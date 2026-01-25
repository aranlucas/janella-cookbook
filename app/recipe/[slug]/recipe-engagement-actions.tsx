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
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={recipe.isFavorite ? "default" : "outline"}
        size="lg"
        onClick={handleToggleFavorite}
        disabled={isFavoriting}
        className="group relative overflow-hidden transition-all hover:scale-105"
      >
        <Heart
          className={`mr-2 h-5 w-5 transition-transform group-hover:scale-110 ${
            recipe.isFavorite ? "fill-current" : ""
          }`}
        />
        <span className="font-medium">
          {recipe.isFavorite ? "Favorited" : "Add to Favorites"}
        </span>
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={handleMarkCooked}
        disabled={isCooking}
        className="group relative overflow-hidden transition-all hover:scale-105"
      >
        <ChefHat className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
        <span className="font-medium">I Made This</span>
        {(recipe.cookCount || 0) > 0 && (
          <span className="bg-terracotta text-cream ml-2 rounded-full px-2 py-0.5 text-xs font-semibold">
            {recipe.cookCount}
          </span>
        )}
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={handleChatWithRecipe}
        className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white transition-all hover:scale-105 hover:from-orange-600 hover:to-orange-700"
      >
        <MessageCircle className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
        <span className="font-medium">Chat with Recipe</span>
      </Button>
    </div>
  );
}
