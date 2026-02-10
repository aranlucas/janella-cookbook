"use client";

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
    return (
      <Link href="/recipes/new" onClick={onClick}>
        <Button
          size="icon"
          className={cn(
            "hover-squish h-9 w-9 transition-transform hover:rotate-90",
            className,
          )}
          aria-label="Add new recipe"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </Link>
    );
  }

  if (variant === "mobile") {
    return (
      <Link
        href="/recipes/new"
        onClick={onClick}
        className={cn("w-full", className)}
      >
        <Button className="hover-squish w-full gap-2">
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Add New Recipe
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/recipes/new" className={className}>
      <Button className="animate-glow-pulse group gap-2 transition-transform active:scale-95">
        <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
        New Recipe
      </Button>
    </Link>
  );
}
