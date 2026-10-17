import * as cheerio from "cheerio";
import { z } from "zod";
import { isJsonArray, jsonValueSchema, readJsonObject, readJsonString } from "@/lib/json";
import type { Course, ParsedRecipe } from "@/types/recipe";
import type { JsonObject, JsonValue } from "@/types/json";
import { parseIngredientLine } from "./ingredient-line";
import { cleanText } from "./text";

interface StructuredStep {
  text: string;
  group?: string;
}

function isRecipe(object: JsonObject): boolean {
  const type = object["@type"];

  return type === "Recipe" || (isJsonArray(type) && type.includes("Recipe"));
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

  if (isRecipe(object)) {
    return object;
  }

  return find(object["@graph"] ?? null);
}

/** Every schema.org Recipe object in the page's JSON-LD blocks, in document order. */
export function findStructuredRecipes(html: string): JsonObject[] {
  const $ = cheerio.load(html);
  const recipes: JsonObject[] = [];

  for (const element of $('script[type="application/ld+json"]').toArray()) {
    try {
      const recipe = find(jsonValueSchema.parse(JSON.parse($(element).text())));

      if (recipe) {
        recipes.push(recipe);
      }
    } catch {
      /* Try the next structured-data block. */
    }
  }

  return recipes;
}

function steps(value: JsonValue): StructuredStep[] {
  const text = readJsonString(value);

  if (text !== undefined) {
    // Some sites put every step in one HTML string; keep block boundaries as lines.
    return text
      .replaceAll(/<\/(?:p|li|div)>|<br\s*\/?>/gi, "\n")
      .split(/\n+/)
      .map((line) => ({ text: cleanText(line) }))
      .filter((step) => step.text);
  }

  if (isJsonArray(value)) {
    return value.flatMap(steps);
  }

  const object = readJsonObject(value);

  if (object) {
    if (object.itemListElement) {
      const name = readJsonString(object.name ?? null);

      return steps(object.itemListElement).map((step) => ({
        ...step,
        group: name === undefined ? step.group : cleanText(name),
      }));
    }

    const stepText = readJsonString(object.text ?? null) ?? readJsonString(object.name ?? null);

    if (stepText !== undefined && cleanText(stepText)) {
      return [{ text: cleanText(stepText) }];
    }
  }

  return [];
}

const ISO_DURATION =
  /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;

/** ISO 8601 duration ("PT1H30M") as minutes; missing, malformed and "PT0M" (common for unknown) are undefined. */
const durationSchema = z
  .string()
  .catch("")
  .transform((duration) => {
    const [, days, hours, mins, secs] = duration.trim().match(ISO_DURATION) ?? [];

    const total = Math.round(
      Number(days ?? 0) * 1440 +
        Number(hours ?? 0) * 60 +
        Number(mins ?? 0) +
        Number(secs ?? 0) / 60,
    );

    return total > 0 ? total : undefined;
  });

const textSchema = z
  .union([z.string().transform(cleanText), z.number().transform(String)])
  .catch("");

/** A schema.org text value: a string, number, or array of them, as cleaned plain text. */
const textsSchema = z
  .union([z.array(textSchema), textSchema.transform((text) => [text])])
  .transform((items) => items.filter(Boolean));

const firstTextSchema = textsSchema.transform((items) => items.at(0));

type CoursePattern = readonly [RegExp, Course];

const COURSES: readonly CoursePattern[] = [
  [/breakfast|brunch/i, "BREAKFAST"],
  [/dessert|cake|cookie|sweet|baking/i, "DESSERT"],
  [/appetizer|starter|hors|finger food/i, "APPETIZER"],
  [/side/i, "SIDE"],
  [/sauce|condiment|dressing|dip|marinade/i, "SAUCE"],
  [/drink|beverage|cocktail|smoothie/i, "DRINK"],
  [/bread/i, "BREAD"],
  [/snack/i, "SNACK"],
  [/lunch/i, "LUNCH"],
  [/dinner|main|entr[ée]e|supper/i, "DINNER"],
];

const courseSchema = textsSchema.transform((categories): Course | undefined => {
  for (const category of categories) {
    const found = COURSES.find(([pattern]) => pattern.test(category));

    if (found) {
      return found[1];
    }
  }

  return undefined;
});

/** Prefer the descriptive yield, e.g. "4 servings" from ["4", "4 servings"]. */
const servingsSchema = textsSchema.transform(
  (yields) => yields.find((item) => /\D/.test(item)) ?? yields.at(0),
);

const imageUrlSchema = z.union([
  z.string(),
  z.object({ url: z.string() }).transform(({ url }) => url),
]);

/** First image URL from a schema.org `image` value (string, ImageObject or array). */
const imageSchema = z
  .union([z.array(z.unknown()).transform((images) => images.at(0)), z.unknown()])
  .pipe(imageUrlSchema.catch(""))
  .transform((url) => url || undefined)
  .optional();

/** The schema.org Recipe fields the cookbook stores. Malformed fields read as empty. */
const schemaOrgRecipeSchema = z.object({
  name: firstTextSchema,
  description: firstTextSchema,
  image: imageSchema,
  recipeIngredient: textsSchema.transform((lines) => lines.map(parseIngredientLine)),
  recipeInstructions: z.json().catch(null).transform(steps),
  prepTime: durationSchema,
  cookTime: durationSchema,
  totalTime: durationSchema,
  recipeYield: servingsSchema,
  recipeCuisine: firstTextSchema,
  recipeCategory: courseSchema,
});

export function structuredImage(recipe: JsonObject): string | undefined {
  return imageSchema.parse(recipe.image);
}

/** Convert complete schema.org Recipe data without calling a model. */
export function extractStructuredRecipe(html: string): ParsedRecipe | undefined {
  for (const object of findStructuredRecipes(html)) {
    const recipe = schemaOrgRecipeSchema.parse(object);

    if (!recipe.name || !recipe.recipeIngredient.length || !recipe.recipeInstructions.length) {
      continue;
    }

    return {
      title: recipe.name,
      description: recipe.description,
      ingredients: recipe.recipeIngredient,
      instructions: recipe.recipeInstructions,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.totalTime,
      servings: recipe.recipeYield,
      cuisine: recipe.recipeCuisine,
      course: recipe.recipeCategory,
    };
  }

  return undefined;
}
