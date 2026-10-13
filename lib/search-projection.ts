import { ResultAsync } from "neverthrow";
import { toAppError, thrownValueSchema, type AppError } from "@/lib/errors";
import type { RecipeEmbeddingInput } from "@/lib/embeddings";

export interface RecipeSearchProjectionInput extends RecipeEmbeddingInput {
  readonly id: string;
  readonly searchText?: string | null;
}

interface RecipeSearchProjectionDependencies<Transaction> {
  readonly generateSearchText: (recipe: Readonly<RecipeEmbeddingInput>) => string;
  readonly generateEmbedding: (searchText: string) => ResultAsync<readonly number[], AppError>;
  readonly invalidate: (
    transaction: Readonly<Transaction>,
    recipeId: string,
    searchText: string,
  ) => Promise<number>;
  readonly persistEmbedding: (
    recipeId: string,
    embedding: readonly number[],
    searchText: string,
  ) => Promise<number>;
}

export function createRecipeSearchProjection<Transaction>(
  dependencies: Readonly<RecipeSearchProjectionDependencies<Transaction>>,
) {
  async function update<Recipe extends Readonly<RecipeSearchProjectionInput>>(
    transaction: Readonly<Transaction>,
    recipe: Recipe,
  ) {
    const searchText = dependencies.generateSearchText(recipe);
    const searchTextChanged = searchText !== recipe.searchText;

    if (searchTextChanged) {
      await dependencies.invalidate(transaction, recipe.id, searchText);
    }

    return {
      recipe: { ...recipe, searchText },
      searchTextChanged,
    };
  }

  function embeddingJob(recipeId: string, searchText: string) {
    return async function generateAndPersistEmbedding() {
      await dependencies
        .generateEmbedding(searchText)
        .andThen((embedding) =>
          ResultAsync.fromPromise(
            dependencies.persistEmbedding(recipeId, embedding, searchText),
            (error) => toAppError(thrownValueSchema.parse(error)),
          ),
        )
        .match(
          () => {},
          (error) => console.error("Background embedding generation failed:", error),
        );
    };
  }

  return { update, embeddingJob };
}
