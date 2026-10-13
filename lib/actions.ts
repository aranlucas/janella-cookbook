"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ok, err, safeTry, ResultAsync } from "neverthrow";
import { prisma } from "@/lib/prisma";
import { recipeRelations } from "@/lib/recipe-queries";
import { generateUniqueSlug, generateTagSlug } from "@/lib/slug";
import { recipeInputSchema } from "@/lib/validations";
import { z } from "zod";
import { generateSearchText, generateEmbedding } from "@/lib/embeddings";
import type { Prisma } from "@prisma/client";
import { AppError, ValidationError, thrownValueSchema, toAppError } from "@/lib/errors";
import type { RecipeInput, RecipeWithRelations } from "@/types/recipe";
import { createRecipeSearchProjection } from "@/lib/search-projection";

export type ActionResult<T = RecipeWithRelations> =
  | { success: true; data: T; slug?: string }
  | { success: false; error: string };

function trimToNull(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function zeroToNull(value: number) {
  if (value === 0) {
    return null;
  }

  return value;
}

interface CreateIngredientInput {
  readonly quantity?: string;
  readonly unit?: string;
  readonly name: string;
  readonly notes?: string;
  readonly group?: string;
  readonly sortOrder: number;
}

interface CreateInstructionInput {
  readonly text: string;
  readonly group?: string;
  readonly sortOrder: number;
  readonly duration?: number;
  readonly imageUrl?: string;
}

interface CreateRecipeInDbInput {
  readonly title: string;
  readonly slug: string;
  readonly saveKey?: string;
  readonly description?: string | null;
  readonly prepTime?: number | null;
  readonly cookTime?: number | null;
  readonly totalTime?: number | null;
  readonly servings?: string | null;
  readonly difficulty?: RecipeInput["difficulty"];
  readonly cuisine?: string | null;
  readonly course?: RecipeInput["course"] | null;
  readonly sourceUrl?: string | null;
  readonly sourceType: RecipeInput["sourceType"];
  readonly imageUrl?: string | null;
  readonly notes?: string | null;
  readonly rating?: number | null;
  readonly ingredients: readonly CreateIngredientInput[];
  readonly instructions: readonly CreateInstructionInput[];
  readonly tagNames?: readonly string[];
}

const recipeUpdateSchema = recipeInputSchema.partial().extend({
  isFavorite: z.boolean().optional(),
  cookCount: z.number().int().nonnegative().optional(),
  lastCooked: z.string().datetime().optional(),
});

type RecipeUpdateInput = Readonly<
  Partial<Omit<RecipeInput, "prepTime" | "cookTime" | "totalTime" | "rating">> & {
    prepTime?: number | null;
    cookTime?: number | null;
    totalTime?: number | null;
    rating?: number | null;
    isFavorite?: boolean;
    cookCount?: number;
    lastCooked?: string;
  }
>;

/**
 * Revalidate all recipe-related caches
 * This triggers regeneration of static pages on-demand
 */
function revalidateRecipes(slug?: string) {
  // Revalidate home page (recipe list)
  for (const path of ["/", "/recipes", "/favorites", "/categories", "/dashboard", "/search"]) {
    revalidatePath(path);
  }

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
const searchProjection = createRecipeSearchProjection<Prisma.TransactionClient>({
  generateSearchText,
  generateEmbedding,
  invalidate: (tx, recipeId, searchText) => tx.$executeRaw`
    UPDATE "Recipe"
    SET "searchText" = ${searchText}, embedding = NULL
    WHERE id = ${recipeId}
  `,
  persistEmbedding: (recipeId, embedding, searchText) =>
    prisma.$executeRaw`
      UPDATE "Recipe"
      SET embedding = ${`[${embedding.join(",")}]`}::vector
      WHERE id = ${recipeId} AND "searchText" = ${searchText}
    `,
});

function deferEmbeddingGeneration(recipeId: string, searchText: string) {
  if (process.env.ENABLE_HOSTED_EMBEDDINGS !== "true" || !process.env.HUGGINGFACE_API_KEY) {
    return;
  }

  after(searchProjection.embeddingJob(recipeId, searchText));
}

// Helper to create recipe in DB with embedding
function createRecipeInDb(data: CreateRecipeInDbInput) {
  return prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.create({
      data: {
        saveKey: data.saveKey,
        title: data.title,
        slug: data.slug,
        description: trimToNull(data.description),
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        totalTime: data.totalTime,
        servings: trimToNull(data.servings),
        difficulty: data.difficulty ?? "MEDIUM",
        cuisine: trimToNull(data.cuisine),
        course: data.course,
        sourceUrl: trimToNull(data.sourceUrl),
        sourceType: data.sourceType,
        imageUrl: trimToNull(data.imageUrl),
        notes: trimToNull(data.notes),
        rating: data.rating,
        ingredients: {
          create: data.ingredients.map((ingredient) => ({ ...ingredient })),
        },
        instructions: {
          create: data.instructions.map((instruction) => ({ ...instruction })),
        },
        tags: {
          connectOrCreate: (data.tagNames ?? []).map((name) => ({
            where: { slug: generateTagSlug(name) },
            create: { name, slug: generateTagSlug(name) },
          })),
        },
      },
      include: recipeRelations,
    });

    return (await searchProjection.update(tx, recipe)).recipe;
  });
}

// Persist a reviewed recipe. A retry with the same key returns the same record.
export async function createRecipe(input: RecipeInput, saveKey?: string): Promise<ActionResult> {
  const validated = recipeInputSchema.safeParse(input);

  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || "Invalid recipe" };
  }

  if (saveKey && !z.string().uuid().safeParse(saveKey).success) {
    return { success: false, error: "Invalid save key" };
  }

  const data = validated.data;
  const include = recipeRelations;

  try {
    if (saveKey) {
      const existing = await prisma.recipe.findUnique({ where: { saveKey }, include });

      if (existing) {
        return { success: true, data: existing, slug: existing.slug };
      }
    }

    const slugResult = await generateUniqueSlug(data.title);

    if (slugResult.isErr()) {
      return { success: false, error: slugResult.error.message };
    }

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

    deferEmbeddingGeneration(recipe.id, recipe.searchText);
    revalidateRecipes(recipe.slug);

    return { success: true, data: recipe, slug: recipe.slug };
  } catch (error) {
    if (saveKey) {
      try {
        const existing = await prisma.recipe.findUnique({ where: { saveKey }, include });

        if (existing) {
          return { success: true, data: existing, slug: existing.slug };
        }
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
  input: RecipeUpdateInput,
  expectedUpdatedAt?: string,
): Promise<ActionResult> {
  const validated = recipeUpdateSchema.safeParse(input);

  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || "Invalid recipe" };
  }

  input = validated.data;

  const actionResult = await safeTry(async function* () {
    // Find existing recipe
    const existing = yield* ResultAsync.fromPromise(
      prisma.recipe.findUnique({ where: { id } }),
      (error) => toAppError(thrownValueSchema.parse(error)),
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

    // Preserve an explicit total when timing fields are untouched. A derived
    // total is persisted before generating the canonical search projection.
    let totalTime: number | null | undefined;

    if (input.totalTime !== undefined) {
      totalTime = input.totalTime;
    } else if (input.prepTime !== undefined || input.cookTime !== undefined) {
      totalTime = zeroToNull(
        (input.prepTime ?? existing.prepTime ?? 0) + (input.cookTime ?? existing.cookTime ?? 0),
      );
    }

    // Prepare update data, stripping undefined fields
    const updateData: Prisma.RecipeUpdateInput = {
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
    };

    // Perform the update atomically so a failed nested write cannot leave
    // the recipe without its previous ingredients or instructions.
    const { recipe, searchTextChanged } = yield* ResultAsync.fromPromise(
      prisma.$transaction(async (tx) => {
        if (expectedUpdatedAt) {
          const locked = await tx.recipe.updateMany({
            where: { id, updatedAt: new Date(expectedUpdatedAt) },
            data: { updatedAt: new Date() },
          });

          if (!locked.count) {
            throw new ValidationError(
              "This recipe changed while you were editing. Reload it before saving.",
            );
          }
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
          : [];

        if (input.ingredients) {
          await tx.ingredient.deleteMany({ where: { recipeId: id } });
        }

        if (input.instructions) {
          await tx.instruction.deleteMany({ where: { recipeId: id } });
        }

        const updated = await tx.recipe.update({
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

        return searchProjection.update(tx, updated);
      }),
      (error) => toAppError(thrownValueSchema.parse(error)),
    ).safeUnwrap();

    // Side effects
    if (searchTextChanged) {
      deferEmbeddingGeneration(id, recipe.searchText);
    }

    revalidateRecipes(existing.slug);
    revalidateRecipes(slug);

    return ok<ActionResult>({ success: true, data: recipe, slug });
  }).match(
    (result) => result,
    (error) => {
      console.error("Error updating recipe:", error);

      return { success: false as const, error: error.message };
    },
  );

  return actionResult;
}

// Toggle favorite status
export async function toggleFavorite(id: string, isFavorite: boolean): Promise<ActionResult> {
  const actionResult = await ResultAsync.fromPromise(
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
    (error) => toAppError(thrownValueSchema.parse(error)),
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

  return actionResult;
}

// Mark recipe as cooked
export async function markAsCooked(id: string, _currentCount: number): Promise<ActionResult> {
  const actionResult = await ResultAsync.fromPromise(
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
    (error) => toAppError(thrownValueSchema.parse(error)),
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

  return actionResult;
}

// Delete a recipe
export async function deleteRecipe(id: string): Promise<ActionResult<null>> {
  const actionResult = await ResultAsync.fromPromise(
    prisma.recipe.findUnique({ where: { id } }),
    (error) => toAppError(thrownValueSchema.parse(error)),
  )
    .andThen((existing) =>
      existing ? ok(existing) : err(new AppError("Recipe not found", "RECIPE_NOT_FOUND", 404)),
    )
    .andThen(() =>
      ResultAsync.fromPromise(prisma.recipe.delete({ where: { id } }), (error) =>
        toAppError(thrownValueSchema.parse(error)),
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

  return actionResult;
}

// Regenerate recipe from its source URL
