# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern Next.js 16 recipe management application with AI-powered recipe parsing and semantic search capabilities. Built with React 19, TypeScript, PostgreSQL with pgvector, and OpenAI integration.

## Environment Setup

**This project uses Railway for deployment.** The Railway service name is **`surprising-growth`**.

Use `railway env` to access environment variables:

```bash
railway env                    # View all environment variables
railway run npm run dev        # Run commands with Railway environment
railway run npm run db:migrate  # Run with specific service
```

**Required Environment Variables:**

- `DATABASE_URL` - PostgreSQL connection string (access via Railway)

**First-Time Setup:**

```bash
npm install                    # Auto-runs postinstall (prisma generate)
railway run npm run db:push    # Push schema to Railway database
npm run dev                    # Start dev server on localhost:3000
```

## Common Commands

**Development:**

```bash
npm run dev                    # Start Next.js dev server with Turbopack
npm run build                  # Production build
npm run start                  # Start production server
npm run lint                   # Run ESLint
```

**Database (Prisma):**

```bash
npm run db:migrate             # Create and apply migration (dev)
npm run db:migrate:deploy      # Apply migrations (production)
npm run db:migrate:reset       # Reset database and reapply all migrations
npm run db:migrate:status      # Check migration status
npm run db:push                # Push schema without creating migration (prototyping)
npm run db:studio              # Open Prisma Studio at localhost:5555
npm run db:generate            # Generate Prisma Client
```

**Railway-specific Database Access:**

```bash
railway run npm run db:studio    # Run Prisma Studio with Railway DB
railway run npm run db:migrate   # Run migrations against Railway DB
```

## Architecture Overview

### Next.js App Router Structure

This project uses the **App Router** (not Pages Router). Key patterns:

- **Server Components (default)**: Pages that fetch data are async functions
  - `app/page.tsx` - Home page fetches recipes and stats
  - `app/recipe/[slug]/page.tsx` - Recipe detail page
  - Use `generateMetadata()` for dynamic meta tags

- **Client Components**: Interactive UI marked with `"use client"`
  - All forms (`ManualRecipeForm`, `UrlImportForm`, `TextImportForm`)
  - Interactive components (Header, SearchBar, filters)
  - No global state management (Redux/Zustand) - uses React hooks

- **API Routes**: RESTful endpoints in `app/api/`
  - `/api/recipes` - CRUD operations
  - `/api/search` - Hybrid semantic + keyword search
  - `/api/import` - URL and text recipe parsing
  - `/api/filters` - Dynamic filter options
  - `/api/tags` - Tag management

### Database Architecture (PostgreSQL + pgvector)

**Core Models:**

- `Recipe` - Main entity with relations to ingredients, instructions, tags, images
- `Ingredient` - Ordered list (sortOrder) with quantity, unit, name, notes, group
- `Instruction` - Ordered steps (stepNumber) with optional duration and images
- `Tag` - Many-to-many with recipes via implicit join table
- `RecipeImage` - Multiple images per recipe with isPrimary flag

**Vector Search Fields:**

- `Recipe.embedding` - 1536-dim vector from OpenAI text-embedding-3-small
- `Recipe.searchText` - Concatenated searchable content for keyword fallback

**Important:** The pgvector extension must be enabled in PostgreSQL. Vector operations use raw SQL queries since Prisma doesn't natively support vector types.

### Hybrid Search Strategy

Located in `lib/search.ts`, implements dual-mode search:

1. **Semantic Search** (when OPENAI_API_KEY available):
   - Generates query embedding via OpenAI
   - Uses PostgreSQL `<=>` operator for vector similarity
   - Returns recipes with similarity scores

2. **Keyword Search** (always runs as fallback):
   - Case-insensitive search in title, description, searchText
   - Uses Prisma `contains` with `mode: "insensitive"`

3. **Fusion**: Combines results using Reciprocal Rank Fusion (RRF)

### AI-Powered Recipe Import

**URL Import** (`lib/recipe-parser.ts` - `parseRecipeFromUrl`):

1. Fetch HTML from URL
2. Try JSON-LD extraction (schema.org Recipe format)
3. Fallback: Extract main content with Mozilla Readability
4. Parse with GPT-4o-mini in JSON mode

**Text Import** (`lib/recipe-parser.ts` - `parseRecipeFromText`):

- Parse freeform recipe text using GPT-4o-mini
- Structured output via JSON mode response format

**Embedding Generation** (`lib/embeddings.ts`):

- Generates vector embeddings for semantic search
- Auto-enhances queries with cuisine/dietary context
- Used during recipe creation and search

## Key Architectural Patterns

### Data Fetching Pattern

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

### Recipe Creation Flow

```
Client Form Submit
  → POST /api/recipes
    → Generate unique slug
    → Upsert tags by name
    → Generate OpenAI embedding (if available)
    → Prisma create with nested relations
    → Raw SQL to update embedding vector
  → Return full recipe
  → Navigate to /recipe/[slug]
```

### Component Organization

- `components/ui/` - Radix UI primitives (35+ reusable components)
- `components/forms/` - Feature-specific forms
- `components/recipe/` - Recipe display components
- `components/search/` - Search bar, filters, chips
- `components/layout/` - Header, footer

### Styling System

- **Tailwind CSS v4** with custom design tokens
- **Color Palette**: cream, warm-white, butter, terracotta, rust, sage, charcoal
- **Path Aliases**: `@/*` maps to root (e.g., `@/lib/prisma`)
- **Utilities**: `cn()` helper from `lib/utils.ts` for conditional classes

## Database Schema Notes

**Enums:**

- `Difficulty`: EASY, MEDIUM, HARD, EXPERT
- `Course`: BREAKFAST, LUNCH, DINNER, APPETIZER, SIDE, DESSERT, SNACK, DRINK, SAUCE, BREAD
- `SourceType`: URL_IMPORT, MANUAL, NATURAL_LANGUAGE, PHOTO, API

**Cascade Deletes:** Ingredients, Instructions, and RecipeImages cascade delete with Recipe

**Indexes:** Applied to frequently queried fields (slug, cuisine, course, isFavorite)

**Slug Generation:** Uses `slugify` package with UUID suffix for uniqueness (see `lib/slug.ts`)

## Prisma Client Configuration

Located in `lib/prisma.ts`:

- Uses singleton pattern to prevent connection exhaustion in dev
- PrismaPg adapter for better PostgreSQL performance
- Logging: detailed queries in dev, errors only in production
- Must use this instance, not direct `new PrismaClient()`

### ES Module Migration Notes

The project has been migrated to use ES Modules (`"type": "module"` in `package.json`).
This change was necessary to resolve compatibility issues with certain modern JavaScript libraries that are distributed as ES Modules.

**Prisma Configuration for ES Modules:**

If encountering issues with Prisma after the ES Module migration, ensure that the Prisma Generator is configured to output ES Module compatible code. This is done by adding `moduleFormat = "esm"` to the generator block in `prisma/schema.prisma`.

Example:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
  // Add this line for ES Module compatibility
  moduleFormat    = "esm"
}
```

This ensures that the generated Prisma Client is compatible with the ES Module environment, preventing potential `require()`-related errors.

## Important Notes

**pgvector Setup:**

- Requires PostgreSQL with pgvector extension installed
- Extension configured in `prisma/schema.prisma` with `postgresqlExtensions`
- Vector operations use raw SQL: `await prisma.$executeRaw`

**OpenAI Integration:**

- Gracefully degrades to keyword-only search if OPENAI_API_KEY missing
- Model: `text-embedding-3-small` (1536 dimensions)
- Also used for recipe parsing from URLs/text

**Type Safety:**

- Strict TypeScript enabled
- Prisma auto-generates types from schema
- Custom types in `types/recipe.ts`
- Component props typed with interfaces

**Form Validation:**

- React Hook Form with Zod schemas
- Client-side validation before API submission
- Server-side validation in API routes

**Responsive Design:**

- Mobile-first approach with Tailwind breakpoints
- Mobile menu in Header component
- Responsive grid layouts for recipe cards
