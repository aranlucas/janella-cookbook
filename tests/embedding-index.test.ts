// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { errAsync, okAsync } from "neverthrow";
import { ExternalApiError } from "@/lib/errors";

import { createEmbeddingReindexer } from "@/lib/reindex-embeddings";

const mocks = { candidates: vi.fn(), generate: vi.fn(), persist: vi.fn() };

const reindexRecipeEmbeddings = createEmbeddingReindexer({
  findCandidates: mocks.candidates,
  generateEmbedding: mocks.generate,
  persistEmbedding: mocks.persist,
});

beforeEach(() => {
  mocks.candidates.mockResolvedValue([{ id: "one", searchText: "first recipe" }]);
  mocks.generate.mockReturnValue(okAsync([0.5]));
  mocks.persist.mockResolvedValue(1);
});

afterEach(() => vi.resetAllMocks());

describe("embedding backfill", () => {
  test("dry run makes no provider calls or writes", async () => {
    expect(await reindexRecipeEmbeddings(10)).toMatchObject({
      candidates: 1,
      indexed: 0,
      dryRun: true,
    });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  test("writes generated vectors with the original recipe text guard", async () => {
    expect(await reindexRecipeEmbeddings(10, true)).toMatchObject({ indexed: 1, stale: 0 });
    expect(mocks.generate).toHaveBeenCalledWith("first recipe");
    expect(mocks.persist).toHaveBeenCalledWith("one", [0.5], "first recipe");
  });

  test("counts concurrent edits as skipped instead of indexed", async () => {
    mocks.persist.mockResolvedValue(0);
    expect(await reindexRecipeEmbeddings(10, true)).toMatchObject({ indexed: 0, stale: 1 });
  });

  test("stops on provider failure without persisting invalid data or processing more recipes", async () => {
    mocks.candidates.mockResolvedValue([
      { id: "one", searchText: "first recipe" },
      { id: "two", searchText: "second recipe" },
    ]);
    mocks.generate.mockReturnValue(errAsync(new ExternalApiError("FreeLLMAPI", "unavailable")));
    await expect(reindexRecipeEmbeddings(10, true)).rejects.toThrow("unavailable");
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.persist).not.toHaveBeenCalled();
  });
});
