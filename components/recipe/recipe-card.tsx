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

  return (
    <Link href={`/recipe/${recipe.slug}`} className="group block h-full">
      <div
        className={cn(
          "bg-card dark:bg-card/40 relative flex h-full flex-col overflow-hidden rounded-2xl border-none shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl",
          className,
        )}
      >
        <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
          {/* Image Overlay for text readout if needed, or just grain */}
          <div className="absolute inset-0 z-10 bg-black/5 opacity-0 transition-opacity duration-500 group-hover:opacity-10 dark:bg-white/5" />

          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
          {recipe.isFavorite && (
            <div className="absolute top-3 right-3 z-20 rounded-full bg-white/90 p-1.5 shadow-sm backdrop-blur-sm transition-transform hover:scale-110">
              <span className="text-sm">❤️</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="mb-1 flex items-center justify-between">
            {recipe.difficulty && (
              <Badge
                variant={difficultyVariant[recipe.difficulty] || "secondary"}
                className="text-[9px] font-bold tracking-wider uppercase sm:text-[10px]"
              >
                {recipe.difficulty}
              </Badge>
            )}
            {recipe.totalTime && (
              <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium sm:text-xs">
                {recipe.totalTime}m
              </span>
            )}
          </div>

          <h3 className="text-card-foreground group-hover:text-primary mb-1 font-serif text-lg font-bold leading-tight transition-colors duration-300 sm:text-xl">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="text-muted-foreground mb-2 line-clamp-2 text-xs leading-relaxed sm:text-sm">
              {recipe.description}
            </p>
          )}

          <div className="text-muted-foreground/80 mt-auto flex items-center justify-between gap-2 text-[11px] sm:gap-3 sm:text-xs">
            {recipe.cuisine && (
              <Badge
                variant="outline"
                className="bg-background/50 border-border/50 text-[9px] font-medium tracking-wider uppercase sm:text-[10px]"
              >
                {recipe.cuisine}
              </Badge>
            )}
            {recipe.servings && (
              <>
                <span>•</span>
                <span className="truncate">{recipe.servings} servings</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
