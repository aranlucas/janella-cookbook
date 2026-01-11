import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { load } from "cheerio";
import { encode } from "gpt-tokenizer";
import { RecipeParseError, ExternalApiError, withRetry } from "./errors";
import type { ParsedRecipe, Course, Difficulty } from "@/types/recipe";
import {
  extractYouTubeVideoId,
  getYouTubeTranscript,
  getYouTubeVideoMetadata,
} from "./youtube";

// OpenRouter client configured for AI SDK
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const model = openrouter("mistralai/devstral-2512:free");

// Model context window configuration
const MAX_CONTEXT_TOKENS = 256000; // Devstral 2512 supports 256K tokens
const SYSTEM_PROMPT_TOKENS = 500; // Estimate for system prompt
const RESPONSE_TOKENS = 2000; // Estimate for structured recipe response
const SAFETY_BUFFER = 3500; // Safety buffer
const MAX_INPUT_TOKENS =
  MAX_CONTEXT_TOKENS - SYSTEM_PROMPT_TOKENS - RESPONSE_TOKENS - SAFETY_BUFFER; // ~250K tokens

/**
 * Validate and truncate content to fit within token limits
 * @param content - The content to validate
 * @param maxTokens - Maximum allowed tokens (defaults to MAX_INPUT_TOKENS)
 * @returns Validated content truncated to fit within token limits
 */
function validateAndTruncateContent(
  content: string,
  maxTokens: number = MAX_INPUT_TOKENS,
): string {
  const tokens = encode(content);

  if (tokens.length <= maxTokens) {
    return content;
  }

  // Truncate by decoding only the allowed number of tokens
  // Since we can't easily decode back to string, we'll estimate character-to-token ratio
  const charToTokenRatio = content.length / tokens.length;
  const maxChars = Math.floor(maxTokens * charToTokenRatio);

  console.warn(
    `Content exceeds token limit (${tokens.length} > ${maxTokens}). Truncating from ${content.length} to ~${maxChars} characters.`,
  );

  return content.slice(0, maxChars);
}

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

  // Clean and validate HTML - send full page content to LLM
  const cleanedHtml = html.replace(/\s+/g, " ").trim();

  // Validate and truncate to fit within model's context window
  const validatedContent = validateAndTruncateContent(cleanedHtml);

  try {
    const { output: parsed } = await withRetry(
      async () => {
        return await generateText({
          model: model,
          output: Output.object({ schema: recipeSchema }),
          system: `You are a recipe extraction expert. Extract recipe data from the provided webpage HTML.

CRITICAL INSTRUCTIONS:
- You will receive the FULL HTML of a webpage - ignore all irrelevant content like navigation menus, advertisements, footers, sidebars, social media widgets, and promotional content
- Focus ONLY on the actual recipe content (ingredients, instructions, title, description, etc.)
- Be accurate and only include information that is part of the recipe itself
- Extract ALL ingredients with their exact quantities, units, and any preparation notes
- Extract ALL instruction steps in order, preserving any groupings (e.g., "For the sauce", "For assembly")
- If ingredients are grouped (e.g., "For the avocado topping"), preserve that group information
- Include prep time, cook time, and total time if mentioned
- Extract servings/yield information
- Identify the cuisine type and meal course if evident
- Pay special attention to ingredient details like "finely chopped", "divided", "optional" - include these as notes
- For instructions, maintain the original step numbering and any substeps
- Look for recipe variations, notes, or tips that are part of the recipe
- Ignore any user comments, related recipes, or other non-recipe content
- Output in structured JSON format`,
          prompt: `Extract the complete recipe from this webpage HTML. Ignore navigation, ads, and other irrelevant content. Focus only on the recipe itself:\n\n${validatedContent}`,
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

  // Validate and truncate to fit within model's context window
  const validatedText = validateAndTruncateContent(text.trim());

  try {
    const { output: parsed } = await withRetry(
      async () => {
        return await generateText({
          model: model,
          output: Output.object({ schema: recipeSchema }),
          system: `You are a recipe parsing expert. Parse the provided recipe text into structured JSON.
Be accurate and organized. Extract all ingredients and instructions even if formatting is messy.`,
          prompt: validatedText,
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

/**
 * Parse a recipe from a YouTube video URL
 * Extracts the transcript and parses it into structured recipe data
 */
export async function parseRecipeFromYouTube(
  url: string,
): Promise<ParsedRecipe> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new ExternalApiError(
      "OpenRouter",
      "OPENROUTER_API_KEY environment variable is not set",
    );
  }

  // Extract video ID from URL
  const videoId = extractYouTubeVideoId(url);

  // Get video metadata
  const { thumbnailUrl } = getYouTubeVideoMetadata(videoId);

  // Fetch transcript or description (may also return video title)
  const {
    text: content,
    title: videoTitle,
    source,
  } = await getYouTubeTranscript(videoId);

  if (!content || content.trim().length < 50) {
    throw new RecipeParseError(
      source === "description"
        ? "Video description is too short to extract a recipe"
        : "Transcript is too short to extract a recipe",
      url,
    );
  }

  // Validate and truncate to fit within model's context window
  const validatedContent = validateAndTruncateContent(content.trim());

  try {
    const { output: parsed } = await withRetry(
      async () => {
        const videoContext = videoTitle
          ? `\n\nVideo Title: "${videoTitle}"\n\n`
          : "\n\n";

        // Different system prompts for transcript vs description
        const systemPrompt =
          source === "description"
            ? `You are a recipe extraction expert. Extract recipe data from a YouTube video description.

CRITICAL INSTRUCTIONS:
- The text is from a video description, which may contain a written recipe
- Look for ingredients listed with quantities (e.g., "2 cups of flour", "3 tablespoons butter")
- Extract step-by-step cooking instructions if provided
- Identify prep time, cook time, and servings if mentioned
- Extract the recipe title (often in the video title or at the start of the description)
- Identify the cuisine type and meal course if evident
- Be thorough but only include information that's actually in the description
- If ingredients are mentioned but quantities aren't specified, still include the ingredient
- Ignore non-recipe content like social media links, channel promotions, or unrelated information
- If the video title clearly indicates the recipe name, you can use it as the recipe title
- Video descriptions may be less detailed than transcripts, so extract whatever information is available`
            : `You are a recipe extraction expert. Extract recipe data from a YouTube video transcript.

CRITICAL INSTRUCTIONS:
- The transcript is from a cooking video, so extract the recipe being demonstrated
- Look for ingredients mentioned with quantities (e.g., "2 cups of flour", "3 tablespoons butter")
- Extract step-by-step cooking instructions in the order they're mentioned
- Identify prep time, cook time, and servings if mentioned
- Extract the recipe title (often mentioned at the start of the video or in the video title)
- Identify the cuisine type and meal course if evident
- Be thorough but only include information that's actually in the transcript
- If ingredients are mentioned but quantities aren't specified, still include the ingredient
- Ignore non-recipe content like intro/outro, channel promotions, or unrelated commentary
- Extract all ingredients and instructions even if the transcript is messy or has typos
- If the video title clearly indicates the recipe name, you can use it as the recipe title`;

        const contentLabel =
          source === "description" ? "Description" : "Transcript";

        return await generateText({
          model: model,
          output: Output.object({ schema: recipeSchema }),
          system: systemPrompt,
          prompt: `Extract the complete recipe from this YouTube cooking video.${videoContext}${contentLabel}:\n${validatedContent}`,
        });
      },
      {
        maxRetries: 2,
        initialDelayMs: 2000,
      },
    );

    // Validate we got a proper recipe
    const sourceLabel = source === "description" ? "description" : "transcript";

    if (!parsed.title || parsed.title === "Untitled Recipe") {
      throw new RecipeParseError(
        `Could not extract recipe title from the video ${sourceLabel}`,
        url,
      );
    }

    if (!parsed.ingredients || parsed.ingredients.length === 0) {
      throw new RecipeParseError(
        `Could not extract any ingredients from the video ${sourceLabel}. ${source === "description" ? "The description may not contain a complete recipe." : "Make sure the video has captions enabled and contains a recipe."}`,
        url,
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
      imageUrl: thumbnailUrl, // Use YouTube thumbnail as recipe image
    };
  } catch (error) {
    if (error instanceof RecipeParseError) throw error;
    throw new ExternalApiError(
      "OpenRouter",
      `Failed to parse recipe from YouTube video: ${error instanceof Error ? error.message : "Unknown error"}`,
      error,
    );
  }
}
