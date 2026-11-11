// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { errAsync } from "neverthrow";
import { ExternalApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import * as embeddings from "@/lib/embeddings";
import { browseRecipes } from "@/lib/recipe-browse";
import { recipeCategorySchema } from "@/lib/validations";
import { makeRecipe } from "./fixtures/recipe";

afterEach(() => vi.restoreAllMocks());

// The category index counts recipes with groupBy on course/cuisine, so its links
// must browse those exact rows rather than recipes that merely mention the word.
function spyOnRecipeQueries(total: number) {
  const embedding = vi
    .spyOn(embeddings, "generateEmbedding")
    .mockImplementation(() => errAsync(new ExternalApiError("fixture", "must not be called")));

  const findMany = vi
    .spyOn(prisma.recipe, "findMany")
    .mockResolvedValue([makeRecipe({ id: "side", course: "SIDE" })]);

  const count = vi.spyOn(prisma.recipe, "count").mockResolvedValue(total);

  return { embedding, findMany, count };
}

describe("browsing a category", () => {
  test("a course link filters by course instead of searching recipe text", async () => {
    const { embedding, findMany, count } = spyOnRecipeQueries(3);

    const result = await browseRecipes({ category: "side", page: 1, sort: "recent" });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { course: "SIDE" } }));
    expect(count).toHaveBeenCalledWith({ where: { course: "SIDE" } });
    expect(embedding).not.toHaveBeenCalled();
    expect(result.total).toBe(3);
    expect(result.recipes.map(({ id }) => id)).toEqual(["side"]);
  });

  test("a cuisine link matches the stored cuisine case-insensitively", async () => {
    const { embedding, findMany } = spyOnRecipeQueries(1);

    await browseRecipes({ category: "italian", page: 1, sort: "recent" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cuisine: { equals: "italian", mode: "insensitive" } } }),
    );
    expect(embedding).not.toHaveBeenCalled();
  });

  test("sorting and pagination apply across the whole category", async () => {
    const { findMany } = spyOnRecipeQueries(25);

    await browseRecipes({ category: "dessert", page: 2, sort: "title" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { course: "DESSERT" },
        orderBy: { title: "asc" },
        take: 20,
        skip: 20,
      }),
    );
  });

  test("an invalid category returns no recipes without querying", async () => {
    const { findMany } = spyOnRecipeQueries(0);

    const result = await browseRecipes({ category: "x".repeat(101), page: 1, sort: "recent" });

    expect(result).toEqual({ recipes: [], total: 0 });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("recipeCategorySchema", () => {
  test.each([
    ["dessert", { course: "DESSERT" }],
    [" DESSERT ", { course: "DESSERT" }],
    ["créole", { cuisine: "créole" }],
    ["italian, american", { cuisine: "italian, american" }],
  ])("resolves %j", (category, expected) => {
    expect(recipeCategorySchema.parse(category)).toEqual(expected);
  });

  test("rejects a blank category", () => {
    expect(recipeCategorySchema.safeParse("   ").success).toBe(false);
  });
});
