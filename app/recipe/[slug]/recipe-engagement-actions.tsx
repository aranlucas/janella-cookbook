"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, ChefHat, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toggleFavorite, markAsCooked } from "@/lib/actions";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeEngagementActionsProps {
  recipe: RecipeWithRelations;
}

export function RecipeEngagementActions({
  recipe: initialRecipe,
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
      toast.success(
        result.data.isFavorite
          ? "Added to favorites"
          : "Removed from favorites",
      );
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

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <div className="flex gap-2 sm:contents">
        <Button
          variant={recipe.isFavorite ? "default" : "outline"}
          size="default"
          onClick={handleToggleFavorite}
          disabled={isFavoriting}
          className="group relative flex-1 overflow-hidden transition-all hover:scale-105 sm:size-auto sm:flex-initial"
        >
          <Heart
            className={`mr-1.5 h-4 w-4 transition-transform group-hover:scale-110 sm:mr-2 sm:h-5 sm:w-5 ${
              recipe.isFavorite ? "fill-current" : ""
            }`}
          />
          <span className="text-sm font-medium sm:text-base">
            {recipe.isFavorite ? "Favorited" : "Favorite"}
          </span>
        </Button>

        <Button
          variant="outline"
          size="default"
          onClick={handleMarkCooked}
          disabled={isCooking}
          className="group relative flex-1 overflow-hidden transition-all hover:scale-105 sm:size-auto sm:flex-initial"
        >
          <ChefHat className="mr-1.5 h-4 w-4 transition-transform group-hover:scale-110 sm:mr-2 sm:h-5 sm:w-5" />
          <span className="text-sm font-medium sm:text-base">I Made This</span>
          {(recipe.cookCount || 0) > 0 && (
            <span className="bg-primary text-primary-foreground ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:ml-2 sm:px-2 sm:text-xs">
              {recipe.cookCount}
            </span>
          )}
        </Button>
      </div>

      <Button
        variant="default"
        size="default"
        onClick={handleChatWithRecipe}
        className="group relative w-full overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white transition-all hover:scale-105 hover:from-orange-600 hover:to-orange-700 sm:w-auto"
      >
        <MessageCircle className="mr-1.5 h-4 w-4 transition-transform group-hover:scale-110 sm:mr-2 sm:h-5 sm:w-5" />
        <span className="text-sm font-medium sm:text-base">
          Chat with Recipe
        </span>
      </Button>
    </div>
  );
}
