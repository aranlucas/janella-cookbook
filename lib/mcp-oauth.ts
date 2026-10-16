import { cookies } from "next/headers";
import type {
  OAuthClientProvider,
  OAuthTokens,
  OAuthClientInformation,
  OAuthClientMetadata,
} from "@ai-sdk/mcp";
import { z } from "zod";
import { AuthRequiredError } from "./mcp-auth-error";
import { env } from "./env";

export { AuthRequiredError } from "./mcp-auth-error";

const COOKIES = {
  TOKENS: "mcp_tokens",
  CODE_VERIFIER: "mcp_code_verifier",
  CLIENT_INFO: "mcp_client_info",
} as const;

const oauthTokensSchema = z.object({
  access_token: z.string(),
  id_token: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
  refresh_token: z.string().optional(),
  issuer: z.string().optional(),
  authorization_server: z.string().optional(),
  token_endpoint: z.string().optional(),
});

const oauthClientInformationSchema = z.object({
  client_id: z.string(),
  client_secret: z.string().optional(),
  client_id_issued_at: z.number().optional(),
  client_secret_expires_at: z.number().optional(),
  issuer: z.string().optional(),
  authorization_server: z.string().optional(),
  token_endpoint: z.string().optional(),
});

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

    if (!value) {
      return undefined;
    }

    const parsed = oauthTokensSchema.safeParse(JSON.parse(value));

    return parsed.success ? parsed.data : undefined;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const cookieStore = await cookies();
    const maxAge = Math.max((tokens.expires_in ?? 3600) - 60, 60);
    cookieStore.set(COOKIES.TOKENS, JSON.stringify(tokens), {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    // Throw error with auth URL - caller must handle the redirect
    throw new AuthRequiredError(authorizationUrl.toString());
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIES.CODE_VERIFIER, codeVerifier, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  async codeVerifier(): Promise<string> {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIES.CODE_VERIFIER)?.value;

    if (!value) {
      throw new Error("Code verifier not found");
    }

    return value;
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIES.CLIENT_INFO)?.value;

    if (!value) {
      return undefined;
    }

    const parsed = oauthClientInformationSchema.safeParse(JSON.parse(value));

    return parsed.success ? parsed.data : undefined;
  }

  async saveClientInformation(info: OAuthClientInformation): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIES.CLIENT_INFO, JSON.stringify(info), {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}
