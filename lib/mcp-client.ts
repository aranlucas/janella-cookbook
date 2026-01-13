import { createMCPClient } from "@ai-sdk/mcp";

const MCP_SERVER_URL = "https://ai-meal-planner-mcp.aranlucas.workers.dev";

export async function getMCPClient() {
  const client = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_SERVER_URL,
    },
  });

  return client;
}
