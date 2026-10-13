import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RecipeListInput } from "@/lib/validations";
import type { RecipeWithRelations } from "@/types/recipe";

export const recipeRelations = {
  ingredients: { orderBy: { sortOrder: "asc" } },
  instructions: { orderBy: { sortOrder: "asc" } },
  tags: true,
  images: true,
} as const satisfies Prisma.RecipeInclude;

const recipeSummarySelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  totalTime: true,
  servings: true,
  cuisine: true,
  course: true,
  difficulty: true,
  isFavorite: true,
  rating: true,
  tags: { select: { name: true, slug: true } },
} satisfies Prisma.RecipeSelect;

export type RecipeSummary = Prisma.RecipeGetPayload<{ select: typeof recipeSummarySelect }>;

type RecipeOrderBy = Readonly<Prisma.RecipeOrderByWithRelationInput>;

export type RecipeListOptions = Readonly<Partial<RecipeListInput>> & {
  readonly orderBy?: RecipeOrderBy | readonly RecipeOrderBy[];
};

function isOrderByList(
  value: RecipeOrderBy | readonly RecipeOrderBy[] | undefined,
): value is readonly RecipeOrderBy[] {
  return Array.isArray(value);
}

export interface RecipeList<T> {
  readonly recipes: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

// The app and MCP use identical filters and pagination, with different projections.
export function listRecipes(
  options: Readonly<RecipeListOptions>,
  view: "summary",
): Promise<RecipeList<RecipeSummary>>;
export function listRecipes(
  options?: Readonly<RecipeListOptions>,
): Promise<RecipeList<RecipeWithRelations>>;
export async function listRecipes(
  options: Readonly<RecipeListOptions> = {},
  view?: "summary",
): Promise<RecipeList<RecipeSummary> | RecipeList<RecipeWithRelations>> {
  const { limit = 20, offset = 0 } = options;
  const where: Prisma.RecipeWhereInput = {};

  if (options.query) {
    where.OR = ["title", "description", "searchText"].map((field) => ({
      [field]: { contains: options.query, mode: "insensitive" },
    }));
  }

  if (options.cuisine) {
    where.cuisine = { equals: options.cuisine, mode: "insensitive" };
  }

  if (options.course) {
    where.course = options.course;
  }

  if (options.difficulty) {
    where.difficulty = options.difficulty;
  }

  if (options.tag) {
    where.tags = { some: { slug: options.tag } };
  }

  if (options.isFavorite !== undefined) {
    where.isFavorite = options.isFavorite;
  }

  if (options.maxTime !== undefined) {
    where.totalTime = { lte: options.maxTime };
  }

  const orderBy: Prisma.RecipeOrderByWithRelationInput | Prisma.RecipeOrderByWithRelationInput[] =
    options.orderBy === undefined
      ? [{ createdAt: "desc" as const }, { id: "desc" as const }]
      : isOrderByList(options.orderBy)
        ? options.orderBy.map((item) => ({ ...item }))
        : { ...options.orderBy };

  const query = {
    where,
    take: limit,
    skip: offset,
    orderBy,
  };

  const [recipes, total] = await Promise.all([
    view === "summary"
      ? prisma.recipe.findMany({ ...query, select: recipeSummarySelect })
      : prisma.recipe.findMany({ ...query, include: recipeRelations }),
    prisma.recipe.count({ where }),
  ]);

  return { recipes, total, limit, offset, hasMore: offset + recipes.length < total };
}

export function getRecipeBySlug(slug: string) {
  return prisma.recipe.findUnique({ where: { slug }, include: recipeRelations });
}
