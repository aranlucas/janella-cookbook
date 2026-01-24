import { cookies } from "next/headers";
import type {
  OAuthClientProvider,
  OAuthTokens,
  OAuthClientInformation,
  OAuthClientMetadata,
} from "@ai-sdk/mcp";

const COOKIES = {
  TOKENS: "mcp_tokens",
  CODE_VERIFIER: "mcp_code_verifier",
  CLIENT_INFO: "mcp_client_info",
} as const;

/**
 * Server-side OAuth provider for MCP using HTTP-only cookies.
 */
export class MCPOAuthProvider implements OAuthClientProvider {
  readonly redirectUrl: string;
  readonly clientMetadata: OAuthClientMetadata;

  constructor(baseUrl: string) {
    this.redirectUrl = `${baseUrl}/callback`;
    this.clientMetadata = {
      client_name: "Janella Cookbook",
      redirect_uris: [`${baseUrl}/callback`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    };
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIES.TOKENS)?.value;
    return value ? JSON.parse(value) : undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const cookieStore = await cookies();
    const maxAge = Math.max((tokens.expires_in ?? 3600) - 60, 60);
    cookieStore.set(COOKIES.TOKENS, JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    // Throw error with auth URL - caller must handle the redirect
    throw new AuthRequiredError(authorizationUrl.toString());
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIES.CODE_VERIFIER, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  async codeVerifier(): Promise<string> {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIES.CODE_VERIFIER)?.value;
    if (!value) throw new Error("Code verifier not found");
    return value;
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIES.CLIENT_INFO)?.value;
    return value ? JSON.parse(value) : undefined;
  }

  async saveClientInformation(info: OAuthClientInformation): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIES.CLIENT_INFO, JSON.stringify(info), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}

/**
 * Error thrown when OAuth authorization is required.
 */
export class AuthRequiredError extends Error {
  constructor(public readonly authorizationUrl: string) {
    super("Authorization required");
    this.name = "AuthRequiredError";
  }
}
