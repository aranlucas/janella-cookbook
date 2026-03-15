"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useShoppingList } from "@/components/providers/session-provider";
import type { Ingredient } from "@/types/recipe";
import { cn } from "@/lib/utils";

interface AddToShoppingListButtonProps {
  ingredients: Ingredient[];
  recipeTitle: string;
  recipeSlug: string;
  className?: string;
}

export function AddToShoppingListButton({
  ingredients,
  recipeTitle,
  recipeSlug,
  className,
}: AddToShoppingListButtonProps) {
  const { add } = useShoppingList();

  const handleAdd = () => {
    add(
      ingredients.map((ing) => ({
        name: ing.name,
        quantity: ing.quantity || undefined,
        unit: ing.unit || undefined,
        notes: ing.notes || undefined,
        recipeTitle,
        recipeSlug,
      })),
    );
    toast.success(`Added ${ingredients.length} ingredients to shopping list`);
  };

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleAdd}
      className={cn(
        "hover-squish group relative overflow-hidden transition-all hover:scale-105",
        className,
      )}
    >
      <ShoppingCart className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover:scale-110 sm:mr-2 sm:h-5 sm:w-5" />
      <span className="text-sm font-medium sm:text-base">
        Add to Shopping List
      </span>
    </Button>
  );
}
