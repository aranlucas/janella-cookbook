import { createMCPClient, auth } from "@ai-sdk/mcp";

const MCP_SERVER_URL = "https://ai-meal-planner-mcp.aranlucas.workers.dev";

export async function getMCPClient() {
  const authProvider = auth.createOAuthProvider({
    clientId: process.env.MCP_CLIENT_ID,
    authorizationEndpoint: `${MCP_SERVER_URL}/oauth/authorize`,
    tokenEndpoint: `${MCP_SERVER_URL}/oauth/token`,
  });

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_SERVER_URL,
      authProvider,
    },
  });

  return client;
}
