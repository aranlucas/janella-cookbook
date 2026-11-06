import type { Prisma } from "@prisma/client";

export type RecipeFixture = Prisma.RecipeGetPayload<{
  include: { ingredients: true; instructions: true; tags: true; images: true };
}>;

export function makeRecipe(overrides: Partial<RecipeFixture> = {}): RecipeFixture {
  return {
    id: "recipe",
    title: "Soup",
    slug: "soup",
    saveKey: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    description: null,
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
    servings: null,
    difficulty: "MEDIUM",
    cuisine: null,
    course: null,
    sourceUrl: null,
    sourceType: "MANUAL",
    imageUrl: null,
    searchText: "Soup intermediate",
    notes: null,
    rating: null,
    isFavorite: false,
    cookCount: 0,
    lastCooked: null,
    ingredients: [],
    instructions: [],
    tags: [],
    images: [],
    ...overrides,
  };
}
