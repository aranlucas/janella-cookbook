import { AppError } from "./app-error";
import type { JsonObject, JsonValue } from "@/types/json";

function validationErrorDetails(
  field: string | undefined,
  errors: Readonly<Record<string, readonly string[]>> | undefined,
): JsonObject {
  const details = new Map<string, JsonValue>();

  if (field !== undefined) {
    details.set("field", field);
  }

  if (errors !== undefined) {
    details.set("errors", errors);
  }

  return Object.fromEntries(details);
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    public errors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message, "VALIDATION_ERROR", 400, validationErrorDetails(field, errors));
    this.name = "ValidationError";
  }
}
