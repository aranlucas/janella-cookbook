// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("application environment", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/cookbook");

    for (const name of [
      "DATABASE_POOL_MAX",
      "FREELLM_API_KEY",
      "FREELLM_BASE_URL",
      "FREELLM_MODEL",
      "FREELLM_RECIPE_MODEL",
      "FREELLM_EMBEDDING_MODEL",
      "MCP_API_TOKEN",
    ]) {
      vi.stubEnv(name, "");
    }

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("applies defaults and accepts empty optional credentials without AI preflight checks", async () => {
    const { env } = await import("@/lib/env");

    expect(env.DATABASE_POOL_MAX).toBe(5);
    expect(env.FREELLM_BASE_URL).toBe("https://freellmapi-production-1175.up.railway.app/v1");
    expect(env.FREELLM_MODEL).toBe("auto");
    expect(env.FREELLM_RECIPE_MODEL).toBe("auto:fast");
    expect(env.FREELLM_EMBEDDING_MODEL).toBe("embeddinggemma-300m");
    expect(env.FREELLM_API_KEY).toBeUndefined();
    expect(env.MCP_API_TOKEN).toBeUndefined();
  });

  test("parses pool size", async () => {
    vi.stubEnv("DATABASE_POOL_MAX", "3");

    const { env } = await import("@/lib/env");

    expect(env.DATABASE_POOL_MAX).toBe(3);
  });

  test.each([
    ["DATABASE_URL", ""],
    ["DATABASE_URL", "invalid-url"],
    ["DATABASE_POOL_MAX", "0"],
    ["DATABASE_POOL_MAX", "2.5"],
    ["DATABASE_POOL_MAX", "invalid-number"],
    ["FREELLM_BASE_URL", "invalid-url"],
    ["FREELLM_EMBEDDING_MODEL", "auto"],
  ])("rejects invalid %s configuration (%s)", async (name, value) => {
    vi.stubEnv(name, value);

    await expect(import("@/lib/env")).rejects.toThrow("Invalid environment variables");
  });

  test("blocks server secrets on the client while exposing declared public values", async () => {
    vi.stubGlobal("window", {});
    vi.stubEnv("FREELLM_API_KEY", "synthetic-server-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://cookbook.example");

    const { env } = await import("@/lib/env");

    expect(env.NEXT_PUBLIC_SITE_URL).toBe("https://cookbook.example");
    expect(() => env.FREELLM_API_KEY).toThrow("server-side environment variable");
  });
});
