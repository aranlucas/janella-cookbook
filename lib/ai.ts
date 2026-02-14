import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter client configured for AI SDK
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/**
 * Chat model using OpenRouter's stepfun/step-3.5-flash:free.
 *
 * Note: We use .chat() for OpenRouter to force the Chat Completions API
 * instead of the Responses API (default in AI SDK 5+), as OpenRouter
 * doesn't fully support the Responses API format.
 */
export const chatModel = openrouter.chat("stepfun/step-3.5-flash:free");

/**
 * Standard model for structured output tasks (recipe parsing, nutrition analysis)
 *
 * Note: We use .chat() for OpenRouter to force the Chat Completions API
 * instead of the Responses API (default in AI SDK 5+), as OpenRouter
 * doesn't fully support the Responses API format.
 */
export const model = openrouter.chat("stepfun/step-3.5-flash:free");
