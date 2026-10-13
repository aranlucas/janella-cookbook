"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useShoppingList } from "@/components/providers/session-context";
import type { Ingredient } from "@/types/recipe";
import { cn } from "@/lib/utils";

interface AddToShoppingListButtonProps {
  readonly ingredients: readonly Ingredient[];
  readonly recipeTitle: string;
  readonly recipeSlug: string;
  readonly className?: string;
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
        quantity: ing.quantity ?? undefined,
        unit: ing.unit ?? undefined,
        notes: ing.notes ?? undefined,
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
      <ShoppingCart className="me-1.5 size-4 transition-transform duration-300 group-hover:scale-110 sm:me-2 sm:size-5" />
      <span className="text-sm font-medium sm:text-base">Add to Shopping List</span>
    </Button>
  );
}
