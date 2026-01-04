"use client";

import { RecipeCard } from "./recipe-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeGridProps {
  recipes: RecipeWithRelations[];
  isLoading?: boolean;
}

export function RecipeGrid({ recipes, isLoading }: RecipeGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="mb-4 text-6xl">📚</span>
        <h3 className="mb-2 font-serif text-xl font-semibold">
          No recipes yet
        </h3>
        <p className="text-muted-foreground">
          Start building your cookbook by adding your first recipe!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {recipes.map((recipe, index) => (
        <div
          key={recipe.id}
          className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <RecipeCard recipe={recipe} priority={index < 4} />
        </div>
      ))}
    </div>
  );
}
