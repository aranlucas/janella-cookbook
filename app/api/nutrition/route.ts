import {
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import { ResultAsync } from "neverthrow";
import { model } from "@/lib/ai";
import { apiError, apiValidationError } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";

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
  const bodyResult = await ResultAsync.fromPromise(
    req.json(),
    () => new ValidationError("Invalid JSON in request body"),
  );

  if (bodyResult.isErr()) {
    return apiError(bodyResult.error);
  }

  const parsed = nutritionRequestSchema.safeParse(bodyResult.value);
  if (!parsed.success) {
    return apiValidationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }

  const { title, ingredients, servings } = parsed.data;

  const ingredientsList = ingredients
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

Recipe: ${title}
Servings: ${servings || "Not specified"}

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

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
