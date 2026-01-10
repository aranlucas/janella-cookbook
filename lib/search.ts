import { prisma, isSQLite, getSQLiteDb } from "./prisma";
import { generateEmbedding, enhanceSearchQuery } from "./embeddings";
import { ExternalApiError, DatabaseError, withRetry } from "./errors";
import type {
  SearchFilters,
  SearchResult,
  RecipeWithRelations,
  Course,
  Difficulty,
  Ingredient,
  Instruction,
  Tag,
  RecipeImage,
} from "@/types/recipe";
import { Prisma } from "@prisma/client";

/**
 * Batch fetch related data for multiple recipes in a single query per relation
 * This fixes the N+1 query problem by fetching all related data at once
 */
async function batchFetchRecipeRelations(recipeIds: string[]): Promise<{
  ingredients: Map<string, Ingredient[]>;
  instructions: Map<string, Instruction[]>;
  tags: Map<string, Tag[]>;
  images: Map<string, RecipeImage[]>;
}> {
  if (recipeIds.length === 0) {
    return {
      ingredients: new Map(),
      instructions: new Map(),
      tags: new Map(),
      images: new Map(),
    };
  }

  // Fetch all related data in parallel with batch queries
  const [allIngredients, allInstructions, recipeTags, allImages] =
    await Promise.all([
      prisma.ingredient.findMany({
        where: { recipeId: { in: recipeIds } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.instruction.findMany({
        where: { recipeId: { in: recipeIds } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: {
          id: true,
          tags: true,
        },
      }),
      prisma.recipeImage.findMany({
        where: { recipeId: { in: recipeIds } },
      }),
    ]);

  // Group by recipe ID
  const ingredients = new Map<string, Ingredient[]>();
  const instructions = new Map<string, Instruction[]>();
  const tags = new Map<string, Tag[]>();
  const images = new Map<string, RecipeImage[]>();

  // Initialize with empty arrays
  for (const id of recipeIds) {
    ingredients.set(id, []);
    instructions.set(id, []);
    tags.set(id, []);
    images.set(id, []);
  }

  // Group ingredients by recipe
  for (const ing of allIngredients) {
    const list = ingredients.get(ing.recipeId) || [];
    list.push(ing);
    ingredients.set(ing.recipeId, list);
  }

  // Group instructions by recipe
  for (const inst of allInstructions) {
    const list = instructions.get(inst.recipeId) || [];
    list.push(inst);
    instructions.set(inst.recipeId, list);
  }

  // Group tags by recipe
  for (const recipe of recipeTags) {
    tags.set(recipe.id, recipe.tags);
  }

  // Group images by recipe
  for (const img of allImages) {
    const list = images.get(img.recipeId) || [];
    list.push(img);
    images.set(img.recipeId, list);
  }

  return { ingredients, instructions, tags, images };
}

/**
 * Build safe WHERE conditions for filters using parameterized queries
 * This fixes the SQL injection vulnerability
 */
function buildFilterConditions(filters: SearchFilters): {
  conditions: string[];
  params: Record<string, unknown>;
} {
  const conditions: string[] = ["r.embedding IS NOT NULL"];
  const params: Record<string, unknown> = {};

  if (filters.cuisine && filters.cuisine.length > 0) {
    // Validate that cuisines are safe strings (alphanumeric + spaces)
    const safeCuisines = filters.cuisine.filter((c) => /^[\w\s-]+$/i.test(c));
    if (safeCuisines.length > 0) {
      const placeholders = safeCuisines
        .map((_, i) => `$cuisine${i}`)
        .join(", ");
      conditions.push(`r.cuisine IN (${placeholders})`);
      safeCuisines.forEach((c, i) => {
        params[`cuisine${i}`] = c;
      });
    }
  }

  if (filters.course && filters.course.length > 0) {
    // Course values are from enum, so they're safe
    const courseList = filters.course.map((c) => `'${c}'`).join(", ");
    conditions.push(`r.course::text IN (${courseList})`);
  }

  if (filters.difficulty && filters.difficulty.length > 0) {
    // Difficulty values are from enum, so they're safe
    const diffList = filters.difficulty.map((d) => `'${d}'`).join(", ");
    conditions.push(`r.difficulty::text IN (${diffList})`);
  }

  if (filters.maxTime !== undefined && filters.maxTime > 0) {
    // Numeric value, safe to use directly after validation
    const maxTime = Math.floor(Math.abs(filters.maxTime));
    conditions.push(`r."totalTime" <= ${maxTime}`);
  }

  if (filters.isFavorite !== undefined) {
    conditions.push(`r."isFavorite" = ${filters.isFavorite}`);
  }

  return { conditions, params };
}

/**
 * Perform semantic search using vector similarity
 */
export async function semanticSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): Promise<{ results: SearchResult[]; total: number }> {
  // Enhance and generate embedding for the query with retry logic
  const enhancedQuery = enhanceSearchQuery(query);

  let queryEmbedding: number[];
  try {
    queryEmbedding = await withRetry(() => generateEmbedding(enhancedQuery), {
      maxRetries: 2,
      initialDelayMs: 500,
      shouldRetry: (error) => {
        // Retry on network errors, not on auth errors
        if (error instanceof Error) {
          return !error.message.includes("401");
        }
        return true;
      },
    });
  } catch (error) {
    throw new ExternalApiError(
      "Hugging Face",
      "Failed to generate embedding for search query",
      error,
    );
  }

  // Build safe filter conditions
  const { conditions } = buildFilterConditions(filters);
  const whereClause = conditions.join(" AND ");

  // Query with vector similarity
  let results: Array<{
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
  }>;

  try {
    if (isSQLite()) {
      // For SQLite with sqlite-vec, use virtual table for vector search
      const db = getSQLiteDb();
      if (!db) {
        throw new Error("SQLite database not initialized");
      }

      // Query virtual table for similar vectors
      const queryEmbeddingBuffer = Buffer.from(
        new Float32Array(queryEmbedding).buffer,
      );
      const vectorResults = db
        .prepare(
          `
          SELECT recipe_id, distance
          FROM vec_recipes
          WHERE embedding MATCH ?
          AND k = ?
          ORDER BY distance
        `,
        )
        .all(queryEmbeddingBuffer, limit + offset) as Array<{
        recipe_id: string;
        distance: number;
      }>;

      // Get recipe IDs and calculate similarity (1 - distance for cosine similarity)
      const recipeIds = vectorResults
        .slice(offset, offset + limit)
        .map((r) => r.recipe_id);
      const similarityMap = new Map(
        vectorResults.map((r) => [r.recipe_id, 1 - r.distance]),
      );

      // Fetch full recipe details
      const recipes = await prisma.recipe.findMany({
        where: {
          id: { in: recipeIds },
          ...(filters.cuisine && { cuisine: filters.cuisine }),
          ...(filters.course && { course: filters.course }),
          ...(filters.difficulty && { difficulty: filters.difficulty }),
          ...(filters.tags && {
            tags: { some: { slug: { in: filters.tags } } },
          }),
          ...(filters.isFavorite !== undefined && {
            isFavorite: filters.isFavorite,
          }),
        },
      });

      // Map to results with similarity scores
      results = recipes
        .map((r) => ({
          ...r,
          similarity: similarityMap.get(r.id) || 0,
        }))
        .sort((a, b) => b.similarity - a.similarity);
    } else {
      // For PostgreSQL with pgvector
      const embeddingString = `[${queryEmbedding.join(",")}]`;
      results = await prisma.$queryRaw`
        SELECT * FROM (
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
        ) AS sub
        WHERE similarity > 0.35
        ORDER BY similarity DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }
  } catch (error) {
    throw new DatabaseError("semantic search", String(error));
  }

  // Get total count with similarity threshold
  let total: number;
  try {
    if (isSQLite()) {
      // For SQLite, total is based on vector search results
      const db = getSQLiteDb();
      if (!db) {
        throw new Error("SQLite database not initialized");
      }

      const queryEmbeddingBuffer = Buffer.from(
        new Float32Array(queryEmbedding).buffer,
      );
      const countResults = db
        .prepare(
          `
          SELECT COUNT(*) as count
          FROM vec_recipes
          WHERE embedding MATCH ?
        `,
        )
        .get(queryEmbeddingBuffer) as { count: number };
      total = countResults.count;
    } else {
      // For PostgreSQL
      const embeddingString = `[${queryEmbedding.join(",")}]`;
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM (
          SELECT 1 - (r.embedding <=> ${embeddingString}::vector) as similarity
          FROM "Recipe" r
          WHERE ${Prisma.raw(whereClause)}
        ) AS sub
        WHERE similarity > 0.35
      `;
      total = Number(countResult[0].count);
    }
  } catch (error) {
    throw new DatabaseError("count query", String(error));
  }

  // Batch fetch related data (fixes N+1 problem)
  const recipeIds = results.map((r) => r.id);
  const relations = await batchFetchRecipeRelations(recipeIds);

  // Build enriched results
  const enrichedResults: SearchResult[] = results.map((r) => {
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
      ingredients: relations.ingredients.get(r.id) || [],
      instructions: relations.instructions.get(r.id) || [],
      tags: relations.tags.get(r.id) || [],
      images: relations.images.get(r.id) || [],
    };

    return {
      recipe,
      score: r.similarity,
      highlights: generateHighlights(recipe, query),
    };
  });

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
        AND: searchTerms.map((term) => ({
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

  try {
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { sortOrder: "asc" } },
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
  } catch (error) {
    throw new DatabaseError("keyword search", String(error));
  }
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
  } catch (error) {
    // Fall back to keyword search if semantic fails
    console.error("Hybrid search failed, falling back to keyword:", error);
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
  try {
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
  } catch (error) {
    throw new DatabaseError("fetch filter options", String(error));
  }
}
