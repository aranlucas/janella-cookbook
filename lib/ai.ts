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
 * Chat model with OpenRouter as primary
 * Primary: stepfun/step-3.5-flash:free
 * Fallbacks: gemini-2.5-flash -> gemini-3-flash -> gemini-2.5-flash-lite
 */
export const chatModel = createFallback({
  models: [
    openrouter("stepfun/step-3.5-flash:free"),
    google("gemini-2.5-flash"),
    google("gemini-3-flash"),
    google("gemini-2.5-flash-lite"),
  ],
  onError: (error, modelId) => {
    console.warn(`AI provider error (${modelId}):`, error.message);
  },
  modelResetInterval: 5 * 60 * 1000, // Reset to primary after 5 minutes
});

/**
 * Standard model for structured output tasks (recipe parsing, nutrition analysis)
 * Primary: stepfun/step-3.5-flash:free
 * Fallbacks: gemini-2.0-flash -> gemini-2.5-flash -> gemini-2.5-flash-lite
 */
export const model = createFallback({
  models: [
    openrouter("stepfun/step-3.5-flash:free"),
    google("gemini-2.0-flash"),
    google("gemini-2.5-flash"),
    google("gemini-2.5-flash-lite"),
  ],
  onError: (error, modelId) => {
    console.warn(`AI provider error (${modelId}):`, error.message);
  },
  modelResetInterval: 5 * 60 * 1000, // Reset to primary after 5 minutes
});
