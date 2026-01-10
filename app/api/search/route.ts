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
 *
 * Search Tips:
 * - Use natural language: "quick vegetarian pasta dishes"
 * - Include time constraints: "dinner recipes under 30 minutes"
 * - Specify cuisines: "authentic Italian pizza recipes"
 * - Combine with filters for best results
 */

import { NextRequest } from "next/server";
import { hybridSearch } from "@/lib/search";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api-response";
import type { SearchRequest } from "@/types/recipe";

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();

    // Validate query
    if (!body.query || body.query.trim().length === 0) {
      return apiValidationError("Query is required", {
        query: ["Query cannot be empty"],
      });
    }

    if (body.query.length > 500) {
      return apiValidationError("Query too long", {
        query: ["Query must be 500 characters or less"],
      });
    }

    const limit = Math.min(Math.max(body.limit || 20, 1), 100);
    const offset = Math.max(body.offset || 0, 0);

    const { results, total } = await hybridSearch(
      body.query,
      body.filters || {},
      limit,
      offset,
    );

    // Generate suggested filters based on results
    const suggestedFilters: string[] = [];

    // Suggest cuisine filters if we have a small set of cuisines
    const cuisines = new Set(
      results.map((r) => r.recipe.cuisine).filter(Boolean),
    );
    if (cuisines.size > 0 && cuisines.size <= 3) {
      suggestedFilters.push(
        `Try filtering by cuisine: ${Array.from(cuisines).join(", ")}`,
      );
    }

    // Suggest quick filter if applicable
    const quickRecipes = results.filter(
      (r) => r.recipe.totalTime && r.recipe.totalTime < 30,
    );
    if (quickRecipes.length > 0 && quickRecipes.length < results.length) {
      suggestedFilters.push(
        `${quickRecipes.length} quick recipes available (under 30 min) - use maxTime filter`,
      );
    }

    // Suggest difficulty filter if mixed
    const difficulties = new Set(
      results.map((r) => r.recipe.difficulty).filter(Boolean),
    );
    if (difficulties.size > 1) {
      suggestedFilters.push(
        `Filter by difficulty: ${Array.from(difficulties).join(", ")}`,
      );
    }

    return apiSuccess(
      {
        results,
        total,
        query: body.query,
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
    );
  } catch (error) {
    console.error("Error searching recipes:", error);
    return apiError(error);
  }
}
