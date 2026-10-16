import { createHash, timingSafeEqual } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerRecipeTools } from "@/lib/recipe-mcp";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const maxDuration = 60;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

const mcpHandler = createMcpHandler(registerRecipeTools, {
  serverInfo: { name: "janella-cookbook", version: "1.0.0" },
  instructions:
    "Browse saved recipes and add recipes to Janella Cookbook. Use list_recipes to find slugs, then get_recipe to view full recipes.",
  maxSubscriptions: 0,
});

function verifyToken(_request: Request, token?: string): AuthInfo | undefined {
  const expected = env.MCP_API_TOKEN;

  if (!token || !expected) {
    return undefined;
  }

  if (!timingSafeEqual(digest(token), digest(expected))) {
    return undefined;
  }

  return { token, clientId: "cookbook", scopes: ["recipes:read", "recipes:write"] };
}

const authenticatedHandler = withMcpAuth(mcpHandler, verifyToken, { required: true });

function handler(request: Request) {
  // Never expose a writable public endpoint when deployment configuration is missing.
  if (!env.MCP_API_TOKEN) {
    return Response.json({ error: "Recipe MCP is not configured." }, { status: 503 });
  }

  return authenticatedHandler(request);
}

export { handler as GET, handler as POST };
