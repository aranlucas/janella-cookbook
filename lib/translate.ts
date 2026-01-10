import prisma from "./prisma";
import type { Recipe, Ingredient, Instruction } from "@prisma/client";

interface RecipeWithRelations extends Recipe {
  ingredients: Ingredient[];
  instructions: Instruction[];
}

/**
 * Translate a recipe to a target language using OpenRouter API
 */
export async function translateRecipe(
  recipe: RecipeWithRelations,
  targetLocale: string,
  apiKey?: string,
) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("Translation API key not provided");
  }

  // Prepare the content to translate
  const content = {
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    notes: recipe.notes,
    ingredients: recipe.ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      notes: ing.notes,
      group: ing.group,
    })),
    instructions: recipe.instructions.map((inst) => ({
      id: inst.id,
      text: inst.text,
      group: inst.group,
    })),
  };

  // Call OpenRouter API for translation
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content: `You are a professional recipe translator. Translate the following recipe to ${getLanguageName(targetLocale)}.

IMPORTANT RULES:
1. Keep all measurements and quantities EXACTLY as they are (don't convert units)
2. Translate ingredient names, cooking instructions, and descriptions naturally
3. Preserve the structure and formatting
4. Keep technical cooking terms accurate
5. Maintain the tone and style of the original recipe
6. Return ONLY valid JSON with no additional text

Recipe to translate:
${JSON.stringify(content, null, 2)}

Return the translation in this exact JSON format:
{
  "title": "translated title",
  "description": "translated description",
  "servings": "translated servings",
  "notes": "translated notes",
  "ingredients": [
    {
      "id": "original-id",
      "name": "translated ingredient name",
      "unit": "translated unit (or keep original if it's a standard abbreviation)",
      "notes": "translated notes",
      "group": "translated group name"
    }
  ],
  "instructions": [
    {
      "id": "original-id",
      "text": "translated instruction text",
      "group": "translated group name"
    }
  ]
}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.statusText}`);
  }

  const data = await response.json();
  const translatedContent = JSON.parse(data.choices[0].message.content);

  // Create search text for the translation
  const searchText = [
    translatedContent.title,
    translatedContent.description,
    ...translatedContent.ingredients.map(
      (i: any) => `${i.name} ${i.unit || ""}`,
    ),
    ...translatedContent.instructions.map((i: any) => i.text),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Save to database
  const translation = await prisma.recipeTranslation.create({
    data: {
      recipeId: recipe.id,
      locale: targetLocale,
      title: translatedContent.title,
      description: translatedContent.description,
      servings: translatedContent.servings,
      notes: translatedContent.notes,
      searchText,
      ingredients: {
        create: translatedContent.ingredients.map((ing: any) => ({
          originalIngredientId: ing.id,
          name: ing.name,
          unit: ing.unit,
          notes: ing.notes,
          group: ing.group,
        })),
      },
      instructions: {
        create: translatedContent.instructions.map((inst: any) => ({
          originalInstructionId: inst.id,
          text: inst.text,
          group: inst.group,
        })),
      },
    },
    include: {
      ingredients: true,
      instructions: true,
    },
  });

  return translation;
}

/**
 * Get the full language name from locale code
 */
function getLanguageName(locale: string): string {
  const languages: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ru: "Russian",
    ar: "Arabic",
    hi: "Hindi",
    nl: "Dutch",
    pl: "Polish",
    tr: "Turkish",
    vi: "Vietnamese",
    th: "Thai",
    sv: "Swedish",
    no: "Norwegian",
    da: "Danish",
    fi: "Finnish",
    cs: "Czech",
    hu: "Hungarian",
    ro: "Romanian",
    uk: "Ukrainian",
    el: "Greek",
    he: "Hebrew",
    id: "Indonesian",
    ms: "Malay",
  };

  return languages[locale.split("-")[0]] || locale;
}

/**
 * Get supported locales
 */
export function getSupportedLocales(): string[] {
  return [
    "en", // English
    "es", // Spanish
    "fr", // French
    "de", // German
    "it", // Italian
    "pt", // Portuguese
    "ja", // Japanese
    "ko", // Korean
    "zh", // Chinese
    "ru", // Russian
    "ar", // Arabic
    "nl", // Dutch
  ];
}

/**
 * Batch translate multiple recipes
 */
export async function batchTranslateRecipes(
  recipeIds: string[],
  targetLocale: string,
  apiKey?: string,
) {
  const results = [];

  for (const recipeId of recipeIds) {
    try {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: {
            orderBy: { sortOrder: "asc" },
          },
          instructions: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!recipe) {
        results.push({
          recipeId,
          success: false,
          error: "Recipe not found",
        });
        continue;
      }

      // Check if translation already exists
      const existing = await prisma.recipeTranslation.findUnique({
        where: {
          recipeId_locale: {
            recipeId,
            locale: targetLocale,
          },
        },
      });

      if (existing) {
        results.push({
          recipeId,
          success: false,
          error: "Translation already exists",
        });
        continue;
      }

      const translation = await translateRecipe(recipe, targetLocale, apiKey);

      results.push({
        recipeId,
        success: true,
        translationId: translation.id,
      });
    } catch (error) {
      results.push({
        recipeId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
