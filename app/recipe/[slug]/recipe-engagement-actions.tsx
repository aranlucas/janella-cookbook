"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, ChefHat, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toggleFavorite, markAsCooked } from "@/lib/actions";
import { AddToShoppingListButton } from "@/components/shopping/add-to-shopping-list-button";
import type { RecipeWithRelations } from "@/types/recipe";
import { cn } from "@/lib/utils";

interface RecipeEngagementActionsProps {
  readonly recipe: RecipeWithRelations;
  readonly className?: string;
}

export function RecipeEngagementActions({
  recipe: initialRecipe,
  className,
}: RecipeEngagementActionsProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState(initialRecipe);
  const [isFavoriting, startFavoriteTransition] = useTransition();
  const [isCooking, startCookTransition] = useTransition();

  const handleChatWithRecipe = () => {
    // Navigate to chat with recipe context
    const params = new URLSearchParams({
      recipe: recipe.slug,
      title: recipe.title,
    });

    router.push(`/chat?${params.toString()}`);
  };

  const handleToggleFavorite = () => {
    startFavoriteTransition(async () => {
      const result = await toggleFavorite(recipe.id, !recipe.isFavorite);

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      setRecipe(result.data);
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
    });
  };

  const handleMarkCooked = () => {
    startCookTransition(async () => {
      const result = await markAsCooked(recipe.id, recipe.cookCount || 0);

      if (!result.success) {
        toast.error(result.error);

        return;
      }

      setRecipe(result.data);
      toast.success("Recipe marked as cooked!");
    });
  };

  const cookCount = recipe.cookCount || 0;

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center", className)}>
      <Button
        onClick={handleMarkCooked}
        disabled={isCooking}
        size="lg"
        className="group gap-2 sm:px-4"
      >
        <ChefHat className="size-4 transition-transform group-hover:-rotate-12" />
        I Made This
        {cookCount > 0 && (
          <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs font-semibold tabular-nums">
            {cookCount}
          </span>
        )}
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={handleToggleFavorite}
        disabled={isFavoriting}
        aria-pressed={recipe.isFavorite}
        className={cn("gap-2 sm:px-4", recipe.isFavorite && "border-primary/40 text-primary")}
      >
        <Heart className={cn("size-4", recipe.isFavorite && "animate-heart-pop fill-current")} />
        {recipe.isFavorite ? "Favorited" : "Favorite"}
      </Button>

      <AddToShoppingListButton
        ingredients={recipe.ingredients}
        recipeTitle={recipe.title}
        recipeSlug={recipe.slug}
      />

      <Button variant="ghost" size="lg" onClick={handleChatWithRecipe} className="gap-2 sm:px-3">
        <MessageCircle className="size-4" />
        Ask AI
      </Button>
    </div>
  );
}
