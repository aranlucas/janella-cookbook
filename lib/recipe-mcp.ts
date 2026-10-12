import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { createRecipe } from "@/lib/actions";
import { RecipeNotFoundError, toAppError } from "@/lib/errors";
import { getRecipeBySlug, listRecipes } from "@/lib/recipe-queries";
import { mcpAddRecipeSchema, mcpGetRecipeSchema, mcpListRecipesSchema } from "@/lib/validations";
import type { RecipeWithRelations } from "@/types/recipe";

// Explicit fields keep save keys and internal search data out of tool responses.
function publicRecipe(recipe: RecipeWithRelations) {
  return {
    id: recipe.id,
    slug: recipe.slug,
    path: `/recipe/${recipe.slug}`,
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine,
    course: recipe.course,
    tags: recipe.tags,
    sourceUrl: recipe.sourceUrl,
    sourceType: recipe.sourceType,
    imageUrl: recipe.imageUrl,
    images: recipe.images,
    notes: recipe.notes,
    rating: recipe.rating,
    isFavorite: recipe.isFavorite,
    cookCount: recipe.cookCount,
    lastCooked: recipe.lastCooked?.toISOString() ?? null,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  };
}

function toolResult(data: Record<string, unknown>, isError = false): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
    ...(isError ? { isError: true } : {}),
  };
}

async function recipeTool(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    const appError = toAppError(error);
    if (appError.statusCode >= 500) console.error("Recipe MCP tool failed:", error);
    return toolResult(
      {
        error:
          appError.statusCode < 500 ? appError.message : "Could not access recipes. Please retry.",
        code: appError.code,
      },
      true,
    );
  }
}

export function registerRecipeTools(server: McpServer) {
  server.registerTool(
    "list_recipes",
    {
      title: "List recipes",
      description:
        "Browse or search the cookbook with filters and pagination. Returns recipe summaries, newest first. Use get_recipe with a returned slug for ingredients and instructions.",
      inputSchema: mcpListRecipesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (input) =>
      recipeTool(async () => {
        const { recipes, total, limit, offset, hasMore } = await listRecipes(input, "summary");
        return toolResult({
          recipes: recipes.map((recipe) => ({ ...recipe, path: `/recipe/${recipe.slug}` })),
          pagination: { total, limit, offset, hasMore },
        });
      }),
  );

  server.registerTool(
    "get_recipe",
    {
      title: "View a recipe",
      description:
        "Get a saved recipe by slug, including ordered ingredients, instructions, tags, images, and notes.",
      inputSchema: mcpGetRecipeSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ slug }) =>
      recipeTool(async () => {
        const recipe = await getRecipeBySlug(slug);
        if (!recipe) throw new RecipeNotFoundError(slug);
        return toolResult({ recipe: publicRecipe(recipe) });
      }),
  );

  server.registerTool(
    "add_recipe",
    {
      title: "Add a recipe",
      description:
        "Save a complete recipe to the cookbook. Requires a title, at least one ingredient, and at least one instruction. Times and step durations are in minutes; array order determines ingredient and step order. Supply a saveKey UUID and reuse it for retries to avoid duplicates.",
      inputSchema: mcpAddRecipeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    ({ saveKey, ...recipe }) =>
      recipeTool(async () => {
        const result = await createRecipe(
          {
            ...recipe,
            sourceType: "API",
            prepTime: recipe.prepTime ?? undefined,
            cookTime: recipe.cookTime ?? undefined,
            totalTime: recipe.totalTime ?? undefined,
            rating: recipe.rating ?? undefined,
          },
          saveKey,
        );
        if (!result.success) return toolResult({ error: result.error }, true);
        return toolResult({ recipe: publicRecipe(result.data) });
      }),
  );
}
