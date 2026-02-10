"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { toggleFavorite, markAsCooked, deleteRecipe } from "@/lib/actions";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeActionsProps {
  recipe: RecipeWithRelations;
  onUpdate?: (recipe: RecipeWithRelations) => void;
}

export function RecipeActions({ recipe, onUpdate }: RecipeActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isFavoriting, startFavoriteTransition] = useTransition();
  const [isCooking, startCookTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleToggleFavorite = () => {
    startFavoriteTransition(async () => {
      const result = await toggleFavorite(recipe.id, !recipe.isFavorite);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onUpdate?.(result.data);
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

      onUpdate?.(result.data);
      toast.success("Recipe marked as cooked!");
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteRecipe(recipe.id);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Recipe deleted");
      router.push("/");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleFavorite}
        disabled={isFavoriting}
        className="gap-1"
      >
        <span>{recipe.isFavorite ? "❤️" : "🤍"}</span>
        {recipe.isFavorite ? "Favorited" : "Favorite"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleMarkCooked}
        disabled={isCooking}
        className="gap-1"
      >
        <span>👨‍🍳</span>I Made This
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/recipe/${recipe.slug}/edit`)}
        className="gap-1"
      >
        <span>✏️</span>
        Edit
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="no-print gap-1"
      >
        <span>🖨️</span>
        Print
      </Button>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive"
            />
          }
        >
          <span>🗑️</span>
          Delete
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{recipe.title}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
