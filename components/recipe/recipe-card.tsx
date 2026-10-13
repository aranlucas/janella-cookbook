"use client";

import Link from "next/link";
import { RecipeImage } from "@/components/ui/recipe-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeCardProps {
  readonly recipe: RecipeWithRelations;
  readonly className?: string;
  readonly priority?: boolean;
}

export function RecipeCard({ recipe, className, priority = false }: RecipeCardProps) {
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

  const servingsLabel = recipe.servings?.trim();

  const hasServingsLabel =
    servingsLabel && /serving/i.test(servingsLabel) ? servingsLabel : servingsLabel;

  return (
    <Link href={`/recipe/${recipe.slug}`} className="group block h-full">
      <div
        className={cn(
          "relative flex h-full min-h-79 flex-col overflow-hidden rounded-2xl border border-border/45 bg-card shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-xl",
          className,
        )}
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-linear-to-br from-muted/70 via-muted/50 to-muted/80">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            priority={priority}
            className="size-full object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            fallbackEmoji="🍲"
          />
          {!recipe.imageUrl && (
            <div className="pointer-events-none absolute inset-x-0 inset-be-0 bg-linear-to-t from-background/95 to-transparent px-3 py-2 text-center text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
              Photo coming soon
            </div>
          )}
          {recipe.isFavorite && (
            <div className="absolute inset-e-2 inset-bs-2 z-20 rounded-full bg-white/90 p-1 backdrop-blur-sm sm:inset-e-3 sm:inset-bs-3 sm:p-1.5">
              <span className="inline-block text-xs sm:text-sm">❤️</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="mbe-2 flex items-center justify-between gap-2">
            {recipe.difficulty && (
              <Badge
                variant={difficultyVariant[recipe.difficulty] || "secondary"}
                className="text-3xs font-bold tracking-wider uppercase"
              >
                <span className="me-0.5">{difficultyEmoji[recipe.difficulty]}</span>
                {recipe.difficulty}
              </Badge>
            )}
            {recipe.totalTime && (
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground/95">
                <span className="inline-block">⏱️</span>
                {recipe.totalTime}m
              </span>
            )}
          </div>

          <h3 className="mbe-1.5 line-clamp-2 min-h-11 font-serif text-base leading-tight font-bold text-card-foreground sm:min-h-12.5 sm:text-xl">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mbe-3 line-clamp-2 min-h-9 text-xs leading-relaxed text-muted-foreground/95 sm:min-h-11.5 sm:text-sm">
              {recipe.description}
            </p>
          )}

          <div className="mbs-auto flex items-end justify-between gap-2 text-3xs text-muted-foreground/95 sm:gap-3 sm:text-xs">
            {recipe.cuisine && (
              <Badge
                variant="outline"
                className="max-w-3/5 truncate border-border/60 bg-background/60 text-3xs font-medium tracking-wider uppercase"
                title={recipe.cuisine}
              >
                {recipe.cuisine}
              </Badge>
            )}
            {hasServingsLabel && (
              <span className="truncate text-end font-medium text-muted-foreground/90">
                {hasServingsLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
