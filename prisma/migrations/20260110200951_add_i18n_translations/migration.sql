-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "RecipeTranslation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recipeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "servings" TEXT,
    "notes" TEXT,
    "searchText" TEXT,

    CONSTRAINT "RecipeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientTranslation" (
    "id" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "originalIngredientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "notes" TEXT,
    "group" TEXT,

    CONSTRAINT "IngredientTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructionTranslation" (
    "id" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "originalInstructionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "group" TEXT,

    CONSTRAINT "InstructionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recipe_locale_idx" ON "Recipe"("locale");

-- CreateIndex
CREATE INDEX "RecipeTranslation_locale_idx" ON "RecipeTranslation"("locale");

-- CreateIndex
CREATE INDEX "RecipeTranslation_recipeId_idx" ON "RecipeTranslation"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeTranslation_recipeId_locale_key" ON "RecipeTranslation"("recipeId", "locale");

-- CreateIndex
CREATE INDEX "IngredientTranslation_translationId_idx" ON "IngredientTranslation"("translationId");

-- CreateIndex
CREATE INDEX "InstructionTranslation_translationId_idx" ON "InstructionTranslation"("translationId");

-- AddForeignKey
ALTER TABLE "RecipeTranslation" ADD CONSTRAINT "RecipeTranslation_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientTranslation" ADD CONSTRAINT "IngredientTranslation_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "RecipeTranslation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructionTranslation" ADD CONSTRAINT "InstructionTranslation_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "RecipeTranslation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
