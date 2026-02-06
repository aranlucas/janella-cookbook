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

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
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
