# Janella Cookbook

[![CI](https://github.com/aranlucas/janella-cookbook/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aranlucas/janella-cookbook/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/github/license/aranlucas/janella-cookbook)](LICENSE)

![Janella Cookbook logo, an open recipe book with a whisk](public/logo-bg.png)

Janella Cookbook is a home for recipes worth keeping. Save what you cook, pull recipes in from a webpage or video, and search your collection when the familiar question returns: “What should we make tonight?”

## From discovery to dinner

- Add a recipe by hand or import it from a URL, YouTube transcript, text, or photo.
- Keep ingredients, instructions, servings, images, notes, ratings, and cooking history together.
- Filter by cuisine, course, difficulty, time, and favorites.
- Search with combined semantic and keyword results using FreeLLMAPI embeddings.
- Chat about recipes and add ingredients to shopping lists from recipe pages.

## Start cooking locally

Requirements: Node.js 24.x and the pnpm version pinned in
`package.json`, plus PostgreSQL with the pgvector extension enabled.

```sh
pnpm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to a **local development database**. Prisma CLI commands load `.env`; Next.js also loads `.env.local`. Keep credentials out of committed files.

For AI parsing, photo extraction, nutrition, chat and semantic search, create a dedicated client profile under Keys → Unified API key on [FreeLLMAPI](https://freellmapi-production-1175.up.railway.app/keys) and put `FREELLM_API_KEY` in ignored `.env.local`. The key is optional for configuration loading, manual entry, structured webpage extraction and keyword search. Embedding failures do not block saving or keyword search.

[.env.example](.env.example) lists the configuration and [lib/env.ts](lib/env.ts) validates it. Chat defaults to `auto`; extraction and nutrition default to `auto:fast` (the legacy recipe value `auto` also selects `auto:fast`). Embeddings use `embeddinggemma-300m`; changing model families requires a schema update and reindexing the 768-dimensional vectors. Manage provider credentials in FreeLLMAPI rather than configuring legacy OpenRouter or Hugging Face keys in the cookbook.

R2 and NextAuth variables are declared but have no storage or cookbook sign-in implementation. Setting them does not enable those features.

Create or update the database schema, then launch Next.js:

```sh
pnpm db:push
pnpm dev
```

Open [https://janella-cookbook.localhost](https://janella-cookbook.localhost). `pnpm dev` runs through [Portless](https://github.com/vercel-labs/portless) (a dev dependency); its first run may ask for `sudo` to bind port 443 and trust a local certificate. The production website runs on Vercel, with its database and FreeLLMAPI service on Railway. Set runtime application variables in the Vercel project environment.

## Connect an MCP client

The cookbook exposes recipe tools at `/api/mcp`, using [Vercel's mcp-handler](https://github.com/vercel-labs/mcp-handler). It runs in the existing Next.js app. The handler uses stateless Streamable HTTP and does not need Redis or a separate server.

Set `MCP_API_TOKEN` to a random secret in your local environment or the Vercel production environment. Generate one with:

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

Replace the URL with `https://janella-cookbook.vercel.app/api/mcp` when connecting to the deployed app. Keep the real token out of committed configuration files.

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

Generate a new `saveKey` UUID for each recipe and reuse it only when retrying that same save. Times and instruction durations are in minutes, and array order determines ingredient and step order. Recipes added through MCP have source type `API`. Adding structured recipes and keyword browsing work without AI API keys; embedding generation runs in the background through FreeLLMAPI and provider failures do not block saving.

Run the MCP protocol and tool tests with `pnpm test:mcp`.

## Checks

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

Vitest uses fixtures and needs no provider credentials. Browser E2E tests need a configured **isolated development database** and a production build:

```sh
pnpm build
pnpm test:e2e
```

Playwright starts the built app automatically unless `PLAYWRIGHT_BASE_URL` is supplied. These tests create and update recipes; do not point the ordinary suite at production. Live import tests additionally require `LIVE_IMPORT_TESTS=1` and a working FreeLLMAPI key. For protected deployments, use the separate [deployment E2E procedure](docs/deployment-e2e.md).

## Access boundary

Cookbook pages, REST routes and recipe mutation actions have no application user authentication or ownership checks. The MCP bearer token protects only `/api/mcp`; grocery OAuth authorizes the external grocery service. Keep deployment protection enabled for a private cookbook. See the [roadmap](ROADMAP.md) for proposed sharing and access requirements, and the [recipe workflow design](docs/design/recipe-workflow.md) for intake and recovery constraints.

The reliability audit also adds deterministic [tester-army/e2e](https://github.com/tester-army/e2e)
journeys in `tests/journeys`, configured by `e2e.config.ts`. CI runs `pnpm exec e2e run`
against its isolated database and uploads `.e2e/` evidence. These tests use no agent
steps, provider credentials or model calls. Existing Playwright coverage remains in place.
See [the audit](docs/reliability-audit.md) for findings and pre-fix reproduction gates.
