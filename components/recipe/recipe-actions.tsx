"use client";

import { useState } from "react";
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
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeActionsProps {
  recipe: RecipeWithRelations;
  onUpdate?: (recipe: RecipeWithRelations) => void;
}

export function RecipeActions({ recipe, onUpdate }: RecipeActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [isCooking, setIsCooking] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleToggleFavorite = async () => {
    setIsFavoriting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !recipe.isFavorite }),
      });

      if (!response.ok) throw new Error("Failed to update favorite status");

      const { data } = await response.json();
      onUpdate?.(data);
      toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites");
    } catch {
      toast.error("Failed to update favorite status");
    } finally {
      setIsFavoriting(false);
    }
  };

  const handleMarkCooked = async () => {
    setIsCooking(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookCount: (recipe.cookCount || 0) + 1,
          lastCooked: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to mark as cooked");

      const { data } = await response.json();
      onUpdate?.(data);
      toast.success("Recipe marked as cooked!");
    } catch {
      toast.error("Failed to mark as cooked");
    } finally {
      setIsCooking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete recipe");

      toast.success("Recipe deleted");
      router.push("/");
    } catch {
      toast.error("Failed to delete recipe");
      setIsDeleting(false);
    }
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
        <span>👨‍🍳</span>
        I Made This
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
        className="gap-1 no-print"
      >
        <span>🖨️</span>
        Print
      </Button>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 text-destructive">
            <span>🗑️</span>
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{recipe.title}&quot;? This action cannot be undone.
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
