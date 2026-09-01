/**
 * Standardized API response utilities for LLM-friendly responses.
 *
 * All API responses follow a consistent envelope format that makes it easy
 * for LLMs and programmatic clients to parse and understand responses.
 */

import { NextResponse } from "next/server";
import {
  formatErrorResponse,
  isAppError,
  isTransientDatabaseError,
  toAppError,
} from "./errors";

/**
 * Standard API response envelope.
 * All successful responses include `success: true` and a `data` field.
 * All error responses include `success: false` and an `error` object.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Metadata for paginated responses
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * General response metadata
 */
export interface ApiResponseMeta {
  pagination?: PaginationMeta;
  /** ISO timestamp of when the response was generated */
  timestamp?: string;
  /** API version */
  version?: string;
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  meta?: ApiResponseMeta,
  status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      version: "1.0",
    },
  };
  return NextResponse.json(response, { status });
}

/**
 * Create a paginated API response
 */
export function apiPaginated<T>(
  data: T[],
  pagination: { total: number; limit: number; offset: number },
  status: number = 200,
): NextResponse<ApiSuccessResponse<T[]>> {
  return apiSuccess(
    data,
    {
      pagination: {
        ...pagination,
        hasMore: pagination.offset + data.length < pagination.total,
      },
    },
    status,
  );
}

/**
 * Create an error API response
 * Transient "database starting up" errors are mapped to 503 with Retry-After
 * so clients (and Next.js fetch) can retry instead of seeing a scary 500.
 */
export function apiError(
  error: unknown,
  status?: number,
): NextResponse<ApiErrorResponse> {
  // Normalize transient PG errors (57P03 etc.) to 503 DATABASE_UNAVAILABLE
  const normalized = isTransientDatabaseError(error) ? toAppError(error) : null;
  const effectiveError = normalized ?? error;
  const appError = toAppError(effectiveError);
  const formatted = formatErrorResponse(effectiveError);

  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: formatted.error,
      code: formatted.code,
      details: formatted.details,
    },
  };

  const isRetryable =
    appError.code === "DATABASE_UNAVAILABLE" ||
    isTransientDatabaseError(error);

  return NextResponse.json(response, {
    status:
      status ??
      (isRetryable ? 503 : isAppError(error) ? appError.statusCode : 500),
    headers: isRetryable ? { "Retry-After": "3" } : undefined,
  });
}

/**
 * Create a validation error response
 */
export function apiValidationError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code: "VALIDATION_ERROR",
      details: fieldErrors ? { fields: fieldErrors } : undefined,
    },
  };
  return NextResponse.json(response, { status: 400 });
}

/**
 * Create a not found error response
 */
export function apiNotFound(
  resource: string,
  identifier?: string,
): NextResponse<ApiErrorResponse> {
  const message = identifier
    ? `${resource} not found: ${identifier}`
    : `${resource} not found`;

  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      code: "NOT_FOUND",
    },
  };
  return NextResponse.json(response, { status: 404 });
}
