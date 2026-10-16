// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { generateText, Output } from "ai";
import { z } from "zod";

describe("Railway FreeLLMAPI integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FREELLM_API_KEY", "test-cookbook-key");
    // oxlint-disable-next-line unicorn/no-useless-undefined -- Vitest requires a value to unset an env var.
    vi.stubEnv("FREELLM_BASE_URL", undefined);
    // oxlint-disable-next-line unicorn/no-useless-undefined -- Vitest requires a value to unset an env var.
    vi.stubEnv("FREELLM_MODEL", undefined);
    // oxlint-disable-next-line unicorn/no-useless-undefined -- Vitest requires a value to unset an env var.
    vi.stubEnv("FREELLM_RECIPE_MODEL", undefined);
    // Old deployment settings must never select the previous provider.
    vi.stubEnv("OPENROUTER_API_KEY", "old-provider-key");
    vi.stubEnv("OPENROUTER_MODEL", "openrouter/free");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("sends chat to Railway with the dedicated key and auto routing", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "test-chat",
        created: 1,
        model: "routed-model",
        choices: [
          { index: 0, message: { role: "assistant", content: "Hello" }, finish_reason: "stop" },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    const { chatModel } = await import("@/lib/ai");
    const result = await generateText({ model: chatModel, prompt: "Hello", maxRetries: 0 });

    expect(result.text).toBe("Hello");
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://freellmapi-production-1175.up.railway.app/v1/chat/completions");
    expect(new Headers(request?.headers).get("authorization")).toBe("Bearer test-cookbook-key");

    expect(JSON.parse(z.string().parse(request?.body))).toMatchObject({ model: "auto" });
  });

  test("supports structured recipe output through a configured router endpoint", async () => {
    vi.stubEnv("FREELLM_BASE_URL", "https://router.example/v1");
    vi.stubEnv("FREELLM_RECIPE_MODEL", "auto:recipes");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "test-recipe",
        created: 1,
        model: "routed-model",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: '{"title":"Tomato soup"}' },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    const { model } = await import("@/lib/ai");

    const result = await generateText({
      model,
      prompt: "Extract the recipe title",
      output: Output.object({ schema: z.object({ title: z.string() }) }),
      maxRetries: 0,
    });

    expect(result.output).toEqual({ title: "Tomato soup" });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://router.example/v1/chat/completions");

    expect(JSON.parse(z.string().parse(request?.body))).toMatchObject({
      model: "auto:recipes",
      response_format: { type: "json_schema" },
    });
  });

  test("requires the new key for AI extraction even when an old key exists", async () => {
    vi.stubEnv("FREELLM_API_KEY", "");
    const { isAIConfigured } = await import("@/lib/ai");
    expect(isAIConfigured()).toBe(false);
    vi.stubEnv("FREELLM_API_KEY", "  ");
    expect(isAIConfigured()).toBe(false);
    vi.stubEnv("FREELLM_API_KEY", "test-cookbook-key");
    expect(isAIConfigured()).toBe(true);
  });
});
