import { createOpenAI } from "@ai-sdk/openai";

// Stay on free endpoints even if an older deployment still specifies a paid model.
function freeModel(value: string | undefined, fallback = "openrouter/free"): string {
  return value === "openrouter/free" || value?.endsWith(":free") ? value : fallback;
}

// Chat Completions is required for OpenRouter; do not use the Responses API.
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const chatModel = openrouter.chat(freeModel(process.env.OPENROUTER_MODEL));
export const model = openrouter.chat(
  freeModel(process.env.OPENROUTER_RECIPE_MODEL, "dots-studio/dots-3-note-preview:free"),
);
