# Recommended Improvements

An audit of the Janella Cookbook codebase identified the following areas for improvement, organized by priority.

---

## 1. Security

### 1a. SQL Injection in Search Filters (High)

**File**: `lib/search.ts:127-142`

The `buildFilterConditions` function parameterizes `cuisine` values correctly, but `course`, `difficulty`, `maxTime`, and `isFavorite` are interpolated directly into SQL strings:

```typescript
// course and difficulty are string-concatenated into raw SQL
const courseList = filters.course.map((c) => `'${c}'`).join(", ");
conditions.push(`r.course::text IN (${courseList})`);
```

While these originate from TypeScript enums, the values are not validated at runtime before being placed into SQL. A crafted request to `/api/search` could bypass the enum constraint.

**Fix**: Validate all filter values against their Prisma enums before building the query, or use parameterized placeholders consistently (the same pattern already used for `cuisine`).

### 1b. Overly Permissive Image Domains (Medium)

**File**: `next.config.mjs:11`

```javascript
hostname: "**"; // Accepts any HTTPS host
```

This allows Next.js image optimization for any external URL, which can be abused for SSRF-like probing or to serve unexpected content through your domain's image proxy.

**Fix**: Replace with an allowlist of known recipe image hosts (e.g., common recipe sites, your R2 bucket domain, `images.unsplash.com`).

### 1c. No Authentication or Authorization (Medium)

No server actions or API routes check for an authenticated user. If this app is deployed publicly, anyone can create, edit, and delete recipes.

**Fix**: Add NextAuth.js (or a lightweight session check) and gate write operations behind authentication. Even a simple shared-secret or cookie-based guard would prevent casual abuse.

### 1d. No Rate Limiting on Import Endpoints (Low)

`importFromUrl()` in `lib/actions.ts` fetches arbitrary external URLs and sends their content to an LLM. There is no per-user or per-IP rate limiting, so the endpoint could be used to proxy-crawl external sites or inflate LLM costs.

**Fix**: Add rate limiting middleware (e.g., `next-rate-limit` or an Edge Middleware approach) for import and chat endpoints.

---

## 2. Testing

### 2a. No Tests Exist (High)

There are zero test files in the repository — no unit tests, integration tests, or end-to-end tests.

**Recommended test targets** (highest value first):

| Layer       | What to test                                                                     | Tool                                |
| ----------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| Unit        | `lib/slug.ts`, `lib/search.ts` filter building, `lib/validations.ts` Zod schemas | Vitest                              |
| Integration | Server actions (`createRecipe`, `importFromUrl`, `updateRecipe`, `deleteRecipe`) | Vitest + Prisma test DB             |
| API         | `/api/search`, `/api/recipes` request validation and response shape              | Vitest + `next/test` or `supertest` |
| E2E         | Recipe creation flow, URL import, search, favorites                              | Playwright                          |

**Fix**: Add Vitest as a dev dependency and start with unit tests for pure functions in `lib/`. Then add integration tests for server actions with a test database. Playwright for critical user flows.

---

## 3. Error Handling & Resilience

### 3a. Missing `loading.tsx`, `error.tsx`, and `not-found.tsx` (High)

The app has no Next.js App Router error boundaries or loading states. If a database query fails or a page throws, users see a raw Next.js error page in production.

**Fix**: Add these files:

- `app/error.tsx` — Global error boundary with a retry button
- `app/not-found.tsx` — Custom 404 page
- `app/loading.tsx` — Global loading skeleton
- `app/recipe/[slug]/error.tsx` — Recipe-specific error handling
- `app/recipe/[slug]/loading.tsx` — Recipe detail skeleton

### 3b. Server Actions Swallow Error Context (Medium)

**File**: `lib/actions.ts`

All server actions catch errors and return a generic string:

```typescript
catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : "Failed to import recipe",
  };
}
```

The custom error classes in `lib/errors.ts` (`RecipeParseError`, `ExternalApiError`, etc.) are defined but not consistently used in action catch blocks. Error codes and details are lost.

**Fix**: Use `toAppError()` from `lib/errors.ts` in action catch blocks to preserve error codes and structured details. Return a structured error object (not just a string) so the client can differentiate between validation errors, network errors, and server errors.

### 3c. No Error Monitoring (Low)

There is no error tracking service (Sentry, LogRocket, etc.). Production errors are only visible in server logs.

**Fix**: Add Sentry or a similar service for error tracking and alerting.

---

## 4. Performance

### 4a. No Database Indexes on `sourceUrl` (Medium)

**File**: `prisma/schema.prisma`

The `importFromUrl` action queries `sourceUrl` for duplicate detection (`findFirst({ where: { sourceUrl } })`), but there is no index on this column. As the recipe count grows, this becomes a full table scan.

**Fix**: Add `@@index([sourceUrl])` to the Recipe model.

### 4b. Search Query Runs Two Full Queries Without Pagination Guards (Medium)

**File**: `lib/search.ts`

The hybrid search runs both a semantic query and a keyword query, then fuses results. Neither query applies a hard upper bound before fusion, so with a large dataset both could return many rows.

**Fix**: Add `LIMIT` clauses to the raw SQL semantic search query and cap the Prisma keyword query with `take`.

### 4c. Large CSS File (Low)

**File**: `app/globals.css` (7,000+ lines)

The globals file includes extensive custom component styles alongside Tailwind directives. This increases initial parse time and makes it harder to maintain.

**Fix**: Extract component-specific styles into CSS modules or colocated files. Keep `globals.css` for theme variables and base styles only.

---

## 5. Code Quality

### 5a. Inconsistent Input Validation at Action Boundaries (Medium)

The Zod schemas in `lib/validations.ts` are comprehensive, but server actions in `lib/actions.ts` don't consistently validate their inputs with these schemas before processing. For example, `importFromUrl` validates the URL manually but doesn't use the Zod URL schema.

**Fix**: Add a validation step at the top of each server action using the corresponding Zod schema. This ensures consistent error messages and prevents invalid data from reaching the database layer.

### 5b. Recipe Creation Not Wrapped in a Transaction (Medium)

**File**: `lib/actions.ts:34-124` (`createRecipeInDb`)

Recipe creation involves multiple database operations (create recipe, create ingredients, create instructions, upsert tags, update embedding). These are not wrapped in a `prisma.$transaction()`, so a failure mid-way leaves partial data.

**Fix**: Wrap `createRecipeInDb` in `prisma.$transaction()` to ensure atomicity.

### 5c. Duplicated Enum Validation (Low)

**File**: `app/api/recipes/route.ts:50-63`

The API route manually defines `VALID_COURSES` and `VALID_DIFFICULTIES` arrays that duplicate the Prisma-generated enums. If the schema changes, these arrays must be updated separately.

**Fix**: Import enum values from the generated Prisma client instead of maintaining a separate list.

---

## 6. Developer Experience

### 6a. No Development Database Seed Script (Medium)

There is no seed script to populate the database with sample recipes for development. New contributors must manually create recipes or import from URLs.

**Fix**: Add a `prisma/seed.ts` script with 5-10 sample recipes covering different cuisines, courses, and source types. Wire it into `prisma db seed`.

### 6b. No CI/CD Pipeline (Medium)

No GitHub Actions or similar CI configuration exists. Linting, type checking, and (future) tests are not run automatically on PRs.

**Fix**: Add a GitHub Actions workflow that runs `pnpm run lint`, `tsc --noEmit`, and `pnpm run build` on pull requests.

### 6c. Missing Environment Variable Validation at Startup (Low)

Only `DATABASE_URL` is checked at runtime (in `lib/prisma.ts`). Other variables are silently undefined, leading to confusing runtime errors.

**Fix**: Add a startup validation step (e.g., using `zod` or `t3-env`) that checks all required and optional environment variables and provides clear error messages.

---

## Summary by Priority

| Priority   | Item                                                | Effort |
| ---------- | --------------------------------------------------- | ------ |
| **High**   | 2a. Add tests (start with unit tests for `lib/`)    | Large  |
| **High**   | 3a. Add `error.tsx`, `loading.tsx`, `not-found.tsx` | Small  |
| **High**   | 1a. Parameterize all SQL filter values              | Small  |
| **Medium** | 5b. Wrap recipe creation in a transaction           | Small  |
| **Medium** | 1b. Restrict image domains                          | Small  |
| **Medium** | 4a. Add `sourceUrl` index                           | Small  |
| **Medium** | 5a. Validate server action inputs with Zod          | Medium |
| **Medium** | 1c. Add authentication                              | Medium |
| **Medium** | 3b. Use structured errors in actions                | Medium |
| **Medium** | 6a. Add seed script                                 | Medium |
| **Medium** | 6b. Add CI pipeline                                 | Medium |
| **Low**    | 1d. Rate limiting on imports                        | Medium |
| **Low**    | 4c. Break up globals.css                            | Medium |
| **Low**    | 5c. Deduplicate enum validation                     | Small  |
| **Low**    | 6c. Env var validation at startup                   | Small  |
| **Low**    | 3c. Add error monitoring                            | Small  |
