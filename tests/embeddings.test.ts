// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

function embeddingResponse(embedding: number[], model = "bge-m3") {
  return Response.json({
    object: "list",
    model,
    data: [{ object: "embedding", index: 0, embedding }],
    usage: { prompt_tokens: 2, total_tokens: 2 },
  });
}

describe("FreeLLMAPI embeddings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FREELLM_API_KEY", "synthetic-router-key");
    vi.stubEnv("FREELLM_BASE_URL", "https://router.example/v1");
    vi.stubEnv("FREELLM_EMBEDDING_MODEL", "bge-m3");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("uses the shared router key and a pinned model without an opt-in flag", async () => {
    const vector = Array.from({ length: 1024 }, () => 0.25);
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
      model: "bge-m3",
      input: ["tomato toast"],
    });
  });

  test.each([
    { vector: [] },
    { vector: [0.5] },
    { vector: Array.from({ length: 768 }, () => 0.25) },
    { vector: Array.from({ length: 1024 }, () => 0) },
    { vector: Array.from({ length: 1025 }, () => 0.25) },
  ])("rejects vectors incompatible with the database index (%#)", async ({ vector }) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(embeddingResponse(vector));

    vi.stubGlobal("fetch", fetchMock);
    const { generateEmbedding } = await import("@/lib/embeddings");
    const result = await generateEmbedding("tomato toast");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain("Invalid embedding dimensions or values");
  });

  test("rejects another model even when it returns the expected dimensions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        embeddingResponse(
          Array.from({ length: 1024 }, () => 0.25),
          "another-family",
        ),
      ),
    );
    const { generateEmbedding } = await import("@/lib/embeddings");
    const result = await generateEmbedding("tomato toast");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain("Unexpected embedding model");
  });

  test("supports an explicitly pinned legacy family in a separate versioned space", async () => {
    vi.stubEnv("FREELLM_EMBEDDING_MODEL", "embeddinggemma-300m");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        embeddingResponse(
          Array.from({ length: 768 }, () => 0.25),
          "embeddinggemma-300m",
        ),
      ),
    );
    const { generateEmbedding, embeddingSpace } = await import("@/lib/embeddings");

    expect((await generateEmbedding("tomato toast")).isOk()).toBe(true);
    expect(embeddingSpace).toBe("embeddinggemma-300m:v1");
  });

  test("does not call hosted inference when the input is blank", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    vi.stubGlobal("fetch", fetchMock);
    const { generateEmbedding } = await import("@/lib/embeddings");
    expect((await generateEmbedding("  ")).isErr()).toBe(true);
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
