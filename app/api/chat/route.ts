import { openai } from "@ai-sdk/openai";
import { getMCPClient } from "@/lib/mcp-client";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const model = openai("gpt-4o-mini");

  const result = streamText({
    model,
    messages,
    system: `You are a helpful AI assistant for the Janella Cookbook app.
You help users discover recipes, plan meals, and answer cooking-related questions.
Be friendly, concise, and helpful.`,
  });

  return result.toDataStreamResponse();
}
