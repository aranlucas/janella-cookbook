import { createHash, timingSafeEqual } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler } from "mcp-handler";
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

const bearerChallenge = 'Bearer realm="Janella Cookbook"';

function handler(request: Request) {
  const expected = env.MCP_API_TOKEN;

  // Never expose a writable public endpoint when deployment configuration is missing.
  if (!expected) {
    return Response.json({ error: "Recipe MCP is not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const token = /^Bearer +(\S+)$/i.exec(authorization)?.[1];

  if (!token) {
    return new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": bearerChallenge },
    });
  }

  if (!timingSafeEqual(digest(token), digest(expected))) {
    const description = "Update the client Authorization header with the current cookbook token";

    return Response.json(
      { error: "invalid_token", error_description: description },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `${bearerChallenge}, error="invalid_token", error_description="${description}"`,
        },
      },
    );
  }

  const auth: AuthInfo = { token, clientId: "cookbook", scopes: ["recipes:read", "recipes:write"] };

  return mcpHandler(Object.assign(request, { auth }));
}

export { handler as GET, handler as POST };
