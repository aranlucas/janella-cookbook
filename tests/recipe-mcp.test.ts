// @vitest-environment node

import { afterEach, expect, test, vi } from "vitest";
import type { RecipeMcpServices } from "@/lib/recipe-mcp";
import type { RecipeSummary } from "@/lib/recipe-queries";
import type { RecipeWithRelations } from "@/types/recipe";
import type { JsonObject } from "@/types/json";
import { z } from "zod";

const [{ createRecipeTools }, { GET: protectedResource }] = await Promise.all([
  import("@/lib/recipe-mcp"),
  import("@/app/.well-known/oauth-protected-resource/route"),
]);

const token = "synthetic-mcp-token";

const timestamp = new Date("2026-01-01T00:00:00Z");

const publicRecipePayloadSchema = z.object({ recipe: z.record(z.string(), z.unknown()) });

const recipe = {
  id: "test-recipe",
  slug: "test-soup",
  title: "Test soup",
  description: "Test recipe",
  prepTime: 5,
  cookTime: 10,
  totalTime: 15,
  servings: null,
  difficulty: "MEDIUM",
  cuisine: null,
  course: "DINNER",
  sourceUrl: null,
  sourceType: "API",
  imageUrl: null,
  notes: null,
  rating: null,
  isFavorite: false,
  cookCount: 0,
  lastCooked: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  searchText: "internal search projection",
  ingredients: [
    {
      id: "ingredient-1",
      recipeId: "test-recipe",
      quantity: null,
      unit: null,
      name: "Carrot",
      notes: null,
      group: null,
      sortOrder: 0,
    },
  ],
  instructions: [
    {
      id: "instruction-1",
      recipeId: "test-recipe",
      text: "Simmer",
      group: null,
      sortOrder: 0,
      duration: null,
      imageUrl: null,
    },
  ],
  tags: [],
  images: [],
} satisfies RecipeWithRelations;

const summary = {
  id: recipe.id,
  slug: recipe.slug,
  title: recipe.title,
  description: recipe.description,
  totalTime: recipe.totalTime,
  servings: recipe.servings,
  cuisine: recipe.cuisine,
  course: recipe.course,
  difficulty: recipe.difficulty,
  isFavorite: recipe.isFavorite,
  rating: recipe.rating,
  tags: [],
} satisfies RecipeSummary;

const input = {
  title: "Test soup",
  ingredients: [{ name: "Carrot" }],
  instructions: [{ text: "Simmer" }],
};

const listRecipes = vi.fn<RecipeMcpServices["listRecipes"]>(() =>
  Promise.resolve({
    recipes: [summary],
    total: 1,
    limit: 20,
    offset: 0,
    hasMore: false,
  }),
);

const getRecipeBySlug = vi.fn<RecipeMcpServices["getRecipeBySlug"]>(() => Promise.resolve(recipe));

const createRecipe = vi.fn<RecipeMcpServices["createRecipe"]>(() =>
  Promise.resolve({ success: true, data: recipe, slug: recipe.slug }),
);

const services: RecipeMcpServices = { listRecipes, getRecipeBySlug, createRecipe };

const tools = createRecipeTools(services);

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  listRecipes.mockResolvedValue({
    recipes: [summary],
    total: 1,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  getRecipeBySlug.mockResolvedValue(recipe);
  createRecipe.mockResolvedValue({ success: true, data: recipe, slug: recipe.slug });
});

test("tool definitions advertise read/write behavior and bounded recipe inputs", () => {
  expect(Object.keys(tools).toSorted()).toEqual(["add_recipe", "get_recipe", "list_recipes"]);
  expect(tools.list_recipes.config.annotations?.readOnlyHint).toBe(true);
  expect(tools.get_recipe.config.annotations?.readOnlyHint).toBe(true);
  expect(tools.add_recipe.config.annotations?.readOnlyHint).toBe(false);
  expect(tools.add_recipe.config.inputSchema.safeParse(input).success).toBe(true);
});

test("listing passes validated filters to the shared query service and returns pagination", async () => {
  const parsed = tools.list_recipes.config.inputSchema.parse({
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

  const result = await tools.list_recipes.handler(parsed);

  expect(listRecipes).toHaveBeenCalledWith(parsed, "summary");
  expect(result.structuredContent).toEqual({
    recipes: [{ ...summary, path: "/recipe/test-soup" }],
    pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
  });
});

test("get_recipe returns ordered content and keeps internal fields private", async () => {
  const result = await tools.get_recipe.handler(
    tools.get_recipe.config.inputSchema.parse({ slug: recipe.slug }),
  );

  expect(getRecipeBySlug).toHaveBeenCalledWith(recipe.slug);
  expect(result.structuredContent).toMatchObject({
    recipe: {
      slug: recipe.slug,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      createdAt: timestamp.toISOString(),
    },
  });

  const encodedRecipe = result.content.find((item) => item.type === "text");

  expect(encodedRecipe?.type).toBe("text");

  if (encodedRecipe?.type !== "text") {
    throw new Error("Recipe tool response is missing its JSON text payload");
  }

  const parsedPayload = publicRecipePayloadSchema.parse(JSON.parse(encodedRecipe.text));

  expect(parsedPayload.recipe).not.toHaveProperty("searchText");
  expect(parsedPayload.recipe).not.toHaveProperty("embedding");
  expect(parsedPayload.recipe).not.toHaveProperty("saveKey");
});

test("add_recipe normalizes optional values, sets API provenance, and keeps the retry key", async () => {
  const saveKey = "b3c0f8e4-9d79-4bd3-83db-cdc581290fe8";

  const parsed = tools.add_recipe.config.inputSchema.parse({
    ...input,
    title: " Test soup ",
    prepTime: null,
    rating: null,
    saveKey,
  });

  const result = await tools.add_recipe.handler(parsed);

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
  const encodedRecipe = result.content.find((item) => item.type === "text");

  expect(encodedRecipe?.type).toBe("text");

  if (encodedRecipe?.type !== "text") {
    throw new Error("Recipe tool response is missing its JSON text payload");
  }

  const parsedPayload = publicRecipePayloadSchema.parse(JSON.parse(encodedRecipe.text));

  expect(parsedPayload.recipe).not.toHaveProperty("saveKey");
});

test("invalid tool input fails schema parsing before any service call", () => {
  const invalidArguments = [
    tools.list_recipes.config.inputSchema.safeParse({ limit: 101 }),
    tools.list_recipes.config.inputSchema.safeParse({ offset: -1 }),
    tools.get_recipe.config.inputSchema.safeParse({ slug: " " }),
    tools.add_recipe.config.inputSchema.safeParse({ ...input, ingredients: [] }),
    tools.add_recipe.config.inputSchema.safeParse({ ...input, rating: 2.5 }),
  ];

  expect(invalidArguments.every((result) => !result.success)).toBe(true);
  expect(listRecipes).not.toHaveBeenCalled();
  expect(getRecipeBySlug).not.toHaveBeenCalled();
  expect(createRecipe).not.toHaveBeenCalled();
});

test("missing recipes and database errors are returned as sanitized tool errors", async () => {
  getRecipeBySlug.mockResolvedValue(null);

  const missing = await tools.get_recipe.handler(
    tools.get_recipe.config.inputSchema.parse({ slug: "missing" }),
  );

  expect(missing.isError).toBe(true);
  expect(missing.structuredContent).toMatchObject({ code: "RECIPE_NOT_FOUND" });

  vi.spyOn(console, "error").mockImplementation(() => {});
  listRecipes.mockRejectedValue(new Error("private database connection details"));
  const failed = await tools.list_recipes.handler(tools.list_recipes.config.inputSchema.parse({}));

  expect(failed.isError).toBe(true);
  expect(failed.structuredContent).toMatchObject({
    error: "Could not access recipes. Please retry.",
  });
  expect(JSON.stringify(failed)).not.toContain("private database connection details");
});

function request(
  method: string,
  params: JsonObject,
  authorization: string | null = `Bearer ${token}`,
) {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": "2025-06-18",
  });

  if (authorization !== null) {
    headers.set("Authorization", authorization);
  }

  return new Request("https://cookbook.example/api/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

test("the HTTP endpoint rejects missing and invalid credentials before recipe access", async () => {
  vi.stubEnv("MCP_API_TOKEN", token);
  vi.resetModules();

  const { POST } = await import("@/app/api/mcp/route");

  const responses = await Promise.all(
    [null, "Bearer incorrect-token", "Basic synthetic-mcp-token"].map((authorization) =>
      Promise.resolve(POST(request("tools/list", {}, authorization))),
    ),
  );

  for (const response of responses) {
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "https://cookbook.example/.well-known/oauth-protected-resource",
    );
  }

  expect(listRecipes).not.toHaveBeenCalled();
  expect(createRecipe).not.toHaveBeenCalled();
});

test("the endpoint fails closed when its token is missing and advertises proxy metadata", async () => {
  vi.stubEnv("MCP_API_TOKEN", "");
  vi.resetModules();

  const { POST } = await import("@/app/api/mcp/route");

  expect((await POST(request("tools/list", {}))).status).toBe(503);

  const response = protectedResource(
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

test("stateless GET returns 405 after authentication", async () => {
  vi.stubEnv("MCP_API_TOKEN", token);
  vi.resetModules();

  const { GET } = await import("@/app/api/mcp/route");

  const response = await GET(
    new Request("https://cookbook.example/api/mcp", {
      headers: { Authorization: `Bearer ${token}`, "MCP-Protocol-Version": "2025-06-18" },
    }),
  );

  expect(response.status).toBe(405);
});
