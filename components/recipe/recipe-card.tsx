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
          "group bg-warm-white overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg",
          className,
        )}
      >
        <div className="bg-butter/30 relative aspect-[4/3] overflow-hidden">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-6xl opacity-30">🍽️</span>
            </div>
          )}
          {recipe.isFavorite && (
            <div className="absolute top-2 right-2">
              <span className="text-2xl">❤️</span>
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <h3 className="group-hover:text-terracotta line-clamp-2 font-serif text-lg font-semibold transition-colors">
            {recipe.title}
          </h3>
        </CardHeader>
        <CardContent className="pt-0">
          {recipe.description && (
            <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
              {recipe.description}
            </p>
          )}
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
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
