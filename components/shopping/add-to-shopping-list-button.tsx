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
      size="lg"
      onClick={handleAdd}
      className={cn("gap-2 sm:px-4", className)}
    >
      <ShoppingCart className="size-4" />
      Add to Shopping List
    </Button>
  );
}
