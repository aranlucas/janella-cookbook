import prisma from "./prisma";
import type {
  Recipe,
  Ingredient,
  Instruction,
  RecipeTranslation,
  IngredientTranslation,
  InstructionTranslation,
  Tag,
  RecipeImage,
} from "@prisma/client";
import type {
  RecipeWithRelations,
  RecipeWithTranslations,
  LocalizedRecipe,
  RecipeTranslationWithRelations,
} from "@/types/recipe";

/**
 * Get a recipe in a specific locale
 * Falls back to original if translation doesn't exist
 */
export async function getLocalizedRecipe(
  recipeId: string,
  locale: string = "en",
): Promise<LocalizedRecipe | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        orderBy: { sortOrder: "asc" },
      },
      instructions: {
        orderBy: { sortOrder: "asc" },
      },
      tags: true,
      images: true,
      translations: {
        where: { locale },
        include: {
          ingredients: true,
          instructions: true,
        },
      },
    },
  });

  if (!recipe) {
    return null;
  }

  return mergeRecipeWithTranslation(recipe, locale);
}

/**
 * Get a recipe by slug in a specific locale
 */
export async function getLocalizedRecipeBySlug(
  slug: string,
  locale: string = "en",
): Promise<LocalizedRecipe | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { slug },
    include: {
      ingredients: {
        orderBy: { sortOrder: "asc" },
      },
      instructions: {
        orderBy: { sortOrder: "asc" },
      },
      tags: true,
      images: true,
      translations: {
        where: { locale },
        include: {
          ingredients: true,
          instructions: true,
        },
      },
    },
  });

  if (!recipe) {
    return null;
  }

  return mergeRecipeWithTranslation(recipe, locale);
}

/**
 * Get multiple recipes in a specific locale
 */
export async function getLocalizedRecipes(
  options: {
    locale?: string;
    limit?: number;
    offset?: number;
    where?: any;
    orderBy?: any;
  } = {},
): Promise<LocalizedRecipe[]> {
  const {
    locale = "en",
    limit = 20,
    offset = 0,
    where = {},
    orderBy,
  } = options;

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      ingredients: {
        orderBy: { sortOrder: "asc" },
      },
      instructions: {
        orderBy: { sortOrder: "asc" },
      },
      tags: true,
      images: true,
      translations: {
        where: { locale },
        include: {
          ingredients: true,
          instructions: true,
        },
      },
    },
    orderBy: orderBy || { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return recipes.map((recipe) => mergeRecipeWithTranslation(recipe, locale));
}

/**
 * Merge a recipe with its translation (if exists)
 */
function mergeRecipeWithTranslation(
  recipe: Recipe & {
    ingredients: Ingredient[];
    instructions: Instruction[];
    tags: Tag[];
    images: RecipeImage[];
    translations: Array<
      RecipeTranslation & {
        ingredients: IngredientTranslation[];
        instructions: InstructionTranslation[];
      }
    >;
  },
  locale: string,
): LocalizedRecipe {
  const translation = recipe.translations[0];
  const isTranslated = !!translation && locale !== recipe.locale;

  if (!translation) {
    // Return original recipe
    return {
      ...recipe,
      ingredients: recipe.ingredients.map((ing) => ({
        id: ing.id,
        quantity: ing.quantity || undefined,
        unit: ing.unit || undefined,
        name: ing.name,
        notes: ing.notes || undefined,
        group: ing.group || undefined,
        sortOrder: ing.sortOrder,
      })),
      instructions: recipe.instructions.map((inst) => ({
        id: inst.id,
        text: inst.text,
        group: inst.group || undefined,
        sortOrder: inst.sortOrder,
        duration: inst.duration || undefined,
        imageUrl: inst.imageUrl || undefined,
      })),
      locale: recipe.locale,
      isTranslated: false,
    };
  }

  // Map ingredient translations back to original order
  const ingredientMap = new Map(
    translation.ingredients.map((t) => [t.originalIngredientId, t]),
  );

  const localizedIngredients = recipe.ingredients.map((original) => {
    const translated = ingredientMap.get(original.id);
    return {
      id: original.id,
      quantity: original.quantity || undefined,
      unit: translated?.unit || original.unit || undefined,
      name: translated?.name || original.name,
      notes: translated?.notes || original.notes || undefined,
      group: translated?.group || original.group || undefined,
      sortOrder: original.sortOrder,
    };
  });

  // Map instruction translations back to original order
  const instructionMap = new Map(
    translation.instructions.map((t) => [t.originalInstructionId, t]),
  );

  const localizedInstructions = recipe.instructions.map((original) => {
    const translated = instructionMap.get(original.id);
    return {
      id: original.id,
      text: translated?.text || original.text,
      group: translated?.group || original.group || undefined,
      sortOrder: original.sortOrder,
      duration: original.duration || undefined,
      imageUrl: original.imageUrl || undefined,
    };
  });

  return {
    ...recipe,
    title: translation.title,
    description: translation.description || recipe.description,
    servings: translation.servings || recipe.servings,
    notes: translation.notes || recipe.notes,
    ingredients: localizedIngredients,
    instructions: localizedInstructions,
    locale,
    isTranslated,
  };
}

/**
 * Check if a recipe has a translation in a specific locale
 */
export async function hasTranslation(
  recipeId: string,
  locale: string,
): Promise<boolean> {
  const count = await prisma.recipeTranslation.count({
    where: {
      recipeId,
      locale,
    },
  });

  return count > 0;
}

/**
 * Get all available locales for a recipe
 */
export async function getAvailableLocales(recipeId: string): Promise<string[]> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: {
      locale: true,
      translations: {
        select: {
          locale: true,
        },
      },
    },
  });

  if (!recipe) {
    return [];
  }

  return [recipe.locale, ...recipe.translations.map((t) => t.locale)];
}

/**
 * Get translation statistics
 */
export async function getTranslationStats(): Promise<{
  totalRecipes: number;
  translatedRecipes: number;
  translationsByLocale: Record<string, number>;
}> {
  const totalRecipes = await prisma.recipe.count();

  const translations = await prisma.recipeTranslation.groupBy({
    by: ["recipeId", "locale"],
    _count: true,
  });

  const translatedRecipes = new Set(translations.map((t) => t.recipeId)).size;

  const translationsByLocale: Record<string, number> = {};
  for (const translation of translations) {
    translationsByLocale[translation.locale] =
      (translationsByLocale[translation.locale] || 0) + 1;
  }

  return {
    totalRecipes,
    translatedRecipes,
    translationsByLocale,
  };
}
