"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, generateTagSlug } from "@/lib/slug";
import { generateRecipeEmbedding } from "@/lib/embeddings";
import {
  parseRecipeFromUrl,
  parseRecipeFromText,
  parseRecipeFromYouTube,
} from "@/lib/recipe-parser";
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
  try {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { success: false, error: "Invalid URL" };
    }

    // Check if this URL has been imported before
    const existingRecipe = await prisma.recipe.findFirst({
      where: { sourceUrl: parsedUrl.toString() },
      select: { id: true, slug: true },
    });

    // Parse recipe from URL
    const parsed = await parseRecipeFromUrl(parsedUrl.toString());

    // If recipe exists, update it; otherwise create new one
    if (existingRecipe) {
      // Update existing recipe
      const result = await updateRecipe(existingRecipe.id, {
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

      return result;
    }

    // Generate unique slug for new recipe
    const slug = await generateUniqueSlug(parsed.title);

    // Generate embedding
    let searchText: string | undefined;
    let embeddingData: number[] | undefined;

    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const embedResult = await generateRecipeEmbedding({
          title: parsed.title,
          description: parsed.description,
          cuisine: parsed.cuisine,
          course: parsed.course,
          ingredients: parsed.ingredients,
          instructions: parsed.instructions,
          totalTime: parsed.totalTime,
          difficulty: parsed.difficulty,
        });
        searchText = embedResult.searchText;
        embeddingData = embedResult.embedding;
      } catch (e) {
        console.error("Failed to generate embedding:", e);
      }
    }

    // Create recipe
    const recipe = await createRecipeInDb({
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
      sourceUrl: parsedUrl.toString(),
      sourceType: "URL_IMPORT",
      imageUrl: parsed.imageUrl,
      searchText,
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
    });

    // Update embedding
    if (embeddingData) {
      const embeddingString = `[${embeddingData.join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "Recipe"
        SET embedding = ${embeddingString}::vector
        WHERE id = ${recipe.id}
      `;
    }

    revalidateRecipes(slug);
    return { success: true, data: recipe, slug };
  } catch (error) {
    console.error("Error importing recipe from URL:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import recipe",
    };
  }
}

// Import recipe from text
export async function importFromText(text: string): Promise<ActionResult> {
  try {
    if (!text.trim()) {
      return { success: false, error: "Text is required" };
    }

    // Parse recipe from text
    const parsed = await parseRecipeFromText(text);

    // Generate slug
    const slug = await generateUniqueSlug(parsed.title);

    // Generate embedding
    let searchText: string | undefined;
    let embeddingData: number[] | undefined;

    try {
      const embedResult = await generateRecipeEmbedding({
        title: parsed.title,
        description: parsed.description,
        cuisine: parsed.cuisine,
        course: parsed.course,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        totalTime: parsed.totalTime,
        difficulty: parsed.difficulty,
      });
      searchText = embedResult.searchText;
      embeddingData = embedResult.embedding;
    } catch (e) {
      console.error("Failed to generate embedding:", e);
    }

    // Create recipe
    const recipe = await createRecipeInDb({
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
      searchText,
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
    });

    // Update embedding
    if (embeddingData) {
      const embeddingString = `[${embeddingData.join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "Recipe"
        SET embedding = ${embeddingString}::vector
        WHERE id = ${recipe.id}
      `;
    }

    revalidateRecipes(slug);
    return { success: true, data: recipe, slug };
  } catch (error) {
    console.error("Error importing recipe from text:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse recipe",
    };
  }
}

// Import recipe from YouTube video
export async function importFromYouTube(url: string): Promise<ActionResult> {
  try {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { success: false, error: "Invalid URL" };
    }

    // Check if this YouTube URL has been imported before
    const existingRecipe = await prisma.recipe.findFirst({
      where: { sourceUrl: parsedUrl.toString() },
      select: { id: true, slug: true },
    });

    // Parse recipe from YouTube video
    const parsed = await parseRecipeFromYouTube(parsedUrl.toString());

    // If recipe exists, update it; otherwise create new one
    if (existingRecipe) {
      // Update existing recipe
      const result = await updateRecipe(existingRecipe.id, {
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

      return result;
    }

    // Generate unique slug for new recipe
    const slug = await generateUniqueSlug(parsed.title);

    // Generate embedding
    let searchText: string | undefined;
    let embeddingData: number[] | undefined;

    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const embedResult = await generateRecipeEmbedding({
          title: parsed.title,
          description: parsed.description,
          cuisine: parsed.cuisine,
          course: parsed.course,
          ingredients: parsed.ingredients,
          instructions: parsed.instructions,
          totalTime: parsed.totalTime,
          difficulty: parsed.difficulty,
        });
        searchText = embedResult.searchText;
        embeddingData = embedResult.embedding;
      } catch (e) {
        console.error("Failed to generate embedding:", e);
      }
    }

    // Create recipe
    const recipe = await createRecipeInDb({
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
      sourceUrl: parsedUrl.toString(),
      sourceType: "URL_IMPORT",
      imageUrl: parsed.imageUrl,
      searchText,
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
    });

    // Update embedding
    if (embeddingData) {
      const embeddingString = `[${embeddingData.join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "Recipe"
        SET embedding = ${embeddingString}::vector
        WHERE id = ${recipe.id}
      `;
    }

    revalidateRecipes(slug);
    return { success: true, data: recipe, slug };
  } catch (error) {
    console.error("Error importing recipe from YouTube:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import recipe",
    };
  }
}

// Create a new recipe manually
export async function createRecipe(input: RecipeInput): Promise<ActionResult> {
  try {
    if (!input.title) {
      return { success: false, error: "Title is required" };
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(input.title);

    // Calculate total time
    const totalTime =
      input.totalTime ||
      (input.prepTime || 0) + (input.cookTime || 0) ||
      undefined;

    // Create or find tags
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

    // Generate embedding
    let searchText: string | undefined;
    let embeddingData: number[] | undefined;

    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const embedResult = await generateRecipeEmbedding({
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
        searchText = embedResult.searchText;
        embeddingData = embedResult.embedding;
      } catch (e) {
        console.error("Failed to generate embedding:", e);
      }
    }

    // Create recipe
    const recipe = await createRecipeInDb({
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
      searchText,
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
    });

    // Update embedding
    if (embeddingData) {
      const embeddingString = `[${embeddingData.join(",")}]`;
      await prisma.$executeRaw`
        UPDATE "Recipe"
        SET embedding = ${embeddingString}::vector
        WHERE id = ${recipe.id}
      `;
    }

    revalidateRecipes(slug);
    return { success: true, data: recipe, slug };
  } catch (error) {
    console.error("Error creating recipe:", error);
    return { success: false, error: "Failed to create recipe" };
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
): Promise<ActionResult> {
  try {
    // Check if recipe exists
    const existing = await prisma.recipe.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!existing) {
      return { success: false, error: "Recipe not found" };
    }

    // Generate new slug if title changed
    let slug = existing.slug;
    if (input.title && input.title !== existing.title) {
      slug = await generateUniqueSlug(input.title, id);
    }

    // Calculate total time
    const totalTime =
      input.totalTime ||
      (input.prepTime ?? existing.prepTime ?? 0) +
        (input.cookTime ?? existing.cookTime ?? 0) ||
      undefined;

    // Handle tags
    let tagConnections: { id: string }[] = [];
    if (input.tags) {
      tagConnections = await Promise.all(
        input.tags.map(async (tagName) => {
          const tagSlug = generateTagSlug(tagName);
          const tag = await prisma.tag.upsert({
            where: { slug: tagSlug },
            create: { name: tagName, slug: tagSlug },
            update: {},
          });
          return { id: tag.id };
        }),
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
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

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update ingredients if provided
    if (input.ingredients) {
      await prisma.ingredient.deleteMany({ where: { recipeId: id } });
    }

    // Update instructions if provided
    if (input.instructions) {
      await prisma.instruction.deleteMany({ where: { recipeId: id } });
    }

    // Update recipe
    const recipe = await prisma.recipe.update({
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

    // Regenerate embedding if content changed
    if (
      process.env.HUGGINGFACE_API_KEY &&
      (input.title ||
        input.description ||
        input.ingredients ||
        input.instructions)
    ) {
      try {
        const recipeForEmbedding = {
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          course: recipe.course,
          tags: recipe.tags,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          totalTime: recipe.totalTime,
          difficulty: recipe.difficulty,
        };

        const { searchText, embedding } =
          await generateRecipeEmbedding(recipeForEmbedding);
        const embeddingString = `[${embedding.join(",")}]`;

        await prisma.$executeRaw`
          UPDATE "Recipe"
          SET "searchText" = ${searchText}, embedding = ${embeddingString}::vector
          WHERE id = ${id}
        `;
      } catch (e) {
        console.error("Failed to regenerate embedding:", e);
      }
    }

    revalidateRecipes(slug);
    return { success: true, data: recipe, slug };
  } catch (error) {
    console.error("Error updating recipe:", error);
    return { success: false, error: "Failed to update recipe" };
  }
}

// Toggle favorite status
export async function toggleFavorite(
  id: string,
  isFavorite: boolean,
): Promise<ActionResult> {
  try {
    const recipe = await prisma.recipe.update({
      where: { id },
      data: { isFavorite },
      include: {
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
        tags: true,
        images: true,
      },
    });

    revalidateRecipes(recipe.slug);
    return { success: true, data: recipe };
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return { success: false, error: "Failed to update favorite status" };
  }
}

// Mark recipe as cooked
export async function markAsCooked(
  id: string,
  currentCount: number,
): Promise<ActionResult> {
  try {
    const recipe = await prisma.recipe.update({
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
    });

    revalidateRecipes(recipe.slug);
    return { success: true, data: recipe };
  } catch (error) {
    console.error("Error marking as cooked:", error);
    return { success: false, error: "Failed to mark as cooked" };
  }
}

// Delete a recipe
export async function deleteRecipe(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const existing = await prisma.recipe.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "Recipe not found" };
    }

    await prisma.recipe.delete({ where: { id } });

    revalidateRecipes();
    return { success: true };
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return { success: false, error: "Failed to delete recipe" };
  }
}

// Regenerate recipe from its source URL
export async function regenerateFromSource(id: string): Promise<ActionResult> {
  try {
    // Fetch the recipe to get its source URL
    const existing = await prisma.recipe.findUnique({
      where: { id },
      select: { sourceUrl: true, slug: true },
    });

    if (!existing) {
      return { success: false, error: "Recipe not found" };
    }

    if (!existing.sourceUrl) {
      return {
        success: false,
        error: "Recipe does not have a source URL to regenerate from",
      };
    }

    // Parse the recipe from the source URL again
    const parsed = await parseRecipeFromUrl(existing.sourceUrl);

    // Update the recipe with the newly parsed data
    const result = await updateRecipe(id, {
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

    return result;
  } catch (error) {
    console.error("Error regenerating recipe from source:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to regenerate recipe",
    };
  }
}
