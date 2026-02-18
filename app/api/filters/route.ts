/**
 * GET /api/filters - Get available filter options
 *
 * This endpoint returns the available filter values based on recipes
 * currently in the database. Useful for building dynamic filter UIs
 * and for LLMs to understand what values are valid for filtering.
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     cuisines: string[] - Distinct cuisines in the database
 *     courses: Course[] - Courses that have recipes
 *     difficulties: Difficulty[] - Difficulties that have recipes
 *     tags: Array<{ id, name, slug, recipeCount: number }>
 *     timeRange: { min, max } - Range of totalTime values
 *     counts: {
 *       total: number - Total recipe count
 *       favorites: number - Number of favorited recipes
 *       byCourse: Record<Course, number>
 *       byDifficulty: Record<Difficulty, number>
 *     }
 *   }
 * }
 */

import { ResultAsync } from "neverthrow";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { toAppError } from "@/lib/errors";
import type { Course, Difficulty } from "@prisma/client";

export async function GET() {
  const filtersResult = await ResultAsync.fromPromise(
    Promise.all([
      // Get distinct cuisines
      prisma.recipe
        .findMany({
          where: { cuisine: { not: null } },
          select: { cuisine: true },
          distinct: ["cuisine"],
          orderBy: { cuisine: "asc" },
        })
        .then((results) =>
          results.map((r) => r.cuisine).filter((c): c is string => c !== null),
        ),

      // Get courses with recipes
      prisma.recipe
        .findMany({
          select: { course: true },
          distinct: ["course"],
        })
        .then((results) =>
          results.map((r) => r.course).filter((c): c is Course => c !== null),
        ),

      // Get difficulties with recipes
      prisma.recipe
        .findMany({
          select: { difficulty: true },
          distinct: ["difficulty"],
        })
        .then((results) =>
          results
            .map((r) => r.difficulty)
            .filter((d): d is Difficulty => d !== null),
        ),

      // Get all tags with usage count
      prisma.tag.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { recipes: true } },
        },
        orderBy: { name: "asc" },
      }),

      // Get time range
      prisma.recipe.aggregate({
        _min: { totalTime: true },
        _max: { totalTime: true },
        where: { totalTime: { not: null } },
      }),

      // Get total count
      prisma.recipe.count(),

      // Get favorite count
      prisma.recipe.count({ where: { isFavorite: true } }),

      // Get counts by course
      prisma.recipe.groupBy({
        by: ["course"],
        _count: { course: true },
      }),

      // Get counts by difficulty
      prisma.recipe.groupBy({
        by: ["difficulty"],
        _count: { difficulty: true },
      }),
    ]),
    (error) => toAppError(error),
  );

  if (filtersResult.isErr()) {
    return apiError(filtersResult.error);
  }

  const [
    cuisines,
    courses,
    difficulties,
    tags,
    timeRange,
    totalCount,
    favoriteCount,
    courseCounts,
    difficultyCounts,
  ] = filtersResult.value;

  // Transform course counts to record
  const byCourse: Partial<Record<Course, number>> = {};
  for (const item of courseCounts) {
    if (item.course) {
      byCourse[item.course] = item._count.course;
    }
  }

  // Transform difficulty counts to record
  const byDifficulty: Partial<Record<Difficulty, number>> = {};
  for (const item of difficultyCounts) {
    if (item.difficulty) {
      byDifficulty[item.difficulty] = item._count.difficulty;
    }
  }

  const tagsWithCount = tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    recipeCount: tag._count.recipes,
  }));

  return apiSuccess({
    cuisines,
    courses,
    difficulties,
    tags: tagsWithCount,
    timeRange: {
      min: timeRange._min.totalTime ?? 0,
      max: timeRange._max.totalTime ?? 0,
    },
    counts: {
      total: totalCount,
      favorites: favoriteCount,
      byCourse,
      byDifficulty,
    },
  });
}
