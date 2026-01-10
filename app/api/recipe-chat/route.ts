import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

export const maxDuration = 30;

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
});

const model = openrouter("mistralai/devstral-2512:free");

export async function POST(req: Request) {
  try {
    const { messages, recipeData } = await req.json();

    const systemPrompt = `You are a helpful recipe assistant. You help users modify and improve their recipes.

CURRENT RECIPE:
${JSON.stringify(recipeData, null, 2)}

Your role is to:
- Answer questions about the recipe
- Suggest modifications to ingredients, instructions, cooking times, etc.
- Provide helpful cooking tips and substitutions
- Help improve the recipe based on user requests

When suggesting modifications, be specific about what should change. For example:
- "Change the prep time to 15 minutes"
- "Add '1 tsp vanilla extract' to the ingredients"
- "Replace 'all-purpose flour' with 'bread flour'"
- "Add a new step: 'Let the dough rest for 30 minutes'"

Keep responses concise and actionable. Focus on practical cooking advice.`;

    // Convert UIMessages from useChat to ModelMessages for streamText
    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model,
      messages: modelMessages,
      system: systemPrompt,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Recipe chat error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to process chat",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
