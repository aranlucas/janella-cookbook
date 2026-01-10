/**
 * GET /llms-full.txt - Complete LLM-friendly API documentation
 *
 * This endpoint serves comprehensive API documentation in Markdown format
 * following the llms.txt specification. Contains all endpoint details,
 * request/response schemas, and usage examples.
 *
 * Heavily cached (1 week) as API structure rarely changes.
 */

export const dynamic = "force-static";
export const revalidate = 604800; // 1 week

const LLMS_FULL_TXT = `# Janella Cookbook API - Complete Documentation

> A recipe management API with AI-powered semantic search, recipe parsing from URLs, and nutritional analysis. Built with Next.js 16, PostgreSQL with pgvector for vector similarity search, and OpenAI/HuggingFace for embeddings.

## Response Format

All API responses use a standardized JSON envelope:

### Success Response
\`\`\`json
{
  "success": true,
  "data": <response_data>,
  "meta": {
    "timestamp": "2025-01-10T12:00:00.000Z",
    "version": "1.0",
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
\`\`\`

### Error Response
\`\`\`json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "details": { "field": ["error details"] }
  }
}
\`\`\`

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Invalid request parameters |
| NOT_FOUND | 404 | Resource not found |
| RECIPE_NOT_FOUND | 404 | Recipe does not exist |
| RECIPE_PARSE_ERROR | 400 | Failed to parse recipe from URL or text |
| EXTERNAL_API_ERROR | 502 | External service (AI, embedding) failed |
| DATABASE_ERROR | 500 | Database operation failed |
| UNKNOWN_ERROR | 500 | Unexpected server error |

---

## GET /api/recipes

List all recipes with pagination, sorting, and filtering.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Results per page (1-100) |
| offset | number | 0 | Skip N results for pagination |
| sort | string | createdAt | Sort field |
| order | asc/desc | desc | Sort direction |
| cuisine | string | - | Filter by cuisine (case-insensitive) |
| course | enum | - | Filter by course |
| difficulty | enum | - | Filter by difficulty |
| tag | string | - | Filter by tag slug |
| favorite | boolean | - | Show only favorites |
| maxTime | number | - | Max totalTime in minutes |

### Valid Sort Fields
createdAt, updatedAt, title, prepTime, cookTime, totalTime, rating, cookCount, lastCooked

### Valid Course Values
BREAKFAST, LUNCH, DINNER, APPETIZER, SIDE, DESSERT, SNACK, DRINK, SAUCE, BREAD

### Valid Difficulty Values
EASY, MEDIUM, HARD, EXPERT

### Example Request
\`\`\`
GET /api/recipes?course=DINNER&difficulty=EASY&maxTime=30&limit=10
\`\`\`

### Example Response
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "quick-pasta-dinner-abc123",
      "title": "Quick Pasta Dinner",
      "description": "A simple weeknight pasta",
      "prepTime": 10,
      "cookTime": 15,
      "totalTime": 25,
      "servings": "4",
      "difficulty": "EASY",
      "cuisine": "Italian",
      "course": "DINNER",
      "isFavorite": false,
      "rating": 4.5,
      "ingredients": [...],
      "instructions": [...],
      "tags": [...]
    }
  ],
  "meta": {
    "pagination": { "total": 42, "limit": 10, "offset": 0, "hasMore": true },
    "timestamp": "2025-01-10T12:00:00.000Z",
    "version": "1.0"
  }
}
\`\`\`

---

## GET /api/recipes/:slug

Get a single recipe by its unique slug identifier.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| slug | string | Yes | Unique recipe slug |

### Example Request
\`\`\`
GET /api/recipes/quick-pasta-dinner-abc123
\`\`\`

### Example Response
\`\`\`json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "quick-pasta-dinner-abc123",
    "title": "Quick Pasta Dinner",
    "description": "A simple weeknight pasta dish",
    "prepTime": 10,
    "cookTime": 15,
    "totalTime": 25,
    "servings": "4 servings",
    "difficulty": "EASY",
    "cuisine": "Italian",
    "course": "DINNER",
    "sourceUrl": "https://example.com/recipe",
    "sourceType": "URL_IMPORT",
    "imageUrl": "https://example.com/image.jpg",
    "notes": "Can substitute any pasta shape",
    "rating": 4.5,
    "isFavorite": true,
    "cookCount": 5,
    "lastCooked": "2025-01-05T18:00:00.000Z",
    "createdAt": "2025-01-01T12:00:00.000Z",
    "updatedAt": "2025-01-10T12:00:00.000Z",
    "ingredients": [
      {
        "id": "uuid",
        "quantity": "1",
        "unit": "lb",
        "name": "pasta",
        "notes": "any shape",
        "group": null,
        "sortOrder": 0
      }
    ],
    "instructions": [
      {
        "id": "uuid",
        "text": "Boil pasta according to package directions.",
        "group": null,
        "duration": 10,
        "sortOrder": 0
      }
    ],
    "tags": [
      { "id": "uuid", "name": "Quick", "slug": "quick" },
      { "id": "uuid", "name": "Italian", "slug": "italian" }
    ],
    "images": [
      { "id": "uuid", "url": "https://...", "alt": "Finished dish", "isPrimary": true }
    ]
  },
  "meta": {
    "timestamp": "2025-01-10T12:00:00.000Z",
    "version": "1.0"
  }
}
\`\`\`

### Error Response (404)
\`\`\`json
{
  "success": false,
  "error": {
    "message": "Recipe not found: invalid-slug",
    "code": "NOT_FOUND"
  }
}
\`\`\`

---

## POST /api/search

Search recipes using hybrid semantic and keyword search. Supports natural language queries.

### Request Body

\`\`\`json
{
  "query": "quick vegetarian pasta under 30 minutes",
  "filters": {
    "cuisine": ["Italian", "Mediterranean"],
    "course": ["DINNER", "LUNCH"],
    "difficulty": ["EASY", "MEDIUM"],
    "maxTime": 30,
    "tags": ["vegetarian"],
    "isFavorite": false
  },
  "limit": 20,
  "offset": 0
}
\`\`\`

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | Natural language search query (1-500 chars) |
| filters | object | No | Optional filter constraints |
| filters.cuisine | string[] | No | Filter by cuisines |
| filters.course | Course[] | No | Filter by courses |
| filters.difficulty | Difficulty[] | No | Filter by difficulties |
| filters.maxTime | number | No | Max total time in minutes |
| filters.tags | string[] | No | Filter by tag slugs |
| filters.isFavorite | boolean | No | Filter to favorites only |
| limit | number | No | Max results (default: 20, max: 100) |
| offset | number | No | Skip N results (default: 0) |

### Example Response
\`\`\`json
{
  "success": true,
  "data": {
    "results": [
      {
        "recipe": { ... },
        "score": 0.92,
        "highlights": ["quick pasta", "vegetarian option"]
      }
    ],
    "total": 15,
    "query": "quick vegetarian pasta under 30 minutes",
    "suggestedFilters": [
      "Try filtering by cuisine: Italian, Mediterranean",
      "8 quick recipes available (under 30 min) - use maxTime filter"
    ]
  },
  "meta": {
    "pagination": { "total": 15, "limit": 20, "offset": 0, "hasMore": false },
    "timestamp": "2025-01-10T12:00:00.000Z",
    "version": "1.0"
  }
}
\`\`\`

### Search Tips
- Use natural language: "quick vegetarian pasta dishes"
- Include time constraints: "dinner recipes under 30 minutes"
- Specify cuisines: "authentic Italian pizza recipes"
- Combine with filters for best results

---

## GET /api/filters

Get available filter options based on recipes in the database. Useful for building dynamic filter UIs.

### Example Response
\`\`\`json
{
  "success": true,
  "data": {
    "cuisines": ["American", "Chinese", "Italian", "Mexican", "Thai"],
    "courses": ["BREAKFAST", "DINNER", "LUNCH", "DESSERT"],
    "difficulties": ["EASY", "MEDIUM", "HARD"],
    "tags": [
      { "id": "uuid", "name": "Quick", "slug": "quick", "recipeCount": 25 },
      { "id": "uuid", "name": "Vegetarian", "slug": "vegetarian", "recipeCount": 18 }
    ],
    "timeRange": { "min": 5, "max": 180 },
    "counts": {
      "total": 150,
      "favorites": 12,
      "byCourse": { "DINNER": 45, "LUNCH": 30, "BREAKFAST": 25 },
      "byDifficulty": { "EASY": 80, "MEDIUM": 50, "HARD": 20 }
    }
  },
  "meta": {
    "timestamp": "2025-01-10T12:00:00.000Z",
    "version": "1.0"
  }
}
\`\`\`

---

## GET /api/schema

Get machine-readable API schema documentation as JSON. Contains complete endpoint specifications, parameter definitions, and data schemas.

---

## Data Schemas

### Recipe
| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| slug | string | URL-friendly unique identifier |
| title | string | Recipe title |
| description | string? | Recipe description |
| prepTime | number? | Prep time in minutes |
| cookTime | number? | Cook time in minutes |
| totalTime | number? | Total time in minutes |
| servings | string? | Serving size text |
| difficulty | Difficulty? | EASY, MEDIUM, HARD, EXPERT |
| cuisine | string? | Cuisine type |
| course | Course? | Meal course |
| sourceUrl | string? | Original recipe URL |
| sourceType | SourceType | URL_IMPORT, MANUAL, NATURAL_LANGUAGE, PHOTO, API |
| imageUrl | string? | Primary image URL |
| notes | string? | Additional notes |
| rating | number? | 1-5 rating |
| isFavorite | boolean | Favorited flag |
| cookCount | number | Times cooked |
| lastCooked | string? | ISO 8601 timestamp |
| createdAt | string | ISO 8601 timestamp |
| updatedAt | string | ISO 8601 timestamp |
| ingredients | Ingredient[] | List of ingredients |
| instructions | Instruction[] | List of steps |
| tags | Tag[] | Associated tags |
| images | RecipeImage[] | Additional images |

### Ingredient
| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| quantity | string? | Amount (e.g., "2", "1/2") |
| unit | string? | Unit (e.g., "cups", "tbsp") |
| name | string | Ingredient name |
| notes | string? | Additional notes (e.g., "diced") |
| group | string? | Group header for sectioning |
| sortOrder | number | Display order |

### Instruction
| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| text | string | Step instruction text |
| group | string? | Group header for sectioning |
| duration | number? | Step duration in minutes |
| sortOrder | number | Display order |

### Tag
| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| name | string | Display name |
| slug | string | URL-friendly identifier |

### RecipeImage
| Field | Type | Description |
|-------|------|-------------|
| id | string (uuid) | Unique identifier |
| url | string | Image URL |
| alt | string? | Alt text |
| isPrimary | boolean | Primary image flag |
`;

export function GET() {
  return new Response(LLMS_FULL_TXT, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control":
        "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
