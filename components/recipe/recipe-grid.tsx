"use client";

import { RecipeCard } from "./recipe-card";
import {
  ContentEmptyState,
  RecipeGridSkeleton,
} from "@/components/ui/content-state";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeGridProps {
  recipes: RecipeWithRelations[];
  isLoading?: boolean;
}

export function RecipeGrid({ recipes, isLoading }: RecipeGridProps) {
  if (isLoading) {
    return <RecipeGridSkeleton count={10} />;
  }

  if (recipes.length === 0) {
    return (
      <ContentEmptyState
        icon="📚"
        title="No recipes yet"
        description="Start building your cookbook by adding your first recipe!"
        actionHref="/recipes/new"
        actionLabel="Add Your First Recipe"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 gap-y-4 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {recipes.map((recipe, index) => (
        <div
          key={recipe.id}
          className="animate-in duration-700 fill-mode-both fade-in slide-in-from-bottom-8"
          style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
        >
          <RecipeCard recipe={recipe} priority={index < 4} />
        </div>
      ))}
    </div>
  );
}
