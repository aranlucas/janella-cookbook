# Janella Cookbook

[![CI](https://github.com/aranlucas/janella-cookbook/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aranlucas/janella-cookbook/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/github/license/aranlucas/janella-cookbook)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)

![Janella Cookbook logo, an open recipe book with a whisk](public/logo-bg.png)

**The recipe you loved last month deserves better than another lost browser tab.**

Janella Cookbook is a home for recipes worth keeping. Save what you cook, pull recipes in from a webpage or video, and search your collection when the familiar question returns: “What should we make tonight?”

> “Find something quick and vegetarian with the ingredients I already have.”

Use cookbook filters and search, or ask the recipe assistant to help explore the collection.

## From discovery to dinner

- Add a recipe by hand or import it from a URL, YouTube transcript, text, or photo.
- Keep ingredients, instructions, servings, images, notes, ratings, and cooking history together.
- Filter by cuisine, course, difficulty, time, and favorites.
- Use keyword search without hosted embeddings; turn on semantic search with optional Hugging Face embeddings.
- Chat about recipes and add ingredients to shopping lists from recipe pages.

AI recipe parsing and chat use OpenRouter. Hosted embeddings are optional and disabled by default.

## Start cooking locally

Requirements: Node.js 24, pnpm 12.6, and PostgreSQL with the pgvector extension enabled.

```sh
pnpm install
cp .env.example .env
```

Set DATABASE_URL to your PostgreSQL database. Add OPENROUTER_API_KEY for AI imports and chat. For semantic search, set ENABLE_HOSTED_EMBEDDINGS=true and provide HUGGINGFACE_API_KEY. Optional Cloudflare R2 credentials enable managed recipe-image storage.

Create or update the database schema, then launch Next.js:

```sh
pnpm db:push
pnpm dev
```

Open [https://janella-cookbook.localhost](https://janella-cookbook.localhost). `pnpm dev` runs through [Portless](https://github.com/vercel-labs/portless) (a dev dependency); its first run may ask for `sudo` to bind port 443 and trust a local certificate. In production, the app runs on Railway; use the Railway service environment when working with the deployed database.

## Connect an MCP client

The cookbook exposes recipe tools at `/api/mcp`, using [Vercel's mcp-handler](https://github.com/vercel-labs/mcp-handler). It runs in the existing Next.js app on Railway. The handler uses stateless Streamable HTTP and does not need Redis or a separate server.

Set `MCP_API_TOKEN` to a random secret in your local environment or Railway's `surprising-growth` service. Generate one with:

```sh
openssl rand -hex 32
```

All MCP requests require `Authorization: Bearer <your token>`. A missing server token disables the endpoint with HTTP 503; missing or invalid client credentials return HTTP 401. This setup uses a shared token; clients must support an explicit Authorization header. Interactive OAuth sign-in is not implemented.

For clients that accept a remote MCP URL and headers, add this entry to their `mcpServers` configuration:

```json
{
  "mcpServers": {
    "janella-cookbook": {
      "url": "https://janella-cookbook.localhost/api/mcp",
      "headers": {
        "Authorization": "Bearer <your MCP_API_TOKEN>"
      }
    }
  }
}
```

Replace the URL with your Railway domain plus `/api/mcp` when connecting to the deployed app. Keep the real token out of committed configuration files.

| Tool           | What it does                                                                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_recipes` | Returns summaries with slugs and recipe page paths. Supports keyword `query`, `cuisine`, `course`, `difficulty`, `tag` (slug), `isFavorite`, and `maxTime`. Pagination uses `limit` (default 20, maximum 100) and `offset`, with total count and `hasMore`. |
| `get_recipe`   | Takes a `slug` and returns the full recipe, including ordered ingredients and instructions, tags, images, notes, and cooking history.                                                                                                                       |
| `add_recipe`   | Saves a complete recipe using the app's validation, transaction, search indexing, and page refresh logic. Requires `title`, `ingredients`, and `instructions`; accepts optional recipe metadata and a `saveKey` UUID for retry protection.                  |

For example, call `add_recipe` with:

```json
{
  "title": "Simple tomato soup",
  "ingredients": [
    { "quantity": "1", "unit": "tbsp", "name": "olive oil" },
    { "quantity": "800", "unit": "g", "name": "canned tomatoes" }
  ],
  "instructions": [
    { "text": "Heat the oil, add the tomatoes, and simmer for 15 minutes.", "duration": 15 },
    { "text": "Blend until smooth and season to taste." }
  ],
  "prepTime": 5,
  "cookTime": 15,
  "servings": "2",
  "course": "LUNCH",
  "difficulty": "EASY",
  "tags": ["soup", "vegetarian"],
  "saveKey": "b3c0f8e4-9d79-4bd3-83db-cdc581290fe8"
}
```

Generate a new `saveKey` UUID for each recipe and reuse it only when retrying that same save. Times and instruction durations are in minutes, and array order determines ingredient and step order. Recipes added through MCP have source type `API`. Adding structured recipes and keyword browsing work without AI API keys; optional hosted embeddings follow the existing app settings.

Run the MCP protocol and tool tests with `pnpm exec vitest run tests/recipe-mcp.test.mjs`.

## Where the ingredients live

- app/ contains the Next.js pages and API routes for recipes, search, chat, and nutrition.
- components/forms/ contains manual entry and recipe-intake flows.
- components/recipe/, components/search/, and components/chatbot/ contain the product UI.
- lib/actions.ts handles recipe changes and import workflows.
- lib/recipe-parser.ts and lib/youtube.ts parse recipe sources.
- lib/search.ts combines keyword and optional semantic search.
- lib/embeddings.ts handles hosted embedding generation.
- prisma/ contains the PostgreSQL schema and migrations.

## Checks

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:e2e
```

For current follow-up work, see [IMPROVEMENTS.md](IMPROVEMENTS.md).
