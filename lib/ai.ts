import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "./env";

// Use the Railway router's Chat Completions endpoint for chat and structured output.
const freellm = createOpenAICompatible({
  name: "freellmapi",
  apiKey: env.FREELLM_API_KEY,
  baseURL: env.FREELLM_BASE_URL,
  supportsStructuredOutputs: true,
});

export const chatModel = freellm.chatModel(env.FREELLM_MODEL);

export const model = freellm.chatModel(env.FREELLM_RECIPE_MODEL);

export const embeddingModel = freellm.embeddingModel(env.FREELLM_EMBEDDING_MODEL);
