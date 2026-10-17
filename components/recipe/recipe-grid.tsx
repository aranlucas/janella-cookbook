"use client";

import { RecipeCard } from "./recipe-card";
import { BookOpen } from "lucide-react";
import { EmptyState, RecipeGridSkeleton } from "@/components/layout/page-state";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeGridProps {
  readonly recipes: readonly RecipeWithRelations[];
  readonly isLoading?: boolean;
}

export function RecipeGrid({ recipes, isLoading }: RecipeGridProps) {
  if (isLoading) {
    return <RecipeGridSkeleton count={10} />;
  }

  if (recipes.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No recipes yet"
        description="Bring one in from a link, a photo, or your own notes."
        actionHref="/recipes/new"
        actionLabel="Add Your First Recipe"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-3 xl:grid-cols-4">
      {recipes.map((recipe, index) => (
        <RecipeCard key={recipe.id} recipe={recipe} priority={index < 4} />
      ))}
    </div>
  );
}
