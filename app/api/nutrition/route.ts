import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

// OpenRouter client configured for AI SDK
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const model = openrouter("mistralai/devstral-2512:free");

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
    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "OpenRouter API key not configured",
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
