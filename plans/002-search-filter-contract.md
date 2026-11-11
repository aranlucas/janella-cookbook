# Plan 002: Make `/api/search` honour every filter it accepts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the status row for
> this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c0062cd..HEAD -- lib/search.ts types/recipe.ts lib/validations.ts tests/search-pagination.test.ts`
> On any change, compare the excerpts below with the live code; a mismatch is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c0062cd`, 2026-11-11

## Why this matters

`POST /api/search` validates and documents a `filters.tags` array ("Filter by
tag slugs" in `app/api/search/route.ts:15` and `app/api/schema/route.ts:171`),
and `searchFiltersSchema` accepts it (`lib/validations.ts:290`), but neither
search path reads it — a client asking for `tags: ["vegan"]` silently gets
non-vegan recipes. Separately, the semantic path silently drops any cuisine
that fails `/^[\w\s-]+$/i` (ASCII-only `\w`), so `cuisine: ["Créole"]` removes
the cuisine constraint entirely and widens results instead of narrowing them;
and both paths compare cuisine case-sensitively while `listRecipes` (the REST
list and MCP) compares case-insensitively.

## Current state

- `lib/search.ts:44-76` — `buildFilterConditions` (semantic SQL): handles cuisine (with the regex drop at line 51), course, difficulty, maxTime, isFavorite. No tags.
- `lib/search.ts:202-208` — keyword `filterConditions`: cuisine `{ in: [...] }` (case-sensitive), course, difficulty, maxTime, isFavorite. No tags.
- `lib/recipe-queries.ts:71-85` — reference semantics: cuisine `{ equals, mode: "insensitive" }`, tag `{ tags: { some: { slug } } }`.
- SQL is built with `Prisma.sql` / `Prisma.join`, which parameterises values; the regex is not needed for injection safety.
- Schema: `prisma/schema.prisma` — implicit many-to-many `Recipe.tags` ↔ `Tag` (join table `_RecipeToTag`, columns `A` = Recipe id, `B` = Tag id). Confirm with `grep -n "_RecipeToTag" prisma/migrations -r` before writing SQL.

## Commands you will need

| Purpose   | Command                               | Expected |
| --------- | ------------------------------------- | -------- |
| Typecheck | `pnpm typecheck`                      | exit 0   |
| Tests     | `pnpm exec vitest run --maxWorkers=1` | all pass |
| Lint      | `pnpm lint`                           | exit 0   |
| Build     | `pnpm build`                          | exit 0   |

## Scope

**In scope**: `lib/search.ts`, `tests/search-filters.test.ts` (create).

**Out of scope**: route files, `lib/validations.ts` (contract already right), hybrid candidate pagination (plan 004).

## Steps

1. Keyword path: add `...(filters.tags?.length ? [{ tags: { some: { slug: { in: [...filters.tags] } } } }] : [])`; replace cuisine with `{ OR: filters.cuisine.map((c) => ({ cuisine: { equals: c, mode: "insensitive" } })) }`. **Verify**: `pnpm typecheck` → exit 0.
2. Semantic path: replace the regex-filtered cuisine with `lower(r.cuisine) IN (${Prisma.join(cuisines.map((c) => c.toLowerCase()))})`; add `EXISTS (SELECT 1 FROM "_RecipeToTag" rt JOIN "Tag" t ON t.id = rt."B" WHERE rt."A" = r.id AND t.slug IN (${Prisma.join(tags)}))`. **Verify**: `pnpm typecheck` → exit 0.

## Test plan

`tests/search-filters.test.ts` modelled on `tests/search-pagination.test.ts`:
mock the embedding provider failing, spy `prisma.recipe.findMany`, call
`hybridSearch("soup", { tags: ["vegan"], cuisine: ["Créole"] })`, assert the
`where` contains the tag `some` clause and an insensitive cuisine clause.
Semantic SQL needs the opt-in DB suite (`RUN_EMBEDDING_DB_TESTS=1`, see
`tests/embedding-database.test.ts`) — add a case there if a local pgvector DB
is available; otherwise say so in the PR.

## Done criteria

- [ ] All commands above exit 0; new test fails on `c0062cd` and passes after.
- [ ] `grep -n "safeCuisines" lib/search.ts` → no output.

## STOP conditions

- The join table is not `_RecipeToTag` with `A`/`B` columns.
- Prisma rejects `mode: "insensitive"` inside the cuisine filter.

## Maintenance notes

Filters now exist in three places (`listRecipes`, keyword, semantic). A shared
filter builder is the follow-up; do not attempt it in this plan.
