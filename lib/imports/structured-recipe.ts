import * as cheerio from "cheerio";
import {
  isJsonArray,
  jsonValueSchema,
  readJsonNumber,
  readJsonObject,
  readJsonString,
} from "@/lib/json";
import type { ParsedRecipe } from "@/types/recipe";
import type { JsonObject, JsonValue } from "@/types/json";

interface StructuredStep {
  text: string;
  group?: string;
}

function find(value: JsonValue): JsonObject | undefined {
  if (isJsonArray(value)) {
    for (const item of value) {
      const result = find(item);

      if (result) {
        return result;
      }
    }
  }

  const object = readJsonObject(value);

  if (!object) {
    return undefined;
  }

  const type = object["@type"];

  if (type === "Recipe" || (isJsonArray(type) && type.includes("Recipe"))) {
    return object;
  }

  return find(object["@graph"] ?? null);
}

function steps(value: JsonValue): StructuredStep[] {
  const text = readJsonString(value);

  if (text !== undefined) {
    return text
      .split(/\n+/)
      .map((line) => ({ text: line.trim() }))
      .filter((step) => step.text);
  }

  if (isJsonArray(value)) {
    return value.flatMap(steps);
  }

  const object = readJsonObject(value);

  if (object) {
    if (object.itemListElement) {
      const name = readJsonString(object.name);

      return steps(object.itemListElement).map((step) => ({
        ...step,
        group: name ?? step.group,
      }));
    }

    const stepText = readJsonString(object.text);

    if (stepText !== undefined) {
      return [{ text: stepText }];
    }
  }

  return [];
}

function minutes(value: JsonValue): number | undefined {
  const duration = readJsonString(value);

  if (duration === undefined) {
    return undefined;
  }

  const match = duration.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

  if (!match) {
    return undefined;
  }

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
      const recipe = find(jsonValueSchema.parse(JSON.parse($(element).text())));

      const title = recipe ? readJsonString(recipe.name) : undefined;

      if (!recipe || title === undefined || !isJsonArray(recipe.recipeIngredient)) {
        continue;
      }

      const ingredients = recipe.recipeIngredient
        .map(readJsonString)
        .filter((name): name is string => name !== undefined && name.trim().length > 0)
        .map((name) => ({ name }));

      const instructions = steps(recipe.recipeInstructions);

      if (!ingredients.length || !instructions.length) {
        continue;
      }

      return {
        title,
        description: readJsonString(recipe.description),
        ingredients,
        instructions,
        prepTime: minutes(recipe.prepTime),
        cookTime: minutes(recipe.cookTime),
        totalTime: minutes(recipe.totalTime),
        servings:
          readJsonString(recipe.recipeYield) ??
          (readJsonNumber(recipe.recipeYield) === undefined
            ? undefined
            : String(readJsonNumber(recipe.recipeYield))),
      };
    } catch {
      /* Try the next structured-data block. */
    }
  }

  return undefined;
}
