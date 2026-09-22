import { request } from "@playwright/test";

export function deploymentURL(value: string | undefined): string {
  if (!value) throw new Error("PLAYWRIGHT_BASE_URL is required for deployment tests.");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !/^janella-cookbook(?:-[a-z0-9-]+-aranlucas-projects)?\.vercel\.app$/.test(url.hostname)
  ) {
    throw new Error("Deployment tests require a Janella Cookbook Vercel deployment URL.");
  }
  return url.origin;
}

export async function deploymentSession(baseURL: string, secret: string | undefined) {
  if (!secret) throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET is required for deployment tests.");
  const client = await request.newContext({ baseURL, timeout: 30_000 });
  try {
    // Exchange the credential for an origin-scoped cookie. Never follow a redirect
    // with the secret or attach it to every browser/subresource request.
    await client.get("/", {
      headers: {
        "x-vercel-protection-bypass": secret,
        "x-vercel-set-bypass-cookie": "true",
      },
      maxRedirects: 0,
    });
    const response = await client.get("/recipes/new", { maxRedirects: 0 });
    if (response.status() !== 200 || !(await response.text()).includes("Add a Recipe")) {
      throw new Error("Deployment authentication failed: the recipe page is not accessible.");
    }
    return await client.storageState();
  } catch {
    // Playwright request errors can include credential/cookie headers in their
    // call log. Keep failure output actionable without publishing those values.
    throw new Error(
      "Deployment authentication failed: check the URL, CI credential and recipe page.",
    );
  } finally {
    await client.dispose();
  }
}
