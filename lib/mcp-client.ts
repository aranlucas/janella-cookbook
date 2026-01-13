import { createMCPClient } from "@ai-sdk/mcp";

// MCP Server configuration for AI Meal Planner
const MCP_SERVER_URL = "https://ai-meal-planner-mcp.aranlucas.workers.dev";

// OAuth configuration interface
interface MCPOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
}

/**
 * Creates and returns an MCP client instance with OAuth authentication
 * for the AI Meal Planner MCP server.
 */
export async function getMCPClient(oauthConfig?: MCPOAuthConfig) {
  try {
    // Build headers for authentication
    const headers: Record<string, string> = {};

    // If we have an access token, use Bearer authentication
    if (oauthConfig?.accessToken) {
      headers["Authorization"] = `Bearer ${oauthConfig.accessToken}`;
    }

    // Create MCP client with HTTP transport
    const client = await createMCPClient({
      transport: {
        type: "http",
        url: MCP_SERVER_URL,
        headers,
      },
    });

    return client;
  } catch (error) {
    console.error("Failed to create MCP client:", error);
    throw error;
  }
}

/**
 * Initialize OAuth flow for MCP server
 * This handles the OAuth handshake with the MCP server
 */
export async function initializeMCPOAuth() {
  // The @ai-sdk/mcp package handles OAuth automatically
  // when the server requires it. This includes:
  // - PKCE challenge generation
  // - Token refresh
  // - Dynamic client registration

  // For now, we'll create a client without explicit OAuth config
  // The SDK will handle the OAuth flow automatically
  return getMCPClient();
}

/**
 * Get available resources from the MCP server
 */
export async function getMCPResources(
  client: Awaited<ReturnType<typeof getMCPClient>>,
) {
  try {
    const resources = await client.listResources();
    return resources;
  } catch (error) {
    console.error("Failed to list MCP resources:", error);
    return [];
  }
}

/**
 * Get available prompts from the MCP server
 */
export async function getMCPPrompts(
  client: Awaited<ReturnType<typeof getMCPClient>>,
) {
  try {
    const prompts = await client.listPrompts();
    return prompts;
  } catch (error) {
    console.error("Failed to list MCP prompts:", error);
    return [];
  }
}

/**
 * Get available tools from the MCP server
 */
export async function getMCPTools(
  client: Awaited<ReturnType<typeof getMCPClient>>,
) {
  try {
    const tools = await client.listTools();
    return tools;
  } catch (error) {
    console.error("Failed to list MCP tools:", error);
    return [];
  }
}
