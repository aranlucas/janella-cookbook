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
            <h4 className="text-charcoal mb-3 font-serif text-lg font-medium">
              {groupName}
            </h4>
          )}
          <ul className="space-y-2">
            {groupIngredients.map((ingredient) => (
              <li key={ingredient.id} className="flex items-start gap-3">
                <Checkbox
                  id={ingredient.id}
                  checked={checked.has(ingredient.id)}
                  onCheckedChange={() => toggleIngredient(ingredient.id)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={ingredient.id}
                  className={cn(
                    "flex-1 cursor-pointer select-none",
                    checked.has(ingredient.id) &&
                      "text-muted-foreground line-through",
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
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
