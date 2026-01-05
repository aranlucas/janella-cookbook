"use client";

import { RecipeCard } from "./recipe-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
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
      <Empty className="py-20">
        <EmptyMedia variant="icon">
          <span className="text-4xl">📚</span>
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No recipes yet</EmptyTitle>
          <EmptyDescription>
            Start building your cookbook by adding your first recipe!
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/recipes/new"
            className={cn(
              buttonVariants({ variant: "terracotta" as any }),
              "rounded-full px-8",
            )}
          >
            Add Your First Recipe
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {recipes.map((recipe, index) => (
        <div
          key={recipe.id}
          className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both duration-700"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <RecipeCard recipe={recipe} priority={index < 4} />
        </div>
      ))}
    </div>
  );
}
