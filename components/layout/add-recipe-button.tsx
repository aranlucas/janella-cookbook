"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddRecipeButtonProps {
  readonly variant?: "desktop" | "mobile" | "icon";
  readonly onClick?: () => void;
  readonly className?: string;
}

export function AddRecipeButton({ variant = "desktop", onClick, className }: AddRecipeButtonProps) {
  return (
    <Link
      href="/recipes/new"
      onClick={onClick}
      aria-label={variant === "icon" ? "Add new recipe" : undefined}
      className={cn(
        buttonVariants({ size: variant === "icon" ? "icon" : "default" }),
        "gap-2",
        variant === "mobile" && "w-full",
        variant === "icon" && "size-9",
        className,
      )}
    >
      <Plus className="size-4" />
      {variant !== "icon" && (variant === "mobile" ? "Add New Recipe" : "New Recipe")}
    </Link>
  );
}
