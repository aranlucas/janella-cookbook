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

import { NextRequest } from "next/server";
import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { prisma } from "@/lib/prisma";
import { apiPaginated, apiError, apiValidationError } from "@/lib/api-response";
import { toAppError } from "@/lib/errors";
import { courseValues, difficultyValues } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

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

const recipesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(SORT_FIELDS).default("createdAt"),
  order: z.enum(["asc", "desc"] as const).default("desc"),
  cuisine: z.string().optional(),
  course: z.enum(courseValues).optional(),
  difficulty: z.enum(difficultyValues).optional(),
  tag: z.string().optional(),
  favorite: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  maxTime: z.coerce.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = recipesQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return apiValidationError(
      "Invalid query parameters",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const {
    limit,
    offset,
    sort,
    order,
    cuisine,
    course,
    difficulty,
    tag,
    favorite,
    maxTime,
  } = parsed.data;

  // Build where clause
  const where: Prisma.RecipeWhereInput = {};

  if (cuisine) {
    where.cuisine = { equals: cuisine, mode: "insensitive" };
  }

  if (course) {
    where.course = course;
  }

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (tag) {
    where.tags = { some: { slug: tag } };
  }

  if (favorite) {
    where.isFavorite = true;
  }

  if (maxTime) {
    where.totalTime = { lte: maxTime };
  }

  const dbResult = await ResultAsync.fromPromise(
    Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { sortOrder: "asc" } },
          tags: true,
          images: true,
        },
        orderBy: { [sort]: order },
        take: limit,
        skip: offset,
      }),
      prisma.recipe.count({ where }),
    ]),
    (error) => toAppError(error),
  );

  if (dbResult.isErr()) {
    return apiError(dbResult.error);
  }

  const [recipes, total] = dbResult.value;

  return apiPaginated(recipes, { total, limit, offset });
}
