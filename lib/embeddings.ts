import OpenAI from "openai";
import type { RecipeWithRelations } from "@/types/recipe";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Generate an embedding vector for the given text using OpenAI's embedding model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
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
