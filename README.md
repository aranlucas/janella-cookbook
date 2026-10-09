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
npm install -g portless@0.15.7
pnpm dev
```

Open [https://janella-cookbook.localhost](https://janella-cookbook.localhost). In production, the app runs on Railway; use the Railway service environment when working with the deployed database.

### Named local URL with Portless

After the normal project setup, use [Portless](https://github.com/vercel-labs/portless/tree/v0.15.7)
to run this app alongside other repositories without choosing a port. Use Node.js
24 or newer, within this project's supported Node version, and install the CLI once:

```sh
npm install -g portless@0.15.7
pnpm dev
```

With default proxy settings, the primary checkout is available at
[https://janella-cookbook.localhost](https://janella-cookbook.localhost). Portless starts
Next.js on an available `PORT`. Linked Git worktrees get a branch
prefix; use the exact URL printed at startup. The proxy reuses its most recent
settings, so a custom port or domain can change that URL.

Run the first launch in an interactive terminal: the default HTTPS setup may ask
to trust a local certificate authority and request administrator access for port
443 and local hostname entries. Use `portless list` to see routes and
`portless doctor` for connection or certificate problems.

Use the same local database and optional AI credentials described above. If you
configure authentication with `NEXTAUTH_URL`, set it to the exact Portless origin
for this session and register that origin's callback with the relevant provider.
Provider callbacks and MCP authorization still require their own configuration.

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
