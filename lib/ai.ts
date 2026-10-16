import { createOpenAI } from "@ai-sdk/openai";

// Use the Railway router's Chat Completions endpoint for chat and structured output.
const freellm = createOpenAI({
  name: "freellmapi",
  apiKey: process.env.FREELLM_API_KEY,
  baseURL: process.env.FREELLM_BASE_URL ?? "https://freellmapi-production-1175.up.railway.app/v1",
});

export function isAIConfigured(): boolean {
  return Boolean(process.env.FREELLM_API_KEY?.trim());
}

export const chatModel = freellm.chat(process.env.FREELLM_MODEL ?? "auto");

export const model = freellm.chat(process.env.FREELLM_RECIPE_MODEL ?? "auto");
