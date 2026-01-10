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
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiNotFound, apiError } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const recipe = await prisma.recipe.findUnique({
      where: { slug },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
        tags: true,
        images: true,
      },
    });

    if (!recipe) {
      return apiNotFound("Recipe", slug);
    }

    return apiSuccess(recipe);
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return apiError(error);
  }
}
