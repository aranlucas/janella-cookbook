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
 * Chat model with Gemini 2.5-flash as primary (better for conversational AI)
 * Falls back to OpenRouter Devstral if Google is unavailable
 */
export const chatModel = createFallback({
  models: [
    google("gemini-2.5-flash"),
    openrouter("mistralai/devstral-2512:free"),
  ],
  onError: (error, modelId) => {
    console.warn(`AI provider error (${modelId}):`, error.message);
  },
  modelResetInterval: 5 * 60 * 1000, // Reset to primary after 5 minutes
});

/**
 * Standard model with Gemini 2.0-flash as primary (good for structured output)
 * Used for recipe parsing, nutrition analysis, and other structured tasks
 * Falls back to OpenRouter Devstral if Google is unavailable
 */
export const model = createFallback({
  models: [
    google("gemini-2.0-flash"),
    openrouter("mistralai/devstral-2512:free"),
  ],
  onError: (error, modelId) => {
    console.warn(`AI provider error (${modelId}):`, error.message);
  },
  modelResetInterval: 5 * 60 * 1000, // Reset to primary after 5 minutes
});
