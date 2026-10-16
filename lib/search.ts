import { ResultAsync } from "neverthrow";
import { prisma } from "./prisma";
import { recipeRelations } from "./recipe-queries";
import { generateEmbedding, enhanceSearchQuery } from "./embeddings";
import {
  ExternalApiError,
  DatabaseError,
  thrownValueSchema,
  toAppError,
  type AppError,
} from "./errors";
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
import { z } from "zod";
import { env } from "./env";

const sourceTypeSchema = z.enum(["URL_IMPORT", "MANUAL", "NATURAL_LANGUAGE", "PHOTO", "API"]);

type SearchOutput = { results: SearchResult[]; total: number };

interface BatchRecipeRelations {
  ingredients: Map<string, Ingredient[]>;
  instructions: Map<string, Instruction[]>;
  tags: Map<string, Tag[]>;
  images: Map<string, RecipeImage[]>;
}

interface SemanticSearchRow {
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
}

interface CountResult {
  count: bigint;
}

type CountResultRows = [CountResult];

interface ScoredRecipe {
  recipe: RecipeWithRelations;
  score: number;
  highlights?: readonly string[];
}

interface FilterValue {
  value: string;
  count: number;
}

interface CourseFilterValue {
  value: Course;
  count: number;
}

interface DifficultyFilterValue {
  value: Difficulty;
  count: number;
}

interface TagFilterValue {
  value: string;
  slug: string;
  count: number;
}

interface FilterOptions {
  readonly cuisines: readonly FilterValue[];
  readonly courses: readonly CourseFilterValue[];
  readonly difficulties: readonly DifficultyFilterValue[];
  readonly tags: readonly TagFilterValue[];
  readonly maxTotalTime: number;
}

/**
 * Batch fetch related data for multiple recipes in a single query per relation
 * This fixes the N+1 query problem by fetching all related data at once
 */
async function batchFetchRecipeRelations(
  recipeIds: readonly string[],
): Promise<BatchRecipeRelations> {
  if (recipeIds.length === 0) {
    return {
      ingredients: new Map(),
      instructions: new Map(),
      tags: new Map(),
      images: new Map(),
    };
  }

  // Fetch all related data in parallel with batch queries
  const [allIngredients, allInstructions, recipeTags, allImages] = await Promise.all([
    prisma.ingredient.findMany({
      where: { recipeId: { in: [...recipeIds] } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.instruction.findMany({
      where: { recipeId: { in: [...recipeIds] } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.recipe.findMany({
      where: { id: { in: [...recipeIds] } },
      select: {
        id: true,
        tags: true,
      },
    }),
    prisma.recipeImage.findMany({
      where: { recipeId: { in: [...recipeIds] } },
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
    const list = ingredients.get(ing.recipeId) ?? [];
    list.push(ing);
    ingredients.set(ing.recipeId, list);
  }

  // Group instructions by recipe
  for (const inst of allInstructions) {
    const list = instructions.get(inst.recipeId) ?? [];
    list.push(inst);
    instructions.set(inst.recipeId, list);
  }

  // Group tags by recipe
  for (const recipe of recipeTags) {
    tags.set(recipe.id, recipe.tags);
  }

  // Group images by recipe
  for (const img of allImages) {
    const list = images.get(img.recipeId) ?? [];
    list.push(img);
    images.set(img.recipeId, list);
  }

  return { ingredients, instructions, tags, images };
}

/**
 * Build safe WHERE conditions for filters using parameterized queries
 * This fixes the SQL injection vulnerability
 */
function buildFilterConditions(filters: SearchFilters): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`r.embedding IS NOT NULL`];

  if (filters.cuisine && filters.cuisine.length > 0) {
    // Validate that cuisines are safe strings (alphanumeric + spaces)
    const safeCuisines = filters.cuisine.filter((c) => /^[\w\s-]+$/i.test(c));

    if (safeCuisines.length > 0) {
      conditions.push(Prisma.sql`r.cuisine IN (${Prisma.join(safeCuisines)})`);
    }
  }

  if (filters.course && filters.course.length > 0) {
    // Course values are from enum, so they're safe
    conditions.push(Prisma.sql`r.course::text IN (${Prisma.join(filters.course)})`);
  }

  if (filters.difficulty && filters.difficulty.length > 0) {
    // Difficulty values are from enum, so they're safe
    conditions.push(Prisma.sql`r.difficulty::text IN (${Prisma.join(filters.difficulty)})`);
  }

  if (filters.maxTime !== undefined && filters.maxTime > 0) {
    // Numeric value, safe to use directly after validation
    const maxTime = Math.floor(Math.abs(filters.maxTime));
    conditions.push(Prisma.sql`r."totalTime" <= ${maxTime}`);
  }

  if (filters.isFavorite !== undefined) {
    conditions.push(Prisma.sql`r."isFavorite" = ${filters.isFavorite}`);
  }

  return conditions;
}

/**
 * Perform semantic search using vector similarity.
 * Returns ResultAsync instead of throwing.
 */
export function semanticSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): ResultAsync<SearchOutput, AppError> {
  const enhancedQuery = enhanceSearchQuery(query);

  return generateEmbedding(enhancedQuery)
    .mapErr(
      (error) =>
        new ExternalApiError(
          "Hugging Face",
          "Failed to generate embedding for search query",
          thrownValueSchema.parse(error),
        ),
    )
    .andThen((queryEmbedding) =>
      ResultAsync.fromPromise(
        semanticSearchWithEmbedding(queryEmbedding, query, filters, limit, offset),
        (error) =>
          error instanceof DatabaseError ? error : toAppError(thrownValueSchema.parse(error)),
      ),
    );
}

/** Internal implementation for semantic search after embedding is generated */
async function semanticSearchWithEmbedding(
  queryEmbedding: readonly number[],
  query: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<SearchOutput> {
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  // Build safe filter conditions
  const conditions = buildFilterConditions(filters);
  const whereClause = Prisma.join(conditions, " AND ");

  // Query with vector similarity
  let results: SemanticSearchRow[];

  try {
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
        WHERE ${whereClause}
      ) AS sub
      WHERE similarity > 0.35
      ORDER BY similarity DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
  } catch (error) {
    throw new DatabaseError("semantic search", String(error));
  }

  // Get total count with similarity threshold
  let total: number;

  try {
    const countResult = await prisma.$queryRaw<CountResultRows>`
      SELECT COUNT(*) as count FROM (
        SELECT 1 - (r.embedding <=> ${embeddingString}::vector) as similarity
        FROM "Recipe" r
        WHERE ${whereClause}
      ) AS sub
      WHERE similarity > 0.35
    `;

    total = Number(countResult[0].count);
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
      sourceType: sourceTypeSchema.parse(r.sourceType),
      imageUrl: r.imageUrl,
      searchText: null,
      notes: r.notes,
      rating: r.rating,
      isFavorite: r.isFavorite,
      cookCount: r.cookCount,
      lastCooked: r.lastCooked,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ingredients: relations.ingredients.get(r.id) ?? [],
      instructions: relations.instructions.get(r.id) ?? [],
      tags: relations.tags.get(r.id) ?? [],
      images: relations.images.get(r.id) ?? [],
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
 * Perform keyword-based search.
 * Returns ResultAsync instead of throwing.
 */
export function keywordSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): ResultAsync<SearchOutput, AppError> {
  return ResultAsync.fromPromise(keywordSearchImpl(query, filters, limit, offset), (error) =>
    error instanceof DatabaseError ? error : toAppError(thrownValueSchema.parse(error)),
  );
}

/** Internal throwing implementation for keyword search */
async function keywordSearchImpl(
  query: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<SearchOutput> {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Build filter conditions (shared between empty and non-empty query paths)
  const filterConditions: Prisma.RecipeWhereInput[] = [
    ...(filters.cuisine?.length ? [{ cuisine: { in: [...filters.cuisine] } }] : []),
    ...(filters.course?.length ? [{ course: { in: [...filters.course] } }] : []),
    ...(filters.difficulty?.length ? [{ difficulty: { in: [...filters.difficulty] } }] : []),
    ...(filters.maxTime ? [{ totalTime: { lte: filters.maxTime } }] : []),
    ...(filters.isFavorite !== undefined ? [{ isFavorite: filters.isFavorite }] : []),
  ];

  // When query is empty or whitespace-only, return all recipes matching filters
  const where: Prisma.RecipeWhereInput =
    searchTerms.length === 0
      ? filterConditions.length > 0
        ? { AND: filterConditions }
        : {}
      : {
          AND: [
            {
              AND: searchTerms.map((term) => ({
                OR: [
                  {
                    title: { contains: term, mode: "insensitive" as const },
                  },
                  {
                    description: {
                      contains: term,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    searchText: {
                      contains: term,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              })),
            },
            ...filterConditions,
          ],
        };

  try {
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: recipeRelations,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.recipe.count({ where }),
    ]);

    const results: SearchResult[] = recipes.map((recipe) => {
      // SAFETY: this query includes every relation from recipeRelations and the public type omits private fields.
      const recipeWithRelations = recipe as RecipeWithRelations;

      return {
        recipe: recipeWithRelations,
        score: 0.5, // Default score for keyword matches
        highlights: generateHighlights(recipeWithRelations, query),
      };
    });

    return { results, total };
  } catch (error) {
    throw new DatabaseError("keyword search", String(error));
  }
}

/**
 * Hybrid search combining semantic and keyword search.
 * Returns ResultAsync instead of throwing.
 */
export function hybridSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): ResultAsync<SearchOutput, AppError> {
  // If query is empty or whitespace-only, fall back to keyword search
  // which handles empty queries by returning all recipes with filters
  if (!query || query.trim().length === 0) {
    return keywordSearch(query, filters, limit, offset);
  }

  // Check if we have embeddings capability
  if (!env.ENABLE_HOSTED_EMBEDDINGS) {
    return keywordSearch(query, filters, limit, offset);
  }

  // Try hybrid (semantic + keyword), fall back to keyword-only on error
  return ResultAsync.fromPromise(hybridSearchImpl(query, filters, limit, offset), (error) =>
    toAppError(thrownValueSchema.parse(error)),
  ).orElse(() => {
    // Fall back to keyword search if hybrid fails
    return keywordSearch(query, filters, limit, offset);
  });
}

/** Internal implementation for hybrid search */
async function hybridSearchImpl(
  query: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<SearchOutput> {
  // Run both searches, awaiting their ResultAsync values
  const [semanticResult, keywordResult] = await Promise.all([
    semanticSearch(query, filters, limit * 2, 0),
    keywordSearch(query, filters, limit * 2, 0),
  ]);

  // If keyword search failed, propagate the error
  if (keywordResult.isErr()) {
    throw keywordResult.error;
  }

  // If semantic failed, just use keyword results
  if (semanticResult.isErr()) {
    console.error("Semantic search failed, using keyword only:", semanticResult.error);

    return keywordResult.value;
  }

  const semanticResults = semanticResult.value;
  const keywordResults = keywordResult.value;

  // Reciprocal Rank Fusion
  const scores = new Map<string, ScoredRecipe>();

  // Add semantic results with RRF scores
  for (const [index, result] of semanticResults.results.entries()) {
    const rrf = 1 / (60 + index); // k=60 is a common constant
    scores.set(result.recipe.id, {
      recipe: result.recipe,
      score: rrf,
      highlights: result.highlights,
    });
  }

  // Add keyword results with RRF scores
  for (const [index, result] of keywordResults.results.entries()) {
    const rrf = 1 / (60 + index);
    const existing = scores.get(result.recipe.id);

    if (existing) {
      existing.score += rrf;

      if (result.highlights) {
        existing.highlights = [...(existing.highlights ?? []), ...result.highlights];
      }
    } else {
      scores.set(result.recipe.id, {
        recipe: result.recipe,
        score: rrf,
        highlights: result.highlights,
      });
    }
  }

  // Sort by combined score and return top results
  const combined = Array.from(scores.values())
    .toSorted((a, b) => b.score - a.score)
    .slice(offset, offset + limit);

  return {
    results: combined,
    total: scores.size,
  };
}

/**
 * Generate highlight snippets for search results
 */
function generateHighlights(recipe: RecipeWithRelations, query: string): string[] {
  const highlights: string[] = [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  // Check title
  if (terms.some((term) => recipe.title.toLowerCase().includes(term))) {
    highlights.push(recipe.title);
  }

  // Check description
  const description = recipe.description;

  if (description && terms.some((term) => description.toLowerCase().includes(term))) {
    highlights.push(description.slice(0, 150) + (description.length > 150 ? "..." : ""));
  }

  // Check ingredients
  for (const ing of recipe.ingredients ?? []) {
    if (terms.some((term) => ing.name.toLowerCase().includes(term))) {
      highlights.push(`Ingredient: ${ing.name}`);
    }
  }

  return highlights.slice(0, 3);
}

/**
 * Get filter options from the database.
 * Returns ResultAsync instead of throwing.
 */
export function getFilterOptions(): ResultAsync<FilterOptions, AppError> {
  return ResultAsync.fromPromise(getFilterOptionsImpl(), (error) =>
    error instanceof DatabaseError ? error : toAppError(thrownValueSchema.parse(error)),
  );
}

/** Internal throwing implementation for getFilterOptions */
async function getFilterOptionsImpl() {
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
      cuisines: cuisines.flatMap((item) =>
        item.cuisine === null ? [] : [{ value: item.cuisine, count: item["_count"] }],
      ),
      courses: courses.flatMap((item) =>
        item.course === null ? [] : [{ value: item.course, count: item["_count"] }],
      ),
      difficulties: difficulties.map((d) => ({
        value: d.difficulty,
        count: d["_count"],
      })),
      tags: tags.map((t) => ({
        value: t.name,
        slug: t.slug,
        count: t["_count"].recipes,
      })),
      maxTotalTime: maxTime["_max"].totalTime ?? 120,
    };
  } catch (error) {
    throw new DatabaseError("fetch filter options", String(error));
  }
}
