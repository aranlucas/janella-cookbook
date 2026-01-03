import OpenAI from "openai";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type {
  ParsedRecipe,
  IngredientInput,
  InstructionInput,
  Course,
  Difficulty,
} from "@/types/recipe";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface JsonLdRecipe {
  "@type": string;
  name?: string;
  description?: string;
  image?: string | string[] | { url: string }[];
  recipeIngredient?: string[];
  recipeInstructions?: Array<string | { "@type": string; text: string }>;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | string[];
  recipeCuisine?: string | string[];
  recipeCategory?: string | string[];
  keywords?: string;
}

/**
 * Parse a recipe from a URL
 */
export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CookbookBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();

  // Strategy 1: Try JSON-LD structured data
  const jsonLd = extractJsonLd(html);
  if (jsonLd && jsonLd["@type"] === "Recipe") {
    return parseJsonLdRecipe(jsonLd);
  }

  // Strategy 2: Use AI to extract recipe
  return extractRecipeWithAI(html, url);
}

/**
 * Extract JSON-LD data from HTML
 */
function extractJsonLd(html: string): JsonLdRecipe | null {
  const dom = new JSDOM(html);
  const scripts = dom.window.document.querySelectorAll(
    'script[type="application/ld+json"]',
  );

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "");

      // Handle array of objects
      if (Array.isArray(data)) {
        const recipe = data.find((item) => item["@type"] === "Recipe");
        if (recipe) return recipe;
      }

      // Handle @graph structure
      if (data["@graph"]) {
        const recipe = data["@graph"].find(
          (item: JsonLdRecipe) => item["@type"] === "Recipe",
        );
        if (recipe) return recipe;
      }

      // Direct recipe object
      if (data["@type"] === "Recipe") {
        return data;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Parse a JSON-LD recipe into our format
 */
function parseJsonLdRecipe(jsonLd: JsonLdRecipe): ParsedRecipe {
  // Parse ingredients
  const ingredients: IngredientInput[] = (jsonLd.recipeIngredient || []).map(
    (ing, index) => {
      const parsed = parseIngredientString(ing);
      return { ...parsed, sortOrder: index };
    },
  );

  // Parse instructions
  const instructions: InstructionInput[] = (
    jsonLd.recipeInstructions || []
  ).map((inst, index) => {
    const text = typeof inst === "string" ? inst : inst.text;
    return { stepNumber: index + 1, text };
  });

  // Parse times (ISO 8601 duration)
  const prepTime = parseDuration(jsonLd.prepTime);
  const cookTime = parseDuration(jsonLd.cookTime);
  const totalTime =
    parseDuration(jsonLd.totalTime) ||
    (prepTime && cookTime ? prepTime + cookTime : undefined);

  // Get image URL
  let imageUrl: string | undefined;
  if (typeof jsonLd.image === "string") {
    imageUrl = jsonLd.image;
  } else if (Array.isArray(jsonLd.image) && jsonLd.image.length > 0) {
    const first = jsonLd.image[0];
    imageUrl = typeof first === "string" ? first : first.url;
  }

  // Get servings
  const servings = Array.isArray(jsonLd.recipeYield)
    ? jsonLd.recipeYield[0]
    : jsonLd.recipeYield;

  // Get cuisine
  const cuisine = Array.isArray(jsonLd.recipeCuisine)
    ? jsonLd.recipeCuisine[0]
    : jsonLd.recipeCuisine;

  // Try to map category to course
  const category = Array.isArray(jsonLd.recipeCategory)
    ? jsonLd.recipeCategory[0]
    : jsonLd.recipeCategory;
  const course = mapToCourse(category);

  return {
    title: jsonLd.name || "Untitled Recipe",
    description: jsonLd.description,
    ingredients,
    instructions,
    prepTime,
    cookTime,
    totalTime,
    servings,
    cuisine,
    course,
    imageUrl,
  };
}

/**
 * Parse an ingredient string into components
 */
function parseIngredientString(str: string): IngredientInput {
  // Try to extract quantity, unit, and name
  // Examples: "2 cups flour", "1/2 teaspoon salt", "3 large eggs"
  const match = str.match(/^([\d\s\/.-]+)?\s*(\w+)?\s+(.+)$/);

  if (match) {
    const [, quantityStr, potentialUnit, rest] = match;
    const units = [
      "cup",
      "cups",
      "tablespoon",
      "tablespoons",
      "tbsp",
      "teaspoon",
      "teaspoons",
      "tsp",
      "ounce",
      "ounces",
      "oz",
      "pound",
      "pounds",
      "lb",
      "lbs",
      "gram",
      "grams",
      "g",
      "kilogram",
      "kilograms",
      "kg",
      "ml",
      "milliliter",
      "milliliters",
      "liter",
      "liters",
      "l",
      "pinch",
      "dash",
      "clove",
      "cloves",
      "slice",
      "slices",
      "piece",
      "pieces",
      "whole",
      "large",
      "medium",
      "small",
      "can",
      "cans",
      "package",
      "packages",
    ];

    if (potentialUnit && units.includes(potentialUnit.toLowerCase())) {
      return {
        quantity: quantityStr?.trim(),
        unit: potentialUnit,
        name: rest.trim(),
      };
    }
  }

  // If parsing fails, return the whole string as name
  return { name: str.trim() };
}

/**
 * Parse ISO 8601 duration to minutes
 */
function parseDuration(duration?: string): number | undefined {
  if (!duration) return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 60 + minutes + Math.round(seconds / 60);
}

/**
 * Map a category string to a Course enum
 */
function mapToCourse(category?: string): Course | undefined {
  if (!category) return undefined;

  const lower = category.toLowerCase();
  const mapping: Record<string, Course> = {
    breakfast: "BREAKFAST",
    brunch: "BREAKFAST",
    lunch: "LUNCH",
    dinner: "DINNER",
    "main course": "DINNER",
    "main dish": "DINNER",
    entree: "DINNER",
    appetizer: "APPETIZER",
    starter: "APPETIZER",
    side: "SIDE",
    "side dish": "SIDE",
    dessert: "DESSERT",
    sweet: "DESSERT",
    snack: "SNACK",
    drink: "DRINK",
    beverage: "DRINK",
    cocktail: "DRINK",
    sauce: "SAUCE",
    condiment: "SAUCE",
    bread: "BREAD",
    baking: "BREAD",
  };

  return mapping[lower];
}

/**
 * Extract recipe using AI from HTML content
 */
async function extractRecipeWithAI(
  html: string,
  url: string,
): Promise<ParsedRecipe> {
  // Use Readability to extract main content
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const content = article?.textContent || "";

  // Limit content length
  const truncatedContent = content.slice(0, 12000);

  const client = getOpenAI();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recipe extraction expert. Extract recipe data from the provided webpage content.
Return a JSON object with these fields:
- title: string (required)
- description: string (optional)
- ingredients: array of objects with { quantity?, unit?, name, notes? }
- instructions: array of objects with { stepNumber, text }
- prepTime: number in minutes (optional)
- cookTime: number in minutes (optional)
- totalTime: number in minutes (optional)
- servings: string (optional)
- cuisine: string (optional)
- course: one of BREAKFAST, LUNCH, DINNER, APPETIZER, SIDE, DESSERT, SNACK, DRINK, SAUCE, BREAD (optional)
- difficulty: one of EASY, MEDIUM, HARD, EXPERT (optional)

Be accurate and only include information present in the content.`,
      },
      {
        role: "user",
        content: `Extract the recipe from this content:\n\n${truncatedContent}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");

  return {
    title: parsed.title || "Untitled Recipe",
    description: parsed.description,
    ingredients: (parsed.ingredients || []).map(
      (ing: IngredientInput, i: number) => ({
        ...ing,
        sortOrder: i,
      }),
    ),
    instructions: (parsed.instructions || []).map(
      (inst: InstructionInput, i: number) => ({
        stepNumber: inst.stepNumber || i + 1,
        text: inst.text,
      }),
    ),
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    totalTime: parsed.totalTime,
    servings: parsed.servings,
    cuisine: parsed.cuisine,
    course: parsed.course as Course | undefined,
    difficulty: parsed.difficulty as Difficulty | undefined,
  };
}

/**
 * Parse a recipe from natural language text
 */
export async function parseRecipeFromText(text: string): Promise<ParsedRecipe> {
  const client = getOpenAI();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a recipe parsing expert. Parse the provided recipe text into structured JSON.
Return a JSON object with these fields:
- title: string (required)
- description: string (optional)
- ingredients: array of objects with { quantity?, unit?, name, notes? }
- instructions: array of objects with { stepNumber, text }
- prepTime: number in minutes (optional)
- cookTime: number in minutes (optional)
- totalTime: number in minutes (optional)
- servings: string (optional)
- cuisine: string (optional)
- course: one of BREAKFAST, LUNCH, DINNER, APPETIZER, SIDE, DESSERT, SNACK, DRINK, SAUCE, BREAD (optional)
- difficulty: one of EASY, MEDIUM, HARD, EXPERT based on complexity (optional)

Be accurate and organized. Extract all ingredients and instructions even if formatting is messy.`,
      },
      {
        role: "user",
        content: text,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");

  return {
    title: parsed.title || "Untitled Recipe",
    description: parsed.description,
    ingredients: (parsed.ingredients || []).map(
      (ing: IngredientInput, i: number) => ({
        ...ing,
        sortOrder: i,
      }),
    ),
    instructions: (parsed.instructions || []).map(
      (inst: InstructionInput, i: number) => ({
        stepNumber: inst.stepNumber || i + 1,
        text: inst.text,
      }),
    ),
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    totalTime: parsed.totalTime,
    servings: parsed.servings,
    cuisine: parsed.cuisine,
    course: parsed.course as Course | undefined,
    difficulty: parsed.difficulty as Difficulty | undefined,
  };
}
