import { AppError } from "./app-error";

export class DatabaseError extends AppError {
  constructor(operation: string, message: string) {
    super(`Database ${operation} failed: ${message}`, "DATABASE_ERROR", 500, {
      operation,
    });
    this.name = "DatabaseError";
  }
}
