ALTER TABLE "Recipe" ADD COLUMN "saveKey" TEXT;
CREATE UNIQUE INDEX "Recipe_saveKey_key" ON "Recipe"("saveKey");
