import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Use the Railway router's Chat Completions endpoint for chat and structured output.
const freellm = createOpenAICompatible({
  name: "freellmapi",
  apiKey: process.env.FREELLM_API_KEY,
  baseURL: process.env.FREELLM_BASE_URL ?? "https://freellmapi-production-1175.up.railway.app/v1",
  supportsStructuredOutputs: true,
});

export const chatModel = freellm.chatModel(process.env.FREELLM_MODEL ?? "auto");

export const model = freellm.chatModel(process.env.FREELLM_RECIPE_MODEL ?? "auto");
