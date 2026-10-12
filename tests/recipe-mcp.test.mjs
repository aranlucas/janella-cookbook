// @vitest-environment node

import { afterEach, beforeEach, expect, test, vi } from "vitest";

const prisma = {
  recipe: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
};
const createRecipe = vi.fn();
vi.doMock("../lib/prisma.ts", () => ({ prisma }));
vi.doMock("../lib/actions.ts", () => ({ createRecipe }));

// Run the real HTTP adapter and tool registration; replace only persistence.
const { POST, GET } = await import("../app/api/mcp/route.ts");
const { GET: metadata } = await import("../app/.well-known/oauth-protected-resource/route.ts");
const { GET: restList } = await import("../app/api/recipes/route.ts");
const { GET: restGet } = await import("../app/api/recipes/[slug]/route.ts");
const token = "synthetic-mcp-token";
const recipe = {
  id: "test-recipe",
  slug: "test-soup",
  title: "Test soup",
  description: "Test recipe",
  ingredients: [{ name: "Carrot", sortOrder: 0 }],
  instructions: [{ text: "Simmer", sortOrder: 0 }],
  tags: [],
  images: [],
  sourceType: "API",
  prepTime: 5,
  cookTime: 10,
  totalTime: 15,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  saveKey: "private-save-key",
  searchText: "internal search projection",
  embedding: [1, 2, 3],
};
const input = {
  title: "Test soup",
  ingredients: [{ name: "Carrot" }],
  instructions: [{ text: "Simmer" }],
};

beforeEach(() => {
  vi.stubEnv("MCP_API_TOKEN", token);
  prisma.recipe.findMany.mockResolvedValue([{ slug: recipe.slug, title: recipe.title }]);
  prisma.recipe.findUnique.mockResolvedValue(recipe);
  prisma.recipe.count.mockResolvedValue(1);
  createRecipe.mockResolvedValue({ success: true, data: recipe, slug: recipe.slug });
});

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function request(method, params, authorization = `Bearer ${token}`) {
  return new Request("https://cookbook.example/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
      ...(authorization === null ? {} : { Authorization: authorization }),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

async function rpc(method, params) {
  const response = await POST(request(method, params));
  const body = await response.text();
  expect(response.status, body).toBe(200);
  const message = response.headers.get("content-type")?.includes("text/event-stream")
    ? JSON.parse(
        body
          .split("\n")
          .find((line) => line.startsWith("data: "))
          .slice(6),
      )
    : JSON.parse(body);
  return message;
}

const call = (name, args) => rpc("tools/call", { name, arguments: args });
const data = (message) => JSON.parse(message.result.content[0].text);

test("MCP initializes with the cookbook identity and advertises recipe tools", async () => {
  const initialized = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  });
  expect(initialized.result.serverInfo.name).toBe("janella-cookbook");
  const listed = await rpc("tools/list", {});
  expect(listed.result.tools.map((tool) => tool.name).sort()).toEqual([
    "add_recipe",
    "get_recipe",
    "list_recipes",
  ]);
  const add = listed.result.tools.find((tool) => tool.name === "add_recipe");
  expect(add.inputSchema.required).toEqual(
    expect.arrayContaining(["title", "ingredients", "instructions"]),
  );
  expect(add.annotations.readOnlyHint).toBe(false);
  expect(
    listed.result.tools.find((tool) => tool.name === "get_recipe").annotations.readOnlyHint,
  ).toBe(true);
});

for (const authorization of [null, "Bearer incorrect-token", "Basic synthetic-mcp-token"]) {
  test(`unauthorized requests do not reach persistence: ${authorization}`, async () => {
    const response = await POST(
      request("tools/call", { name: "add_recipe", arguments: input }, authorization),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "https://cookbook.example/.well-known/oauth-protected-resource",
    );
    expect(createRecipe).not.toHaveBeenCalled();
    expect(prisma.recipe.findMany).not.toHaveBeenCalled();
  });
}

test("missing server token disables MCP instead of exposing anonymous access", async () => {
  vi.stubEnv("MCP_API_TOKEN", "");
  expect((await POST(request("tools/list", {}))).status).toBe(503);
  expect(createRecipe).not.toHaveBeenCalled();
  expect(prisma.recipe.findMany).not.toHaveBeenCalled();
});

test("stateless GET returns 405 after authentication", async () => {
  const response = await GET(
    new Request("https://cookbook.example/api/mcp", {
      headers: { Authorization: `Bearer ${token}`, "MCP-Protocol-Version": "2025-06-18" },
    }),
  );
  expect(response.status).toBe(405);
});

test("authentication metadata identifies the MCP endpoint behind the Railway proxy", async () => {
  const response = metadata(
    new Request("http://localhost:3000/.well-known/oauth-protected-resource", {
      headers: { "x-forwarded-host": "cookbook.example", "x-forwarded-proto": "https" },
    }),
  );
  expect(await response.json()).toMatchObject({
    resource: "https://cookbook.example/api/mcp",
    authorization_servers: [],
    scopes_supported: ["recipes:read", "recipes:write"],
  });
});

test("listing uses default bounded pagination and returns links", async () => {
  const result = await call("list_recipes", {});
  expect(data(result)).toMatchObject({
    recipes: [{ slug: recipe.slug, path: "/recipe/test-soup" }],
    pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
  });
  expect(prisma.recipe.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ take: 20, skip: 0 }),
  );
  expect(result.result.structuredContent).toEqual(data(result));
});

test("filters and keyword search apply equally to records and total count", async () => {
  prisma.recipe.count.mockResolvedValue(40);
  const result = await call("list_recipes", {
    query: "carrot",
    cuisine: "Italian",
    course: "DINNER",
    difficulty: "EASY",
    tag: "vegetarian",
    isFavorite: false,
    maxTime: 0,
    limit: 5,
    offset: 10,
  });
  const query = prisma.recipe.findMany.mock.calls[0][0];
  expect(query.where).toEqual({
    OR: ["title", "description", "searchText"].map((field) => ({
      [field]: { contains: "carrot", mode: "insensitive" },
    })),
    cuisine: { equals: "Italian", mode: "insensitive" },
    course: "DINNER",
    difficulty: "EASY",
    tags: { some: { slug: "vegetarian" } },
    isFavorite: false,
    totalTime: { lte: 0 },
  });
  expect(prisma.recipe.count).toHaveBeenCalledWith({ where: query.where });
  expect(query).toMatchObject({
    take: 5,
    skip: 10,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  expect(data(result).pagination.hasMore).toBe(true);
});

test("viewing returns full recipe content without internal fields", async () => {
  const result = await call("get_recipe", { slug: recipe.slug });
  expect(data(result).recipe).toMatchObject({
    slug: recipe.slug,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  for (const field of ["saveKey", "embedding", "searchText"]) {
    expect(data(result).recipe).not.toHaveProperty(field);
  }
  expect(prisma.recipe.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { slug: recipe.slug },
      include: expect.objectContaining({
        ingredients: { orderBy: { sortOrder: "asc" } },
        instructions: { orderBy: { sortOrder: "asc" } },
      }),
    }),
  );
});

test("missing recipes produce an MCP tool error", async () => {
  prisma.recipe.findUnique.mockResolvedValue(null);
  const result = await call("get_recipe", { slug: "missing" });
  expect(result.result.isError).toBe(true);
  expect(data(result).code).toBe("RECIPE_NOT_FOUND");
});

test("database failures are tool errors without leaking connection details", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  prisma.recipe.findMany.mockRejectedValue(new Error("private database connection details"));
  const result = await call("list_recipes", {});
  expect(result.result.isError).toBe(true);
  expect(data(result).error).toContain("Please retry");
  expect(JSON.stringify(result)).not.toContain("private database connection details");
});

test("adding uses validated input, API provenance, and the existing retry key", async () => {
  const saveKey = "b3c0f8e4-9d79-4bd3-83db-cdc581290fe8";
  const result = await call("add_recipe", {
    ...input,
    title: " Test soup ",
    prepTime: null,
    rating: null,
    saveKey,
  });
  expect(createRecipe).toHaveBeenCalledWith(
    {
      ...input,
      sourceType: "API",
      prepTime: undefined,
      cookTime: undefined,
      totalTime: undefined,
      rating: undefined,
    },
    saveKey,
  );
  expect(data(result).recipe.path).toBe("/recipe/test-soup");
  expect(data(result).recipe).not.toHaveProperty("saveKey");
});

test("save failures are reported as MCP tool errors", async () => {
  createRecipe.mockResolvedValue({ success: false, error: "Could not save the recipe." });
  const result = await call("add_recipe", input);
  expect(result.result.isError).toBe(true);
  expect(data(result).error).toBe("Could not save the recipe.");
});

test("REST and MCP browse the same filtered collection and report the same pagination", async () => {
  const filters = {
    query: "carrot",
    cuisine: "Italian",
    course: "DINNER",
    difficulty: "EASY",
    tag: "vegetarian",
    isFavorite: true,
    maxTime: 25,
    limit: 5,
    offset: 10,
  };
  prisma.recipe.count.mockResolvedValue(40);
  const mcp = await call("list_recipes", filters);
  const mcpQuery = prisma.recipe.findMany.mock.calls[0][0];
  const params = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(filters)
        .filter(([key]) => key !== "isFavorite")
        .map(([key, value]) => [key, String(value)]),
    ),
    favorite: "true",
  });
  const response = await restList(new Request(`https://cookbook.example/api/recipes?${params}`));
  expect(response.status).toBe(200);
  const rest = await response.json();
  const restQuery = prisma.recipe.findMany.mock.calls[1][0];
  expect(restQuery.where).toEqual(mcpQuery.where);
  expect(restQuery.take).toBe(mcpQuery.take);
  expect(restQuery.skip).toBe(mcpQuery.skip);
  expect(rest.meta.pagination).toEqual(data(mcp).pagination);
  expect(restQuery.include).toMatchObject({ ingredients: { orderBy: { sortOrder: "asc" } } });
  expect(mcpQuery.select).toHaveProperty("title", true);
  expect(mcpQuery).not.toHaveProperty("include");
});

test("REST preserves its default favorite behavior and accepts its existing sort options", async () => {
  const response = await restList(
    new Request("https://cookbook.example/api/recipes?sort=title&order=asc"),
  );
  expect(response.status).toBe(200);
  const query = prisma.recipe.findMany.mock.calls[0][0];
  expect(query.where).not.toHaveProperty("isFavorite");
  expect(query.orderBy).toEqual({ title: "asc" });
  expect((await response.json()).meta.pagination).toMatchObject({ limit: 20, offset: 0 });
});

test("REST and MCP view the same recipe with the same ordered relations", async () => {
  const mcp = await call("get_recipe", { slug: recipe.slug });
  const response = await restGet(
    new Request(`https://cookbook.example/api/recipes/${recipe.slug}`),
    {
      params: Promise.resolve({ slug: recipe.slug }),
    },
  );
  expect(response.status).toBe(200);
  const rest = await response.json();
  expect(rest.data.ingredients).toEqual(data(mcp).recipe.ingredients);
  expect(rest.data.instructions).toEqual(data(mcp).recipe.instructions);
  expect(prisma.recipe.findUnique.mock.calls[0][0]).toEqual(
    prisma.recipe.findUnique.mock.calls[1][0],
  );
});

test("the shared lookup preserves REST 404 responses and MCP tool errors", async () => {
  prisma.recipe.findUnique.mockResolvedValue(null);
  const response = await restGet(new Request("https://cookbook.example/api/recipes/missing"), {
    params: Promise.resolve({ slug: "missing" }),
  });
  expect(response.status).toBe(404);
  expect((await response.json()).error.code).toBe("RECIPE_NOT_FOUND");
  const mcp = await call("get_recipe", { slug: "missing" });
  expect(mcp.result.isError).toBe(true);
  expect(data(mcp).code).toBe("RECIPE_NOT_FOUND");
});

for (const [name, args] of [
  ["list_recipes", { limit: 101 }],
  ["list_recipes", { offset: -1 }],
  ["list_recipes", { limit: 1.5 }],
  ["list_recipes", { course: "INVALID" }],
  ["get_recipe", { slug: " " }],
  ["add_recipe", { ...input, title: " " }],
  ["add_recipe", { ...input, ingredients: [] }],
  ["add_recipe", { ...input, instructions: [] }],
  ["add_recipe", { ...input, rating: 2.5 }],
  ["add_recipe", { ...input, saveKey: "invalid-uuid" }],
  ["add_recipe", { ...input, instructions: [{ text: "Simmer", duration: 0.5 }] }],
]) {
  test(`invalid ${name} arguments are rejected before persistence: ${JSON.stringify(args)}`, async () => {
    const result = await call(name, args);
    expect(Boolean(result.error || result.result?.isError)).toBe(true);
    expect(createRecipe).not.toHaveBeenCalled();
    expect(prisma.recipe.findMany).not.toHaveBeenCalled();
    expect(prisma.recipe.findUnique).not.toHaveBeenCalled();
  });
}
