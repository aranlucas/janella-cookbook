import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { load } from "cheerio";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { RecipeParseError, ExternalApiError, withRetry } from "./errors";
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
 * Extract the most important image from HTML content
 * Priority: JSON-LD schema > Open Graph > Twitter Card > Common selectors
 */
function extractImageFromHtml(
  html: string,
  baseUrl: string,
): string | undefined {
  const $ = load(html);

  // Helper to resolve relative URLs
  const resolveUrl = (imgUrl: string | undefined): string | undefined => {
    if (!imgUrl) return undefined;
    try {
      return new URL(imgUrl, baseUrl).href;
    } catch {
      return imgUrl;
    }
  };

  // 1. Try JSON-LD schema.org Recipe format (most reliable for recipe sites)
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const content = $(jsonLdScripts[i]).html();
      if (!content) continue;

      const data = JSON.parse(content);
      const recipes = findRecipeInJsonLd(data);

      for (const recipe of recipes) {
        if (recipe.image) {
          // image can be string, array of strings, or ImageObject(s)
          const img = Array.isArray(recipe.image)
            ? recipe.image[0]
            : recipe.image;
          if (typeof img === "string") {
            return resolveUrl(img);
          } else if (img?.url) {
            return resolveUrl(img.url);
          }
        }
      }
    } catch {
      // Invalid JSON, continue to next script
    }
  }

  // 2. Try Open Graph meta tag (commonly used for social sharing)
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    return resolveUrl(ogImage);
  }

  // 3. Try Twitter Card image
  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  if (twitterImage) {
    return resolveUrl(twitterImage);
  }

  // 4. Try common recipe image selectors
  const selectors = [
    'img[itemprop="image"]',
    ".recipe-image img",
    '[class*="recipe-hero"] img',
    '[class*="recipe-image"] img',
    ".recipe-photo img",
    ".hero-image img",
    '[class*="hero-image"] img',
    "article img",
    ".post-content img",
    "main img",
  ];

  for (const selector of selectors) {
    const img = $(selector).first();
    const src =
      img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src");
    if (src && !src.includes("placeholder") && !src.includes("avatar")) {
      return resolveUrl(src);
    }
  }

  return undefined;
}

/**
 * Find Recipe objects within JSON-LD data (handles @graph arrays)
 */
function findRecipeInJsonLd(data: unknown): Array<{ image?: unknown }> {
  const recipes: Array<{ image?: unknown }> = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      recipes.push(...findRecipeInJsonLd(item));
    }
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    // Check if this is a Recipe
    if (
      obj["@type"] === "Recipe" ||
      (Array.isArray(obj["@type"]) && obj["@type"].includes("Recipe"))
    ) {
      recipes.push(obj as { image?: unknown });
    }

    // Check @graph array
    if (Array.isArray(obj["@graph"])) {
      recipes.push(...findRecipeInJsonLd(obj["@graph"]));
    }
  }

  return recipes;
}

/**
 * Validate and sanitize URL
 */
function validateUrl(url: string): URL {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new RecipeParseError("Only HTTP and HTTPS URLs are supported", url);
    }
    return parsed;
  } catch (error) {
    if (error instanceof RecipeParseError) throw error;
    throw new RecipeParseError("Invalid URL format", url);
  }
}

/**
 * Parse a recipe from a URL
 */
export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const validatedUrl = validateUrl(url);

  let html: string;
  try {
    const response = await withRetry(
      async () => {
        const res = await fetch(validatedUrl.href, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CookbookBot/1.0)",
            Accept: "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!res.ok) {
          throw new RecipeParseError(
            `Failed to fetch URL: ${res.status} ${res.statusText}`,
            url,
          );
        }

        return res;
      },
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        shouldRetry: (error) => {
          // Don't retry on 4xx errors
          if (error instanceof RecipeParseError) {
            return !error.message.includes("4");
          }
          return true;
        },
      },
    );

    html = await response.text();
  } catch (error) {
    if (error instanceof RecipeParseError) throw error;
    throw new RecipeParseError(
      `Failed to fetch recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
      url,
    );
  }

  return extractRecipeWithAI(html, url);
}

/**
 * Extract recipe using AI from HTML content
 */
async function extractRecipeWithAI(
  html: string,
  sourceUrl: string,
): Promise<ParsedRecipe> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new ExternalApiError(
      "OpenRouter",
      "OPENROUTER_API_KEY environment variable is not set",
    );
  }

  // Extract the main image before processing content
  const imageUrl = extractImageFromHtml(html, sourceUrl);

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

  // Clean and limit content length
  const cleanedContent = content.replace(/\s+/g, " ").trim().slice(0, 12000);

  if (cleanedContent.length < 50) {
    throw new RecipeParseError(
      "Could not extract enough content from the page to parse a recipe",
      sourceUrl,
    );
  }

  try {
    const { output: parsed } = await withRetry(
      async () => {
        return await generateText({
          model: model,
          output: Output.object({ schema: recipeSchema }),
          system: `You are a recipe extraction expert. Extract recipe data from the provided webpage content.
Be accurate and only include information present in the content. Extract all ingredients and instructions even if formatting is messy. Output in structured JSON format.`,
          prompt: `Extract the recipe from this content:\n\n${cleanedContent}`,
        });
      },
      {
        maxRetries: 2,
        initialDelayMs: 2000,
      },
    );

    // Validate we got a proper recipe
    if (!parsed.title || parsed.title === "Untitled Recipe") {
      throw new RecipeParseError(
        "Could not extract recipe title from the page",
        sourceUrl,
      );
    }

    if (!parsed.ingredients || parsed.ingredients.length === 0) {
      throw new RecipeParseError(
        "Could not extract any ingredients from the page",
        sourceUrl,
      );
    }

    return {
      title: parsed.title,
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
      imageUrl,
    };
  } catch (error) {
    if (error instanceof RecipeParseError) throw error;
    throw new ExternalApiError(
      "OpenRouter",
      `Failed to parse recipe with AI: ${error instanceof Error ? error.message : "Unknown error"}`,
      error,
    );
  }
}

/**
 * Parse a recipe from natural language text
 */
export async function parseRecipeFromText(text: string): Promise<ParsedRecipe> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new ExternalApiError(
      "OpenRouter",
      "OPENROUTER_API_KEY environment variable is not set",
    );
  }

  if (!text || text.trim().length < 20) {
    throw new RecipeParseError("Please provide more recipe text to parse");
  }

  try {
    const { output: parsed } = await withRetry(
      async () => {
        return await generateText({
          model: model,
          output: Output.object({ schema: recipeSchema }),
          system: `You are a recipe parsing expert. Parse the provided recipe text into structured JSON.
Be accurate and organized. Extract all ingredients and instructions even if formatting is messy.`,
          prompt: text.slice(0, 15000), // Limit input size
        });
      },
      {
        maxRetries: 2,
        initialDelayMs: 2000,
      },
    );

    // Validate we got a proper recipe
    if (!parsed.ingredients || parsed.ingredients.length === 0) {
      throw new RecipeParseError(
        "Could not extract any ingredients from the text",
      );
    }

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
  } catch (error) {
    if (error instanceof RecipeParseError) throw error;
    throw new ExternalApiError(
      "OpenRouter",
      `Failed to parse recipe text: ${error instanceof Error ? error.message : "Unknown error"}`,
      error,
    );
  }
}
