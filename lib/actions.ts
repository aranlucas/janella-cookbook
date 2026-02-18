"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ok, err, ResultAsync } from "neverthrow";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, generateTagSlug } from "@/lib/slug";
import { generateRecipeEmbedding } from "@/lib/embeddings";
import {
  parseRecipeFromUrl,
  parseRecipeFromText,
  parseRecipeFromYouTube,
} from "@/lib/recipe-parser";
import { AppError, toAppError } from "@/lib/errors";
import type { RecipeInput, RecipeWithRelations } from "@/types/recipe";

export type ActionResult<T = RecipeWithRelations> =
  | { success: true; data: T; slug?: string }
  | { success: false; error: string };

/**
 * Revalidate all recipe-related caches
 * This triggers regeneration of static pages on-demand
 */
function revalidateRecipes(slug?: string) {
  // Revalidate home page (recipe list)
  revalidatePath("/");

  // Revalidate specific recipe pages if slug provided
  if (slug) {
    revalidatePath(`/recipe/${slug}`);
    revalidatePath(`/recipe/${slug}/edit`);
  }
}

/**
 * Defer embedding generation to run after the response is sent.
 * Uses Next.js after() so the user gets their recipe immediately
 * while the embedding is generated in the background for search.
 */
function deferEmbeddingGeneration(
  recipeId: string,
  recipeData: {
    title: string;
    description?: string | null;
    cuisine?: string | null;
    course?: string | null;
    tags?: { name: string }[];
    ingredients?: { name: string }[];
    instructions?: { text: string }[];
    totalTime?: number | null;
    difficulty?: string | null;
  },
) {
  if (!process.env.HUGGINGFACE_API_KEY) return;

  after(async () => {
    const result = await generateRecipeEmbedding(recipeData);
    if (result.isErr()) {
      console.error("Background embedding generation failed:", result.error);
      return;
    }

    const { searchText, embedding } = result.value;
    const embeddingString = `[${embedding.join(",")}]`;

    try {
      await prisma.$executeRaw`
        UPDATE "Recipe"
        SET "searchText" = ${searchText}, embedding = ${embeddingString}::vector
        WHERE id = ${recipeId}
      `;
    } catch (e) {
      console.error("Background embedding SQL update failed:", e);
    }
  });
}

// Helper to create recipe in DB with embedding
async function createRecipeInDb(data: {
  title: string;
  slug: string;
  description?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  servings?: string | null;
  difficulty?: string;
  cuisine?: string | null;
  course?: string | null;
  sourceUrl?: string | null;
  sourceType: string;
  imageUrl?: string | null;
  notes?: string | null;
  rating?: number | null;
  searchText?: string;
  ingredients: {
    quantity?: string;
    unit?: string;
    name: string;
    notes?: string;
    group?: string;
    sortOrder: number;
  }[];
  instructions: {
    text: string;
    group?: string;
    sortOrder: number;
    duration?: number;
    imageUrl?: string;
  }[];
  tagIds?: { id: string }[];
}) {
  const recipe = await prisma.recipe.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      totalTime: data.totalTime,
      servings: data.servings,
      difficulty:
        (data.difficulty as "EASY" | "MEDIUM" | "HARD" | "EXPERT") || "MEDIUM",
      cuisine: data.cuisine,
      course: data.course as
        | "BREAKFAST"
        | "LUNCH"
        | "DINNER"
        | "APPETIZER"
        | "SIDE"
        | "DESSERT"
        | "SNACK"
        | "DRINK"
        | "SAUCE"
        | "BREAD"
        | undefined,
      sourceUrl: data.sourceUrl,
      sourceType: data.sourceType as
        | "URL_IMPORT"
        | "MANUAL"
        | "NATURAL_LANGUAGE"
        | "PHOTO"
        | "API",
      imageUrl: data.imageUrl,
      notes: data.notes,
      rating: data.rating,
      searchText: data.searchText,
      ingredients: {
        create: data.ingredients,
      },
      instructions: {
        create: data.instructions,
      },
      ...(data.tagIds && {
        tags: {
          connect: data.tagIds,
        },
      }),
    },
    include: {
      ingredients: { orderBy: { sortOrder: "asc" } },
      instructions: { orderBy: { sortOrder: "asc" } },
      tags: true,
      images: true,
    },
  });

  return recipe;
}

// Import recipe from URL
// NOTE: This function checks if the URL has been imported before.
// If the same URL is imported again, it updates the existing recipe instead of creating a duplicate.
// This ensures each URL always maps to the same recipe/slug.
export async function importFromUrl(url: string): Promise<ActionResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { success: false, error: "Invalid URL" };
  }

  const urlStr = parsedUrl.toString();

  // Chain: find existing recipe + parse URL in sequence
  const baseResult = await ResultAsync.fromPromise(
    prisma.recipe.findFirst({
      where: { sourceUrl: urlStr },
      select: { id: true, slug: true },
    }),
    toAppError,
  ).andThen((existingRecipe) =>
    parseRecipeFromUrl(urlStr).map((parsed) => ({ parsed, existingRecipe })),
  );

  if (baseResult.isErr()) {
    console.error("Error importing recipe from URL:", baseResult.error);
    return { success: false, error: baseResult.error.message };
  }

  const { parsed, existingRecipe } = baseResult.value;

  // If recipe exists, update it and return immediately
  if (existingRecipe) {
    return updateRecipe(existingRecipe.id, {
      title: parsed.title,
      description: parsed.description,
      prepTime: parsed.prepTime,
      cookTime: parsed.cookTime,
      totalTime: parsed.totalTime,
      servings: parsed.servings,
      difficulty: parsed.difficulty,
      cuisine: parsed.cuisine,
      course: parsed.course,
      imageUrl: parsed.imageUrl,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
    });
  }

  // New recipe: chain slug generation + DB creation
  return generateUniqueSlug(parsed.title)
    .andThen((slug) =>
      ResultAsync.fromPromise(
        createRecipeInDb({
          title: parsed.title,
          slug,
          description: parsed.description,
          prepTime: parsed.prepTime,
          cookTime: parsed.cookTime,
          totalTime:
            parsed.totalTime ||
            (parsed.prepTime || 0) + (parsed.cookTime || 0) ||
            undefined,
          servings: parsed.servings,
          difficulty: parsed.difficulty || "MEDIUM",
          cuisine: parsed.cuisine,
          course: parsed.course,
          sourceUrl: urlStr,
          sourceType: "URL_IMPORT",
          imageUrl: parsed.imageUrl,
          ingredients: parsed.ingredients.map((ing, index) => ({
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            notes: ing.notes,
            group: ing.group,
            sortOrder: ing.sortOrder ?? index,
          })),
          instructions: parsed.instructions.map((inst, index) => ({
            text: inst.text,
            group: inst.group,
            sortOrder: inst.sortOrder ?? index,
            duration: inst.duration,
          })),
        }),
        toAppError,
      ).map((recipe) => ({ recipe, slug })),
    )
    .match(
      ({ recipe, slug }) => {
        deferEmbeddingGeneration(recipe.id, {
          title: parsed.title,
          description: parsed.description,
          cuisine: parsed.cuisine,
          course: parsed.course,
          ingredients: parsed.ingredients,
          instructions: parsed.instructions,
          totalTime: parsed.totalTime,
          difficulty: parsed.difficulty,
        });
        revalidateRecipes(slug);
        return { success: true as const, data: recipe, slug };
      },
      (error) => {
        console.error("Error importing recipe from URL:", error);
        return { success: false as const, error: error.message };
      },
    );
}

// Import recipe from text
export async function importFromText(text: string): Promise<ActionResult> {
  if (!text.trim()) {
    return { success: false, error: "Text is required" };
  }

  return parseRecipeFromText(text)
    .andThen((parsed) =>
      generateUniqueSlug(parsed.title).map((slug) => ({ parsed, slug })),
    )
    .andThen(({ parsed, slug }) =>
      ResultAsync.fromPromise(
        createRecipeInDb({
          title: parsed.title,
          slug,
          description: parsed.description,
          prepTime: parsed.prepTime,
          cookTime: parsed.cookTime,
          totalTime:
            parsed.totalTime ||
            (parsed.prepTime || 0) + (parsed.cookTime || 0) ||
            undefined,
          servings: parsed.servings,
          difficulty: parsed.difficulty || "MEDIUM",
          cuisine: parsed.cuisine,
          course: parsed.course,
          sourceType: "NATURAL_LANGUAGE",
          imageUrl: parsed.imageUrl,
          ingredients: parsed.ingredients.map((ing, index) => ({
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            notes: ing.notes,
            group: ing.group,
            sortOrder: ing.sortOrder ?? index,
          })),
          instructions: parsed.instructions.map((inst, index) => ({
            text: inst.text,
            group: inst.group,
            sortOrder: inst.sortOrder ?? index,
            duration: inst.duration,
          })),
        }),
        toAppError,
      ).map((recipe) => ({ recipe, parsed, slug })),
    )
    .match(
      ({ recipe, parsed, slug }) => {
        deferEmbeddingGeneration(recipe.id, {
          title: parsed.title,
          description: parsed.description,
          cuisine: parsed.cuisine,
          course: parsed.course,
          ingredients: parsed.ingredients,
          instructions: parsed.instructions,
          totalTime: parsed.totalTime,
          difficulty: parsed.difficulty,
        });
        revalidateRecipes(slug);
        return { success: true as const, data: recipe, slug };
      },
      (error) => {
        console.error("Error importing recipe from text:", error);
        return { success: false as const, error: error.message };
      },
    );
}

// Import recipe from YouTube video
export async function importFromYouTube(url: string): Promise<ActionResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { success: false, error: "Invalid URL" };
  }

  const urlStr = parsedUrl.toString();

  // Chain: find existing recipe + parse YouTube URL in sequence
  const baseResult = await ResultAsync.fromPromise(
    prisma.recipe.findFirst({
      where: { sourceUrl: urlStr },
      select: { id: true, slug: true },
    }),
    toAppError,
  ).andThen((existingRecipe) =>
    parseRecipeFromYouTube(urlStr).map((parsed) => ({
      parsed,
      existingRecipe,
    })),
  );

  if (baseResult.isErr()) {
    console.error("Error importing recipe from YouTube:", baseResult.error);
    return { success: false, error: baseResult.error.message };
  }

  const { parsed, existingRecipe } = baseResult.value;

  // If recipe exists, update it and return immediately
  if (existingRecipe) {
    return updateRecipe(existingRecipe.id, {
      title: parsed.title,
      description: parsed.description,
      prepTime: parsed.prepTime,
      cookTime: parsed.cookTime,
      totalTime: parsed.totalTime,
      servings: parsed.servings,
      difficulty: parsed.difficulty,
      cuisine: parsed.cuisine,
      course: parsed.course,
      imageUrl: parsed.imageUrl,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
    });
  }

  // New recipe: chain slug generation + DB creation
  return generateUniqueSlug(parsed.title)
    .andThen((slug) =>
      ResultAsync.fromPromise(
        createRecipeInDb({
          title: parsed.title,
          slug,
          description: parsed.description,
          prepTime: parsed.prepTime,
          cookTime: parsed.cookTime,
          totalTime:
            parsed.totalTime ||
            (parsed.prepTime || 0) + (parsed.cookTime || 0) ||
            undefined,
          servings: parsed.servings,
          difficulty: parsed.difficulty || "MEDIUM",
          cuisine: parsed.cuisine,
          course: parsed.course,
          sourceUrl: urlStr,
          sourceType: "URL_IMPORT",
          imageUrl: parsed.imageUrl,
          ingredients: parsed.ingredients.map((ing, index) => ({
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            notes: ing.notes,
            group: ing.group,
            sortOrder: ing.sortOrder ?? index,
          })),
          instructions: parsed.instructions.map((inst, index) => ({
            text: inst.text,
            group: inst.group,
            sortOrder: inst.sortOrder ?? index,
            duration: inst.duration,
          })),
        }),
        toAppError,
      ).map((recipe) => ({ recipe, slug })),
    )
    .match(
      ({ recipe, slug }) => {
        deferEmbeddingGeneration(recipe.id, {
          title: parsed.title,
          description: parsed.description,
          cuisine: parsed.cuisine,
          course: parsed.course,
          ingredients: parsed.ingredients,
          instructions: parsed.instructions,
          totalTime: parsed.totalTime,
          difficulty: parsed.difficulty,
        });
        revalidateRecipes(slug);
        return { success: true as const, data: recipe, slug };
      },
      (error) => {
        console.error("Error importing recipe from YouTube:", error);
        return { success: false as const, error: error.message };
      },
    );
}

// Create a new recipe manually
export async function createRecipe(input: RecipeInput): Promise<ActionResult> {
  if (!input.title) {
    return { success: false, error: "Title is required" };
  }

  const totalTime =
    input.totalTime ||
    (input.prepTime || 0) + (input.cookTime || 0) ||
    undefined;

  return generateUniqueSlug(input.title)
    .andThen((slug) =>
      ResultAsync.fromPromise(
        (async () => {
          const tagConnections = input.tags
            ? await Promise.all(
                input.tags.map(async (tagName) => {
                  const tagSlug = generateTagSlug(tagName);
                  const tag = await prisma.tag.upsert({
                    where: { slug: tagSlug },
                    create: { name: tagName, slug: tagSlug },
                    update: {},
                  });
                  return { id: tag.id };
                }),
              )
            : [];
          return { slug, tagConnections };
        })(),
        toAppError,
      ),
    )
    .andThen(({ slug, tagConnections }) =>
      ResultAsync.fromPromise(
        createRecipeInDb({
          title: input.title,
          slug,
          description: input.description,
          prepTime: input.prepTime,
          cookTime: input.cookTime,
          totalTime,
          servings: input.servings,
          difficulty: input.difficulty || "MEDIUM",
          cuisine: input.cuisine,
          course: input.course,
          sourceUrl: input.sourceUrl,
          sourceType: input.sourceType,
          imageUrl: input.imageUrl,
          notes: input.notes,
          rating: input.rating,
          ingredients: input.ingredients.map((ing, index) => ({
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
            notes: ing.notes,
            group: ing.group,
            sortOrder: ing.sortOrder ?? index,
          })),
          instructions: input.instructions.map((inst, index) => ({
            text: inst.text,
            group: inst.group,
            sortOrder: inst.sortOrder ?? index,
            duration: inst.duration,
            imageUrl: inst.imageUrl,
          })),
          tagIds: tagConnections,
        }),
        toAppError,
      ).map((recipe) => ({ recipe, slug })),
    )
    .match(
      ({ recipe, slug }) => {
        deferEmbeddingGeneration(recipe.id, {
          title: input.title,
          description: input.description,
          cuisine: input.cuisine,
          course: input.course,
          tags: input.tags?.map((t) => ({ name: t })),
          ingredients: input.ingredients,
          instructions: input.instructions,
          totalTime,
          difficulty: input.difficulty,
        });
        revalidateRecipes(slug);
        return { success: true as const, data: recipe, slug };
      },
      (error) => {
        console.error("Error creating recipe:", error);
        return { success: false as const, error: error.message };
      },
    );
}

// Update an existing recipe
export async function updateRecipe(
  id: string,
  input: Partial<RecipeInput> & {
    isFavorite?: boolean;
    cookCount?: number;
    lastCooked?: string;
  },
): Promise<ActionResult> {
  // Find existing recipe
  const existingResult = await ResultAsync.fromPromise(
    prisma.recipe.findUnique({ where: { id }, include: { tags: true } }),
    toAppError,
  ).andThen((existing) =>
    existing
      ? ok(existing)
      : err(new AppError("Recipe not found", "RECIPE_NOT_FOUND", 404)),
  );

  if (existingResult.isErr()) {
    return { success: false, error: existingResult.error.message };
  }

  const existing = existingResult.value;

  // Generate new slug if title changed
  let slug = existing.slug;
  if (input.title && input.title !== existing.title) {
    const slugResult = await generateUniqueSlug(input.title, id);
    if (slugResult.isErr()) {
      return { success: false, error: slugResult.error.message };
    }
    slug = slugResult.value;
  }

  // Calculate total time
  const totalTime =
    input.totalTime ||
    (input.prepTime ?? existing.prepTime ?? 0) +
      (input.cookTime ?? existing.cookTime ?? 0) ||
    undefined;

  // Resolve tag connections
  const tagsResult = input.tags
    ? await ResultAsync.fromPromise(
        Promise.all(
          input.tags.map(async (tagName) => {
            const tagSlug = generateTagSlug(tagName);
            const tag = await prisma.tag.upsert({
              where: { slug: tagSlug },
              create: { name: tagName, slug: tagSlug },
              update: {},
            });
            return { id: tag.id };
          }),
        ),
        toAppError,
      )
    : ok([] as { id: string }[]);

  if (tagsResult.isErr()) {
    return { success: false, error: tagsResult.error.message };
  }

  const tagConnections = tagsResult.value;

  // Prepare update data, stripping undefined fields
  const updateData: Record<string, unknown> = Object.fromEntries(
    Object.entries({
      title: input.title,
      slug,
      description: input.description,
      prepTime: input.prepTime,
      cookTime: input.cookTime,
      totalTime,
      servings: input.servings,
      difficulty: input.difficulty,
      cuisine: input.cuisine,
      course: input.course,
      sourceUrl: input.sourceUrl,
      imageUrl: input.imageUrl,
      notes: input.notes,
      rating: input.rating,
      isFavorite: input.isFavorite,
      cookCount: input.cookCount,
      lastCooked: input.lastCooked ? new Date(input.lastCooked) : undefined,
    }).filter(([, v]) => v !== undefined),
  );

  return ResultAsync.fromPromise(
    (async () => {
      if (input.ingredients) {
        await prisma.ingredient.deleteMany({ where: { recipeId: id } });
      }
      if (input.instructions) {
        await prisma.instruction.deleteMany({ where: { recipeId: id } });
      }
      return prisma.recipe.update({
        where: { id },
        data: {
          ...updateData,
          ...(input.ingredients && {
            ingredients: {
              create: input.ingredients.map((ing, index) => ({
                quantity: ing.quantity,
                unit: ing.unit,
                name: ing.name,
                notes: ing.notes,
                group: ing.group,
                sortOrder: ing.sortOrder ?? index,
              })),
            },
          }),
          ...(input.instructions && {
            instructions: {
              create: input.instructions.map((inst, index) => ({
                text: inst.text,
                group: inst.group,
                sortOrder: inst.sortOrder ?? index,
                duration: inst.duration,
                imageUrl: inst.imageUrl,
              })),
            },
          }),
          ...(input.tags && {
            tags: {
              set: tagConnections,
            },
          }),
        },
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          instructions: { orderBy: { sortOrder: "asc" } },
          tags: true,
          images: true,
        },
      });
    })(),
    toAppError,
  ).match(
    (recipe) => {
      if (
        input.title ||
        input.description ||
        input.ingredients ||
        input.instructions
      ) {
        deferEmbeddingGeneration(id, {
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          course: recipe.course,
          tags: recipe.tags,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          totalTime: recipe.totalTime,
          difficulty: recipe.difficulty,
        });
      }
      revalidateRecipes(slug);
      return { success: true as const, data: recipe, slug };
    },
    (error) => {
      console.error("Error updating recipe:", error);
      return { success: false as const, error: error.message };
    },
  );
}

// Toggle favorite status
export async function toggleFavorite(
  id: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  return ResultAsync.fromPromise(
    prisma.recipe.update({
      where: { id },
      data: { isFavorite },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
        tags: true,
        images: true,
      },
    }),
    toAppError,
  )
    .map((recipe) => {
      revalidateRecipes(recipe.slug);
      return recipe;
    })
    .match(
      (recipe) => ({ success: true as const, data: recipe }),
      (error) => {
        console.error("Error toggling favorite:", error);
        return { success: false as const, error: error.message };
      },
    );
}

// Mark recipe as cooked
export async function markAsCooked(
  id: string,
  currentCount: number,
): Promise<ActionResult> {
  return ResultAsync.fromPromise(
    prisma.recipe.update({
      where: { id },
      data: {
        cookCount: currentCount + 1,
        lastCooked: new Date(),
      },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
        tags: true,
        images: true,
      },
    }),
    toAppError,
  )
    .map((recipe) => {
      revalidateRecipes(recipe.slug);
      return recipe;
    })
    .match(
      (recipe) => ({ success: true as const, data: recipe }),
      (error) => {
        console.error("Error marking as cooked:", error);
        return { success: false as const, error: error.message };
      },
    );
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<ActionResult<null>> {
  return ResultAsync.fromPromise(
    prisma.recipe.findUnique({ where: { id } }),
    toAppError,
  )
    .andThen((existing) =>
      existing
        ? ok(existing)
        : err(new AppError("Recipe not found", "RECIPE_NOT_FOUND", 404)),
    )
    .andThen(() =>
      ResultAsync.fromPromise(
        prisma.recipe.delete({ where: { id } }),
        toAppError,
      ),
    )
    .match(
      () => {
        revalidateRecipes();
        return { success: true as const, data: null };
      },
      (error) => {
        console.error("Error deleting recipe:", error);
        return { success: false as const, error: error.message };
      },
    );
}

// Regenerate recipe from its source URL
export async function regenerateFromSource(id: string): Promise<ActionResult> {
  const fetchResult = await ResultAsync.fromPromise(
    prisma.recipe.findUnique({
      where: { id },
      select: { sourceUrl: true, slug: true },
    }),
    toAppError,
  ).andThen((existing) => {
    if (!existing) {
      return err(new AppError("Recipe not found", "RECIPE_NOT_FOUND", 404));
    }
    if (!existing.sourceUrl) {
      return err(
        new AppError(
          "Recipe does not have a source URL to regenerate from",
          "NO_SOURCE_URL",
          400,
        ),
      );
    }
    return ok(existing.sourceUrl);
  });

  if (fetchResult.isErr()) {
    return { success: false, error: fetchResult.error.message };
  }

  const sourceUrl = fetchResult.value;

  const parsedResult = await parseRecipeFromUrl(sourceUrl);
  if (parsedResult.isErr()) {
    console.error("Error regenerating recipe from source:", parsedResult.error);
    return { success: false, error: parsedResult.error.message };
  }

  const parsed = parsedResult.value;
  return updateRecipe(id, {
    title: parsed.title,
    description: parsed.description,
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    totalTime: parsed.totalTime,
    servings: parsed.servings,
    difficulty: parsed.difficulty,
    cuisine: parsed.cuisine,
    course: parsed.course,
    imageUrl: parsed.imageUrl,
    ingredients: parsed.ingredients,
    instructions: parsed.instructions,
  });
}
