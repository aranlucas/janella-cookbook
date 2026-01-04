"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeCardProps {
  recipe: RecipeWithRelations;
  className?: string;
}

export function RecipeCard({ recipe, className }: RecipeCardProps) {
  const difficultyColor = {
    EASY: "bg-sage text-warm-white",
    MEDIUM: "bg-butter text-charcoal",
    HARD: "bg-terracotta text-warm-white",
    EXPERT: "bg-rust text-warm-white",
  };

  return (
    <Link href={`/recipe/${recipe.slug}`}>
      <Card
        className={cn(
          "group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-warm-white",
          className,
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-butter/30">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-6xl opacity-30">🍽️</span>
            </div>
          )}
          {recipe.isFavorite && (
            <div className="absolute right-2 top-2">
              <span className="text-2xl">❤️</span>
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <h3 className="font-serif text-lg font-semibold line-clamp-2 group-hover:text-terracotta transition-colors">
            {recipe.title}
          </h3>
        </CardHeader>
        <CardContent className="pt-0">
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {recipe.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {recipe.totalTime && (
              <span className="flex items-center gap-1">
                <span>⏱️</span>
                {recipe.totalTime} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <span>🍽️</span>
                {recipe.servings}
              </span>
            )}
            {recipe.difficulty && (
              <Badge
                variant="secondary"
                className={cn("text-xs", difficultyColor[recipe.difficulty])}
              >
                {recipe.difficulty.toLowerCase()}
              </Badge>
            )}
          </div>
          {recipe.cuisine && (
            <Badge variant="outline" className="mt-2 text-xs">
              {recipe.cuisine}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
