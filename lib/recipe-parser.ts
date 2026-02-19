import { generateText, Output } from "ai";
import { z } from "zod";
import { load } from "cheerio";
import { encode } from "gpt-tokenizer";
import { ResultAsync } from "neverthrow";
import {
  RecipeParseError,
  ExternalApiError,
  toAppError,
  type AppError,
} from "./errors";
import { model } from "./ai";
import { normalizeRecipeImageUrl } from "./image-url";
import type { ParsedRecipe, Course, Difficulty } from "@/types/recipe";
import {
  extractYouTubeVideoId,
  getYouTubeTranscript,
  getYouTubeVideoMetadata,
  type TranscriptResult,
} from "./youtube";

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
      return (
        normalizeRecipeImageUrl(new URL(imgUrl, baseUrl).href) ?? undefined
      );
    } catch {
      return normalizeRecipeImageUrl(imgUrl) ?? undefined;
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
 * Fetch markdown content for a URL via markdown.new
 * Returns null if the service is unavailable or returns an error
 */
async function fetchMarkdown(url: string): Promise<string | null> {
  try {
    const response = await fetch(`https://markdown.new/${url}`, {
      headers: {
        Accept: "text/markdown",
      },
      signal: AbortSignal.timeout(20000), // 20 second timeout (external service)
    });

    if (!response.ok) return null;

    const text = await response.text();
    // Sanity check: ensure we got meaningful content
    if (!text || text.trim().length < 50) return null;

    return text;
  } catch {
    return null;
  }
}

/**
 * Fetch raw HTML for a URL (used for image extraction and as fallback)
 */
async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CookbookBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000), // 15 second timeout
  });

  if (!response.ok) {
    throw new RecipeParseError(
      `Failed to fetch URL: ${response.status} ${response.statusText}`,
      url,
    );
  }

  return response.text();
}

/**
 * Parse a recipe from a URL.
 * Uses markdown.new for cleaner content extraction, with HTML fallback.
 * Returns ResultAsync instead of throwing.
 */
export function parseRecipeFromUrl(
  url: string,
): ResultAsync<ParsedRecipe, AppError> {
  return ResultAsync.fromPromise(parseRecipeFromUrlImpl(url), (error) =>
    error instanceof RecipeParseError || error instanceof ExternalApiError
      ? error
      : toAppError(error),
  );
}

/** Internal throwing implementation for parseRecipeFromUrl */
async function parseRecipeFromUrlImpl(url: string): Promise<ParsedRecipe> {
  const validatedUrl = validateUrl(url);
  const href = validatedUrl.href;

  try {
    // Fetch markdown (for AI extraction) and HTML (for image extraction) in parallel
    const [markdown, html] = await Promise.all([
      fetchMarkdown(href),
      fetchHtml(href),
    ]);

    // Extract image from HTML (needs structured data like JSON-LD, OG tags)
    const imageUrl = extractImageFromHtml(html, href);

    if (markdown) {
      // Use markdown for AI extraction (cleaner, fewer tokens)
      return extractRecipeFromMarkdown(markdown, href, imageUrl);
    }

    // Fall back to HTML-based extraction
    return extractRecipeWithAI(html, href, imageUrl);
  } catch (error) {
    if (error instanceof RecipeParseError) throw error;
    throw new RecipeParseError(
      `Failed to fetch recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
      url,
    );
  }
}

/**
 * Validate AI output and build a ParsedRecipe from the structured result
 */
function buildParsedRecipe(
  parsed: z.infer<typeof recipeSchema>,
  sourceUrl: string,
  imageUrl: string | undefined,
): ParsedRecipe {
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
}

/**
 * Extract recipe using AI from markdown content (preferred path via markdown.new)
 */
async function extractRecipeFromMarkdown(
  markdown: string,
  sourceUrl: string,
  imageUrl: string | undefined,
): Promise<ParsedRecipe> {
  // Validate and truncate to fit within model's context window
  const validatedContent = validateAndTruncateContent(markdown.trim());

  try {
    const { output: parsed } = await generateText({
      model: model,
      output: Output.object({ schema: recipeSchema }),
      system: `You are a recipe extraction expert. Extract recipe data from the provided webpage content in Markdown format.

CRITICAL INSTRUCTIONS:
- The content has been pre-converted to Markdown, so most irrelevant page elements have been removed
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
      prompt: `Extract the complete recipe from this webpage content:\n\n${validatedContent}`,
    });

    return buildParsedRecipe(parsed, sourceUrl, imageUrl);
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
 * Extract recipe using AI from HTML content (fallback when markdown.new is unavailable)
 */
async function extractRecipeWithAI(
  html: string,
  sourceUrl: string,
  imageUrl: string | undefined,
): Promise<ParsedRecipe> {
  // Clean and validate HTML - send full page content to LLM
  const cleanedHtml = html.replace(/\s+/g, " ").trim();

  // Validate and truncate to fit within model's context window
  const validatedContent = validateAndTruncateContent(cleanedHtml);

  try {
    const { output: parsed } = await generateText({
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

    return buildParsedRecipe(parsed, sourceUrl, imageUrl);
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
 * Parse a recipe from natural language text.
 * Returns ResultAsync instead of throwing.
 */
export function parseRecipeFromText(
  text: string,
): ResultAsync<ParsedRecipe, AppError> {
  return ResultAsync.fromPromise(parseRecipeFromTextImpl(text), (error) =>
    error instanceof RecipeParseError || error instanceof ExternalApiError
      ? error
      : toAppError(error),
  );
}

/** Internal throwing implementation for parseRecipeFromText */
async function parseRecipeFromTextImpl(text: string): Promise<ParsedRecipe> {
  if (!text || text.trim().length < 20) {
    throw new RecipeParseError("Please provide more recipe text to parse");
  }

  // Validate and truncate to fit within model's context window
  const validatedText = validateAndTruncateContent(text.trim());

  try {
    const { output: parsed } = await generateText({
      model: model,
      output: Output.object({ schema: recipeSchema }),
      system: `You are a recipe parsing expert. Parse the provided recipe text into structured JSON.
Be accurate and organized. Extract all ingredients and instructions even if formatting is messy.`,
      prompt: validatedText,
    });

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
 * Parse a recipe from a YouTube video URL.
 * Extracts the transcript and parses it into structured recipe data.
 * Returns ResultAsync instead of throwing.
 */
export function parseRecipeFromYouTube(
  url: string,
): ResultAsync<ParsedRecipe, AppError> {
  // Chain: extract video ID (sync) → fetch transcript (async) → parse (async)
  return new ResultAsync(Promise.resolve(extractYouTubeVideoId(url))).andThen(
    (videoId) => {
      const { thumbnailUrl } = getYouTubeVideoMetadata(videoId);
      return getYouTubeTranscript(videoId).andThen((transcript) =>
        ResultAsync.fromPromise(
          parseYouTubeTranscriptImpl(url, transcript, thumbnailUrl),
          (error) =>
            error instanceof RecipeParseError ||
            error instanceof ExternalApiError
              ? error
              : toAppError(error),
        ),
      );
    },
  );
}

/** Internal throwing implementation for YouTube transcript parsing */
async function parseYouTubeTranscriptImpl(
  url: string,
  transcript: TranscriptResult,
  thumbnailUrl: string,
): Promise<ParsedRecipe> {
  const { text: content, title: videoTitle, source } = transcript;

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

    const { output: parsed } = await generateText({
      model: model,
      output: Output.object({ schema: recipeSchema }),
      system: systemPrompt,
      prompt: `Extract the complete recipe from this YouTube cooking video.${videoContext}${contentLabel}:\n${validatedContent}`,
    });

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
