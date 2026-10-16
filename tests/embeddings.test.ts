// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

function embeddingResponse(embedding: number[]) {
  return Response.json({
    object: "list",
    model: "embeddinggemma-300m",
    data: [{ object: "embedding", index: 0, embedding }],
    usage: { prompt_tokens: 2, total_tokens: 2 },
  });
}

describe("FreeLLMAPI embeddings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FREELLM_API_KEY", "synthetic-router-key");
    vi.stubEnv("FREELLM_BASE_URL", "https://router.example/v1");
    vi.stubEnv("FREELLM_EMBEDDING_MODEL", "embeddinggemma-300m");
    vi.stubEnv("ENABLE_HOSTED_EMBEDDINGS", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("uses the shared router key and a pinned model for 768-dimensional vectors", async () => {
    const vector = Array.from({ length: 768 }, () => 0.25);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(embeddingResponse(vector));

    vi.stubGlobal("fetch", fetchMock);
    const { generateEmbedding } = await import("@/lib/embeddings");
    const result = await generateEmbedding("tomato toast");

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(vector);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://router.example/v1/embeddings");
    expect(new Headers(request?.headers).get("authorization")).toBe("Bearer synthetic-router-key");
    expect(JSON.parse(z.string().parse(request?.body))).toMatchObject({
      model: "embeddinggemma-300m",
      input: ["tomato toast"],
    });
  });

  test.each([
    { vector: [] },
    { vector: [0.5] },
    { vector: Array.from({ length: 769 }, () => 0.25) },
  ])("rejects vectors incompatible with the database index (%#)", async ({ vector }) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(embeddingResponse(vector));

    vi.stubGlobal("fetch", fetchMock);
    const { generateEmbedding } = await import("@/lib/embeddings");
    const result = await generateEmbedding("tomato toast");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain("Invalid embedding dimensions or values");
  });

  test("does not call hosted inference when disabled or when the input is blank", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ENABLE_HOSTED_EMBEDDINGS", "false");
    const disabled = await import("@/lib/embeddings");
    expect((await disabled.generateEmbedding("tomato toast")).isErr()).toBe(true);
    vi.resetModules();
    vi.stubEnv("ENABLE_HOSTED_EMBEDDINGS", "true");
    const enabled = await import("@/lib/embeddings");
    expect((await enabled.generateEmbedding("  ")).isErr()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns provider failures for keyword fallback without retrying", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: { message: "Provider unavailable", type: "provider_error" } },
          { status: 503 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);
    const { generateEmbedding } = await import("@/lib/embeddings");
    const result = await generateEmbedding("tomato toast");

    expect(result.isErr()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
