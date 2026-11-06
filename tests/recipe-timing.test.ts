// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: db,
    $transaction: async (run: (tx: { recipe: typeof db }) => unknown) => run({ recipe: db }),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/embeddings", () => ({ generateSearchText: vi.fn(), generateEmbedding: vi.fn() }));
vi.mock("@/lib/search-projection", () => ({
  createRecipeSearchProjection: () => ({
    update: async (_tx: unknown, recipe: unknown) => ({ recipe, searchTextChanged: false }),
  }),
}));
import { updateRecipe } from "@/lib/actions";

beforeEach(() => {
  vi.clearAllMocks();
  db.findUnique.mockResolvedValue({
    id: "recipe",
    slug: "soup",
    title: "Soup",
    prepTime: 10,
    cookTime: 20,
    totalTime: 30,
  });
  db.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "recipe",
    ...data,
  }));
});

// Explicit null clears a stored component; omission preserves the other component.
test.each([
  [{ prepTime: null }, 20],
  [{ cookTime: null }, 10],
  [{ prepTime: null, cookTime: null }, null],
  [{ prepTime: null, totalTime: 45 }, 45],
  [{ notes: "Keep the custom total" }, undefined],
] as const)("timing update %j writes total %s", async (input, totalTime) => {
  const result = await updateRecipe("recipe", input);
  expect(result.success).toBe(true);
  expect(db.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ totalTime }) }),
  );
});
