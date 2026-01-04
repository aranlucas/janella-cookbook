"use client";

import Link from "next/link";
import { RecipeImage } from "@/components/ui/recipe-image";
import { cn } from "@/lib/utils";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeCardProps {
  recipe: RecipeWithRelations;
  className?: string;
  priority?: boolean;
}

export function RecipeCard({ recipe, className, priority = false }: RecipeCardProps) {
  const difficultyColor = {
    EASY: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
    MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
    HARD: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    EXPERT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };

  return (
    <Link href={`/recipe/${recipe.slug}`} className="group block h-full">
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl bg-card border-none shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:bg-card/40",
          className,
        )}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
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

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex items-center justify-between">
            {recipe.difficulty && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  difficultyColor[recipe.difficulty] || "bg-secondary text-secondary-foreground"
                )}
              >
                {recipe.difficulty}
              </span>
            )}
            {recipe.totalTime && (
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {recipe.totalTime}m
              </span>
            )}
          </div>

          <h3 className="mb-2 font-serif text-xl font-bold leading-tight text-card-foreground group-hover:text-primary transition-colors duration-300">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}

          <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground/80">
            {recipe.cuisine && (
              <span className="font-medium uppercase tracking-wider">{recipe.cuisine}</span>
            )}
            {recipe.servings && (
              <>
                <span>•</span>
                <span>{recipe.servings} servings</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
