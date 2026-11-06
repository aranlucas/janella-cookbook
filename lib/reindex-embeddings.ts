import type { ResultAsync } from "neverthrow";
import type { ExternalApiError } from "./errors";
import { prisma } from "./prisma";
import { embeddingSpace, generateEmbedding } from "./embeddings";
import { persistRecipeEmbedding } from "./embedding-index";

interface Candidate {
  readonly id: string;
  readonly searchText: string;
}

interface EmbeddingReindexDependencies {
  readonly findCandidates: (limit: number) => Promise<Candidate[]>;
  readonly generateEmbedding: (text: string) => ResultAsync<number[], ExternalApiError>;
  readonly persistEmbedding: (
    id: string,
    vector: readonly number[],
    text: string,
  ) => Promise<number>;
}

function findCandidates(limit: number): Promise<Candidate[]> {
  return prisma.$queryRaw<Candidate[]>`
    SELECT r.id, r."searchText" FROM "Recipe" r
    LEFT JOIN "RecipeEmbedding" e
      ON e."recipeId" = r.id AND e.space = ${embeddingSpace}
      AND e."searchText" = r."searchText"
    WHERE r."searchText" IS NOT NULL AND btrim(r."searchText") <> ''
      AND e."recipeId" IS NULL
    ORDER BY r.id
    LIMIT ${limit}
  `;
}

/** Bounded and resumable: only missing/stale rows are selected; no legacy vectors are deleted. */
export function createEmbeddingReindexer(dependencies: Readonly<EmbeddingReindexDependencies>) {
  return async function reindex(limit: number, write = false) {
    const candidates = await dependencies.findCandidates(limit);
    let indexed = 0;
    let stale = 0;

    if (write) {
      for (const recipe of candidates) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- Bound provider load and stop on the first failure.
        const result = await dependencies.generateEmbedding(recipe.searchText);

        if (result.isErr()) {
          throw result.error;
        }

        // oxlint-disable-next-line eslint/no-await-in-loop -- Persist each success before requesting the next vector.
        const changed = await dependencies.persistEmbedding(
          recipe.id,
          result.value,
          recipe.searchText,
        );

        indexed += changed;
        stale += changed === 0 ? 1 : 0;
      }
    }

    return { space: embeddingSpace, candidates: candidates.length, indexed, stale, dryRun: !write };
  };
}

export const reindexRecipeEmbeddings = createEmbeddingReindexer({
  findCandidates,
  generateEmbedding,
  persistEmbedding: persistRecipeEmbedding,
});
