"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FilterChip } from "@/components/search/quick-filters";

interface FilterChipsProps {
  readonly chips: readonly FilterChip[];
  readonly onToggle: (value: string) => void;
  readonly className?: string;
}

export function FilterChips({ chips, onToggle, className }: Readonly<FilterChipsProps>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <Badge
          key={chip.value}
          variant={chip.active ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-colors",
            chip.active
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "hover:bg-muted",
          )}
          onClick={() => onToggle(chip.value)}
        >
          {chip.label}
        </Badge>
      ))}
    </div>
  );
}
