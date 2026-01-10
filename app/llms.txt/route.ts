/**
 * GET /llms.txt - LLM-friendly site overview
 *
 * This endpoint serves a Markdown file following the llms.txt specification
 * (https://llmstxt.org/) to help LLMs understand and use this API.
 *
 * The response is heavily cached (1 week) since the API structure rarely changes.
 */

// Force static generation for maximum caching
export const dynamic = "force-static";
export const revalidate = 604800; // 1 week in seconds

const LLMS_TXT = `# Janella Cookbook API

> A recipe management API with AI-powered semantic search, recipe parsing, and nutritional analysis. Built with Next.js, PostgreSQL, and pgvector for vector similarity search.

## Quick Start

The API uses a standardized JSON response format:
- Success: \`{ "success": true, "data": <response>, "meta": { "timestamp", "version", "pagination?" } }\`
- Error: \`{ "success": false, "error": { "message", "code", "details?" } }\`

## API Endpoints

- [GET /api/schema](/api/schema): Complete API documentation with all endpoints, parameters, and schemas
- [GET /api/recipes](/api/recipes): List recipes with pagination and filtering
- [GET /api/recipes/:slug](/api/recipes/example-slug): Get a single recipe by slug
- [POST /api/search](/api/search): Hybrid semantic + keyword search
- [GET /api/filters](/api/filters): Available filter options from the database

## Core Data Types

**Recipe** contains: id, slug, title, description, prepTime, cookTime, totalTime, servings, difficulty (EASY|MEDIUM|HARD|EXPERT), cuisine, course (BREAKFAST|LUNCH|DINNER|APPETIZER|SIDE|DESSERT|SNACK|DRINK|SAUCE|BREAD), sourceUrl, imageUrl, notes, rating, isFavorite, cookCount, ingredients[], instructions[], tags[]

**Ingredient** contains: quantity, unit, name, notes, group, sortOrder

**Instruction** contains: text, group, duration, sortOrder

## Common Query Patterns

List all recipes: \`GET /api/recipes\`
Get desserts: \`GET /api/recipes?course=DESSERT\`
Quick meals: \`GET /api/recipes?maxTime=30\`
Search: \`POST /api/search\` with \`{ "query": "quick pasta dinner" }\`

## Optional

- [GET /llms-full.txt](/llms-full.txt): Complete API documentation in a single file
`;

export function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control":
        "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
