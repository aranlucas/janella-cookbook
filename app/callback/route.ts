import { auth } from "@ai-sdk/mcp";
import { MCPOAuthProvider } from "@/lib/mcp-oauth";
import { NextRequest, NextResponse } from "next/server";

const MCP_SERVER_URL = "https://ai-meal-planner-mcp.aranlucas.workers.dev/mcp";

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    const errorDescription = searchParams.get("error_description") ?? error;
    return NextResponse.redirect(
      new URL(
        `/chat?auth_error=${encodeURIComponent(errorDescription)}`,
        request.url,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/chat?auth_error=No%20authorization%20code%20received",
        request.url,
      ),
    );
  }

  const baseUrl = getBaseUrl(request);
  const authProvider = new MCPOAuthProvider(baseUrl);

  try {
    // Exchange the authorization code for tokens
    const result = await auth(authProvider, {
      serverUrl: new URL(MCP_SERVER_URL),
      authorizationCode: code,
    });

    if (result === "AUTHORIZED") {
      // Success - redirect back to the chat
      return NextResponse.redirect(new URL("/chat?auth=success", request.url));
    }

    // If still needs redirect (shouldn't happen with a code), handle it
    return NextResponse.redirect(
      new URL("/chat?auth_error=Authorization%20incomplete", request.url),
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/chat?auth_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
