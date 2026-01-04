import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { load } from "cheerio";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import type { ParsedRecipe, Course, Difficulty } from "@/types/recipe";

// OpenRouter client configured for AI SDK
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const model = openrouter("mistralai/devstral-2512:free");

// Zod schema for recipe parsing
const recipeSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  ingredients: z.array(
    z.object({
      quantity: z.string().optional(),
      unit: z.string().optional(),
      name: z.string(),
      notes: z.string().optional(),
      group: z.string().optional(),
    }),
  ),
  instructions: z.array(
    z
      .object({
        text: z.string(),
        group: z.string().optional(),
      })
      .optional(),
  ),
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  totalTime: z.number().optional(),
  servings: z.string().optional(),
  cuisine: z.string().optional(),
  course: z
    .enum([
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
    ])
    .optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).optional(),
});

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

  return extractRecipeWithAI(html);
}

/**
 * Extract recipe using AI from HTML content
 */
async function extractRecipeWithAI(html: string): Promise<ParsedRecipe> {
  // First try Readability (linkedom provides a lightweight DOM for Readability)
  let content = "";
  try {
    const { document } = parseHTML(html);
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();
    if (article?.textContent) content = article.textContent;
  } catch {
    // ignore and fall back to selector heuristics
  }

  if (!content) {
    const $ = load(html);
    const articleEl = $("article").first();
    if (articleEl.length) content = articleEl.text();
    else if ($("main").length) content = $("main").text();
    else if ($("[role=main]").length) content = $("[role=main]").text();
    else content = $("body").text() || "";
  }

  // Limit content length
  const truncatedContent = content.slice(0, 12000);

  const { output: parsed } = await generateText({
    model: model,
    output: Output.object({ schema: recipeSchema }),
    system: `You are a recipe extraction expert. Extract recipe data from the provided webpage content.
Be accurate and only include information present in the content. Extract all ingredients and instructions even if formatting is messy. Output in structured JSON format.`,
    prompt: `Extract the recipe from this content:\n\n${truncatedContent}`,
  });

  return {
    title: parsed.title || "Untitled Recipe",
    description: parsed.description,
    ingredients: (parsed.ingredients || []).map((ing, i: number) => ({
      ...ing,
      sortOrder: i,
    })),
    instructions: (parsed.instructions || []).map((inst, i: number) => ({
      text: inst?.text || "",
      group: inst?.group,
      sortOrder: i,
    })),
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
  const { output: parsed } = await generateText({
    model: model,
    output: Output.object({ schema: recipeSchema }),
    system: `You are a recipe parsing expert. Parse the provided recipe text into structured JSON.
Be accurate and organized. Extract all ingredients and instructions even if formatting is messy.`,
    prompt: text,
  });

  return {
    title: parsed.title || "Untitled Recipe",
    description: parsed.description,
    ingredients: (parsed.ingredients || []).map((ing, i: number) => ({
      ...ing,
      sortOrder: i,
    })),
    instructions: (parsed.instructions || []).map((inst, i: number) => ({
      text: inst?.text || "",
      group: inst?.group,
      sortOrder: i,
    })),
    prepTime: parsed.prepTime,
    cookTime: parsed.cookTime,
    totalTime: parsed.totalTime,
    servings: parsed.servings,
    cuisine: parsed.cuisine,
    course: parsed.course as Course | undefined,
    difficulty: parsed.difficulty as Difficulty | undefined,
  };
}
