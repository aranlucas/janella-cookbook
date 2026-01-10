/**
 * GET /api/schema - API schema and capabilities documentation
 *
 * This endpoint provides machine-readable documentation of the API,
 * making it easy for LLMs and programmatic clients to understand
 * the available endpoints, their parameters, and response formats.
 *
 * Response includes:
 * - API version and metadata
 * - List of all available endpoints
 * - Data schemas for Recipe, Ingredient, Instruction, Tag
 * - Valid enum values for Course, Difficulty, SourceType
 * - Filter options and constraints
 */

import { NextResponse } from "next/server";

const API_SCHEMA = {
  version: "1.0",
  name: "Janella Cookbook API",
  description:
    "A recipe management API with AI-powered search and recipe parsing capabilities",
  baseUrl: "/api",

  endpoints: [
    {
      path: "/api/recipes",
      method: "GET",
      description: "List all recipes with pagination and filtering",
      parameters: {
        query: {
          limit: {
            type: "number",
            default: 20,
            min: 1,
            max: 100,
            description: "Number of recipes to return",
          },
          offset: {
            type: "number",
            default: 0,
            min: 0,
            description: "Number of recipes to skip for pagination",
          },
          sort: {
            type: "string",
            default: "createdAt",
            enum: [
              "createdAt",
              "updatedAt",
              "title",
              "prepTime",
              "cookTime",
              "totalTime",
              "rating",
              "cookCount",
              "lastCooked",
            ],
            description: "Field to sort by",
          },
          order: {
            type: "string",
            default: "desc",
            enum: ["asc", "desc"],
            description: "Sort order",
          },
          cuisine: {
            type: "string",
            description: "Filter by cuisine (case-insensitive)",
          },
          course: {
            type: "string",
            enum: [
              "BREAKFAST",
              "LUNCH",
              "DINNER",
              "APPETIZER",
              "SIDE",
              "DESSERT",
              "SNACK",
              "DRINK",
              "SAUCE",
              "BREAD",
            ],
            description: "Filter by meal course",
          },
          difficulty: {
            type: "string",
            enum: ["EASY", "MEDIUM", "HARD", "EXPERT"],
            description: "Filter by difficulty level",
          },
          tag: {
            type: "string",
            description: "Filter by tag slug",
          },
          favorite: {
            type: "boolean",
            description: "Filter to only show favorites when true",
          },
          maxTime: {
            type: "number",
            description: "Filter recipes with totalTime <= maxTime (in minutes)",
          },
        },
      },
      response: {
        success: true,
        data: "Recipe[]",
        meta: {
          pagination: {
            total: "number",
            limit: "number",
            offset: "number",
            hasMore: "boolean",
          },
          timestamp: "ISO 8601 string",
          version: "string",
        },
      },
    },
    {
      path: "/api/recipes/:slug",
      method: "GET",
      description: "Get a single recipe by its unique slug",
      parameters: {
        path: {
          slug: {
            type: "string",
            required: true,
            description: "The unique slug identifier for the recipe",
          },
        },
      },
      response: {
        success: true,
        data: "Recipe",
        meta: {
          timestamp: "ISO 8601 string",
          version: "string",
        },
      },
      errors: [
        { status: 404, code: "NOT_FOUND", description: "Recipe not found" },
      ],
    },
    {
      path: "/api/search",
      method: "POST",
      description:
        "Search recipes using hybrid semantic and keyword search. Supports natural language queries.",
      requestBody: {
        query: {
          type: "string",
          required: true,
          minLength: 1,
          maxLength: 500,
          description:
            "Search query - supports natural language (e.g., 'quick pasta dishes under 30 minutes')",
        },
        filters: {
          type: "object",
          description: "Optional filters to narrow results",
          properties: {
            cuisine: { type: "string[]", description: "Filter by cuisines" },
            course: { type: "Course[]", description: "Filter by courses" },
            difficulty: {
              type: "Difficulty[]",
              description: "Filter by difficulties",
            },
            maxTime: {
              type: "number",
              description: "Maximum total time in minutes",
            },
            tags: { type: "string[]", description: "Filter by tag slugs" },
            isFavorite: {
              type: "boolean",
              description: "Filter to favorites only",
            },
          },
        },
        limit: {
          type: "number",
          default: 20,
          max: 100,
          description: "Maximum results to return",
        },
        offset: {
          type: "number",
          default: 0,
          description: "Results to skip for pagination",
        },
      },
      response: {
        success: true,
        data: {
          results: "SearchResult[]",
          total: "number",
          query: "string",
          suggestedFilters: "string[] | undefined",
        },
        meta: {
          pagination: "PaginationMeta",
          timestamp: "ISO 8601 string",
          version: "string",
        },
      },
    },
    {
      path: "/api/filters",
      method: "GET",
      description:
        "Get available filter options based on existing recipes in the database",
      response: {
        success: true,
        data: {
          cuisines: "string[]",
          courses: "Course[]",
          difficulties: "Difficulty[]",
          tags: "Tag[]",
          timeRanges: "{ min: number, max: number }",
        },
      },
    },
    {
      path: "/api/schema",
      method: "GET",
      description: "Get API schema and documentation (this endpoint)",
    },
  ],

  schemas: {
    Recipe: {
      id: { type: "string", format: "uuid" },
      slug: { type: "string", description: "URL-friendly unique identifier" },
      title: { type: "string" },
      description: { type: "string | null" },
      prepTime: { type: "number | null", description: "Prep time in minutes" },
      cookTime: { type: "number | null", description: "Cook time in minutes" },
      totalTime: {
        type: "number | null",
        description: "Total time in minutes",
      },
      servings: { type: "string | null", description: "Serving size text" },
      difficulty: { type: "Difficulty | null" },
      cuisine: { type: "string | null" },
      course: { type: "Course | null" },
      sourceUrl: { type: "string | null", description: "Original recipe URL" },
      sourceType: { type: "SourceType" },
      imageUrl: { type: "string | null" },
      notes: { type: "string | null" },
      rating: { type: "number | null", description: "1-5 rating" },
      isFavorite: { type: "boolean", default: false },
      cookCount: {
        type: "number",
        default: 0,
        description: "Times recipe has been cooked",
      },
      lastCooked: { type: "string | null", format: "ISO 8601" },
      createdAt: { type: "string", format: "ISO 8601" },
      updatedAt: { type: "string", format: "ISO 8601" },
      ingredients: { type: "Ingredient[]" },
      instructions: { type: "Instruction[]" },
      tags: { type: "Tag[]" },
      images: { type: "RecipeImage[]" },
    },

    Ingredient: {
      id: { type: "string", format: "uuid" },
      quantity: { type: "string | null", description: "Amount (e.g., '2', '1/2')" },
      unit: { type: "string | null", description: "Unit of measure (e.g., 'cups', 'tbsp')" },
      name: { type: "string", description: "Ingredient name" },
      notes: { type: "string | null", description: "Additional notes (e.g., 'diced', 'optional')" },
      group: { type: "string | null", description: "Ingredient group header" },
      sortOrder: { type: "number" },
    },

    Instruction: {
      id: { type: "string", format: "uuid" },
      text: { type: "string", description: "Step instruction text" },
      group: { type: "string | null", description: "Instruction group header" },
      duration: { type: "number | null", description: "Step duration in minutes" },
      sortOrder: { type: "number" },
    },

    Tag: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      slug: { type: "string" },
    },

    RecipeImage: {
      id: { type: "string", format: "uuid" },
      url: { type: "string" },
      alt: { type: "string | null" },
      isPrimary: { type: "boolean" },
    },

    SearchResult: {
      recipe: { type: "Recipe" },
      score: { type: "number", description: "Relevance score (0-1)" },
      highlights: {
        type: "string[]",
        description: "Matched text snippets",
      },
    },
  },

  enums: {
    Course: [
      "BREAKFAST",
      "LUNCH",
      "DINNER",
      "APPETIZER",
      "SIDE",
      "DESSERT",
      "SNACK",
      "DRINK",
      "SAUCE",
      "BREAD",
    ],
    Difficulty: ["EASY", "MEDIUM", "HARD", "EXPERT"],
    SourceType: ["URL_IMPORT", "MANUAL", "NATURAL_LANGUAGE", "PHOTO", "API"],
  },

  responseFormat: {
    description: "All responses follow a consistent envelope format",
    success: {
      success: true,
      data: "<response data>",
      meta: {
        timestamp: "ISO 8601 timestamp",
        version: "API version",
        pagination: "Present for list endpoints",
      },
    },
    error: {
      success: false,
      error: {
        message: "Human-readable error message",
        code: "Machine-readable error code",
        details: "Additional error context (optional)",
      },
    },
  },

  errorCodes: [
    { code: "VALIDATION_ERROR", status: 400, description: "Invalid request parameters" },
    { code: "NOT_FOUND", status: 404, description: "Resource not found" },
    { code: "RECIPE_NOT_FOUND", status: 404, description: "Recipe does not exist" },
    { code: "RECIPE_PARSE_ERROR", status: 400, description: "Failed to parse recipe from URL or text" },
    { code: "EXTERNAL_API_ERROR", status: 502, description: "External service (AI, embedding) failed" },
    { code: "DATABASE_ERROR", status: 500, description: "Database operation failed" },
    { code: "UNKNOWN_ERROR", status: 500, description: "Unexpected server error" },
  ],
};

export async function GET() {
  return NextResponse.json(API_SCHEMA, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
