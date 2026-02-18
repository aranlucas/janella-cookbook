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

import { NextRequest } from "next/server";
import { ResultAsync } from "neverthrow";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiNotFound, apiError } from "@/lib/api-response";
import { toAppError } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const recipeResult = await ResultAsync.fromPromise(
    prisma.recipe.findUnique({
      where: { slug },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
        tags: true,
        images: true,
      },
    }),
    (error) => toAppError(error),
  );

  if (recipeResult.isErr()) {
    return apiError(recipeResult.error);
  }

  if (!recipeResult.value) {
    return apiNotFound("Recipe", slug);
  }

  return apiSuccess(recipeResult.value);
}
