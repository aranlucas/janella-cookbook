import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddRecipeButtonProps {
  variant?: "desktop" | "mobile" | "icon";
  onClick?: () => void;
  className?: string;
}

export function AddRecipeButton({
  variant = "desktop",
  onClick,
  className,
}: AddRecipeButtonProps) {
  if (variant === "icon") {
    // Compact icon-only button for small screens
    return (
      <Link href="/recipes/new" onClick={onClick}>
        <Button
          size="icon"
          className={cn("h-9 w-9", className)}
          aria-label="Add new recipe"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </Link>
    );
  }

  if (variant === "mobile") {
    // Full-width button for mobile menu
    return (
      <Link href="/add" onClick={onClick} className={cn("w-full", className)}>
        <Button className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add New Recipe
        </Button>
      </Link>
    );
  }

  // Standard desktop button
  return (
    <Link href="/recipes/new" className={className}>
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        New Recipe
      </Button>
    </Link>
  );
}
