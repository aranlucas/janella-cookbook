# Plan 003: Design spike — MCP "find a cookable choice" search (roadmap "Now")

> **Executor instructions**: This is a design/spike plan. Produce the design
> note and a prototype behind tests; do not change existing tool contracts
> without the maintainer approving the design note. Update `plans/README.md`
> when done.
>
> **Drift check (run first)**: `git diff --stat c0062cd..HEAD -- lib/recipe-mcp.ts lib/validations.ts lib/recipe-queries.ts ROADMAP.md`

## Status

- **Priority**: P2
- **Effort**: M (coarse)
- **Risk**: MED — changes an assistant-facing contract
- **Depends on**: 002 (shared, correct filter semantics)
- **Category**: direction
- **Planned at**: commit `c0062cd`, 2026-11-11

## Why this matters

`ROADMAP.md` lists as **Now**: "Extend MCP search with the same useful time,
cuisine and ingredient constraints as the app, returning reasons and missing
ingredients. Acceptance: a user can choose among three relevant saved recipes
and open the exact recipe without the assistant inventing ingredients." Today
`list_recipes` (`lib/recipe-mcp.ts:103-127`, schema `lib/validations.ts:220-230`)
supports keyword/cuisine/course/difficulty/tag/favorite/maxTime but has no
ingredient constraint, returns no match reasons and no missing-ingredient list,
and summaries (`lib/recipe-queries.ts:13-26`) omit ingredients — so an
assistant must call `get_recipe` per candidate and guess.

## Current state

- `lib/recipe-mcp.ts` — tools `list_recipes`, `get_recipe`, `add_recipe`; dependency-injected `RecipeMcpServices` for tests (`tests/recipe-mcp.test.ts`).
- `Ingredient.name` is stored per row (`prisma/schema.prisma`); original text is preserved (roadmap: "Preserve original ingredient text").
- Roadmap limit: "Do not claim dietary/allergen safety from AI parsing."

## Spike deliverables

1. Design note `docs/design/mcp-cookable-search.md`: new tool vs. extended `list_recipes`; input (`haveIngredients: string[]`, `excludeIngredients`, existing filters); output per recipe (`matchedIngredients`, `missingIngredients` as stored names, `reasons` built only from stored fields); deterministic matching rule (case-insensitive substring on `Ingredient.name`); pagination; how the assistant opens `/recipe/<slug>`.
2. Prototype a pure `rankCookableRecipes(recipes, constraints)` in `lib/` with Vitest cases: exact stored names only, no invented ingredients, deterministic ordering by missing count then total time.
3. List open questions (pantry staples like salt, Pantry Pulse coordination).

## Done criteria

- [ ] Design note exists; prototype tests pass with `pnpm exec vitest run --maxWorkers=1`.
- [ ] No change to existing tool input/output shapes.

## STOP conditions

- The maintainer's roadmap row changed or was delivered elsewhere.
