/**
 * Standardized API response utilities for LLM-friendly responses.
 *
 * All API responses follow a consistent envelope format that makes it easy
 * for LLMs and programmatic clients to parse and understand responses.
 */

import { NextResponse } from "next/server";
import type { JsonObject } from "@/types/json";
import { isAppError, isTransientDatabaseError, toAppError, type ThrownValue } from "./errors";

/**
 * Standard API response envelope.
 * All successful responses include `success: true` and a `data` field.
 * All error responses include `success: false` and an `error` object.
 */
export interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: JsonObject;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

export interface ApiResponseMeta {
  readonly pagination?: PaginationMeta;
  /** ISO timestamp of when the response was generated */
  readonly timestamp?: string;
  /** API version */
  readonly version?: string;
}

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

export function apiPaginated<T>(
  data: readonly T[],
  pagination: Omit<PaginationMeta, "hasMore">,
  status: number = 200,
): NextResponse<ApiSuccessResponse<readonly T[]>> {
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
export function apiError(error: ThrownValue, status?: number): NextResponse<ApiErrorResponse> {
  const appError = toAppError(error);

  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      details: appError.details,
    },
  };

  const isRetryable = appError.code === "DATABASE_UNAVAILABLE" || isTransientDatabaseError(error);

  return NextResponse.json(response, {
    status: status ?? (isRetryable ? 503 : isAppError(error) ? appError.statusCode : 500),
    headers: isRetryable ? { "Retry-After": "3" } : undefined,
  });
}

export function apiValidationError(
  message: string,
  fieldErrors?: Readonly<Record<string, readonly string[]>>,
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
