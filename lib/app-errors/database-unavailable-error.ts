import { AppError } from "./app-error";

export class DatabaseUnavailableError extends AppError {
  constructor(message = "Database is starting up — please retry in a few seconds") {
    super(message, "DATABASE_UNAVAILABLE", 503, { retryable: true });
    this.name = "DatabaseUnavailableError";
  }
}
