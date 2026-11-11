import { z } from "zod";

export const ingredientSchema = z.object({
  quantity: z.string().optional(),
  unit: z.string().optional(),
  name: z.string().trim().min(1, "Ingredient name is required"),
  notes: z.string().optional(),
  group: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const instructionSchema = z.object({
  text: z.string().trim().min(1, "Instruction text is required"),
  group: z.string().optional(),
  sortOrder: z.number().optional(),
  duration: z.number().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const difficultyValues = ["EASY", "MEDIUM", "HARD", "EXPERT"] as const;

export type DifficultyValue = (typeof difficultyValues)[number];

export const courseValues = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "APPETIZER",
  "SIDE",
  "DESSERT",
  "SNACK",
  "DRINK",
  "SAUCE",
  "BREAD",
] as const;

export type CourseValue = (typeof courseValues)[number];

export const sourceTypeValues = [
  "URL_IMPORT",
  "MANUAL",
  "NATURAL_LANGUAGE",
  "PHOTO",
  "API",
] as const;

export type SourceTypeValue = (typeof sourceTypeValues)[number];

export const recipeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Recipe title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000, "Description too long").optional(),
  prepTime: z.number().int().min(0).max(10000).optional().nullable(),
  cookTime: z.number().int().min(0).max(10000).optional().nullable(),
  totalTime: z.number().int().min(0).max(10000).optional().nullable(),
  servings: z.string().max(50).optional(),
  difficulty: z.enum(difficultyValues).optional(),
  cuisine: z.string().max(100).optional(),
  course: z.enum(courseValues).optional(),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  notes: z.string().max(5000, "Notes too long").optional(),
  rating: z.number().min(1).max(5).optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
  sourceUrl: z.string().url("Invalid source URL").optional().or(z.literal("")),
  sourceType: z.enum(sourceTypeValues),
  ingredients: z.array(ingredientSchema).min(1, "At least one ingredient is required"),
  instructions: z.array(instructionSchema).min(1, "At least one instruction is required"),
});

type ParsedRecipeInputSchema = z.infer<typeof recipeInputSchema>;

export type RecipeInputSchema = ParsedRecipeInputSchema;

/** MCP tools use the same recipe validation as the app. Array order defines step order. */
export const mcpAddRecipeSchema = recipeInputSchema.omit({ sourceType: true }).extend({
  ingredients: z
    .array(ingredientSchema.omit({ sortOrder: true }))
    .min(1)
    .max(1000),
  instructions: z
    .array(
      instructionSchema.omit({ sortOrder: true }).extend({
        duration: z.number().int().min(0).max(10000).optional(),
      }),
    )
    .min(1)
    .max(1000),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  saveKey: z
    .string()
    .uuid()
    .optional()
    .describe("Optional UUID. Reuse the same key when retrying a save to avoid duplicate recipes."),
});

export const recipeListSchema = z.object({
  query: z.string().trim().min(1).max(500).optional().describe("Keyword search in recipe content"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(1000000).default(0),
  cuisine: z.string().trim().min(1).max(100).optional(),
  course: z.enum(courseValues).optional(),
  difficulty: z.enum(difficultyValues).optional(),
  tag: z.string().trim().min(1).max(100).optional().describe("Tag slug"),
  isFavorite: z.boolean().optional(),
  maxTime: z.number().int().min(0).max(10000).optional().describe("Maximum total time in minutes"),
});

export type RecipeListInput = Readonly<z.infer<typeof recipeListSchema>>;

export const mcpListRecipesSchema = recipeListSchema;

/**
 * `/recipes?category=` links carry a lowercased course enum or cuisine value.
 * Resolve them to structured filters so browsing matches category counts.
 */
export const recipeCategorySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((value) => {
    const course = courseValues.find((candidate) => candidate === value.toUpperCase());

    return course ? { course } : { cuisine: value };
  });

export type RecipeCategoryFilter = z.infer<typeof recipeCategorySchema>;

export const mcpGetRecipeSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .describe("Recipe slug returned by list_recipes or add_recipe"),
});

export const urlImportSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Please enter a valid URL")
    .refine((value) => /^https?:\/\//i.test(value), "Use an HTTP or HTTPS URL"),
});

export type UrlImportSchema = z.infer<typeof urlImportSchema>;

export const textImportSchema = z.object({
  text: z.string().min(20, "Please enter more recipe text").max(50000, "Text is too long"),
});

export type TextImportSchema = z.infer<typeof textImportSchema>;

export const youtubeImportSchema = z.object({
  url: z
    .string()
    .url("Please enter a valid URL")
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);

          return (
            parsedUrl.hostname === "www.youtube.com" ||
            parsedUrl.hostname === "youtube.com" ||
            parsedUrl.hostname === "youtu.be" ||
            parsedUrl.hostname === "m.youtube.com"
          );
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid YouTube URL" },
    ),
});

export type YouTubeImportSchema = z.infer<typeof youtubeImportSchema>;

export const searchFiltersSchema = z.object({
  cuisine: z.array(z.string()).optional(),
  course: z.array(z.enum(courseValues)).optional(),
  difficulty: z.array(z.enum(difficultyValues)).optional(),
  maxTime: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
});

export type SearchFiltersSchema = z.infer<typeof searchFiltersSchema>;

export const searchRequestSchema = z.object({
  query: z.string().min(1, "Search query is required").max(500),
  filters: searchFiltersSchema.optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export type SearchRequestSchema = z.infer<typeof searchRequestSchema>;

// Drafts may be incomplete; saving still requires recipeInputSchema.
export const recipeDraftSchema = recipeInputSchema.extend({
  title: z.string().max(200),
  ingredients: z.array(ingredientSchema.extend({ name: z.string() })),
  instructions: z.array(instructionSchema.extend({ text: z.string() })),
});
