import { AppError } from "./app-error";

export class RecipeParseError extends AppError {
  constructor(
    message: string,
    public url?: string,
  ) {
    super(message, "RECIPE_PARSE_ERROR", 400, url === undefined ? undefined : { url });
    this.name = "RecipeParseError";
  }
}
