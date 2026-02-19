/**
 * POST /api/search - Hybrid semantic and keyword search for recipes
 *
 * This endpoint combines vector similarity search (when embeddings are available)
 * with traditional keyword search using Reciprocal Rank Fusion for optimal results.
 *
 * Request Body:
 * {
 *   query: string (required) - Natural language search query
 *   filters?: {
 *     cuisine?: string[] - Filter by cuisines
 *     course?: Course[] - Filter by meal courses
 *     difficulty?: Difficulty[] - Filter by difficulties
 *     maxTime?: number - Maximum total time in minutes
 *     tags?: string[] - Filter by tag slugs
 *     isFavorite?: boolean - Filter to favorites only
 *   }
 *   limit?: number (default: 20, max: 100)
 *   offset?: number (default: 0)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     results: SearchResult[] - Recipes with relevance scores
 *     total: number - Total matching recipes
 *     query: string - Original query
 *     suggestedFilters?: string[] - Helpful filter suggestions
 *   },
 *   meta: { pagination, timestamp, version }
 * }
 */

import { NextRequest } from "next/server";
import { ok, err, ResultAsync } from "neverthrow";
import { hybridSearch } from "@/lib/search";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { searchRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  return ResultAsync.fromPromise(
    request.json(),
    () => new ValidationError("Invalid JSON in request body"),
  )
    .andThen((body) => {
      const parsed = searchRequestSchema.safeParse(body);
      return parsed.success
        ? ok(parsed.data)
        : err(
            new ValidationError(
              "Invalid search request",
              undefined,
              parsed.error.flatten().fieldErrors as Record<string, string[]>,
            ),
          );
    })
    .andThen(({ query, filters, limit = 20, offset = 0 }) =>
      hybridSearch(query, filters ?? {}, limit, offset).map(
        ({ results, total }) => {
          // Generate suggested filters based on results
          const suggestedFilters: string[] = [];

          const cuisines = new Set(
            results.map((r) => r.recipe.cuisine).filter(Boolean),
          );
          if (cuisines.size > 0 && cuisines.size <= 3) {
            suggestedFilters.push(
              `Try filtering by cuisine: ${Array.from(cuisines).join(", ")}`,
            );
          }

          const quickRecipes = results.filter(
            (r) => r.recipe.totalTime && r.recipe.totalTime < 30,
          );
          if (quickRecipes.length > 0 && quickRecipes.length < results.length) {
            suggestedFilters.push(
              `${quickRecipes.length} quick recipes available (under 30 min) - use maxTime filter`,
            );
          }

          const difficulties = new Set(
            results.map((r) => r.recipe.difficulty).filter(Boolean),
          );
          if (difficulties.size > 1) {
            suggestedFilters.push(
              `Filter by difficulty: ${Array.from(difficulties).join(", ")}`,
            );
          }

          return { results, total, query, suggestedFilters, limit, offset };
        },
      ),
    )
    .match(
      ({ results, total, suggestedFilters, query, limit, offset }) =>
        apiSuccess(
          {
            query,
            results,
            total,
            suggestedFilters:
              suggestedFilters.length > 0 ? suggestedFilters : undefined,
          },
          {
            pagination: {
              total,
              limit,
              offset,
              hasMore: offset + results.length < total,
            },
          },
        ),
      (error) => {
        if (error instanceof ValidationError && error.errors) {
          return apiValidationError(error.message, error.errors);
        }
        return apiError(error);
      },
    );
}
