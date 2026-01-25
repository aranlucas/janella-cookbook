import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createFallback } from "ai-fallback";

// Google Generative AI client (primary)
const google = createGoogleGenerativeAI({});

// OpenRouter client configured for AI SDK (fallback)
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/**
 * Chat model with Gemini text models as fallback chain
 * Primary: gemini-2.5-flash (best for conversational AI)
 * Fallbacks: gemini-3-flash -> gemini-2.5-flash-lite -> OpenRouter
 */
export const chatModel = createFallback({
  models: [
    google("gemini-2.5-flash"),
    google("gemini-3-flash"),
    google("gemini-2.5-flash-lite"),
    openrouter("mistralai/devstral-2512:free"),
  ],
  onError: (error, modelId) => {
    console.warn(`AI provider error (${modelId}):`, error.message);
  },
  modelResetInterval: 5 * 60 * 1000, // Reset to primary after 5 minutes
});

/**
 * Standard model for structured output tasks (recipe parsing, nutrition analysis)
 * Primary: gemini-2.0-flash (good for structured output)
 * Fallbacks: gemini-2.5-flash -> gemini-2.5-flash-lite -> OpenRouter
 */
export const model = createFallback({
  models: [
    google("gemini-2.0-flash"),
    google("gemini-2.5-flash"),
    google("gemini-2.5-flash-lite"),
    openrouter("mistralai/devstral-2512:free"),
  ],
  onError: (error, modelId) => {
    console.warn(`AI provider error (${modelId}):`, error.message);
  },
  modelResetInterval: 5 * 60 * 1000, // Reset to primary after 5 minutes
});
