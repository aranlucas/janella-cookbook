import { prisma } from "./prisma";
import { generateEmbedding, enhanceSearchQuery } from "./embeddings";
import type {
  SearchFilters,
  SearchResult,
  RecipeWithRelations,
  Course,
  Difficulty,
} from "@/types/recipe";
import { Prisma } from "@prisma/client";

/**
 * Perform semantic search using vector similarity
 */
export async function semanticSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): Promise<{ results: SearchResult[]; total: number }> {
  // Enhance and generate embedding for the query
  const enhancedQuery = enhanceSearchQuery(query);
  const queryEmbedding = await generateEmbedding(enhancedQuery);
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  // Build filter conditions
  const whereConditions: string[] = ["r.embedding IS NOT NULL"];

  if (filters.cuisine && filters.cuisine.length > 0) {
    const cuisines = filters.cuisine.map((c) => `'${c}'`).join(",");
    whereConditions.push(`r.cuisine IN (${cuisines})`);
  }

  if (filters.course && filters.course.length > 0) {
    const courses = filters.course.map((c) => `'${c}'`).join(",");
    whereConditions.push(`r.course IN (${courses})`);
  }

  if (filters.difficulty && filters.difficulty.length > 0) {
    const difficulties = filters.difficulty.map((d) => `'${d}'`).join(",");
    whereConditions.push(`r.difficulty IN (${difficulties})`);
  }

  if (filters.maxTime) {
    whereConditions.push(`r."totalTime" <= ${filters.maxTime}`);
  }

  if (filters.isFavorite !== undefined) {
    whereConditions.push(`r."isFavorite" = ${filters.isFavorite}`);
  }

  const whereClause = whereConditions.join(" AND ");

  // Query with vector similarity
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      prepTime: number | null;
      cookTime: number | null;
      totalTime: number | null;
      servings: string | null;
      difficulty: Difficulty;
      cuisine: string | null;
      course: Course | null;
      sourceUrl: string | null;
      sourceType: string;
      imageUrl: string | null;
      notes: string | null;
      rating: number | null;
      isFavorite: boolean;
      cookCount: number;
      lastCooked: Date | null;
      createdAt: Date;
      updatedAt: Date;
      similarity: number;
    }>
  >`
    SELECT
      r.id,
      r.title,
      r.slug,
      r.description,
      r."prepTime",
      r."cookTime",
      r."totalTime",
      r.servings,
      r.difficulty,
      r.cuisine,
      r.course,
      r."sourceUrl",
      r."sourceType",
      r."imageUrl",
      r.notes,
      r.rating,
      r."isFavorite",
      r."cookCount",
      r."lastCooked",
      r."createdAt",
      r."updatedAt",
      1 - (r.embedding <=> ${embeddingString}::vector) as similarity
    FROM "Recipe" r
    WHERE ${Prisma.raw(whereClause)}
    ORDER BY r.embedding <=> ${embeddingString}::vector
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // Get total count
  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count
    FROM "Recipe" r
    WHERE ${Prisma.raw(whereClause)}
  `;
  const total = Number(countResult[0].count);

  // Fetch related data for each recipe
  const enrichedResults: SearchResult[] = await Promise.all(
    results.map(async (r) => {
      const [ingredients, instructions, tags, images] = await Promise.all([
        prisma.ingredient.findMany({
          where: { recipeId: r.id },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.instruction.findMany({
          where: { recipeId: r.id },
          orderBy: { stepNumber: "asc" },
        }),
        prisma.tag.findMany({ where: { recipes: { some: { id: r.id } } } }),
        prisma.recipeImage.findMany({ where: { recipeId: r.id } }),
      ]);

      const recipe: RecipeWithRelations = {
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        totalTime: r.totalTime,
        servings: r.servings,
        difficulty: r.difficulty,
        cuisine: r.cuisine,
        course: r.course,
        sourceUrl: r.sourceUrl,
        sourceType: r.sourceType as RecipeWithRelations["sourceType"],
        imageUrl: r.imageUrl,
        searchText: null,
        notes: r.notes,
        rating: r.rating,
        isFavorite: r.isFavorite,
        cookCount: r.cookCount,
        lastCooked: r.lastCooked,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        ingredients,
        instructions,
        tags,
        images,
      };

      return {
        recipe,
        score: r.similarity,
        highlights: generateHighlights(recipe, query),
      };
    }),
  );

  return { results: enrichedResults, total };
}

/**
 * Perform keyword-based search
 */
export async function keywordSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): Promise<{ results: SearchResult[]; total: number }> {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const where: Prisma.RecipeWhereInput = {
    AND: [
      // Search in title, description, and searchText
      {
        OR: searchTerms.map((term) => ({
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
            { searchText: { contains: term, mode: "insensitive" as const } },
          ],
        })),
      },
      // Apply filters
      ...(filters.cuisine?.length
        ? [{ cuisine: { in: filters.cuisine } }]
        : []),
      ...(filters.course?.length ? [{ course: { in: filters.course } }] : []),
      ...(filters.difficulty?.length
        ? [{ difficulty: { in: filters.difficulty } }]
        : []),
      ...(filters.maxTime ? [{ totalTime: { lte: filters.maxTime } }] : []),
      ...(filters.isFavorite !== undefined
        ? [{ isFavorite: filters.isFavorite }]
        : []),
    ],
  };

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { stepNumber: "asc" } },
        tags: true,
        images: true,
      },
      take: limit,
      skip: offset,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.recipe.count({ where }),
  ]);

  const results: SearchResult[] = recipes.map((recipe) => ({
    recipe: recipe as unknown as RecipeWithRelations,
    score: 0.5, // Default score for keyword matches
    highlights: generateHighlights(
      recipe as unknown as RecipeWithRelations,
      query,
    ),
  }));

  return { results, total };
}

/**
 * Hybrid search combining semantic and keyword search
 */
export async function hybridSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): Promise<{ results: SearchResult[]; total: number }> {
  // Check if we have embeddings capability
  const hasEmbeddings = process.env.HUGGINGFACE_API_KEY;

  if (!hasEmbeddings) {
    return keywordSearch(query, filters, limit, offset);
  }

  try {
    // Try semantic search first
    const semanticResults = await semanticSearch(query, filters, limit * 2, 0);
    const keywordResults = await keywordSearch(query, filters, limit * 2, 0);

    // Reciprocal Rank Fusion
    const scores = new Map<
      string,
      { recipe: RecipeWithRelations; score: number; highlights?: string[] }
    >();

    // Add semantic results with RRF scores
    semanticResults.results.forEach((result, index) => {
      const rrf = 1 / (60 + index); // k=60 is a common constant
      scores.set(result.recipe.id, {
        recipe: result.recipe,
        score: rrf,
        highlights: result.highlights,
      });
    });

    // Add keyword results with RRF scores
    keywordResults.results.forEach((result, index) => {
      const rrf = 1 / (60 + index);
      const existing = scores.get(result.recipe.id);
      if (existing) {
        existing.score += rrf;
        if (result.highlights) {
          existing.highlights = [
            ...(existing.highlights || []),
            ...result.highlights,
          ];
        }
      } else {
        scores.set(result.recipe.id, {
          recipe: result.recipe,
          score: rrf,
          highlights: result.highlights,
        });
      }
    });

    // Sort by combined score and return top results
    const combined = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    return {
      results: combined,
      total: scores.size,
    };
  } catch {
    // Fall back to keyword search if semantic fails
    return keywordSearch(query, filters, limit, offset);
  }
}

/**
 * Generate highlight snippets for search results
 */
function generateHighlights(
  recipe: RecipeWithRelations,
  query: string,
): string[] {
  const highlights: string[] = [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Check title
  if (terms.some((term) => recipe.title.toLowerCase().includes(term))) {
    highlights.push(recipe.title);
  }

  // Check description
  if (
    recipe.description &&
    terms.some((term) => recipe.description!.toLowerCase().includes(term))
  ) {
    highlights.push(
      recipe.description.slice(0, 150) +
        (recipe.description.length > 150 ? "..." : ""),
    );
  }

  // Check ingredients
  recipe.ingredients?.forEach((ing) => {
    if (terms.some((term) => ing.name.toLowerCase().includes(term))) {
      highlights.push(`Ingredient: ${ing.name}`);
    }
  });

  return highlights.slice(0, 3);
}

/**
 * Get filter options from the database
 */
export async function getFilterOptions() {
  const [cuisines, courses, difficulties, tags, maxTime] = await Promise.all([
    prisma.recipe.groupBy({
      by: ["cuisine"],
      _count: true,
      where: { cuisine: { not: null } },
    }),
    prisma.recipe.groupBy({
      by: ["course"],
      _count: true,
      where: { course: { not: null } },
    }),
    prisma.recipe.groupBy({
      by: ["difficulty"],
      _count: true,
    }),
    prisma.tag.findMany({
      include: {
        _count: { select: { recipes: true } },
      },
    }),
    prisma.recipe.aggregate({
      _max: { totalTime: true },
    }),
  ]);

  return {
    cuisines: cuisines.map((c) => ({ value: c.cuisine!, count: c._count })),
    courses: courses.map((c) => ({ value: c.course!, count: c._count })),
    difficulties: difficulties.map((d) => ({
      value: d.difficulty,
      count: d._count,
    })),
    tags: tags.map((t) => ({
      value: t.name,
      slug: t.slug,
      count: t._count.recipes,
    })),
    maxTotalTime: maxTime._max.totalTime || 120,
  };
}
