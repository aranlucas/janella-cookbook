"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { deleteRecipe } from "@/lib/actions";
import type { RecipeWithRelations } from "@/types/recipe";

interface RecipeManagementActionsProps {
  recipe: RecipeWithRelations;
}

export function RecipeManagementActions({
  recipe,
}: RecipeManagementActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

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
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/recipe/${recipe.slug}/edit`)}
          className="text-muted-foreground hover:text-charcoal hover:bg-sage/10 h-9 w-9"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit recipe</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrint}
          className="text-muted-foreground hover:text-charcoal hover:bg-sage/10 h-9 w-9"
        >
          <Printer className="h-4 w-4" />
          <span className="sr-only">Print recipe</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete recipe</span>
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Delete Recipe?
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Are you sure you want to delete{" "}
              <span className="font-semibold">&quot;{recipe.title}&quot;</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="font-medium"
            >
              {isDeleting ? "Deleting..." : "Delete Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
