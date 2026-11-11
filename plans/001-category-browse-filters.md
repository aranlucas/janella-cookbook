# Plan 001: Category links filter by course or cuisine instead of running a text search

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c0062cd..HEAD -- app/recipes/page.tsx lib/validations.ts lib/recipe-queries.ts app/categories/page.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c0062cd`, 2026-11-11

## Why this matters

Every course/cuisine link in the app (`/categories`, the home page "Browse by
course" index, and the course/cuisine links on each recipe page) points to
`/recipes?category=<value>`. That page does not filter by course or cuisine: it
passes the category word to `hybridSearch` as a free-text query. Because the
keyword index (`searchText`) contains ingredient names and full instruction
text, `category=side` matches every recipe whose steps say "set aside", and
`category=sauce` matches every recipe with soy sauce. The semantic half adds
any recipe above a 0.35 cosine similarity. The `/categories` card says "Side —
3 recipes" and the destination lists dozens. Sorting is also wrong: the search
path sorts only the current 20-result page in memory. After this plan, the
destination lists exactly the recipes the card counted, sorted and paginated
by the database.

## Current state

- `app/recipes/page.tsx` — server component for `/recipes`; lines 125–174:

  ```ts
  async function getAllRecipes(query?, category?, page = 1, sort = "recent") {
    try {
      // Use hybridSearch for sophisticated search capabilities
      if (query || category) {
        const searchQuery = query ?? category ?? "";
        const offset = (page - 1) * ITEMS_PER_PAGE;
        const searchResult = await hybridSearch(searchQuery, {}, ITEMS_PER_PAGE, offset);
        ...
        return { recipes: sortRecipesInMemory(...), total: searchResult.value.total };
      }
      const orderByMap = { recent: { updatedAt: "desc" }, newest: ..., title: { title: "asc" }, ... };
      return await listRecipes({ orderBy: orderByMap[sort], limit: ITEMS_PER_PAGE, offset: ... });
  ```

- Link producers (do not change them — their values are the contract):
  - `app/categories/page.tsx:117` — `/recipes?category=${encodeURIComponent((category.value ?? category.name).toLowerCase())}` where `value` is the raw `course` enum (e.g. `SIDE`) or raw `cuisine` string; counts come from `prisma.recipe.groupBy({ by: ["course"] })` / `groupBy({ by: ["cuisine"] })` (lines 34–46).
  - `app/page.tsx:243` and `components/recipe/recipe-meta.tsx:75,83` — same shape.
- `lib/embeddings.ts:84-92` — `generateSearchText` concatenates title, description, cuisine, course, tags, ingredient names and instruction text; this is why word matches are far broader than the category.
- `lib/recipe-queries.ts:51-117` — `listRecipes(options)` already supports structured `course` (enum equality) and `cuisine` (`{ equals, mode: "insensitive" }`) filters with `orderBy`, `limit`, `offset`, and returns `{ recipes, total, limit, offset, hasMore }`.
- `lib/validations.ts:145-158` — `courseValues` enum list. Conventions (from `AGENTS.md`): validate server inputs with Zod before database operations and reuse `lib/validations.ts`; no `any`.
- `SearchBar` (`components/search/search-bar.tsx:43`) pushes `?q=` only, so the UI never produces `q` and `category` together.

## Commands you will need

| Purpose   | Command                               | Expected on success |
| --------- | ------------------------------------- | ------------------- |
| Install   | `pnpm install --frozen-lockfile`      | exit 0              |
| Typecheck | `pnpm typecheck`                      | exit 0, no errors   |
| Tests     | `pnpm exec vitest run --maxWorkers=1` | all pass            |
| Lint      | `pnpm lint`                           | exit 0              |
| Format    | `pnpm format:check`                   | exit 0              |
| Build     | `pnpm build`                          | exit 0              |

## Scope

**In scope**:

- `lib/validations.ts` (add `recipeCategorySchema`)
- `lib/recipe-browse.ts` (create — the `/recipes` data dispatch moved out of the page so it is unit-testable; Next page files may not export helpers)
- `app/recipes/page.tsx`
- `tests/recipe-browse.test.ts` (create)
- `e2e/categories.spec.ts` (strengthen the click-through test)

**Out of scope**:

- `lib/search.ts` filter behaviour (plan 002) and hybrid pagination (plan 004).
- The link producers listed above, and `components/ui/`.
- Combining `q` with `category` — the UI cannot produce it; keep `q` precedence.

## Steps

### Step 1: Add a category schema

In `lib/validations.ts`, add `recipeCategorySchema`: trimmed string, 1–100
chars, transformed to `{ course }` when `value.toUpperCase()` is in
`courseValues`, otherwise `{ cuisine: value }`.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Move the `/recipes` data dispatch into `lib/recipe-browse.ts`

Move `SORT_OPTIONS`, `SortOption`, `isSortOption`, `sortRecipesInMemory`,
`ITEMS_PER_PAGE` and `getAllRecipes` (rename `browseRecipes`) verbatim, then
change the dispatch: `q` → `hybridSearch` (unchanged); else `category` →
`recipeCategorySchema.safeParse`, invalid → `{ recipes: [], total: 0 }`, valid
→ `listRecipes({ ...filter, orderBy: orderByMap[sort], limit, offset })`; else
plain `listRecipes`. Keep the existing `try/catch` empty-result fallback.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Use it from the page

`app/recipes/page.tsx` imports from `@/lib/recipe-browse` and no longer
imports `hybridSearch`, `listRecipes` or `Prisma`.

**Verify**: `grep -n "hybridSearch" app/recipes/page.tsx` → no output.

## Test plan

`tests/recipe-browse.test.ts` (`// @vitest-environment node`), modelled on
`tests/search-pagination.test.ts` (spies on `prisma.recipe.findMany`/`count`
and `embeddings.generateEmbedding`, `makeRecipe` fixture):

- `category=side` queries `where: { course: "SIDE" }`, never calls the
  embedding provider, and returns the database total.
- `category=italian` queries case-insensitive cuisine equality.
- Category pages sort and paginate in the database (`sort=title`, page 2 →
  `orderBy: { title: "asc" }`, `skip: 20`).
- Over-long category returns empty without a database call.
- Schema cases: `Dessert`/`DESSERT` → course, `créole` → cuisine, blank rejected.

The first three fail on `c0062cd` (the category goes through `hybridSearch`).

`e2e/categories.spec.ts`: after clicking a category, the destination's count
line must state the same number as the card.

## Done criteria

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` exit 0
- [ ] `pnpm exec vitest run --maxWorkers=1` exits 0 including `tests/recipe-browse.test.ts`
- [ ] `grep -n "hybridSearch(searchQuery" app lib -r` returns nothing
- [ ] Only in-scope files modified

## STOP conditions

- `listRecipes` no longer supports `course`/`cuisine` filters.
- A link producer starts emitting something other than a lowercased course enum or cuisine.
- Typecheck requires an `any` or a non-trivial cast.

## Maintenance notes

- If a "tag" category is ever added to `/categories`, extend `recipeCategorySchema` rather than reintroducing text search.
- If `q` and `category` become combinable in the UI, pass the parsed filter to `hybridSearch` (requires plan 002's case-insensitive cuisine filter).
- Cuisine matching is case-insensitive equality, so "italian" and "Italian" rows are merged on the destination while `/categories` groups them separately — normalising stored cuisines is a separate data task.
- **Found by the strengthened e2e in CI:** `updateRecipe` wrote submitted text fields raw while `createRecipe` applied `trimToNull`, and the edit form submits `""` for an empty cuisine. The stored `""` became a nameless `/categories` card linking to `/recipes?category=` (all recipes). Updates now normalise blanks like creates, and `/categories` skips blank cuisines already stored. A one-off `UPDATE "Recipe" SET cuisine = NULL WHERE btrim(cuisine) = ''` cleanup is optional because of that filter; `getFilterOptions` in `lib/search.ts` has the same blank-cuisine exposure (track it with plan 002).
