/**
 * GET /api/recipes/[slug] - Get a single recipe by slug
 *
 * This endpoint returns a single recipe with all related data including
 * ingredients, instructions, tags, and images.
 *
 * Path Parameters:
 * - slug: string - The unique slug identifier for the recipe
 *
 * Response:
 * {
 *   success: true,
 *   data: Recipe,
 *   meta: { timestamp, version }
 * }
 *
 * Error Responses:
 * - 404: Recipe not found
 * - 500: Server error
 */

import type { NextRequest } from "next/server";
import { ok, err, ResultAsync } from "neverthrow";
import { getRecipeBySlug } from "@/lib/recipe-queries";
import { apiSuccess, apiError } from "@/lib/api-response";
import { RecipeNotFoundError, thrownValueSchema, toAppError } from "@/lib/errors";

type RecipeRouteParams = { readonly slug: string };

type RecipeRouteContext = { readonly params: Promise<RecipeRouteParams> };

export async function GET(request: NextRequest, { params }: RecipeRouteContext) {
  const { slug } = await params;

  return ResultAsync.fromPromise(getRecipeBySlug(slug), (error) =>
    toAppError(thrownValueSchema.parse(error)),
  )
    .andThen((recipe) => (recipe ? ok(recipe) : err(new RecipeNotFoundError(slug))))
    .match(
      (recipe) => apiSuccess(recipe),
      (error) => apiError(thrownValueSchema.parse(error)),
    );
}
