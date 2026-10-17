import { fetchRecipeSource } from "@/lib/imports/fetch-source";
import {
  extractStructuredRecipe,
  findStructuredRecipes,
  structuredImage,
} from "@/lib/imports/structured-recipe";
import {
  modelRecipeSchema,
  parsedRecipeSchema,
  type CleanParsedRecipe,
} from "@/lib/imports/recipe-schema";
import { cleanText } from "@/lib/imports/text";
import { generateText, NoObjectGeneratedError, Output, type ModelMessage } from "ai";
import { load } from "cheerio";
import { decode, encode } from "gpt-tokenizer";
import { ResultAsync } from "neverthrow";
import {
  RecipeParseError,
  ExternalApiError,
  thrownValueSchema,
  toAppError,
  type AppError,
  type ThrownValue,
} from "./errors";
import { model } from "./ai";
import { normalizeRecipeImageUrl } from "./image-url";
import type { ParsedRecipe } from "@/types/recipe";
import {
  extractYouTubeVideoId,
  getYouTubeTranscript,
  getYouTubeVideoMetadata,
  type TranscriptResult,
} from "./youtube";

/**
 * The router picks the model ("auto"), so assume a modest context window.
 * A cleaned recipe page or a long video transcript fits comfortably.
 */
const MAX_INPUT_TOKENS = 24_000;

/** Free routed models can be slow; this covers the request and its retries. */
const AI_TIMEOUT_MS = 90_000;

const EXTRACTION_RULES = `You convert recipe sources into structured data for a home cookbook.

Rules:
- Use only what the source says. Never invent ingredients, amounts, times or steps.
- List every ingredient and every step, in the order they appear.
- Split each ingredient into quantity, unit, name and notes. Keep quantities as written (fractions, ranges).
- Keep section headings (e.g. "For the sauce") in the group field of their ingredients or steps.
- Write one instruction per step and drop step numbers.
- Times are whole minutes: "1 hour 15 minutes" is 75. Use null when a time is not stated.
- Use null for any field the source does not provide.
- Ignore navigation, ads, comments, related recipes, sponsor messages and channel promotion.
- If the source contains no recipe, return empty ingredient and instruction lists.`;

/** Keep content within the model's input budget, cutting on a token boundary. */
function fitToTokenBudget(content: string, maxTokens = MAX_INPUT_TOKENS): string {
  const tokens = encode(content);

  if (tokens.length <= maxTokens) {
    return content;
  }

  console.warn(`Recipe source has ${tokens.length} tokens; truncating to ${maxTokens}.`);

  return decode(tokens.slice(0, maxTokens));
}

/** Most important image: JSON-LD > Open Graph > Twitter Card > common selectors. */
function extractImageFromHtml(html: string, baseUrl: string): string | undefined {
  const $ = load(html);

  const resolveUrl = (imgUrl: string | undefined): string | undefined => {
    if (!imgUrl) {
      return undefined;
    }

    try {
      return normalizeRecipeImageUrl(new URL(imgUrl, baseUrl).href) ?? undefined;
    } catch {
      return normalizeRecipeImageUrl(imgUrl) ?? undefined;
    }
  };

  for (const recipe of findStructuredRecipes(html)) {
    const image = resolveUrl(structuredImage(recipe));

    if (image) {
      return image;
    }
  }

  const meta =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content");

  if (meta) {
    return resolveUrl(meta);
  }

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
    const src = img.attr("src") ?? img.attr("data-src") ?? img.attr("data-lazy-src");

    if (src && !src.includes("placeholder") && !src.includes("avatar")) {
      return resolveUrl(src);
    }
  }

  return undefined;
}

/** Recipe-plugin containers, most specific first. */
const RECIPE_CONTAINERS = [
  ".wprm-recipe-container",
  ".tasty-recipes",
  ".mv-create-card",
  ".recipe-card",
  '[itemtype*="schema.org/Recipe"]',
  "article",
  "main",
  '[role="main"]',
  "body",
];

/**
 * Reduce a page to readable text with line breaks between blocks. Raw HTML is
 * mostly scripts and markup, which slows the model down and can overflow its context.
 */
function pageToText(html: string): string {
  const $ = load(html);
  const title = cleanText($("title").first().text());
  const description = $('meta[name="description"]').attr("content");
  // Partial structured data (e.g. ingredients without steps) is still a strong hint.
  const structured = findStructuredRecipes(html).map((recipe) => JSON.stringify(recipe));

  $(
    "script, style, noscript, template, svg, iframe, nav, footer, aside, form, button, " +
      '[class*="comment"], [id*="comment"], [class*="related"], [class*="newsletter"], [class*="share"]',
  ).remove();

  $("br").replaceWith("\n");
  $("p, li, tr, h1, h2, h3, h4, h5, h6, div, section, header").append("\n");

  const container = RECIPE_CONTAINERS.map((selector) => $(selector).first()).find(
    (element) => element.length > 0 && element.text().trim().length > 200,
  );

  const body = (container ?? $.root())
    .text()
    .split("\n")
    .map((line) => line.replaceAll(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return [
    title && `Page title: ${title}`,
    description && `Page description: ${cleanText(description)}`,
    structured.length > 0 && `Structured data:\n${structured.join("\n").slice(0, 20_000)}`,
    `Page text:\n${body}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

interface RecipeSource {
  /** Shown in error messages, e.g. "page", "video transcript". */
  readonly label: string;
  readonly url?: string;
  /** Title to use when the source has none (pasted text, photos). */
  readonly fallbackTitle?: string;
}

/**
 * Reject recipes that cleaned up to nothing usable. This stays outside the
 * model schema so a source without a recipe gets a clear message instead of
 * a structured-output failure.
 */
function requireCompleteRecipe(recipe: CleanParsedRecipe, source: RecipeSource): ParsedRecipe {
  const title = recipe.title ?? source.fallbackTitle;

  if (!title) {
    throw new RecipeParseError(`Could not find a recipe title in the ${source.label}`, source.url);
  }

  if (recipe.ingredients.length === 0) {
    throw new RecipeParseError(`Could not find any ingredients in the ${source.label}`, source.url);
  }

  if (recipe.instructions.length === 0) {
    throw new RecipeParseError(`Could not find any steps in the ${source.label}`, source.url);
  }

  return { ...recipe, title };
}

/** Ask the recipe model for structured output; the schema cleans the result. */
async function generateRecipe(
  task: string,
  messages: ModelMessage[],
  source: RecipeSource,
): Promise<ParsedRecipe> {
  let output: CleanParsedRecipe;

  try {
    ({ output } = await generateText({
      model,
      temperature: 0,
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      output: Output.object({
        name: "Recipe",
        description: "A recipe extracted from the source, or empty lists if there is none.",
        schema: modelRecipeSchema,
      }),
      instructions: `${EXTRACTION_RULES}\n\n${task}`,
      messages,
    }));
  } catch (error) {
    const thrownValue = thrownValueSchema.parse(error);
    const message = thrownValue instanceof Error ? thrownValue.message : "Unknown error";

    if (NoObjectGeneratedError.isInstance(error)) {
      // The raw reply shows whether the model truncated, refused or ignored the schema.
      console.error(`Recipe model returned unusable output for the ${source.label}:`, {
        model: error.response?.modelId,
        finishReason: error.finishReason,
        cause: error.cause,
        text: error.text?.slice(0, 2000),
      });
    } else {
      console.error(`Recipe model failed to read the ${source.label}:`, error);
    }

    throw new ExternalApiError(
      "FreeLLMAPI",
      `Failed to read the recipe ${source.label}: ${message}`,
      thrownValue,
    );
  }

  return requireCompleteRecipe(output, source);
}

function toParseError(error: ThrownValue): AppError {
  return error instanceof RecipeParseError || error instanceof ExternalApiError
    ? error
    : toAppError(error);
}

function validateUrl(url: string): URL {
  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new RecipeParseError("Only HTTP and HTTPS URLs are supported", url);
    }

    return parsed;
  } catch (error) {
    if (error instanceof RecipeParseError) {
      throw error;
    }

    throw new RecipeParseError("Invalid URL format", url);
  }
}

/**
 * Parse a recipe from a web page. Complete schema.org data is used directly;
 * otherwise the page text goes to the recipe model.
 */
export function parseRecipeFromUrl(url: string): ResultAsync<ParsedRecipe, AppError> {
  return ResultAsync.fromPromise(parseRecipeFromUrlImpl(url), (error) =>
    toParseError(thrownValueSchema.parse(error)),
  );
}

async function parseRecipeFromUrlImpl(url: string): Promise<ParsedRecipe> {
  const href = validateUrl(url).href;
  let html: string;

  try {
    html = await fetchRecipeSource(href);
  } catch (error) {
    throw new RecipeParseError(
      `Failed to fetch recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
      url,
    );
  }

  return parseRecipeFromHtml(html, href);
}

/** Parse a fetched recipe page. `href` resolves relative image links. */
export async function parseRecipeFromHtml(html: string, href: string): Promise<ParsedRecipe> {
  const imageUrl = extractImageFromHtml(html, href);
  const source = { label: "page", url: href };
  const structured = extractStructuredRecipe(html);

  if (structured) {
    try {
      return requireCompleteRecipe(parsedRecipeSchema.parse({ ...structured, imageUrl }), source);
    } catch {
      // Structured data was unusable after cleaning; let the model read the page.
    }
  }

  const recipe = await generateRecipe(
    "The source is the text of a recipe web page.",
    [
      {
        role: "user",
        content: `Extract the recipe from this page (${href}).\n\n${fitToTokenBudget(pageToText(html))}`,
      },
    ],
    source,
  );

  return { ...recipe, imageUrl };
}

/** Parse a recipe from pasted text. */
export function parseRecipeFromText(text: string): ResultAsync<ParsedRecipe, AppError> {
  return ResultAsync.fromPromise(parseRecipeFromTextImpl(text), (error) =>
    toParseError(thrownValueSchema.parse(error)),
  );
}

function parseRecipeFromTextImpl(text: string): Promise<ParsedRecipe> {
  if (!text || text.trim().length < 20) {
    return Promise.reject(new RecipeParseError("Please provide more recipe text to parse"));
  }

  return generateRecipe(
    "The source is recipe text pasted by the user. It may be messy or informally written.",
    [{ role: "user", content: fitToTokenBudget(text.trim()) }],
    { label: "text", fallbackTitle: "Untitled Recipe" },
  );
}

/** Parse a recipe from a YouTube video's transcript and description. */
export function parseRecipeFromYouTube(url: string): ResultAsync<ParsedRecipe, AppError> {
  return new ResultAsync(Promise.resolve(extractYouTubeVideoId(url))).andThen((videoId) => {
    const { thumbnailUrl } = getYouTubeVideoMetadata(videoId);

    return getYouTubeTranscript(videoId).andThen((transcript) =>
      ResultAsync.fromPromise(parseRecipeFromTranscript(url, transcript, thumbnailUrl), (error) =>
        toParseError(thrownValueSchema.parse(error)),
      ),
    );
  });
}

/** Parse a fetched YouTube transcript and description. */
export async function parseRecipeFromTranscript(
  url: string,
  transcript: TranscriptResult,
  thumbnailUrl: string,
): Promise<ParsedRecipe> {
  const { text: content, title, source, description } = transcript;
  const fromDescription = source === "description";
  const label = fromDescription ? "video description" : "video transcript";

  if (!content || content.trim().length < 50) {
    throw new RecipeParseError(
      fromDescription
        ? "Video description is too short to extract a recipe"
        : "Transcript is too short to extract a recipe",
      url,
    );
  }

  const sections = [
    title && `Video title: ${title}`,
    !fromDescription && description?.trim() && `Video description:\n${description.trim()}`,
    `${fromDescription ? "Video description" : "Transcript"}:\n${content.trim()}`,
  ].filter(Boolean);

  try {
    const recipe = await generateRecipe(
      `The source is a YouTube cooking video. When both are present, the description often lists exact ingredient amounts and the transcript describes the method; combine them. Use the video title for the recipe name if the source names no dish.`,
      [{ role: "user", content: fitToTokenBudget(sections.join("\n\n")) }],
      { label, url },
    );

    return { ...recipe, imageUrl: thumbnailUrl };
  } catch (error) {
    if (error instanceof RecipeParseError && !fromDescription) {
      throw new RecipeParseError(
        `${error.message}. Make sure the video has captions and shows a full recipe.`,
        url,
      );
    }

    throw error;
  }
}

/** Read recipe text visible in an image; never infer a recipe from a dish photo. */
export function parseRecipeFromPhoto(image: Uint8Array): ResultAsync<ParsedRecipe, AppError> {
  return ResultAsync.fromPromise(
    generateRecipe(
      "The source is a photo of a written or printed recipe. Transcribe it. A photo of food without written recipe text is not a recipe. Leave unreadable amounts null rather than guessing.",
      [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract this written recipe for review." },
            { type: "image", image, mediaType: "image/jpeg" },
          ],
        },
      ],
      { label: "photo", fallbackTitle: "Untitled Recipe" },
    ),
    (error) => toParseError(thrownValueSchema.parse(error)),
  );
}
