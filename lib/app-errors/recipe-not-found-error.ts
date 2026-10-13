import { AppError } from "./app-error";

export class RecipeNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Recipe not found: ${identifier}`, "RECIPE_NOT_FOUND", 404);
    this.name = "RecipeNotFoundError";
  }
}
