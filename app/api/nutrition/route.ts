import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createFallback } from "ai-fallback";
import { streamText } from "ai";
import { z } from "zod";

// Google Generative AI client (primary)
const google = createGoogleGenerativeAI({});

// OpenRouter client configured for AI SDK (fallback)
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Create fallback model with Google (Gemini) as primary and OpenRouter (Devstral) as fallback
const model = createFallback({
  models: [
    google("gemini-2.0-flash"),
    openrouter("mistralai/devstral-2512:free"),
  ],
  onError: (error, modelId) => {
    console.warn(`AI provider error (${modelId}):`, error.message);
  },
  modelResetInterval: 5 * 60 * 1000,
});

// Request validation schema
const nutritionRequestSchema = z.object({
  title: z.string(),
  ingredients: z.array(
    z.object({
      quantity: z.string().optional().nullable(),
      unit: z.string().optional().nullable(),
      name: z.string(),
      notes: z.string().optional().nullable(),
    }),
  ),
  servings: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    // Check if at least one AI provider is configured
    if (
      !process.env.OPENROUTER_API_KEY &&
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ) {
      return new Response(
        JSON.stringify({
          error:
            "No AI provider configured. Set either OPENROUTER_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY",
        }),
        { status: 500 },
      );
    }

    const body = await req.json();
    const validated = nutritionRequestSchema.parse(body);

    // Format ingredients for the prompt
    const ingredientsList = validated.ingredients
      .map((ing) => {
        const parts = [
          ing.quantity,
          ing.unit,
          ing.name,
          ing.notes ? `(${ing.notes})` : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `- ${parts}`;
      })
      .join("\n");

    const prompt = `Analyze this recipe and provide nutritional information per serving:

Recipe: ${validated.title}
Servings: ${validated.servings || "Not specified"}

Ingredients:
${ingredientsList}

Please provide:
1. Estimated calories per serving
2. Macronutrients (protein, carbs, fats) in grams
3. Key micronutrients (fiber, sodium, sugar, etc.)
4. Any notable nutritional highlights or concerns
5. Brief dietary information (e.g., high-protein, low-carb, etc.)

Format your response in a clear, easy-to-read way. Be realistic with estimates and note that these are approximations.`;

    const result = streamText({
      model: model,
      prompt: prompt,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error generating nutrition facts:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate nutrition facts",
      }),
      { status: 500 },
    );
  }
}
