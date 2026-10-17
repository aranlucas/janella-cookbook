import { z } from "zod";
import { courseValues, difficultyValues } from "@/lib/validations";
import { cleanText, clip } from "./text";

/** Plain text, or undefined when blank; clipped to fit `recipeInputSchema` limits. */
function optionalText(max?: number) {
  return z
    .string()
    .optional()
    .transform((value) => {
      const text = value ? cleanText(value) : "";

      return text ? (max ? clip(text, max) : text) : undefined;
    });
}

/** Whole minutes within the range `recipeInputSchema` accepts. */
const minutes = z
  .number()
  .optional()
  .transform((value) =>
    value !== undefined && Number.isFinite(value) && value > 0 && value <= 10_000
      ? Math.round(value)
      : undefined,
  );

const ingredientSchema = z.object({
  quantity: optionalText(),
  unit: optionalText(),
  name: optionalText(),
  notes: optionalText(),
  group: optionalText(),
});

const instructionSchema = z.object({
  text: optionalText(),
  group: optionalText(),
});

/**
 * Cleans a parsed recipe from any source (schema.org data or the model) so it
 * passes `recipeInputSchema`: trimmed text, no blank ingredients or steps, sane
 * times, and lengths within limits. Completeness is checked by the caller.
 */
export const parsedRecipeSchema = z
  .object({
    title: optionalText(200),
    description: optionalText(2000),
    ingredients: z
      .array(ingredientSchema)
      .transform((ingredients) =>
        ingredients
          .flatMap(({ name, ...rest }) => (name ? [{ ...rest, name }] : []))
          .map((ingredient, sortOrder) => ({ ...ingredient, sortOrder })),
      ),
    instructions: z
      .array(instructionSchema)
      .transform((steps) =>
        steps
          .flatMap(({ text, group }) => (text ? [{ text, group }] : []))
          .map((step, sortOrder) => ({ ...step, sortOrder })),
      ),
    prepTime: minutes,
    cookTime: minutes,
    totalTime: minutes,
    servings: optionalText(50),
    cuisine: optionalText(100),
    course: z.enum(courseValues).optional(),
    difficulty: z.enum(difficultyValues).optional(),
    imageUrl: z.string().optional(),
  })
  .transform((recipe) => ({
    ...recipe,
    totalTime:
      recipe.totalTime ??
      (recipe.prepTime || recipe.cookTime
        ? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
        : undefined),
  }));

export type CleanParsedRecipe = z.output<typeof parsedRecipeSchema>;

/**
 * A field the model must always return (strict JSON schema mode requires every
 * property), using `null` for "not in the source".
 */
function nullable<T extends z.ZodType>(schema: T, description: string) {
  return schema
    .nullable()
    .describe(description)
    .transform((value) => value ?? undefined);
}

/**
 * Structured output requested from the recipe model. The provider sees the
 * input shape; the parsed `output` is already cleaned by `parsedRecipeSchema`.
 */
export const modelRecipeSchema = z
  .object({
    title: z.string().describe("Recipe name without the site name or SEO phrases"),
    description: nullable(z.string(), "Short summary of the dish taken from the source, or null"),
    ingredients: z
      .array(
        z.object({
          quantity: nullable(
            z.string(),
            'Amount exactly as written, e.g. "1 1/2", "2-3", "½"; null if none',
          ),
          unit: nullable(
            z.string(),
            'Unit as written, e.g. "cups", "tbsp", "g", "cloves"; null if none',
          ),
          name: z.string().describe('Ingredient itself, e.g. "all-purpose flour"'),
          notes: nullable(
            z.string(),
            'Preparation or extra details, e.g. "finely chopped", "optional"; or null',
          ),
          group: nullable(z.string(), 'Section heading such as "For the sauce"; null if ungrouped'),
        }),
      )
      .describe("Every ingredient, in source order"),
    instructions: z
      .array(
        z.object({
          text: z.string().describe("One step, without its step number"),
          group: nullable(
            z.string(),
            'Section heading such as "Make the dough"; null if ungrouped',
          ),
        }),
      )
      .describe("Every step, in source order"),
    prepTime: nullable(z.number(), "Preparation time in minutes, or null"),
    cookTime: nullable(z.number(), "Cooking time in minutes, or null"),
    totalTime: nullable(z.number(), "Total time in minutes, or null"),
    servings: nullable(z.string(), 'Yield as written, e.g. "4 servings" or "24 cookies"; or null'),
    cuisine: nullable(z.string(), 'Cuisine such as "Italian" or "Thai"; or null'),
    course: nullable(z.enum(courseValues), "Meal course, or null if unclear"),
    difficulty: nullable(z.enum(difficultyValues), "Difficulty, or null if unclear"),
  })
  // Output already has the cleanup schema's input shape, so this parse cannot fail.
  .transform((recipe) => parsedRecipeSchema.parse(recipe));
