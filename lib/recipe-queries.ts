import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RecipeListInput } from "@/lib/validations";
import type { RecipeWithRelations } from "@/types/recipe";

export const recipeRelations = {
  ingredients: { orderBy: { sortOrder: "asc" } },
  instructions: { orderBy: { sortOrder: "asc" } },
  tags: true,
  images: true,
} satisfies Prisma.RecipeInclude;

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

type RecipeSummary = Prisma.RecipeGetPayload<{ select: typeof recipeSummarySelect }>;
type RecipeListOptions = Partial<RecipeListInput> & {
  orderBy?: Prisma.RecipeOrderByWithRelationInput | Prisma.RecipeOrderByWithRelationInput[];
};
interface RecipeList<T> {
  recipes: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// The app and MCP use identical filters and pagination, with different projections.
export function listRecipes(
  options: RecipeListOptions,
  view: "summary",
): Promise<RecipeList<RecipeSummary>>;
export function listRecipes(options?: RecipeListOptions): Promise<RecipeList<RecipeWithRelations>>;
export async function listRecipes(options: RecipeListOptions = {}, view?: "summary") {
  const { limit = 20, offset = 0 } = options;
  const where: Prisma.RecipeWhereInput = {};
  if (options.query) {
    where.OR = ["title", "description", "searchText"].map((field) => ({
      [field]: { contains: options.query, mode: "insensitive" },
    }));
  }
  if (options.cuisine) where.cuisine = { equals: options.cuisine, mode: "insensitive" };
  if (options.course) where.course = options.course;
  if (options.difficulty) where.difficulty = options.difficulty;
  if (options.tag) where.tags = { some: { slug: options.tag } };
  if (options.isFavorite !== undefined) where.isFavorite = options.isFavorite;
  if (options.maxTime !== undefined) where.totalTime = { lte: options.maxTime };

  const query = {
    where,
    take: limit,
    skip: offset,
    orderBy: options.orderBy ?? [{ createdAt: "desc" as const }, { id: "desc" as const }],
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
