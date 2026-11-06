import { prisma } from "./prisma";
import { embeddingSpace } from "./embeddings";

/** Keep each family's vectors separate and never attach a stale job to edited recipe text. */
export function persistRecipeEmbedding(
  recipeId: string,
  embedding: readonly number[],
  searchText: string,
): Promise<number> {
  return prisma.$executeRaw`
    WITH current_recipe AS (
      SELECT id FROM "Recipe"
      WHERE id = ${recipeId} AND "searchText" = ${searchText}
      FOR SHARE
    )
    INSERT INTO "RecipeEmbedding" ("recipeId", space, "searchText", embedding)
    SELECT id, ${embeddingSpace}, ${searchText}, ${`[${embedding.join(",")}]`}::vector
    FROM current_recipe
    ON CONFLICT ("recipeId", space) DO UPDATE
    SET "searchText" = EXCLUDED."searchText", embedding = EXCLUDED.embedding
  `;
}
