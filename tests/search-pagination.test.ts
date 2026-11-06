// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { errAsync } from "neverthrow";
import { ExternalApiError } from "@/lib/errors";

const db = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { recipe: db } }));
vi.mock("@/lib/embeddings", () => ({
  enhanceSearchQuery: (query: string) => query,
  generateEmbedding: () => errAsync(new ExternalApiError("fixture", "offline")),
}));
import { hybridSearch } from "@/lib/search";

beforeEach(() => {
  vi.clearAllMocks();
  const recipes = Array.from({ length: 7 }, (_, index) => ({
    id: String(index),
    title: `Soup ${index}`,
    description: null,
    ingredients: [],
  }));
  db.findMany.mockImplementation(async ({ skip, take }: { skip: number; take: number }) =>
    recipes.slice(skip, skip + take),
  );
  db.count.mockResolvedValue(7);
});

// Seven ordered matches: page two of size two must contain positions 2 and 3.
test("provider failure preserves keyword page size, offset and full total", async () => {
  const result = await hybridSearch("Soup", {}, 2, 2);
  expect(result.isOk()).toBe(true);
  if (result.isErr()) throw result.error;
  expect(result.value.results.map(({ recipe }) => recipe.id)).toEqual(["2", "3"]);
  expect(result.value.total).toBe(7);
});

test("provider failure preserves an empty page beyond the collection", async () => {
  const result = await hybridSearch("Soup", {}, 2, 10);
  if (result.isErr()) throw result.error;
  expect(result.value.results).toEqual([]);
  expect(result.value.total).toBe(7);
});
