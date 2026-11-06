# Server refactor decisions

Recorded before implementation. Scope: server actions, imports, search, validation,
recipe queries and the recipe engagement caller. Repository workflow constraints
remain authoritative; no schema or provider changes are planned.

- Use `recipeRelations` for every full recipe read returned by actions and previews.
  - Hidden link: update, favorite, cooked and import preview repeat the same include.
  - Restore uses unsorted ingredients/instructions despite the ordered recipe contract.
- Let semantic SQL rank IDs and Prisma hydrate full recipes through `recipeRelations`.
  - Hidden links: `SemanticSearchRow`, the SQL select list and manual result assembly
    separately mirror the Recipe schema. `sourceTypeSchema` duplicates its enum.
  - Surplus: four relation queries and hand-built grouping maps reproduce Prisma's
    relation loading. Ranking and public result shape remain unchanged; a recipe
    deleted between ranking and hydration is omitted instead of reconstructed.
- Remove the unused current-count argument from `markAsCooked` and its caller.
  - Needless link: caller supplies a stale counter that the atomic increment ignores.
- Remove validation wrappers that have no consumers.
  - Surplus: `validateRecipeInput`, `validateUrlImport`, `validateTextImport`,
    `validateYouTubeImport` and their private result types. Live callers use schemas.
- Reuse the public `FilterOptions` type in search instead of mirroring it locally.
  - Hidden link: filter result and UI contract have duplicate field definitions.
- Remove comments that restate edited code; retain comments explaining external
  provider constraints, save retry safety and transaction/search consistency.

Retained special cases: save-key retry lookup protects a committed save after a lost
response; optimistic update locking protects concurrent edits; embedding failure
must not prevent keyword use; blocked-source/size/format rules protect bounded
imports; YouTube provider fallback addresses independent external availability.
These have requirements of their own and are not refactor targets.

Validation: run typecheck and existing regression suites after implementation.
Test cleanup is deferred to the parent after structural work.
