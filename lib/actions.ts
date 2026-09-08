"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ok, err, safeTry, ResultAsync } from "neverthrow";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, generateTagSlug } from "@/lib/slug";
import { recipeInputSchema } from "@/lib/validations";
import { z } from "zod";
import { generateSearchText, generateRecipeEmbedding } from "@/lib/embeddings";
import { AppError, ValidationError, toAppError } from "@/lib/errors";
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
  for (const path of ["/", "/recipes", "/favorites", "/categories", "/dashboard", "/search"])
    revalidatePath(path);

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
  if (process.env.ENABLE_HOSTED_EMBEDDINGS !== "true" || !process.env.HUGGINGFACE_API_KEY) return;

  after(async () => {
    await generateRecipeEmbedding(recipeData)
      .andThen(({ searchText, embedding }) => {
        const embeddingString = `[${embedding.join(",")}]`;
        return ResultAsync.fromPromise(
          prisma.$executeRaw`
            UPDATE "Recipe"
            SET embedding = ${embeddingString}::vector
            WHERE id = ${recipeId} AND "searchText" = ${searchText}
          `,
          toAppError,
        );
      })
      .match(
        () => {},
        (error) => console.error("Background embedding generation failed:", error),
      );
  });
}

// Helper to create recipe in DB with embedding
async function createRecipeInDb(data: {
  title: string;
  slug: string;
  saveKey?: string;
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
  tagNames?: string[];
}) {
  const recipe = await prisma.recipe.create({
    data: {
      saveKey: data.saveKey,
      title: data.title,
      slug: data.slug,
      description: data.description?.trim() || null,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      totalTime: data.totalTime,
      servings: data.servings?.trim() || null,
      difficulty: (data.difficulty as "EASY" | "MEDIUM" | "HARD" | "EXPERT") || "MEDIUM",
      cuisine: data.cuisine?.trim() || null,
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
      sourceUrl: data.sourceUrl?.trim() || null,
      sourceType: data.sourceType as "URL_IMPORT" | "MANUAL" | "NATURAL_LANGUAGE" | "PHOTO" | "API",
      imageUrl: data.imageUrl?.trim() || null,
      notes: data.notes?.trim() || null,
      rating: data.rating,
      searchText: generateSearchText({ ...data, tags: data.tagNames?.map((name) => ({ name })) }),
      ingredients: {
        create: data.ingredients,
      },
      instructions: {
        create: data.instructions,
      },
      tags: {
        connectOrCreate: (data.tagNames ?? []).map((name) => ({
          where: { slug: generateTagSlug(name) },
          create: { name, slug: generateTagSlug(name) },
        })),
      },
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

// Persist a reviewed recipe. A retry with the same key returns the same record.
export async function createRecipe(input: RecipeInput, saveKey?: string): Promise<ActionResult> {
  const validated = recipeInputSchema.safeParse(input);
  if (!validated.success)
    return { success: false, error: validated.error.issues[0]?.message || "Invalid recipe" };
  if (saveKey && !z.string().uuid().safeParse(saveKey).success)
    return { success: false, error: "Invalid save key" };
  const data = validated.data;
  const include = {
    ingredients: { orderBy: { sortOrder: "asc" as const } },
    instructions: { orderBy: { sortOrder: "asc" as const } },
    tags: true,
    images: true,
  };
  try {
    if (saveKey) {
      const existing = await prisma.recipe.findUnique({ where: { saveKey }, include });
      if (existing) return { success: true, data: existing, slug: existing.slug };
    }
    const slugResult = await generateUniqueSlug(data.title);
    if (slugResult.isErr()) return { success: false, error: slugResult.error.message };
    const totalTime = data.totalTime ?? ((data.prepTime ?? 0) + (data.cookTime ?? 0) || undefined);
    const recipe = await createRecipeInDb({
      ...data,
      slug: slugResult.value,
      saveKey,
      totalTime,
      tagNames: [...new Set(data.tags?.map((tag) => tag.trim()).filter(Boolean))],
      ingredients: data.ingredients.map((ingredient, sortOrder) => ({ ...ingredient, sortOrder })),
      instructions: data.instructions.map((instruction, sortOrder) => ({
        ...instruction,
        sortOrder,
      })),
    });
    deferEmbeddingGeneration(recipe.id, { ...recipe, tags: recipe.tags });
    revalidateRecipes(recipe.slug);
    return { success: true, data: recipe, slug: recipe.slug };
  } catch (error) {
    if (saveKey) {
      try {
        const existing = await prisma.recipe.findUnique({ where: { saveKey }, include });
        if (existing) return { success: true, data: existing, slug: existing.slug };
      } catch {
        /* Keep the original failure. */
      }
    }
    console.error("Recipe save failed:", error);
    return {
      success: false,
      error: "Could not save the recipe. Your draft is still here; please retry.",
    };
  }
}

// Update an existing recipe
export async function updateRecipe(
  id: string,
  input: Partial<RecipeInput> & {
    isFavorite?: boolean;
    cookCount?: number;
    lastCooked?: string;
  },
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  const validated = recipeInputSchema
    .partial()
    .extend({
      isFavorite: z.boolean().optional(),
      cookCount: z.number().int().nonnegative().optional(),
      lastCooked: z.string().datetime().optional(),
    })
    .safeParse(input);
  if (!validated.success)
    return { success: false, error: validated.error.issues[0]?.message || "Invalid recipe" };
  input = validated.data as typeof input;
  return safeTry(async function* () {
    // Find existing recipe
    const existing = yield* ResultAsync.fromPromise(
      prisma.recipe.findUnique({ where: { id }, include: { tags: true } }),
      toAppError,
    )
      .andThen((found) =>
        found ? ok(found) : err(new AppError("Recipe not found", "RECIPE_NOT_FOUND", 404)),
      )
      .safeUnwrap();

    // Generate new slug if title changed
    let slug = existing.slug;
    if (input.title && input.title !== existing.title) {
      slug = yield* generateUniqueSlug(input.title, id).safeUnwrap();
    }

    // Calculate total time
    const totalTime =
      input.totalTime ||
      (input.prepTime ?? existing.prepTime ?? 0) + (input.cookTime ?? existing.cookTime ?? 0) ||
      undefined;

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

    // Perform the update atomically so a failed nested write cannot leave
    // the recipe without its previous ingredients or instructions.
    const recipe = yield* ResultAsync.fromPromise(
      prisma.$transaction(async (tx) => {
        if (expectedUpdatedAt) {
          const locked = await tx.recipe.updateMany({
            where: { id, updatedAt: new Date(expectedUpdatedAt) },
            data: { updatedAt: new Date() },
          });
          if (!locked.count)
            throw new ValidationError(
              "This recipe changed while you were editing. Reload it before saving.",
            );
        }
        const tagConnections = input.tags
          ? await Promise.all(
              input.tags.map(async (tagName) => {
                const tagSlug = generateTagSlug(tagName);
                const tag = await tx.tag.upsert({
                  where: { slug: tagSlug },
                  create: { name: tagName, slug: tagSlug },
                  update: {},
                });
                return { id: tag.id };
              }),
            )
          : ([] as { id: string }[]);

        if (input.ingredients) {
          await tx.ingredient.deleteMany({ where: { recipeId: id } });
        }
        if (input.instructions) {
          await tx.instruction.deleteMany({ where: { recipeId: id } });
        }
        return tx.recipe.update({
          where: { id },
          data: {
            ...updateData,
            searchText: generateSearchText({
              ...existing,
              ...input,
              ingredients:
                input.ingredients ?? (await tx.ingredient.findMany({ where: { recipeId: id } })),
              instructions:
                input.instructions ?? (await tx.instruction.findMany({ where: { recipeId: id } })),
              tags: input.tags?.map((name) => ({ name })) ?? existing.tags,
            }),
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
      }),
      toAppError,
    ).safeUnwrap();

    // Side effects
    if (input.title || input.description || input.ingredients || input.instructions) {
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
    revalidateRecipes(existing.slug);
    revalidateRecipes(slug);

    return ok({ success: true as const, data: recipe, slug } as ActionResult);
  }).match(
    (result) => result,
    (error) => {
      console.error("Error updating recipe:", error);
      return { success: false as const, error: error.message };
    },
  );
}

// Toggle favorite status
export async function toggleFavorite(id: string, isFavorite: boolean): Promise<ActionResult> {
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
export async function markAsCooked(id: string, _currentCount: number): Promise<ActionResult> {
  return ResultAsync.fromPromise(
    prisma.recipe.update({
      where: { id },
      data: {
        cookCount: { increment: 1 },
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
  return ResultAsync.fromPromise(prisma.recipe.findUnique({ where: { id } }), toAppError)
    .andThen((existing) =>
      existing ? ok(existing) : err(new AppError("Recipe not found", "RECIPE_NOT_FOUND", 404)),
    )
    .andThen(() => ResultAsync.fromPromise(prisma.recipe.delete({ where: { id } }), toAppError))
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
