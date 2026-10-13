/**
 * GET /api/recipes - List all recipes with pagination and filtering
 *
 * This endpoint provides a RESTful way to retrieve recipes. It supports:
 * - Pagination via `limit` and `offset` query parameters
 * - Filtering by cuisine, course, difficulty, tags, and favorites
 * - Sorting by various fields
 *
 * Query Parameters:
 * - limit: number (default: 20, max: 100) - Number of recipes to return
 * - offset: number (default: 0) - Number of recipes to skip
 * - sort: string (default: "createdAt") - Field to sort by
 * - order: "asc" | "desc" (default: "desc") - Sort order
 * - cuisine: string - Filter by cuisine
 * - course: string - Filter by course (BREAKFAST, LUNCH, DINNER, etc.)
 * - difficulty: string - Filter by difficulty (EASY, MEDIUM, HARD, EXPERT)
 * - tag: string - Filter by tag slug
 * - favorite: boolean - Filter to only favorites
 * - maxTime: number - Filter recipes with totalTime <= maxTime (in minutes)
 *
 * Response:
 * {
 *   success: true,
 *   data: Recipe[],
 *   meta: {
 *     pagination: { total, limit, offset, hasMore },
 *     timestamp: string,
 *     version: string
 *   }
 * }
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { listRecipes } from "@/lib/recipe-queries";
import { apiPaginated, apiError, apiValidationError } from "@/lib/api-response";
import { thrownValueSchema, toAppError } from "@/lib/errors";
import { recipeListSchema } from "@/lib/validations";

const SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "title",
  "prepTime",
  "cookTime",
  "totalTime",
  "rating",
  "cookCount",
  "lastCooked",
] as const;

const recipesQuerySchema = recipeListSchema.omit({ isFavorite: true }).extend({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(SORT_FIELDS).default("createdAt"),
  order: z.enum(["asc", "desc"] as const).default("desc"),
  favorite: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  maxTime: z.coerce.number().positive().optional(),
});

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = recipesQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return apiValidationError("Invalid query parameters", parsed.error.flatten().fieldErrors);
  }

  const { limit, offset, sort, order, cuisine, course, difficulty, tag, favorite, maxTime } =
    parsed.data;

  return ResultAsync.fromPromise(
    listRecipes({
      query: parsed.data.query,
      cuisine,
      course,
      difficulty,
      tag,
      isFavorite: favorite ? true : undefined,
      maxTime,
      limit,
      offset,
      orderBy: { [sort]: order },
    }),
    (error) => toAppError(thrownValueSchema.parse(error)),
  ).match(
    ({ recipes, total }) => apiPaginated(recipes, { total, limit, offset }),
    (error) => apiError(thrownValueSchema.parse(error)),
  );
}
