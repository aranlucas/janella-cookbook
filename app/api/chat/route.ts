import { openai } from "@ai-sdk/openai";
import { getMCPClient } from "@/lib/mcp-client";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const mcpClient = await getMCPClient();
  const tools = await mcpClient.tools();

  const model = openai("gpt-4o-mini");

  const result = streamText({
    model,
    messages,
    // @ts-expect-error - MCP tools() return type is compatible but TS can't infer the complex union type
    tools,
    system: `You are a helpful AI assistant for the Janella Cookbook app.
You help users discover recipes, plan meals, and answer cooking-related questions.
You have access to meal planning tools through the MCP server. Use them to provide personalized meal suggestions and planning assistance.
Be friendly, concise, and helpful.`,
  });

  return result.toDataStreamResponse();
}
