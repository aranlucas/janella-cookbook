/**
 * Custom error classes for the cookbook application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class RecipeNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Recipe not found: ${identifier}`, "RECIPE_NOT_FOUND", 404);
    this.name = "RecipeNotFoundError";
  }
}

export class RecipeParseError extends AppError {
  constructor(
    message: string,
    public url?: string,
  ) {
    super(message, "RECIPE_PARSE_ERROR", 400, { url });
    this.name = "RecipeParseError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message, "VALIDATION_ERROR", 400, { field, errors });
    this.name = "ValidationError";
  }
}

export class ExternalApiError extends AppError {
  constructor(
    service: string,
    message: string,
    public originalError?: unknown,
  ) {
    super(`${service} API error: ${message}`, "EXTERNAL_API_ERROR", 502, {
      service,
    });
    this.name = "ExternalApiError";
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, message: string) {
    super(`Database ${operation} failed: ${message}`, "DATABASE_ERROR", 500, {
      operation,
    });
    this.name = "DatabaseError";
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message = "Database is starting up — please retry in a few seconds") {
    super(message, "DATABASE_UNAVAILABLE", 503, { retryable: true });
    this.name = "DatabaseUnavailableError";
  }
}

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

export function isTransientDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as Record<string, unknown>;

  // Direct pg error (cause chain may hold it)
  const code =
    (candidate.code as string | undefined) ??
    ((candidate.cause as Record<string, unknown> | undefined)?.code as
      | string
      | undefined) ??
    ((candidate.meta as Record<string, unknown> | undefined)?.code as
      | string
      | undefined);

  if (code && TRANSIENT_PG_CODES.has(String(code).toUpperCase())) {
    return true;
  }

  // Prisma meta.code or AppError.details.meta.code etc.
  const nestedMetaCode = (() => {
    try {
      const details = (candidate.details as Record<string, unknown> | undefined)
        ?.meta as Record<string, unknown> | undefined;
      return details?.code as string | undefined;
    } catch {
      return undefined;
    }
  })();
  if (nestedMetaCode && TRANSIENT_PG_CODES.has(String(nestedMetaCode).toUpperCase())) {
    return true;
  }

  const messageParts: string[] = [];
  if (typeof candidate.message === "string") messageParts.push(candidate.message.toLowerCase());
  if (candidate.cause && typeof (candidate.cause as Record<string, unknown>).message === "string") {
    messageParts.push(
      String((candidate.cause as Record<string, unknown>).message).toLowerCase(),
    );
  }
  // Prisma error stringification often embeds original pg message
  const combined = messageParts.join(" | ");
  return TRANSIENT_MESSAGE_FRAGMENTS.some((frag) => combined.includes(frag));
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  return (
    isAppError(error) && error.code === "DATABASE_UNAVAILABLE" ||
    isTransientDatabaseError(error)
  );
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 * Transient "database starting up" (57P03 / P1001 etc.) is normalized to
 * DatabaseUnavailableError (503) so callers can retry and UIs can show a
 * friendly "waking up" state instead of a generic 500.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (isTransientDatabaseError(error)) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Database is starting up — please retry in a few seconds";
    // Preserve original code in details for debugging but surface as 503
    const transient = new DatabaseUnavailableError(message);
    // attach original code/message for logs without leaking internals to client
    transient.details = {
      ...transient.details,
      originalCode:
        (error as Record<string, unknown>).code ??
        ((error as Record<string, unknown>).cause as Record<string, unknown> | undefined)?.code ??
        undefined,
    };
    return transient;
  }

  if (error instanceof Error) {
    return new AppError(error.message, "UNKNOWN_ERROR", 500);
  }

  return new AppError(String(error), "UNKNOWN_ERROR", 500);
}

/**
 * Format error for client response
 */
export function formatErrorResponse(error: unknown): {
  error: string;
  code: string;
  details?: Record<string, unknown>;
} {
  const appError = toAppError(error);
  return {
    error: appError.message,
    code: appError.code,
    details: appError.details,
  };
}
