"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterChip {
  label: string;
  value: string;
  active?: boolean;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onToggle: (value: string) => void;
  className?: string;
}

export function FilterChips({ chips, onToggle, className }: FilterChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <Badge
          key={chip.value}
          variant={chip.active ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-colors",
            chip.active
              ? "bg-terracotta hover:bg-rust text-warm-white"
              : "hover:bg-butter",
          )}
          onClick={() => onToggle(chip.value)}
        >
          {chip.label}
        </Badge>
      ))}
    </div>
  );
}

// Pre-defined quick filter chips
export const quickFilters: FilterChip[] = [
  { label: "❤️ Favorites", value: "favorites" },
  { label: "⚡ Quick (< 30 min)", value: "quick" },
  { label: "🆕 Recently Added", value: "recent" },
  { label: "⭐ Top Rated", value: "rated" },
];
