// @vitest-environment node

import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { persistRecipeEmbedding } from "@/lib/embedding-index";
import { hybridSearch, semanticSearch } from "@/lib/search";
import { reindexRecipeEmbeddings } from "@/lib/reindex-embeddings";

interface BackendPid {
  readonly pid: number;
}

interface BlockedWriter {
  readonly blocked: boolean;
}

interface StoredEmbedding {
  readonly searchText: string;
  readonly vector: string;
}

interface VectorDimensions {
  readonly dimensions: number;
}

// Requires an isolated pgvector database. CI opts in after applying the schema.
describe.skipIf(process.env.RUN_EMBEDDING_DB_TESTS !== "1")("versioned embedding database", () => {
  const cuisine = `embedding-test-${randomUUID()}`;
  const vector = Array.from({ length: 1024 }, () => 0.25);
  const legacy = Array.from({ length: 768 }, () => 0.25);
  let recipeId: string;

  beforeEach(async () => {
    const recipe = await prisma.recipe.create({
      data: {
        title: "Tomato toast",
        slug: randomUUID(),
        cuisine,
        sourceType: "MANUAL",
        searchText: "tomato toast",
      },
    });

    recipeId = recipe.id;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(() =>
        Promise.resolve(
          Response.json({
            model: "bge-m3",
            data: [{ index: 0, embedding: vector }],
          }),
        ),
      ),
    );
  });

  afterEach(async () => {
    await prisma.recipe.deleteMany({ where: { cuisine } });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("never searches unversioned legacy vectors or another model's 768-dimensional vectors", async () => {
    await prisma.$executeRaw`UPDATE "Recipe" SET embedding = ${`[${legacy.join(",")}]`}::vector WHERE id = ${recipeId}`;
    await prisma.$executeRaw`
      INSERT INTO "RecipeEmbedding" ("recipeId", space, "searchText", embedding)
      VALUES (${recipeId}, 'embeddinggemma-300m:v1', 'tomato toast', ${`[${legacy.join(",")}]`}::vector)
    `;
    expect((await semanticSearch("tomato", { cuisine: [cuisine] }))._unsafeUnwrap().total).toBe(0);
    await persistRecipeEmbedding(recipeId, vector, "tomato toast");
    const result = (await semanticSearch("tomato", { cuisine: [cuisine] }))._unsafeUnwrap();
    expect(result.total).toBe(1);
    expect(result.results[0].recipe.id).toBe(recipeId);

    const oldRows = await prisma.$queryRaw<VectorDimensions[]>`
      SELECT vector_dims(embedding) AS dimensions FROM "Recipe" WHERE id = ${recipeId}
    `;

    expect(oldRows[0].dimensions).toBe(768);
  });

  test("ignores stale indexed text after an old or new app instance edits the recipe", async () => {
    await persistRecipeEmbedding(recipeId, vector, "tomato toast");
    await prisma.recipe.update({ where: { id: recipeId }, data: { searchText: "potato soup" } });
    expect(await persistRecipeEmbedding(recipeId, vector, "tomato toast")).toBe(0);
    expect((await semanticSearch("tomato", { cuisine: [cuisine] }))._unsafeUnwrap().total).toBe(0);
    await persistRecipeEmbedding(recipeId, vector, "potato soup");
    expect((await semanticSearch("potato", { cuisine: [cuisine] }))._unsafeUnwrap().total).toBe(1);
  });

  test.skipIf(process.env.RUN_EMBEDDING_CONCURRENCY_TESTS !== "1")(
    "an old writer blocked by a concurrent edit cannot overwrite the newer embedding",
    async () => {
      await persistRecipeEmbedding(recipeId, vector, "tomato toast");
      const editor = new Client({ connectionString: process.env.DATABASE_URL });
      const observer = new Client({ connectionString: process.env.DATABASE_URL });
      await editor.connect();
      await observer.connect();
      let oldWriter = Promise.resolve(0);

      try {
        const { rows } = await editor.query<BackendPid>("SELECT pg_backend_pid() AS pid");
        await editor.query("BEGIN");
        await editor.query('UPDATE "Recipe" SET "searchText" = $1 WHERE id = $2', [
          "new toast",
          recipeId,
        ]);
        await editor.query(
          'UPDATE "RecipeEmbedding" SET "searchText" = $1, embedding = $2::vector WHERE "recipeId" = $3 AND space = $4',
          ["new toast", JSON.stringify(vector.map(() => 0.5)), recipeId, "bge-m3:v1"],
        );
        oldWriter = Promise.resolve(persistRecipeEmbedding(recipeId, vector, "tomato toast"));

        // Observe the actual lock wait rather than assuming a fixed delay schedules the writer.
        await vi.waitFor(
          async () => {
            const status = await observer.query<BlockedWriter>(
              "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid)) AND query LIKE '%RecipeEmbedding%' AND pid <> pg_backend_pid()) AS blocked",
              [rows[0].pid],
            );

            expect(status.rows[0].blocked).toBe(true);
          },
          { timeout: 5000, interval: 25 },
        );
        await editor.query("COMMIT");
        expect(await oldWriter).toBe(0);

        const stored = await observer.query<StoredEmbedding>(
          'SELECT "searchText", embedding::text AS vector FROM "RecipeEmbedding" WHERE "recipeId" = $1 AND space = $2',
          [recipeId, "bge-m3:v1"],
        );

        expect(stored.rows[0].searchText).toBe("new toast");
        expect(JSON.parse(stored.rows[0].vector)).toEqual(vector.map(() => 0.5));
      } finally {
        await editor.query("ROLLBACK");
        await Promise.allSettled([oldWriter]);
        await editor.end();
        await observer.end();
      }
    },
  );

  test("provider failure retains keyword search", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ error: { message: "Unavailable" } }, { status: 503 })),
    );
    const result = (await hybridSearch("tomato", { cuisine: [cuisine] }))._unsafeUnwrap();
    expect(result.results.map(({ recipe }) => recipe.id)).toContain(recipeId);
  });

  test("backfill is dry by default and resumes without re-embedding completed recipes", async () => {
    // This database is isolated; other suites do not create recipes while this test runs.
    const dry = await reindexRecipeEmbeddings(10000);
    expect(dry.indexed).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    await reindexRecipeEmbeddings(10000, true);
    const calls = vi.mocked(fetch).mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    await reindexRecipeEmbeddings(10000, true);
    expect(fetch).toHaveBeenCalledTimes(calls);
    expect((await semanticSearch("tomato", { cuisine: [cuisine] }))._unsafeUnwrap().total).toBe(1);
  });
});
