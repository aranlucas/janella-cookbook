CREATE INDEX "Recipe_createdAt_id_idx" ON "Recipe"("createdAt" DESC, "id" DESC);
CREATE INDEX "RecipeImage_recipeId_idx" ON "RecipeImage"("recipeId");
