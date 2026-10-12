import {
  generateProtectedResourceMetadata,
  getPublicOrigin,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";

export function GET(request: Request) {
  return Response.json(
    generateProtectedResourceMetadata({
      authServerUrls: [],
      resourceUrl: `${getPublicOrigin(request)}/api/mcp`,
      additionalMetadata: {
        resource_name: "Janella Cookbook",
        scopes_supported: ["recipes:read", "recipes:write"],
      },
    }),
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
