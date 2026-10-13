import { AppError } from "./app-error";
import type { ThrownValue } from "@/lib/errors";

export class ExternalApiError extends AppError {
  constructor(
    service: string,
    message: string,
    public originalError?: ThrownValue,
  ) {
    super(`${service} API error: ${message}`, "EXTERNAL_API_ERROR", 502, {
      service,
    });
    this.name = "ExternalApiError";
  }
}
