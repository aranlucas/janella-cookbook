"use client";

import Link from "next/link";
import { RecipeImage } from "@/components/ui/recipe-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeCardProps {
  recipe: RecipeWithRelations;
  className?: string;
  priority?: boolean;
}

export function RecipeCard({
  recipe,
  className,
  priority = false,
}: RecipeCardProps) {
  const difficultyVariant = {
    EASY: "secondary",
    MEDIUM: "default",
    HARD: "destructive",
    EXPERT: "destructive",
  } as const;

  const difficultyEmoji = {
    EASY: "🟢",
    MEDIUM: "🟡",
    HARD: "🔴",
    EXPERT: "💀",
  } as const;

  return (
    <Link href={`/recipe/${recipe.slug}`} className="block h-full">
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border-none bg-card dark:bg-card/40",
          className,
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            priority={priority}
            className="h-full w-full object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
          {recipe.isFavorite && (
            <div className="absolute top-2 right-2 z-20 rounded-full bg-white/90 p-1 backdrop-blur-sm sm:top-3 sm:right-3 sm:p-1.5">
              <span className="inline-block text-xs sm:text-sm">❤️</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="mb-1 flex items-center justify-between">
            {recipe.difficulty && (
              <Badge
                variant={difficultyVariant[recipe.difficulty] || "secondary"}
                className="text-[10px] font-bold tracking-wider uppercase"
              >
                <span className="mr-0.5">
                  {difficultyEmoji[recipe.difficulty]}
                </span>
                {recipe.difficulty}
              </Badge>
            )}
            {recipe.totalTime && (
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <span className="inline-block">⏱️</span>
                {recipe.totalTime}m
              </span>
            )}
          </div>

          <h3 className="mb-1 font-serif text-base leading-tight font-bold text-card-foreground sm:text-xl">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {recipe.description}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 text-[10px] text-muted-foreground/80 sm:gap-3 sm:text-xs">
            {recipe.cuisine && (
              <Badge
                variant="outline"
                className="border-border/50 bg-background/50 text-[10px] font-medium tracking-wider uppercase"
              >
                {recipe.cuisine}
              </Badge>
            )}
            {recipe.servings && (
              <>
                <span>·</span>
                <span>{recipe.servings} servings</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
