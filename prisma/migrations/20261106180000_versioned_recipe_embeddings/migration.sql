-- Additive migration: keep legacy 768-dimensional vectors for rollback.
-- Do not label existing vectors with a model family that cannot be verified.
CREATE TABLE "RecipeEmbedding" (
    "recipeId" TEXT NOT NULL,
    "space" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    CONSTRAINT "RecipeEmbedding_pkey" PRIMARY KEY ("recipeId", "space"),
    CONSTRAINT "RecipeEmbedding_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
