/**
 * Standardized API response utilities for LLM-friendly responses.
 *
 * All API responses follow a consistent envelope format that makes it easy
 * for LLMs and programmatic clients to parse and understand responses.
 */

import { NextResponse } from "next/server";
import { formatErrorResponse, isAppError, toAppError } from "./errors";

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
 */
export function apiError(
  error: unknown,
  status?: number,
): NextResponse<ApiErrorResponse> {
  const appError = toAppError(error);
  const formatted = formatErrorResponse(error);

  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: formatted.error,
      code: formatted.code,
      details: formatted.details,
    },
  };

  return NextResponse.json(response, {
    status: status ?? (isAppError(error) ? appError.statusCode : 500),
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

/**
 * Wrap an async handler with standardized error handling
 */
export function withApiErrorHandler<T>(
  handler: () => Promise<NextResponse<ApiSuccessResponse<T>>>,
): Promise<NextResponse<ApiResponse<T>>> {
  return handler().catch((error) => apiError(error));
}
