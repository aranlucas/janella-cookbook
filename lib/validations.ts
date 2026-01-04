import { z } from "zod";

/**
 * Ingredient schema for form validation
 */
export const ingredientSchema = z.object({
    quantity: z.string().optional(),
    unit: z.string().optional(),
    name: z.string().min(1, "Ingredient name is required"),
    notes: z.string().optional(),
    group: z.string().optional(),
    sortOrder: z.number().optional(),
});

/**
 * Instruction schema for form validation
 */
export const instructionSchema = z.object({
    text: z.string().min(1, "Instruction text is required"),
    group: z.string().optional(),
    sortOrder: z.number().optional(),
    duration: z.number().optional(),
    imageUrl: z.string().url().optional().or(z.literal("")),
});

/**
 * Difficulty enum values
 */
export const difficultyValues = ["EASY", "MEDIUM", "HARD", "EXPERT"] as const;
export type DifficultyValue = (typeof difficultyValues)[number];

/**
 * Course enum values
 */
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

/**
 * Source type enum values
 */
export const sourceTypeValues = [
    "URL_IMPORT",
    "MANUAL",
    "NATURAL_LANGUAGE",
    "PHOTO",
    "API",
] as const;
export type SourceTypeValue = (typeof sourceTypeValues)[number];

/**
 * Main recipe input schema for form validation
 */
export const recipeInputSchema = z.object({
    title: z
        .string()
        .min(1, "Recipe title is required")
        .max(200, "Title must be less than 200 characters"),
    description: z.string().max(2000, "Description too long").optional(),
    prepTime: z.number().min(0).max(10000).optional().nullable(),
    cookTime: z.number().min(0).max(10000).optional().nullable(),
    totalTime: z.number().min(0).max(10000).optional().nullable(),
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
    ingredients: z
        .array(ingredientSchema)
        .min(1, "At least one ingredient is required"),
    instructions: z
        .array(instructionSchema)
        .min(1, "At least one instruction is required"),
});

export type RecipeInputSchema = z.infer<typeof recipeInputSchema>;

/**
 * URL import schema
 */
export const urlImportSchema = z.object({
    url: z.string().url("Please enter a valid URL"),
});

export type UrlImportSchema = z.infer<typeof urlImportSchema>;

/**
 * Text import schema
 */
export const textImportSchema = z.object({
    text: z
        .string()
        .min(20, "Please enter more recipe text")
        .max(50000, "Text is too long"),
});

export type TextImportSchema = z.infer<typeof textImportSchema>;

/**
 * Search filters schema
 */
export const searchFiltersSchema = z.object({
    cuisine: z.array(z.string()).optional(),
    course: z.array(z.enum(courseValues)).optional(),
    difficulty: z.array(z.enum(difficultyValues)).optional(),
    maxTime: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
});

export type SearchFiltersSchema = z.infer<typeof searchFiltersSchema>;

/**
 * Search request schema
 */
export const searchRequestSchema = z.object({
    query: z.string().min(1, "Search query is required").max(500),
    filters: searchFiltersSchema.optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
});

export type SearchRequestSchema = z.infer<typeof searchRequestSchema>;

/**
 * Validate recipe input and return typed result
 */
export function validateRecipeInput(data: unknown): {
    success: true;
    data: RecipeInputSchema;
} | {
    success: false;
    errors: Record<string, string[]>;
} {
    const result = recipeInputSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Format Zod errors into a simple object
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(issue.message);
    }

    return { success: false, errors };
}

/**
 * Validate URL import input
 */
export function validateUrlImport(data: unknown): {
    success: true;
    data: UrlImportSchema;
} | {
    success: false;
    error: string;
} {
    const result = urlImportSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return { success: false, error: result.error.issues[0]?.message || "Invalid input" };
}

/**
 * Validate text import input
 */
export function validateTextImport(data: unknown): {
    success: true;
    data: TextImportSchema;
} | {
    success: false;
    error: string;
} {
    const result = textImportSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return { success: false, error: result.error.issues[0]?.message || "Invalid input" };
}
