import { generateText, NoObjectGeneratedError, Output, type UserContent } from "ai";
import { load, type CheerioAPI } from "cheerio";
import { errAsync, ResultAsync } from "neverthrow";
import { fetchRecipeSource } from "@/lib/imports/fetch-source";
import {
  modelRecipeSchema,
  parsedRecipeSchema,
  type CleanParsedRecipe,
} from "@/lib/imports/recipe-schema";
import { isCompleteRecipe, readStructuredRecipes } from "@/lib/imports/structured-recipe";
import { cleanText } from "@/lib/imports/text";
import type { ParsedRecipe } from "@/types/recipe";
import { model } from "./ai";
import {
  ExternalApiError,
  RecipeParseError,
  thrownValueSchema,
  toAppError,
  type AppError,
} from "./errors";
import { normalizeRecipeImageUrl } from "./image-url";
import {
  extractYouTubeVideoId,
  getYouTubeTranscript,
  getYouTubeVideoMetadata,
  type TranscriptResult,
} from "./youtube";

/**
 * The router picks the model ("auto"), so assume a modest context window:
 * roughly 20K tokens, plenty for a cleaned recipe page or a long transcript.
 */
const MAX_INPUT_CHARS = 80_000;

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
  content: UserContent,
  source: RecipeSource,
): Promise<ParsedRecipe> {
  try {
    const { output } = await generateText({
      model,
      temperature: 0,
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      output: Output.object({
        name: "Recipe",
        description: "A recipe extracted from the source, or empty lists if there is none.",
        schema: modelRecipeSchema,
      }),
      instructions: `${EXTRACTION_RULES}\n\n${task}`,
      messages: [{ role: "user", content }],
    });

    return requireCompleteRecipe(output, source);
  } catch (error) {
    if (error instanceof RecipeParseError) {
      throw error;
    }

    // For unusable output, the raw reply shows whether the model truncated, refused or ignored the schema.
    console.error(
      `Recipe model failed to read the ${source.label}:`,
      NoObjectGeneratedError.isInstance(error)
        ? { finishReason: error.finishReason, cause: error.cause, text: error.text?.slice(0, 2000) }
        : error,
    );

    const thrownValue = thrownValueSchema.parse(error);

    throw new ExternalApiError(
      "FreeLLMAPI",
      `Failed to read the recipe ${source.label}: ${thrownValue instanceof Error ? thrownValue.message : "Unknown error"}`,
      thrownValue,
    );
  }
}

function attempt<T>(promise: Promise<T>): ResultAsync<T, AppError> {
  return ResultAsync.fromPromise(promise, (error) => toAppError(thrownValueSchema.parse(error)));
}

/** Recipe image: schema.org data, then Open Graph, then Twitter Card. */
function pageImage($: CheerioAPI, href: string, structured: readonly ParsedRecipe[]) {
  const image =
    structured.find((recipe) => recipe.imageUrl)?.imageUrl ??
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="twitter:image"]').attr("content");

  return image && URL.canParse(image, href)
    ? (normalizeRecipeImageUrl(new URL(image, href).href) ?? undefined)
    : undefined;
}

/**
 * Reduce a page to readable text with line breaks between blocks. Raw HTML is
 * mostly scripts and markup, which slows the model down and can overflow its context.
 */
function pageText($: CheerioAPI, structured: readonly ParsedRecipe[]): string {
  const title = cleanText($("title").first().text());

  $(
    "script, style, noscript, template, svg, iframe, nav, footer, aside, form, button, " +
      '[class*="comment"], [id*="comment"]',
  ).remove();
  $("br").replaceWith("\n");
  $("p, li, tr, h1, h2, h3, h4, h5, h6, div, section").append("\n");

  const body = $("body")
    .text()
    .split("\n")
    .map((line) => line.replaceAll(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return [
    title && `Page title: ${title}`,
    // Partial structured data (e.g. ingredients without steps) is still a strong hint.
    structured.length > 0 && `Structured data:\n${JSON.stringify(structured)}`,
    `Page text:\n${body}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_INPUT_CHARS);
}

/**
 * Parse a fetched recipe page. Complete schema.org data is used directly;
 * otherwise the page text goes to the recipe model.
 */
export async function parseRecipeFromHtml(html: string, href: string): Promise<ParsedRecipe> {
  const $ = load(html);
  const structured = readStructuredRecipes(html);
  const imageUrl = pageImage($, href, structured);
  const source = { label: "page", url: href };
  const complete = structured.find(isCompleteRecipe);

  if (complete) {
    return requireCompleteRecipe(parsedRecipeSchema.parse({ ...complete, imageUrl }), source);
  }

  const recipe = await generateRecipe(
    "The source is the text of a recipe web page.",
    `Extract the recipe from this page (${href}).\n\n${pageText($, structured)}`,
    source,
  );

  return { ...recipe, imageUrl };
}

async function fetchPage(url: string): Promise<string> {
  try {
    return await fetchRecipeSource(url);
  } catch (error) {
    throw new RecipeParseError(
      `Failed to fetch recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
      url,
    );
  }
}

/** Parse a recipe from a web page link. */
export function parseRecipeFromUrl(url: string): ResultAsync<ParsedRecipe, AppError> {
  return attempt(fetchPage(url).then((html) => parseRecipeFromHtml(html, url)));
}

/** Parse a recipe from pasted text. */
export function parseRecipeFromText(text: string): ResultAsync<ParsedRecipe, AppError> {
  if (text.trim().length < 20) {
    return errAsync(new RecipeParseError("Please provide more recipe text to parse"));
  }

  return attempt(
    generateRecipe(
      "The source is recipe text pasted by the user. It may be messy or informally written.",
      text.trim().slice(0, MAX_INPUT_CHARS),
      { label: "text", fallbackTitle: "Untitled Recipe" },
    ),
  );
}

/** Parse a fetched YouTube transcript, with the description when there is one. */
export async function parseRecipeFromTranscript(
  url: string,
  transcript: TranscriptResult,
  thumbnailUrl: string,
): Promise<ParsedRecipe> {
  const { text, title, source, description } = transcript;
  const fromDescription = source === "description";
  const label = fromDescription ? "video description" : "video transcript";

  if (text.trim().length < 50) {
    throw new RecipeParseError(`The ${label} is too short to extract a recipe`, url);
  }

  const content = [
    title && `Video title: ${title}`,
    !fromDescription && description && `Video description:\n${description}`,
    `${fromDescription ? "Video description" : "Transcript"}:\n${text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const recipe = await generateRecipe(
    "The source is a YouTube cooking video. When both are present, the description often lists exact ingredient amounts and the transcript describes the method; combine them. Use the video title for the recipe name if the source names no dish.",
    content.slice(0, MAX_INPUT_CHARS),
    { label, url },
  );

  return { ...recipe, imageUrl: thumbnailUrl };
}

/** Parse a recipe from a YouTube video link. */
export function parseRecipeFromYouTube(url: string): ResultAsync<ParsedRecipe, AppError> {
  return extractYouTubeVideoId(url).asyncAndThen((videoId) =>
    getYouTubeTranscript(videoId).andThen((transcript) =>
      attempt(
        parseRecipeFromTranscript(url, transcript, getYouTubeVideoMetadata(videoId).thumbnailUrl),
      ),
    ),
  );
}

/** Read recipe text visible in an image; never infer a recipe from a dish photo. */
export function parseRecipeFromPhoto(image: Uint8Array): ResultAsync<ParsedRecipe, AppError> {
  return attempt(
    generateRecipe(
      "The source is a photo of a written or printed recipe. Transcribe it. A photo of food without written recipe text is not a recipe. Leave unreadable amounts null rather than guessing.",
      [
        { type: "text", text: "Extract this written recipe for review." },
        { type: "image", image, mediaType: "image/jpeg" },
      ],
      { label: "photo", fallbackTitle: "Untitled Recipe" },
    ),
  );
}
