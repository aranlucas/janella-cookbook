"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            priority={priority}
            className="transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
          {recipe.isFavorite && (
            <div className="absolute top-2 right-2 z-10">
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
