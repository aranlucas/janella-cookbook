"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Ingredient } from "@/types/recipe";

interface IngredientListProps {
  readonly ingredients: readonly Ingredient[];
  readonly className?: string;
}

export function IngredientList({ ingredients, className }: IngredientListProps) {
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

  // Group ingredients by their group field; ungrouped ingredients get no heading
  const groupedIngredients = ingredients.reduce<Record<string, Ingredient[]>>((acc, ing) => {
    const group = ing.group?.trim() ?? "";

    if (!acc[group]) {
      acc[group] = [];
    }

    acc[group].push(ing);

    return acc;
  }, {});

  const groups = Object.entries(groupedIngredients);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {groups.map(([groupName, groupIngredients]) => (
        <div key={groupName || "ungrouped"}>
          {groupName && (
            <h3 className="mbe-1 font-sans text-sm font-semibold tracking-normal text-foreground">
              {groupName}
            </h3>
          )}
          <ul>
            {groupIngredients.map((ingredient) => {
              const isChecked = checked.has(ingredient.id);

              return (
                <li
                  key={ingredient.id}
                  className="flex items-start gap-3 border-be border-dashed border-foreground/15 py-2 last:border-be-0"
                >
                  <Checkbox
                    id={ingredient.id}
                    checked={isChecked}
                    onCheckedChange={() => toggleIngredient(ingredient.id)}
                    className="mbs-1"
                  />
                  <label
                    htmlFor={ingredient.id}
                    className={cn(
                      "flex-1 cursor-pointer text-base leading-relaxed text-foreground transition-colors select-none",
                      isChecked && "text-muted-foreground line-through decoration-accent/60",
                    )}
                  >
                    {ingredient.quantity && (
                      <span className="font-semibold">{ingredient.quantity} </span>
                    )}
                    {ingredient.unit && <span className="font-semibold">{ingredient.unit} </span>}
                    <span>{ingredient.name}</span>
                    {ingredient.notes && (
                      <span className="text-muted-foreground">, {ingredient.notes}</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
