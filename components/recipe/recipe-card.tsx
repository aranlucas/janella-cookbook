"use client";

import Link from "next/link";
import { Clock, Heart } from "lucide-react";
import { RecipeImage } from "@/components/ui/recipe-image";
import { cn, formatMinutes } from "@/lib/utils";
import type { Difficulty, RecipeWithRelations } from "@/types/recipe";

interface RecipeCardProps {
  readonly recipe: RecipeWithRelations;
  readonly className?: string;
  readonly priority?: boolean;
  /** "feature" is the oversized lead card on the home page */
  readonly variant?: "default" | "feature";
}

const difficultyLabel: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
  EXPERT: "Expert",
};

export function RecipeCard({
  recipe,
  className,
  priority = false,
  variant = "default",
}: RecipeCardProps) {
  const isFeature = variant === "feature";

  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl bg-muted",
          isFeature ? "aspect-4/3 lg:aspect-auto lg:flex-1" : "aspect-4/3",
        )}
      >
        {recipe.imageUrl ? (
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            priority={priority}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-103"
            sizes={
              isFeature
                ? "(max-width: 1024px) 100vw, 50vw"
                : "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            }
            fallbackEmoji="🍲"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-card font-display text-7xl font-semibold text-primary/25 transition-colors group-hover:text-primary/40 sm:text-8xl"
          >
            {recipe.title.trim().charAt(0).toUpperCase()}
          </span>
        )}
        {recipe.isFavorite && (
          <span className="absolute inset-e-2.5 inset-bs-2.5 z-20 flex size-8 items-center justify-center rounded-full bg-background/90 text-primary backdrop-blur-sm">
            <Heart className="size-4 fill-current" aria-hidden="true" />
            <span className="sr-only">Favorite</span>
          </span>
        )}
      </div>

      <div className={cn("flex flex-col pbs-2.5", isFeature && "pbs-3")}>
        <h3
          className={cn(
            "font-display leading-tight font-semibold text-foreground transition-colors group-hover:text-primary",
            isFeature ? "text-2xl sm:text-3xl" : "line-clamp-2 text-lg sm:text-xl",
          )}
        >
          {recipe.title}
        </h3>

        {isFeature && recipe.description && (
          <p className="mbs-2 line-clamp-2 max-w-xl text-base text-muted-foreground">
            {recipe.description}
          </p>
        )}

        <div className="mbs-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {recipe.totalTime ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {formatMinutes(recipe.totalTime)}
            </span>
          ) : null}
          {recipe.difficulty && <span>{difficultyLabel[recipe.difficulty]}</span>}
          {isFeature && recipe.cuisine && <span>{recipe.cuisine}</span>}
        </div>
      </div>
    </Link>
  );
}
