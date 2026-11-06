import { embed } from "ai";
import { ok, err, errAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import { ExternalApiError, thrownValueSchema } from "./errors";
import { embeddingModel } from "./ai";
import { env } from "./env";

export const embeddingDimensions = env.FREELLM_EMBEDDING_MODEL === "bge-m3" ? 1024 : 768;

// Bump the version if input preprocessing or provider pooling changes.
export const embeddingSpace = `${env.FREELLM_EMBEDDING_MODEL}:v1`;

const embeddingSchema = z
  .array(z.number().finite())
  .length(embeddingDimensions)
  .refine((vector) => vector.some((value) => value !== 0));

const responseModelSchema = z.object({ model: z.literal(env.FREELLM_EMBEDDING_MODEL) });

/**
 * Generate a vector in the configured model space through the Railway router.
 * Pin the model family so provider routing cannot change the vector space.
 *
 * Returns Result instead of throwing.
 */
export function generateEmbedding(text: string): ResultAsync<number[], ExternalApiError> {
  if (!text || text.trim().length === 0) {
    return errAsync(new ExternalApiError("FreeLLMAPI", "Cannot generate embedding for empty text"));
  }

  return ResultAsync.fromPromise(
    embed({
      model: embeddingModel,
      value: text.slice(0, 8000),
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(5000),
    }),
    (error) => {
      const message = error instanceof Error ? error.message : "Unknown embedding error";

      return new ExternalApiError("FreeLLMAPI", message, thrownValueSchema.parse(error));
    },
  ).andThen((result) => {
    // The router returns the resolved family, including after same-family provider fallback.
    // Dimensions alone cannot detect a wrong model that happens to have the same width.
    if (!responseModelSchema.safeParse(result.response?.body).success) {
      return err(new ExternalApiError("FreeLLMAPI", "Unexpected embedding model in response"));
    }

    const parsed = embeddingSchema.safeParse(result.embedding);

    if (!parsed.success) {
      return err(new ExternalApiError("FreeLLMAPI", "Invalid embedding dimensions or values"));
    }

    return ok(parsed.data);
  });
}

interface NamedTag {
  readonly name: string;
}

interface NamedIngredient {
  readonly name: string;
}

interface TextInstruction {
  readonly text: string;
}

export interface RecipeEmbeddingInput {
  readonly title: string;
  readonly description?: string | null;
  readonly cuisine?: string | null;
  readonly course?: string | null;
  readonly tags?: readonly NamedTag[];
  readonly ingredients?: readonly NamedIngredient[];
  readonly instructions?: readonly TextInstruction[];
  readonly totalTime?: number | null;
  readonly difficulty?: string | null;
}

export function generateSearchText(recipe: RecipeEmbeddingInput): string {
  const parts: string[] = [
    recipe.title,
    recipe.description ?? "",
    recipe.cuisine ?? "",
    recipe.course ?? "",
    recipe.tags?.map((t) => t.name).join(" ") ?? "",
    recipe.ingredients?.map((i) => i.name).join(" ") ?? "",
    recipe.instructions?.map((i) => i.text).join(" ") ?? "",
  ];

  if (recipe.totalTime && recipe.totalTime < 30) {
    parts.push("quick fast easy");
  }

  if (recipe.totalTime && recipe.totalTime < 15) {
    parts.push("super quick instant");
  }

  if (recipe.difficulty === "EASY") {
    parts.push("simple beginner friendly");
  }

  if (recipe.difficulty === "MEDIUM") {
    parts.push("intermediate");
  }

  if (recipe.difficulty === "HARD") {
    parts.push("challenging advanced");
  }

  if (recipe.difficulty === "EXPERT") {
    parts.push("advanced chef professional complex");
  }

  return parts.filter(Boolean).join(" ");
}

export function enhanceSearchQuery(query: string): string {
  const expansions = {
    quick: "quick fast easy under 30 minutes",
    healthy: "healthy light low-calorie nutritious",
    "comfort food": "comfort food hearty warming cozy",
    easy: "easy simple beginner quick",
    fancy: "fancy elegant impressive dinner party",
    spicy: "spicy hot pepper chili",
    vegetarian: "vegetarian veggie meatless plant-based",
    vegan: "vegan plant-based dairy-free",
    asian: "asian chinese japanese korean thai vietnamese",
    italian: "italian pasta pizza mediterranean",
    mexican: "mexican tacos burritos tex-mex latin",
    breakfast: "breakfast brunch morning",
    dinner: "dinner supper evening meal",
    dessert: "dessert sweet treat cake pie",
  } satisfies Readonly<Record<string, string>>;

  let enhanced = query.toLowerCase();

  for (const [term, expansion] of Object.entries(expansions)) {
    if (enhanced.includes(term)) {
      enhanced = enhanced.replace(term, expansion);
    }
  }

  return enhanced;
}
