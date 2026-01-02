"use client";

import { useState } from "react";
import { RecipeActions } from "@/components/recipe/recipe-actions";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeActionsClientProps {
  recipe: RecipeWithRelations;
}

export function RecipeActionsClient({ recipe: initialRecipe }: RecipeActionsClientProps) {
  const [recipe, setRecipe] = useState(initialRecipe);

  return (
    <RecipeActions
      recipe={recipe}
      onUpdate={(updated) => setRecipe(updated)}
    />
  );
}
