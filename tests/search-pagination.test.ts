// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { errAsync } from "neverthrow";
import { ExternalApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import * as embeddings from "@/lib/embeddings";
import { hybridSearch } from "@/lib/search";
import { makeRecipe } from "./fixtures/recipe";

afterEach(() => vi.restoreAllMocks());

interface PageCase {
  readonly offset: number;
  readonly expectedIds: readonly string[];
}

// Seven ordered matches: page two contains positions 2 and 3; offset 10 is empty.
const pages: readonly PageCase[] = [
  { offset: 2, expectedIds: ["2", "3"] },
  { offset: 10, expectedIds: [] },
];

test.each(pages)(
  "provider failure preserves keyword page at offset $offset",
  async ({ offset, expectedIds }) => {
    const recipes = Array.from({ length: 7 }, (_, index) =>
      makeRecipe({ id: String(index), title: `Soup ${index}` }),
    );

    vi.spyOn(embeddings, "generateEmbedding").mockImplementation(() =>
      errAsync(new ExternalApiError("fixture", "offline")),
    );
    vi.spyOn(prisma.recipe, "findMany")
      .mockResolvedValueOnce(recipes.slice(0, 4))
      .mockResolvedValueOnce(recipes.slice(offset, offset + 2));
    vi.spyOn(prisma.recipe, "count").mockResolvedValue(7);

    const result = await hybridSearch("Soup", {}, 2, offset);

    expect(result.isOk()).toBe(true);

    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.results.map(({ recipe }) => recipe.id)).toEqual(expectedIds);
    expect(result.value.total).toBe(7);
    expect(prisma.recipe.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 2, skip: offset }),
    );
  },
);
