import { createMCPClient, type OAuthClientProvider } from "@ai-sdk/mcp";

const MCP_SERVER_URL = "https://ai-meal-planner-mcp.aranlucas.workers.dev";

const authProvider: OAuthClientProvider = {
  redirectUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`,
  clientMetadata: {
    client_name: "Janella Cookbook",
    redirect_uris: [
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`,
    ],
    grant_types: ["authorization_code", "refresh_token"],
  },
  tokens: async () => {
    // TODO: Retrieve stored tokens from database/session
    return null;
  },
  saveTokens: async (tokens) => {
    // TODO: Save tokens to database/session
    console.log("Tokens received:", tokens);
  },
};

export async function getMCPClient() {
  const client = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_SERVER_URL,
      authProvider,
    },
  });

  return client;
}
