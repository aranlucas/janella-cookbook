# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local Agent Rules

- Do not modify anything under `components/ui/` unless the user explicitly asks for it in the current thread.

## Project Overview

A modern Next.js 16 recipe management application with AI-powered recipe parsing, YouTube transcript extraction, AI chat assistant, and hybrid semantic search. Built with React 19, TypeScript, PostgreSQL with pgvector, FreeLLMAPI embeddings, and FreeLLMAPI chat and recipe extraction.

**Tech Stack:** Next.js 16 | React 19 | TypeScript | Node 24+ | Prisma 7 | PostgreSQL + pgvector | Tailwind CSS v4 | AI SDK 7 | ES Modules. Use `package.json` and the lockfile for exact dependency versions.

## Environment Setup

The website is deployed on Vercel. PostgreSQL and the FreeLLMAPI router run on
Railway. See `README.md` for the current deployment and configuration contract;
`lib/env.ts` is the application's environment schema. Do not use legacy OpenRouter
or Hugging Face variables to configure this app.

- `DATABASE_URL`: PostgreSQL connection URL; use a local development database for
  schema changes. `DATABASE_POOL_MAX` defaults to 5.
- `FREELLM_API_KEY`: the router's Unified API key, used by chat, recipe extraction,
  and embeddings. It is optional at configuration-load time.
- `FREELLM_BASE_URL`: defaults to the Railway router's `/v1` endpoint.
- `FREELLM_MODEL`: defaults to `auto` for chat.
- `FREELLM_RECIPE_MODEL`: defaults to `auto:fast` for extraction and nutrition;
  the legacy value `auto` is normalized to `auto:fast`.
- `FREELLM_EMBEDDING_MODEL`: fixed to `embeddinggemma-300m` (768 dimensions).
- R2 settings are optional for managed image storage. `MCP_API_TOKEN` configures
  the bearer-token-protected recipe MCP endpoint.

**First-time local setup:**

```bash
pnpm install                    # Runs prisma generate
cp .env.example .env            # Set DATABASE_URL to a local database
# Put FREELLM_API_KEY in ignored .env.local if exercising AI features.
pnpm db:push                    # Apply schema to that development database
pnpm dev                        # https://janella-cookbook.localhost via Portless
```

Use the pnpm version pinned by `packageManager`. No provider credentials are
needed for the fixture-based Vitest suite. Browser E2E tests need a running app
and the configured PostgreSQL database; deployment tests have separate settings.

## Common Commands

**Development:**

```bash
pnpm run dev                    # Start Next.js dev server with Turbopack
pnpm run build                  # Production build
pnpm run start                  # Start production server
pnpm run lint                   # Check with Oxlint (use lint:fix to apply fixes)
pnpm run format                 # Format with Oxfmt
```

**Database (Prisma):**

```bash
pnpm run db:migrate             # Create and apply migration (dev)
pnpm run db:migrate:deploy      # Apply migrations (production)
pnpm run db:migrate:reset       # Reset database and reapply all migrations
pnpm run db:migrate:status      # Check migration status
pnpm run db:push                # Push schema without creating migration (prototyping)
pnpm run db:studio              # Open Prisma Studio at localhost:5555
pnpm run db:generate            # Generate Prisma Client
pnpm run db:seed                # Seed database
```

**Testing (Playwright E2E):**

```bash
pnpm run test:e2e               # Run Playwright tests headless
pnpm run test:e2e:headed        # Run Playwright tests with browser UI
pnpm run test                   # Run Vitest component and unit tests
pnpm run test:watch             # Run Vitest in watch mode
pnpm run test:deployment-auth   # Run the deployment authentication unit tests
```

Use Vitest for synchronous server and client components. Keep async Server
Component behavior in the Playwright E2E suite.

**Railway-specific Database Access:**

```bash
railway run pnpm run db:studio    # Run Prisma Studio with Railway DB
railway run pnpm run db:migrate   # Run migrations against Railway DB
```

## Scripts: native first

Before adding a script file (`scripts/`, `bin/`, `tools/`, root `*.sh|*.py|*.mjs`) or a package script that runs one, take the first rung that works:

1. A flag or subcommand of a tool the repo already uses (`<tool> --help`).
2. Declarative config for that tool (`next.config.mjs`, `prisma.config.ts`, `prisma/schema.prisma`, `oxfmt.config.ts`, `pnpm-workspace.yaml`, `vitest.config.mts`, `playwright.config.ts`).
3. A maintained plugin for that tool.
4. A one-line package.json script that calls a native command.
5. A test in the existing runner (Vitest and Playwright), for anything that asserts.
6. A custom script, only for behavior specific to this repo. Its first comment names the native rung it couldn't use and why. It has a test in the existing runner, and the PR that adds it quotes that comment.

## Code: libraries first

Before hand-writing general-purpose code, use a well-maintained library: actively released, widely adopted, typed, and a fit for this stack. Reach for one already in the dependencies first. Write custom code for domain logic and for the glue no library covers. A PR that adds a dependency says why it was picked; a PR that hand-writes something a library covers names the library and why it didn't fit.

- Input validation → Zod schemas in lib/validations.ts; validate server-side before database operations.
- Forms → React Hook Form with @hookform/resolvers for client-side validation.
- UI primitives → @base-ui/react/*; do not assume Radix Slot-based asChild support unless the local component explicitly implements it.

## Architecture Overview

### Directory Structure

```
app/                    # Next.js App Router pages, layouts, API routes
components/             # React components organized by feature
  ui/                   # 45+ Radix UI / shadcn primitives (base-vega style)
  forms/                # Recipe creation forms (URL, YouTube, text, manual)
  recipe/               # Recipe display components (grid, card, meta, actions)
  search/               # Search bar, filter panel, filter chips
  layout/               # Header, footer, sidebar, navigation
  chatbot/              # AI chat interface components
  ai-elements/          # 50+ AI interface components (code blocks, terminal, etc.)
lib/                    # Business logic and utilities
hooks/                  # Custom React hooks
types/                  # TypeScript type definitions
prisma/                 # Database schema and migrations
e2e/                    # Playwright end-to-end tests
public/                 # Static assets and fonts
.github/workflows/      # CI/CD pipelines
```

### Next.js App Router Structure

This project uses the **App Router** (not Pages Router). Key patterns:

- **Server Components (default)**: Pages that fetch data are async functions
  - `app/page.tsx` - Home page with recipe carousel (revalidate 24h)
  - `app/recipe/[slug]/page.tsx` - Recipe detail page
  - `app/recipes/page.tsx` - All recipes listing
  - `app/recipes/new/page.tsx` - Recipe creation (4 import tabs)
  - `app/search/page.tsx` - Search results
  - `app/chat/page.tsx` - AI chat assistant
  - `app/dashboard/page.tsx` - Analytics dashboard
  - `app/favorites/page.tsx` - Favorite recipes
  - `app/categories/page.tsx` - Recipe categories
  - `app/about/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` - Static pages
  - Use `generateMetadata()` for dynamic meta tags

- **Client Components**: Interactive UI marked with `"use client"`
  - All forms (`ManualRecipeForm`, `UrlImportForm`, `TextImportForm`, `YouTubeImportForm`)
  - Interactive components (Header, SearchBar, ChatInterface, filters)
  - No global state management (Redux/Zustand) - uses React hooks

- **Server Actions**: Primary data mutation method in `lib/actions.ts`
  - `createRecipe()` - Create new recipe manually
  - `updateRecipe()` - Update existing recipe
  - `deleteRecipe()` - Delete recipe
  - `importFromUrl()` - Import recipe from URL (with duplicate detection)
  - `importFromText()` - Import recipe from natural language text
  - `importFromYouTube()` - Import recipe from YouTube video transcript
  - `toggleFavorite()` - Toggle favorite status
  - `markAsCooked()` - Increment cook count
  - `regenerateFromSource()` - Re-parse recipe from its original source URL

- **API Routes**: In `app/api/`
  - `POST /api/search` - Hybrid semantic + keyword search
  - `POST /api/chat` - AI chat with ToolLoopAgent and MCP integration
  - `GET /api/filters` - Filter options metadata
  - `GET|POST /api/nutrition` - Nutrition analysis
  - `GET /api/recipes` - List recipes with pagination/filtering
  - `GET /api/recipes/[slug]` - Single recipe by slug
  - `GET /api/schema` - Database schema export

### Database Architecture (PostgreSQL + pgvector)

**Core Models:**

- `Recipe` - Main entity with relations to ingredients, instructions, tags, images
- `Ingredient` - Ordered list (sortOrder) with quantity, unit, name, notes, group
- `Instruction` - Ordered steps (sortOrder) with group, optional duration and images
- `Tag` - Many-to-many with recipes via implicit join table
- `RecipeImage` - Multiple images per recipe with isPrimary flag

**Vector Search Fields:**

- `Recipe.embedding` - 768-dim EmbeddingGemma vector from FreeLLMAPI
- `Recipe.searchText` - Concatenated searchable content for keyword fallback

**Important:** The pgvector extension must be enabled in PostgreSQL. Vector operations use raw SQL queries since Prisma doesn't natively support vector types.

### Hybrid Search Strategy

Located in `lib/search.ts`, implements dual-mode search:

1. **Semantic Search** (when the embedding request succeeds):
   - Enhances query with synonym expansion (`enhanceSearchQuery()`)
   - Generates query embedding via FreeLLMAPI
   - Uses PostgreSQL `<=>` operator for cosine distance
   - Similarity threshold: 0.35
   - Batch fetches relations to prevent N+1 queries

2. **Keyword Search** (always runs as fallback):
   - Case-insensitive search in title, description, searchText
   - Uses Prisma `contains` with `mode: "insensitive"`
   - Supports filtering by cuisine, course, difficulty, maxTime, isFavorite

3. **Fusion**: Combines results using Reciprocal Rank Fusion (RRF, k=60)

### AI Integration

**Recipe Parsing** (`lib/recipe-parser.ts`):

- Uses the configured FreeLLMAPI recipe model via AI SDK (`lib/ai.ts`)
- Uses the router's Chat Completions endpoint with structured outputs
- Zod schema validation for structured output

**URL Import** (`parseRecipeFromUrl`):

1. Fetch HTML from URL
2. Try JSON-LD extraction (schema.org Recipe format)
3. Fallback: Extract main content with Cheerio + Readability
4. Parse with the configured FreeLLMAPI recipe model in structured output mode

**YouTube Import** (`parseRecipeFromYouTube` + `lib/youtube.ts`):

- Validate video links through the shared `extractYouTubeVideoId` parser before fetching
- Fetch transcript via youtubei.js, falling back to youtube-transcript or a usable video description
- Parse transcript into structured recipe with AI

**Text Import** (`parseRecipeFromText`):

- Parse freeform recipe text using structured output
- Token validation and truncation for context windows

**Embedding Generation** (`lib/embeddings.ts`):

- Model: `embeddinggemma-300m` through FreeLLMAPI (768 dimensions)
- Generates semantic search text with context hints (quick/easy/advanced etc.)
- Keyword search remains available when an embedding request fails

**AI Chat** (`/api/chat`):

- ToolLoopAgent from AI SDK for multi-turn tool use
- MCP (Model Context Protocol) integration for extended capabilities
- Voice input support in chat interface

### Key Architectural Patterns

**Data Fetching Pattern:**

```typescript
// Server Component - Direct Prisma queries
export default async function RecipePage({ params }) {
  const recipe = await prisma.recipe.findUnique({
    where: { slug: params.slug },
    include: { ingredients: true, instructions: true, tags: true }
  });
  return <RecipeDetail recipe={recipe} />;
}
```

**Recipe Creation Flow (Server Actions):**

```
Client Form Submit
  -> Server Action: createRecipe() / importFromUrl() / importFromYouTube()
    -> Generate unique slug (with collision detection)
    -> Upsert tags by name
    -> Attempt FreeLLMAPI embedding generation
    -> Prisma create with nested relations
    -> Raw SQL to update embedding vector
  -> Return full recipe with slug
  -> Navigate to /recipe/[slug]
```

**URL/YouTube Import with Duplicate Detection:**

- Checks if `sourceUrl` exists before creating recipe
- If exists: Updates existing recipe (same slug)
- If new: Creates new recipe with unique slug
- This ensures each URL maps to exactly one recipe

**Action Result Pattern:**

All server actions return `ActionResult<T>`:

```typescript
type ActionResult<T> =
  | { success: true; data: T; slug?: string }
  | { success: false; error: string };
```

### Lib Directory Reference

| File               | Purpose                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `prisma.ts`        | Singleton Prisma client with PrismaPg adapter                         |
| `actions.ts`       | Server Actions for all recipe mutations                               |
| `search.ts`        | Hybrid semantic + keyword search with RRF                             |
| `embeddings.ts`    | FreeLLMAPI embedding generation and query enhancement                 |
| `recipe-parser.ts` | AI-powered recipe parsing (URL, YouTube, text)                        |
| `ai.ts`            | FreeLLMAPI chat, recipe, and embedding model configuration            |
| `youtube.ts`       | YouTube URL parsing, transcript extraction, metadata                  |
| `validations.ts`   | Zod schemas for all input validation                                  |
| `slug.ts`          | Unique slug generation with collision detection                       |
| `errors.ts`        | Custom error classes (AppError, ValidationError, DatabaseError, etc.) |
| `api-response.ts`  | Standardized API response helpers (success, error, paginated)         |
| `mcp-oauth.ts`     | OAuth authentication for MCP                                          |
| `haptics.ts`       | Mobile vibration feedback patterns                                    |
| `utils.ts`         | `cn()` helper combining clsx and tailwind-merge                       |

### Component Organization

- `components/ui/` - 45+ Radix UI / shadcn primitives (base-vega style, Tailwind CSS v4)
- `components/forms/` - Recipe creation forms (URL, YouTube, text, manual)
- `components/recipe/` - Recipe display (grid, card, meta, actions, ingredients, instructions, nutrition)
- `components/search/` - Search bar with debouncing, filter panel, filter chips
- `components/layout/` - Header, footer, app layout, sidebar, breadcrumbs, mobile nav, logo
- `components/chatbot/` - AI chat interface, voice input, message context menu, pull-to-refresh
- `components/ai-elements/` - 50+ AI interface components (code blocks, terminal, file tree, etc.)

### Styling System

- **Tailwind CSS v4** with custom design tokens
- **shadcn UI** with base-vega style variant
- **Color Palette**: cream, warm-white, butter, terracotta, rust, sage, charcoal
- **Fonts**: Fraunces (serif display), Outfit (sans-serif UI)
- **Dark/Light Mode**: Supported via next-themes
- **Path Aliases**: `@/*` maps to root (e.g., `@/lib/prisma`)
- **Utilities**: `cn()` helper from `lib/utils.ts` for conditional classes
- **Mobile-first**: Responsive design with `useIsMobile()` hook (768px breakpoint)

## Database Schema Notes

**Enums:**

- `Difficulty`: EASY, MEDIUM, HARD, EXPERT
- `Course`: BREAKFAST, LUNCH, DINNER, APPETIZER, SIDE, DESSERT, SNACK, DRINK, SAUCE, BREAD
- `SourceType`: URL_IMPORT, MANUAL, NATURAL_LANGUAGE, PHOTO, API

**Cascade Deletes:** Ingredients, Instructions, and RecipeImages cascade delete with Recipe

**Indexes:** Applied to frequently queried fields (slug, cuisine, course, isFavorite) plus recipeId on Ingredient and Instruction

**Slug Generation:** Uses `slugify` package with UUID suffix for uniqueness (see `lib/slug.ts`)

**Prisma Configuration:**

- Uses `postgresqlExtensions` preview feature for pgvector
- ES Module output format (`moduleFormat = "esm"`)
- Singleton pattern in `lib/prisma.ts` to prevent connection exhaustion
- PrismaPg adapter for better PostgreSQL performance

## Testing

**E2E Tests (Playwright):**

8 test files in `e2e/` covering:

- `add-recipe.spec.ts` - Recipe creation flow
- `categories.spec.ts` - Category pages
- `favorites.spec.ts` - Favorite functionality
- `home.spec.ts` - Home page
- `navigation.spec.ts` - Navigation flows
- `recipes.spec.ts` - Recipe listing and details
- `search.spec.ts` - Search functionality
- `static-pages.spec.ts` - About, Privacy, Terms pages

**Configuration** (`playwright.config.ts`):

- Base URL: `localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL`)
- Browser: Chromium only
- Retries: 2 in CI, 0 locally
- Timeout: 60s in CI, 30s locally
- Screenshots on failure, traces on first retry

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

- `ci.yml` - CI pipeline
- `e2e.yml` - End-to-end test pipeline

## Coding Guidelines

**Type Safety:**

- **NEVER use `any` type** - Always use proper TypeScript types
- If type is unknown, use `unknown` and narrow it down with type guards
- Use `Awaited<ReturnType<typeof func>>` for inferring async function return types
- Use generics or union types when multiple types are possible
- If TypeScript's type inference has legitimate limitations, use `@ts-expect-error` with a clear comment explaining why

**Error Handling:**

- Use custom error classes from `lib/errors.ts`: `AppError`, `RecipeNotFoundError`, `ValidationError`, `ExternalApiError`, `DatabaseError`, `RecipeParseError`
- Use type guard functions: `isAppError()`, `isNotFoundError()`, etc.
- Server Actions return `ActionResult` discriminated union (never throw)
- API routes use `withApiErrorHandler()` wrapper from `lib/api-response.ts`

**ES Module Configuration:**

The project uses ES Modules (`"type": "module"` in `package.json`). Prisma is configured with `moduleFormat = "esm"` in the generator block.

## Important Notes

**pgvector Setup:**

- Requires PostgreSQL with pgvector extension installed
- Extension configured in `prisma/schema.prisma` with `postgresqlExtensions` preview feature
- Vector operations use raw SQL: `await prisma.$executeRaw`
- Vector dimension: 768 (matching the configured EmbeddingGemma model output)

**AI Graceful Degradation:**

- Search degrades to keyword-only when embedding generation fails.
- Embedding requests use a five-second deadline and validate 768 finite values.
- AI parsing, chat, and embeddings use `FREELLM_API_KEY`; structured webpage recipes can be parsed locally before the model fallback.

**Responsive Design:**

- Mobile-first approach with Tailwind breakpoints
- `useIsMobile()` hook in `hooks/use-mobile.ts` (768px breakpoint)
- Mobile navigation drawer
- Haptic feedback support for mobile (`lib/haptics.ts`)
- Pull-to-refresh in chat interface
