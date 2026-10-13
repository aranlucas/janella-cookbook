/**
 * Custom error classes for the cookbook application
 */

import { AppError } from "./app-errors/app-error";
import { DatabaseUnavailableError } from "./app-errors/database-unavailable-error";
import { z } from "zod";
import type { JsonObject } from "@/types/json";

export { AppError };

export { RecipeNotFoundError } from "./app-errors/recipe-not-found-error";

export { RecipeParseError } from "./app-errors/recipe-parse-error";

export { ValidationError } from "./app-errors/validation-error";

export { ExternalApiError } from "./app-errors/external-api-error";

export { DatabaseError } from "./app-errors/database-error";

export { DatabaseUnavailableError };

/**
 * Postgres / Prisma codes that indicate the DB is temporarily unavailable
 * and a retry is likely to succeed (cold start, failover, scale-to-zero).
 *
 * - 57P03: cannot_connect_now / the database system is starting up (Railway)
 * - 57P01: admin_shutdown
 * - 53300: too_many_connections
 * - 08001 / 08006 / 08000: connection_exception
 * - Prisma P1001 / P1002 / P1008 / P1017: can't reach / timeout / connection closed
 * - Prisma P2039 / driver-specific cold-start wrapper
 */
const TRANSIENT_PG_CODES = new Set([
  "57P03",
  "57P01",
  "53300",
  "53400",
  "08001",
  "08006",
  "08000",
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2039",
]);

const TRANSIENT_MESSAGE_FRAGMENTS = [
  "the database system is starting up",
  "cannot_connect_now",
  "too many clients",
  "connection terminated",
  "connection timed out",
  "can't reach database server",
  "cant reach database server",
  "server has closed the connection",
];

const errorMetadataSchema = z.object({
  code: z.string().optional(),
  cause: z.unknown().optional(),
  details: z
    .object({
      meta: z.object({ code: z.string().optional() }).optional(),
    })
    .optional(),
  message: z.string().optional(),
  meta: z.object({ code: z.string().optional() }).optional(),
});

export const thrownValueSchema = z.union([
  z.instanceof(Error),
  z.object({
    code: z.string().optional(),
    cause: z.unknown().optional(),
    details: z.unknown().optional(),
    message: z.string().optional(),
    meta: z.unknown().optional(),
  }),
  z.string(),
  z.number(),
  z.boolean(),
  z.bigint(),
  z.symbol(),
  z.null(),
  z.undefined(),
]);

export type ThrownValue = z.infer<typeof thrownValueSchema>;

export function isTransientDatabaseError(error: ThrownValue): boolean {
  const parsed = errorMetadataSchema.safeParse(error);

  if (!parsed.success) {
    return false;
  }

  const candidate = parsed.data;
  const cause = errorMetadataSchema.safeParse(candidate.cause);

  // Direct pg error (cause chain may hold it)
  const code =
    candidate.code ?? (cause.success ? cause.data.code : undefined) ?? candidate.meta?.code;

  if (code && TRANSIENT_PG_CODES.has(code.toUpperCase())) {
    return true;
  }

  const nestedMetaCode = candidate.details?.meta?.code;

  if (nestedMetaCode && TRANSIENT_PG_CODES.has(nestedMetaCode.toUpperCase())) {
    return true;
  }

  const messageParts: string[] = [];

  if (candidate.message) {
    messageParts.push(candidate.message.toLowerCase());
  }

  if (cause.success && cause.data.message) {
    messageParts.push(cause.data.message.toLowerCase());
  }

  // Prisma error stringification often embeds original pg message
  const combined = messageParts.join(" | ");

  return TRANSIENT_MESSAGE_FRAGMENTS.some((frag) => combined.includes(frag));
}

export function isDatabaseUnavailableError(error: ThrownValue): boolean {
  return (
    (isAppError(error) && error.code === "DATABASE_UNAVAILABLE") || isTransientDatabaseError(error)
  );
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: ThrownValue): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 * Transient "database starting up" (57P03 / P1001 etc.) is normalized to
 * DatabaseUnavailableError (503) so callers can retry and UIs can show a
 * friendly "waking up" state instead of a generic 500.
 */
export function toAppError(thrownValue: ThrownValue): AppError {
  if (isAppError(thrownValue)) {
    return thrownValue;
  }

  if (isTransientDatabaseError(thrownValue)) {
    const candidate = errorMetadataSchema.safeParse(thrownValue);

    const cause = candidate.success
      ? errorMetadataSchema.safeParse(candidate.data.cause)
      : undefined;

    const message =
      thrownValue instanceof Error && thrownValue.message
        ? thrownValue.message
        : "Database is starting up — please retry in a few seconds";

    // Preserve original code in details for debugging but surface as 503
    const transient = new DatabaseUnavailableError(message);
    // attach original code/message for logs without leaking internals to client
    transient.details = {
      ...transient.details,
      originalCode:
        (candidate?.success ? candidate.data.code : undefined) ??
        (cause?.success ? cause.data.code : undefined) ??
        null,
    };

    return transient;
  }

  if (thrownValue instanceof Error) {
    return new AppError(thrownValue.message, "UNKNOWN_ERROR", 500);
  }

  const message = z.string().safeParse(thrownValue);

  return new AppError(
    message.success ? message.data : "An unexpected error occurred",
    "UNKNOWN_ERROR",
    500,
  );
}

/**
 * Format error for client response
 */
interface ErrorResponse {
  readonly error: string;
  readonly code: string;
  readonly details?: JsonObject;
}

export function formatErrorResponse(error: ThrownValue): ErrorResponse {
  const appError = toAppError(error);

  return {
    error: appError.message,
    code: appError.code,
    details: appError.details,
  };
}
