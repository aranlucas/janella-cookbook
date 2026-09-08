import * as cheerio from "cheerio";
import type { ParsedRecipe } from "@/types/recipe";

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function find(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = find(item);
      if (result) return result;
    }
  }
  if (!record(value)) return;
  if ([value["@type"]].flat().includes("Recipe")) return value;
  return find(value["@graph"]);
}
function steps(value: unknown): { text: string; group?: string }[] {
  if (typeof value === "string")
    return value
      .split(/\n+/)
      .map((text) => ({ text: text.trim() }))
      .filter((step) => step.text);
  if (Array.isArray(value)) return value.flatMap(steps);
  if (record(value)) {
    if (value.itemListElement)
      return steps(value.itemListElement).map((step) => ({
        ...step,
        group: typeof value.name === "string" ? value.name : step.group,
      }));
    if (typeof value.text === "string") return [{ text: value.text }];
  }
  return [];
}
function minutes(value: unknown): number | undefined {
  if (typeof value !== "string") return;
  const match = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return;
  return (
    Number(match[1] || 0) * 1440 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0) +
    Math.ceil(Number(match[4] || 0) / 60)
  );
}
export function extractStructuredRecipe(html: string): ParsedRecipe | undefined {
  const $ = cheerio.load(html);
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    try {
      const recipe = find(JSON.parse($(element).text()) as unknown);
      if (!recipe || typeof recipe.name !== "string" || !Array.isArray(recipe.recipeIngredient))
        continue;
      const ingredients = recipe.recipeIngredient
        .filter((item): item is string => typeof item === "string" && !!item.trim())
        .map((name) => ({ name }));
      const instructions = steps(recipe.recipeInstructions);
      if (!ingredients.length || !instructions.length) continue;
      return {
        title: recipe.name,
        description: typeof recipe.description === "string" ? recipe.description : undefined,
        ingredients,
        instructions,
        prepTime: minutes(recipe.prepTime),
        cookTime: minutes(recipe.cookTime),
        totalTime: minutes(recipe.totalTime),
        servings:
          typeof recipe.recipeYield === "string"
            ? recipe.recipeYield
            : typeof recipe.recipeYield === "number"
              ? String(recipe.recipeYield)
              : undefined,
      };
    } catch {
      /* Try the next structured-data block. */
    }
  }
}
