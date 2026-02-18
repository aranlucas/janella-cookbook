import { InferenceClient } from "@huggingface/inference";
import { ok, err, errAsync, ResultAsync } from "neverthrow";
import { ExternalApiError } from "./errors";

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

/**
 * Generate an embedding vector for the given text using Hugging Face's embedding model
 * Model: google/embeddinggemma-300m (768 dimensions)
 * Free tier: 30,000 requests/month
 *
 * Returns Result instead of throwing.
 */
export function generateEmbedding(
  text: string,
): ResultAsync<number[], ExternalApiError> {
  if (!process.env.HUGGINGFACE_API_KEY) {
    return errAsync(
      new ExternalApiError(
        "Hugging Face",
        "HUGGINGFACE_API_KEY environment variable is not set",
      ),
    );
  }

  if (!text || text.trim().length === 0) {
    return errAsync(
      new ExternalApiError(
        "Hugging Face",
        "Cannot generate embedding for empty text",
      ),
    );
  }

  return ResultAsync.fromPromise(
    hf.featureExtraction({
      model: "google/embeddinggemma-300m",
      inputs: text.slice(0, 8000), // Limit input length to avoid token limits
    }),
    (error) => {
      const message =
        error instanceof Error ? error.message : "Unknown embedding error";
      return new ExternalApiError("Hugging Face", message, error);
    },
  ).andThen((result) => {
    if (!Array.isArray(result)) {
      return err(
        new ExternalApiError(
          "Hugging Face",
          `Expected array response, got ${typeof result}`,
        ),
      );
    }

    if (result.length > 0 && Array.isArray(result[0])) {
      return err(
        new ExternalApiError(
          "Hugging Face",
          "Expected 1D array response, got 2D array",
        ),
      );
    }

    return ok(result as number[]);
  });
}

/**
 * Generate searchable text from a recipe for embedding
 */
export function generateSearchText(recipe: {
  title: string;
  description?: string | null;
  cuisine?: string | null;
  course?: string | null;
  tags?: { name: string }[];
  ingredients?: { name: string }[];
  instructions?: { text: string }[];
  totalTime?: number | null;
  difficulty?: string | null;
}): string {
  const parts: string[] = [
    recipe.title,
    recipe.description || "",
    recipe.cuisine || "",
    recipe.course || "",
    recipe.tags?.map((t) => t.name).join(" ") || "",
    recipe.ingredients?.map((i) => i.name).join(" ") || "",
    recipe.instructions?.map((i) => i.text).join(" ") || "",
  ];

  // Add semantic hints based on attributes
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

/**
 * Generate embedding for a recipe and return both the search text and embedding
 */
export function generateRecipeEmbedding(recipe: {
  title: string;
  description?: string | null;
  cuisine?: string | null;
  course?: string | null;
  tags?: { name: string }[];
  ingredients?: { name: string }[];
  instructions?: { text: string }[];
  totalTime?: number | null;
  difficulty?: string | null;
}): ResultAsync<
  { searchText: string; embedding: number[] },
  ExternalApiError
> {
  const searchText = generateSearchText(recipe);
  return generateEmbedding(searchText).map((embedding) => ({
    searchText,
    embedding,
  }));
}

/**
 * Enhance a search query with synonyms and related terms
 */
export function enhanceSearchQuery(query: string): string {
  const expansions: Record<string, string> = {
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
  };

  let enhanced = query.toLowerCase();
  for (const [term, expansion] of Object.entries(expansions)) {
    if (enhanced.includes(term)) {
      enhanced = enhanced.replace(term, expansion);
    }
  }

  return enhanced;
}
