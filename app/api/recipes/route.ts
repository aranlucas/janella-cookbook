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
import { prisma } from "@/lib/prisma";
import { apiPaginated, apiError, apiValidationError } from "@/lib/api-response";
import type { Course, Difficulty, Prisma } from "@prisma/client";

const VALID_SORT_FIELDS = [
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

const VALID_COURSES: Course[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "APPETIZER",
  "SIDE",
  "DESSERT",
  "SNACK",
  "DRINK",
  "SAUCE",
  "BREAD",
];

const VALID_DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD", "EXPERT"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      100,
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10) || 0,
      0,
    );

    // Parse sorting
    const sortField = searchParams.get("sort") || "createdAt";
    const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

    if (
      !VALID_SORT_FIELDS.includes(
        sortField as (typeof VALID_SORT_FIELDS)[number],
      )
    ) {
      return apiValidationError(
        `Invalid sort field: ${sortField}. Valid fields: ${VALID_SORT_FIELDS.join(", ")}`,
      );
    }

    // Parse filters
    const cuisine = searchParams.get("cuisine");
    const courseParam = searchParams.get("course")?.toUpperCase() as
      | Course
      | undefined;
    const difficultyParam = searchParams.get("difficulty")?.toUpperCase() as
      | Difficulty
      | undefined;
    const tagSlug = searchParams.get("tag");
    const favoriteParam = searchParams.get("favorite");
    const maxTimeParam = searchParams.get("maxTime");

    // Validate enum filters
    if (courseParam && !VALID_COURSES.includes(courseParam)) {
      return apiValidationError(
        `Invalid course: ${courseParam}. Valid courses: ${VALID_COURSES.join(", ")}`,
      );
    }

    if (difficultyParam && !VALID_DIFFICULTIES.includes(difficultyParam)) {
      return apiValidationError(
        `Invalid difficulty: ${difficultyParam}. Valid difficulties: ${VALID_DIFFICULTIES.join(", ")}`,
      );
    }

    // Build where clause
    const where: Prisma.RecipeWhereInput = {};

    if (cuisine) {
      where.cuisine = { equals: cuisine, mode: "insensitive" };
    }

    if (courseParam) {
      where.course = courseParam;
    }

    if (difficultyParam) {
      where.difficulty = difficultyParam;
    }

    if (tagSlug) {
      where.tags = { some: { slug: tagSlug } };
    }

    if (favoriteParam === "true") {
      where.isFavorite = true;
    }

    if (maxTimeParam) {
      const maxTime = parseInt(maxTimeParam, 10);
      if (!isNaN(maxTime) && maxTime > 0) {
        where.totalTime = { lte: maxTime };
      }
    }

    // Fetch recipes and count in parallel
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { sortOrder: "asc" } },
          tags: true,
          images: true,
        },
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.recipe.count({ where }),
    ]);

    return apiPaginated(recipes, { total, limit, offset });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return apiError(error);
  }
}
