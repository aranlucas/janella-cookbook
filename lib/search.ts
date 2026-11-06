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
  FilterOptions,
} from "@/types/recipe";
import { Prisma } from "@prisma/client";

type SearchOutput = { results: SearchResult[]; total: number };

interface SemanticSearchRow {
  id: string;
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

function buildFilterConditions(filters: SearchFilters): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`r.embedding IS NOT NULL`];

  if (filters.cuisine && filters.cuisine.length > 0) {
    const safeCuisines = filters.cuisine.filter((c) => /^[\w\s-]+$/i.test(c));

    if (safeCuisines.length > 0) {
      conditions.push(Prisma.sql`r.cuisine IN (${Prisma.join(safeCuisines)})`);
    }
  }

  if (filters.course && filters.course.length > 0) {
    conditions.push(Prisma.sql`r.course::text IN (${Prisma.join(filters.course)})`);
  }

  if (filters.difficulty && filters.difficulty.length > 0) {
    conditions.push(Prisma.sql`r.difficulty::text IN (${Prisma.join(filters.difficulty)})`);
  }

  if (filters.maxTime !== undefined && filters.maxTime > 0) {
    const maxTime = Math.floor(Math.abs(filters.maxTime));
    conditions.push(Prisma.sql`r."totalTime" <= ${maxTime}`);
  }

  if (filters.isFavorite !== undefined) {
    conditions.push(Prisma.sql`r."isFavorite" = ${filters.isFavorite}`);
  }

  return conditions;
}

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

async function semanticSearchWithEmbedding(
  queryEmbedding: readonly number[],
  query: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<SearchOutput> {
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  const conditions = buildFilterConditions(filters);
  const whereClause = Prisma.join(conditions, " AND ");

  let results: SemanticSearchRow[];

  try {
    results = await prisma.$queryRaw`
      SELECT * FROM (
        SELECT
          r.id,
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

  const recipes = results.length
    ? await prisma.recipe.findMany({
        where: { id: { in: results.map((result) => result.id) } },
        include: recipeRelations,
        omit: { saveKey: true },
      })
    : [];

  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const enrichedResults: SearchResult[] = results.flatMap(({ id, similarity }) => {
    const recipe = recipesById.get(id);

    return recipe
      ? [{ recipe, score: similarity, highlights: generateHighlights(recipe, query) }]
      : [];
  });

  return { results: enrichedResults, total };
}

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

async function keywordSearchImpl(
  query: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<SearchOutput> {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const filterConditions: Prisma.RecipeWhereInput[] = [
    ...(filters.cuisine?.length ? [{ cuisine: { in: [...filters.cuisine] } }] : []),
    ...(filters.course?.length ? [{ course: { in: [...filters.course] } }] : []),
    ...(filters.difficulty?.length ? [{ difficulty: { in: [...filters.difficulty] } }] : []),
    ...(filters.maxTime ? [{ totalTime: { lte: filters.maxTime } }] : []),
    ...(filters.isFavorite !== undefined ? [{ isFavorite: filters.isFavorite }] : []),
  ];

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
        omit: { saveKey: true },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.recipe.count({ where }),
    ]);

    const results: SearchResult[] = recipes.map((recipe) => {
      return {
        recipe,
        score: 0.5, // Default score for keyword matches
        highlights: generateHighlights(recipe, query),
      };
    });

    return { results, total };
  } catch (error) {
    throw new DatabaseError("keyword search", String(error));
  }
}

export function hybridSearch(
  query: string,
  filters: SearchFilters = {},
  limit = 20,
  offset = 0,
): ResultAsync<SearchOutput, AppError> {
  if (!query || query.trim().length === 0) {
    return keywordSearch(query, filters, limit, offset);
  }

  return ResultAsync.fromPromise(hybridSearchImpl(query, filters, limit, offset), (error) =>
    toAppError(thrownValueSchema.parse(error)),
  ).orElse(() => {
    return keywordSearch(query, filters, limit, offset);
  });
}

async function hybridSearchImpl(
  query: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
): Promise<SearchOutput> {
  const [semanticResult, keywordResult] = await Promise.all([
    semanticSearch(query, filters, limit * 2, 0),
    keywordSearch(query, filters, limit * 2, 0),
  ]);

  if (keywordResult.isErr()) {
    throw keywordResult.error;
  }

  if (semanticResult.isErr()) {
    console.error("Semantic search failed, using keyword only:", semanticResult.error);

    return keywordResult.value;
  }

  const semanticResults = semanticResult.value;
  const keywordResults = keywordResult.value;

  const scores = new Map<string, ScoredRecipe>();

  for (const [index, result] of semanticResults.results.entries()) {
    const rrf = 1 / (60 + index); // k=60 is a common constant
    scores.set(result.recipe.id, {
      recipe: result.recipe,
      score: rrf,
      highlights: result.highlights,
    });
  }

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

  const combined = Array.from(scores.values())
    .toSorted((a, b) => b.score - a.score)
    .slice(offset, offset + limit);

  return {
    results: combined,
    total: scores.size,
  };
}

function generateHighlights(recipe: RecipeWithRelations, query: string): string[] {
  const highlights: string[] = [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (terms.some((term) => recipe.title.toLowerCase().includes(term))) {
    highlights.push(recipe.title);
  }

  const description = recipe.description;

  if (description && terms.some((term) => description.toLowerCase().includes(term))) {
    highlights.push(description.slice(0, 150) + (description.length > 150 ? "..." : ""));
  }

  for (const ing of recipe.ingredients ?? []) {
    if (terms.some((term) => ing.name.toLowerCase().includes(term))) {
      highlights.push(`Ingredient: ${ing.name}`);
    }
  }

  return highlights.slice(0, 3);
}

export function getFilterOptions(): ResultAsync<FilterOptions, AppError> {
  return ResultAsync.fromPromise(getFilterOptionsImpl(), (error) =>
    error instanceof DatabaseError ? error : toAppError(thrownValueSchema.parse(error)),
  );
}

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
