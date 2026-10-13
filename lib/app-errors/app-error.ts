import type { JsonObject } from "@/types/json";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: JsonObject,
  ) {
    super(message);
    this.name = "AppError";
  }
}
