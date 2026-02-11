"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Ingredient } from "@/types/recipe";

interface IngredientListProps {
  ingredients: Ingredient[];
  className?: string;
}

export function IngredientList({
  ingredients,
  className,
}: IngredientListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleIngredient = (id: string) => {
    const newChecked = new Set(checked);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setChecked(newChecked);
  };

  // Group ingredients by their group field
  const groupedIngredients = ingredients.reduce<Record<string, Ingredient[]>>(
    (acc, ing) => {
      const group = ing.group || "Ingredients";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(ing);
      return acc;
    },
    {},
  );

  const groups = Object.entries(groupedIngredients);

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map(([groupName, groupIngredients]) => (
        <div key={groupName}>
          {groups.length > 1 && (
            <h4 className="mb-3 font-serif text-lg font-medium text-foreground">
              {groupName}
            </h4>
          )}
          <ul className="space-y-2.5">
            {groupIngredients.map((ingredient) => (
              <li
                key={ingredient.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border/35 px-2.5 py-2 transition-all duration-300",
                  checked.has(ingredient.id)
                    ? "scale-[0.98] bg-accent/7"
                    : "bg-background/55 hover:bg-muted/35",
                )}
              >
                <Checkbox
                  id={ingredient.id}
                  checked={checked.has(ingredient.id)}
                  onCheckedChange={() => toggleIngredient(ingredient.id)}
                  className="mt-0.5 transition-transform duration-200 hover:scale-110"
                />
                <label
                  htmlFor={ingredient.id}
                  className={cn(
                    "flex-1 cursor-pointer text-sm leading-relaxed text-foreground transition-all duration-300 select-none sm:text-base",
                    checked.has(ingredient.id) &&
                      "text-muted-foreground/60 line-through decoration-[var(--highlight)] decoration-2",
                  )}
                >
                  {ingredient.quantity && (
                    <span className="font-medium">{ingredient.quantity} </span>
                  )}
                  {ingredient.unit && (
                    <span className="text-muted-foreground">
                      {ingredient.unit}{" "}
                    </span>
                  )}
                  <span>{ingredient.name}</span>
                  {ingredient.notes && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({ingredient.notes})
                    </span>
                  )}
                  {checked.has(ingredient.id) && (
                    <span className="ml-1.5 inline-block animate-[rubber-band_0.4s_ease-in-out] text-xs">
                      ✓
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
