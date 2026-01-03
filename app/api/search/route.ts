import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/lib/search";
import type { SearchRequest } from "@/types/recipe";

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();

    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const limit = Math.min(body.limit || 20, 100);
    const offset = body.offset || 0;

    const { results, total } = await hybridSearch(
      body.query,
      body.filters || {},
      limit,
      offset,
    );

    // Generate suggested filters based on results
    const suggestedFilters: string[] = [];
    const cuisines = new Set(
      results.map((r) => r.recipe.cuisine).filter(Boolean),
    );
    if (cuisines.size > 0 && cuisines.size <= 3) {
      suggestedFilters.push(
        `Try filtering by: ${Array.from(cuisines).join(", ")}`,
      );
    }

    const quickRecipes = results.filter(
      (r) => r.recipe.totalTime && r.recipe.totalTime < 30,
    );
    if (quickRecipes.length > 0 && quickRecipes.length < results.length) {
      suggestedFilters.push("Filter to show only quick recipes (under 30 min)");
    }

    return NextResponse.json({
      results,
      total,
      query: body.query,
      suggestedFilters,
    });
  } catch (error) {
    console.error("Error searching recipes:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
