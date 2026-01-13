import { createMCPClient, type OAuthClientProvider } from "@ai-sdk/mcp";
import { cookies } from "next/headers";

const MCP_SERVER_URL = "https://ai-meal-planner-mcp.aranlucas.workers.dev";
const TOKEN_COOKIE_NAME = "mcp_oauth_tokens";

async function getStoredTokens() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(TOKEN_COOKIE_NAME);

  if (!tokenCookie?.value) {
    return null;
  }

  return JSON.parse(tokenCookie.value);
}

async function saveStoredTokens(tokens: unknown) {
  const cookieStore = await cookies();

  cookieStore.set(TOKEN_COOKIE_NAME, JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getMCPClient() {
  const authProvider: OAuthClientProvider = {
    redirectUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`,
    clientMetadata: {
      client_name: "Janella Cookbook",
      redirect_uris: [
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/callback`,
      ],
      grant_types: ["authorization_code", "refresh_token"],
    },
    tokens: getStoredTokens,
    saveTokens: saveStoredTokens,
  };

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_SERVER_URL,
      authProvider,
    },
  });

  return client;
}
