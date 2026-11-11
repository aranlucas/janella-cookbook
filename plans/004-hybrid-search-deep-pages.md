# Plan 004: Let hybrid search reach results beyond the first candidate window

> **Executor instructions**: Follow step by step; run every verification. STOP
> on the listed conditions. Update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat c0062cd..HEAD -- lib/search.ts tests/search-pagination.test.ts`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: MED — changes ranking window and query cost
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c0062cd`, 2026-11-11

## Why this matters

`hybridSearchImpl` (`lib/search.ts:292-295`) always fetches `limit * 2`
candidates from offset 0 for both semantic and keyword search, fuses them, then
slices `offset..offset+limit` (line 344) and reports `total: scores.size`
(line 348). Total is therefore at most `4 * limit` and the page window can
never pass the candidate set: on `/recipes?q=chicken` with 100 keyword matches
whose semantic results overlap, total shows ≈40–80 and recipes 41+ are
unreachable. `docs/reliability-audit.md` records the bounded-candidate design
as a known limitation ("does not claim exact global fused ranking/counts"), so
this is a product decision to revisit, not a regression.

## Steps

1. Fetch `offset + limit` (capped, e.g. 500) candidates from each source instead of `limit * 2`, keeping `offset 0` for fusion.
2. Report `total` as `max(keyword.total, semantic.total, scores.size)` so pagination reflects reachable results; document the approximation.
3. Extend `tests/search-pagination.test.ts` with a both-sources-succeed case at offset `>= 2 * limit`.

## Done criteria

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm exec vitest run --maxWorkers=1` exit 0.
- [ ] New test fails on `c0062cd`.

## STOP conditions

- The maintainer prefers the documented bounded design (check `docs/reliability-audit.md` for updates).
- The cap makes `/recipes` measurably slower in the database-scale benchmark (`benchmarks/database-scale`).
