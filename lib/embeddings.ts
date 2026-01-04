import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Generate an embedding vector for the given text using Hugging Face's embedding model
 * Model: google/embeddinggemma-300m (768 dimensions)
 * Free tier: 30,000 requests/month
 */
export async function generateEmbedding(text: string) {
  return hf.featureExtraction({
    model: "google/embeddinggemma-300m",
    inputs: text,
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
  if (recipe.difficulty === "EASY") {
    parts.push("simple beginner");
  }
  if (recipe.difficulty === "EXPERT") {
    parts.push("advanced chef professional");
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * Generate embedding for a recipe and return both the search text and embedding
 */
export async function generateRecipeEmbedding(recipe: {
  title: string;
  description?: string | null;
  cuisine?: string | null;
  course?: string | null;
  tags?: { name: string }[];
  ingredients?: { name: string }[];
  instructions?: { text: string }[];
  totalTime?: number | null;
  difficulty?: string | null;
}): Promise<{ searchText: string; embedding: number[] }> {
  const searchText = generateSearchText(recipe);
  const embedding = await generateEmbedding(searchText);

  return { searchText, embedding };
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
  };

  let enhanced = query.toLowerCase();
  for (const [term, expansion] of Object.entries(expansions)) {
    if (enhanced.includes(term)) {
      enhanced = enhanced.replace(term, expansion);
    }
  }

  return enhanced;
}
