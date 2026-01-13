import { openai } from "@ai-sdk/openai";
import { getMCPClient } from "@/lib/mcp-client";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Initialize MCP client and get tools
  const mcpClient = await getMCPClient().catch(() => {
    console.warn(
      "MCP client initialization failed, continuing without MCP tools",
    );
    return undefined;
  });

  const tools:
    | Awaited<ReturnType<NonNullable<typeof mcpClient>["tools"]>>
    | undefined = mcpClient
    ? await mcpClient.tools().catch(() => {
        console.warn("Failed to get MCP tools");
        return undefined;
      })
    : undefined;

  if (tools) {
    console.log("MCP Tools available:", Object.keys(tools).length);
  }

  // Use OpenAI model
  const model = openai("gpt-4o-mini");

  // Create streaming response
  const result = streamText({
    model,
    messages,
    // @ts-expect-error - MCP tools() return type is compatible but TS can't infer the complex union type
    tools,
    system: `You are a helpful AI assistant for the Janella Cookbook app.
You help users discover recipes, plan meals, and answer cooking-related questions.
${tools ? "You have access to meal planning tools through the MCP server. Use them to provide personalized meal suggestions and planning assistance." : ""}
Be friendly, concise, and helpful. If you're asked about recipes in the cookbook, you can search and provide relevant information.`,
    maxSteps: 5,
    onFinish: async () => {
      // Close MCP client after streaming is complete
      if (mcpClient) {
        await mcpClient.close().catch((error) => {
          console.error("Error closing MCP client:", error);
        });
      }
    },
  });

  return result.toDataStreamResponse();
}
