import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { z } from "zod";
import { createRecipe } from "@/lib/actions";
import { RecipeNotFoundError, thrownValueSchema, toAppError } from "@/lib/errors";
import { getRecipeBySlug, listRecipes } from "@/lib/recipe-queries";
import { mcpAddRecipeSchema, mcpGetRecipeSchema, mcpListRecipesSchema } from "@/lib/validations";
import type { JsonObject } from "@/types/json";
import type { RecipeList, RecipeSummary } from "@/lib/recipe-queries";
import type { ActionResult } from "@/lib/actions";
import type { RecipeInput, RecipeWithRelations } from "@/types/recipe";

export interface RecipeMcpServices {
  readonly createRecipe: (input: Readonly<RecipeInput>, saveKey?: string) => Promise<ActionResult>;
  readonly getRecipeBySlug: (slug: string) => Promise<RecipeWithRelations | null>;
  readonly listRecipes: (
    options: Readonly<z.infer<typeof mcpListRecipesSchema>>,
    view: "summary",
  ) => Promise<RecipeList<RecipeSummary>>;
}

type ReadonlyMcpAddRecipeInput = Readonly<
  Omit<z.infer<typeof mcpAddRecipeSchema>, "ingredients" | "instructions" | "tags"> & {
    readonly ingredients: readonly z.infer<typeof mcpAddRecipeSchema>["ingredients"][number][];
    readonly instructions: readonly z.infer<typeof mcpAddRecipeSchema>["instructions"][number][];
    readonly tags?: readonly string[];
  }
>;

const recipeMcpServices: Readonly<RecipeMcpServices> = {
  createRecipe,
  getRecipeBySlug,
  listRecipes,
};

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

function toolResult<Data extends JsonObject>(data: Data, isError = false): CallToolResult {
  const result: CallToolResult = {
    content: [{ type: "text", text: JSON.stringify(data) }],
    structuredContent: data,
  };

  if (isError) {
    result.isError = true;
  }

  return result;
}

async function recipeTool(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    const appError = toAppError(thrownValueSchema.parse(error));

    if (appError.statusCode >= 500) {
      console.error("Recipe MCP tool failed:", error);
    }

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

export function createRecipeTools(services: Readonly<RecipeMcpServices> = recipeMcpServices) {
  return {
    list_recipes: {
      config: {
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
      handler: (input: Readonly<z.infer<typeof mcpListRecipesSchema>>) =>
        recipeTool(async () => {
          const { recipes, total, limit, offset, hasMore } = await services.listRecipes(
            input,
            "summary",
          );

          return toolResult({
            recipes: recipes.map((recipe) => ({ ...recipe, path: `/recipe/${recipe.slug}` })),
            pagination: { total, limit, offset, hasMore },
          });
        }),
    },

    get_recipe: {
      config: {
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
      handler: ({ slug }: Readonly<z.infer<typeof mcpGetRecipeSchema>>) =>
        recipeTool(async () => {
          const recipe = await services.getRecipeBySlug(slug);

          if (!recipe) {
            throw new RecipeNotFoundError(slug);
          }

          return toolResult({ recipe: publicRecipe(recipe) });
        }),
    },

    add_recipe: {
      config: {
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
      handler: (input: ReadonlyMcpAddRecipeInput) =>
        recipeTool(async () => {
          const { saveKey, ...recipe } = input;

          const result = await services.createRecipe(
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

          if (!result.success) {
            return toolResult({ error: result.error }, true);
          }

          return toolResult({ recipe: publicRecipe(result.data) });
        }),
    },
  };
}

export function registerRecipeTools(server: McpServer) {
  const tools = createRecipeTools();

  server.registerTool("list_recipes", tools.list_recipes.config, tools.list_recipes.handler);
  server.registerTool("get_recipe", tools.get_recipe.config, tools.get_recipe.handler);
  server.registerTool("add_recipe", tools.add_recipe.config, tools.add_recipe.handler);
}
