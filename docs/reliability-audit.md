# Correctness and reliability audit — 2026-11-06

## Baseline and inventory (recorded before implementation)

Clean isolated worktree at remote default `88a692b` (includes merged untangle #138 and indexes #139). This is a behavior audit, not another structural cleanup. Tests/builds run in CI only.

| Boundary / journey                | Implementation and evidence inspected                                                    | Success and failure contracts                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Manual/import/review/save/recover | forms, imports/actions, validations, actions, workflow design                            | Editable draft before persistence; optional browser storage; save UUID deduplication; optimistic edit version; preserve personal metadata |
| Database/search projection        | Prisma schema/migrations, actions, search-projection, embeddings, projection tests       | Transactional nested writes and keyword text; clear old vectors; conditional best-effort deferred embedding                               |
| Browse/search/filter/pagination   | recipe-queries, search, REST list/detail/search, search page                             | Validated inputs; parameterized SQL; semantic failure must preserve keyword availability and page contract                                |
| Cooking/favorites/shopping        | engagement controls, actions, session-store/provider, browser-store tests, lifecycle E2E | Atomic cooking increment; favorite assignment; tab-local shopping recovery with memory fallback                                           |
| External intake                   | fetch-source, parser/import helpers, YouTube, AI adapter and tests                       | Public DNS pinning at redirects, response size/deadline limits, decoded photo validation; errors preserve source                          |
| Assistant/nutrition/grocery OAuth | chat/nutrition routes, callback, mcp-oauth, chat UI                                      | Optional providers, streamed/tool errors, cookie-bound grocery tokens; recipe cooking remains independent                                 |
| Public MCP                        | api/mcp, recipe-mcp, protocol tests                                                      | Shared bearer token, disabled without token; validated add/list/get reuse cookbook persistence                                            |
| Pages/config/delivery             | app routes, env, metadata, README/roadmap, CI and Playwright suites                      | Documented protected single cookbook; no claimed user ownership; isolated DB CI and deployment-specific auth separate                     |

## Confirmed findings

1. **High confidence, medium impact: keyword fallback repeats page one and exceeds page size.** `lib/search.ts`, `hybridSearchImpl`: a nonempty query with unavailable embeddings returns the speculative keyword candidate query (`limit * 2`, offset zero). Requesting limit 2, offset 2 therefore returns the first four matches instead of the third and fourth. Expected: same `limit`, `offset`, total and filtering as direct keyword search. This is an ordinary documented no-provider mode. Fix: route semantic failure through the existing correctly paginated fallback. Regression: mocked provider failure with ordered database fixtures; CI pre-fix run must fail the page assertion.
2. **High confidence, medium impact: clearing a time leaves stale derived total.** `lib/actions.ts`, `updateRecipe`: `{prepTime:null}` persists null but `?? existing.prepTime` still contributes old prep time to total. Example prep 10/cook 20 becomes null/20/30 rather than null/20/20. Expected: explicit null means cleared; omitted means preserved. Both cleared yields null total; explicit total remains authoritative. Regression: action-level fixture checks persisted update values; CI pre-fix run must fail.

## Rejected hypotheses and boundaries

- Missing REST `favorite` does not exclude favorites: the route maps false/omitted to undefined before querying. No change warranted.
- Cookbook routes have no user authentication, but README explicitly documents protected single-collection deployment. Multi-user ownership is a roadmap requirement, not a newly discovered regression; do not invent authentication in this audit.
- Ingredient/step replacement is already transactional; save-key uniqueness and recovery lookup already protect lost-response retries. No duplicate-save rewrite warranted.
- Stale embedding completion already conditions writes on canonical search text; projection tests cover this.
- Hybrid fusion currently ranks bounded candidate sets and its total describes their union. This audit fixes the concrete no-provider page contract; it does not claim exact global fused ranking/counts.

## Validation and framework plan

Preserve existing Vitest, MCP protocol and Playwright journeys. Add the real published `e2e@0.23.0` and `@e2e-dev/web@0.15.5` (npm metadata verified, Node ^22.22.3 or >=24.8), manually configured without agents/credentials. Published docs and e2e.com quickstart/CI/GitHub Actions docs inspected. A deterministic browser journey will manually save two recipes, verify persisted content, sort matching results alphabetically and reopen a saved recipe. Run against the CI database/build, upload `.e2e` evidence. No local tests or builds.

Independent static review approved after fixing editor clear serialization and a chat test readiness race. CI evidence pending on PR #141; no local tests/builds run.

## Additional findings confirmed before edits

3. **High confidence, medium impact:** `app/recipes/page.tsx` title sort explicitly throws in the in-memory filtered path. Two keyword/category matches plus `sort=title` yields an empty error result instead of A–Z recipes. Replace placeholder with title comparison; browser regression saves two recipes and checks ordering.
4. **High confidence, medium impact:** ingredient/step grouping indexes an ordinary object with accepted user strings. `__proto__`, `constructor` and `toString` resolve inherited properties and crash `.push`, making a valid saved recipe unreadable. Use Maps; synchronous render regressions assert those labels and their content.
5. **High confidence, high likelihood chat breakage:** chat part rendering explicitly throws for `step-start` and reasoning/source metadata. The normal AI SDK stream includes step boundaries. Ignore unsupported non-display metadata so subsequent text/tools remain usable; deterministic streamed fixture regression.

Rejected: unused PullToRefresh idle throw has no mounted callsite and is outside behavior scope.

6. **High confidence, medium impact:** chat discards granted coordinates (`const [, setLocation]`) and never sends them, although the success message promises location recommendations. Retain the optional location and attach it to every chat send; disabling omits it. Browser fixture checks request bodies on both states.

Nutrition protocol mismatch rejected: published @ai-sdk/react 4.0.163 and ai 7.0.159 completion parser accept UI-message SSE text deltas.

Independent implementation review caught the editor converting cleared times to omitted fields. Edit submission now sends explicit null; an additional published-e2e journey saves 10/20 minutes, clears prep, verifies total 20 and reopens the editor. Browser baseline proofs cover A–Z, editor clearing, chat metadata and location independently.

### First CI evidence and corrections

At `de67602`, CI typecheck, Vitest and build passed; lint rejected module-mock test scaffolding and style/exhaustiveness issues. Replaced whole-module mocks with spies at existing dependency boundaries and typed fixtures, kept all regression assertions, and made metadata cases explicitly exhaustive. The isolated Playwright suite passed 38 tests. The new e2e app failed startup because the runner filters child environment variables; config now explicitly inherits only `DATABASE_URL` and retains app logs. Baseline e2e proofs now require assertion-failure exit 1, rejecting infrastructure/usage errors rather than counting them as reproduced bugs. These first e2e baseline attempts are not accepted as evidence.

At `f77afd8`, CI exposed frozen Next ESM namespaces that cannot be spied on; only `next/cache` and `next/server` now use narrowly documented framework-hook module mocks. App persistence/provider boundaries retain typed spies. The baseline timing attempt on this head is not accepted as evidence because setup failed. Build also found a request-body inference issue; fixed via explicit location-enabled branching. All corrected assertions remain required in CI.

At `ea8df50`, lint, types, Vitest, build, Lighthouse and Playwright PR passed. Published e2e traces exposed the exact label `Recipe Title *`; fixed the locator from the recorded screen. Baseline browser reports must now contain a selected failed test with `ASSERTION_FAILED`, not just exit 1; locator failures on this head are explicitly rejected as bug evidence. Baseline reports are preserved alongside fixed-run artifacts.

At `5c37439`, preserved baseline reports prove the A–Z assertion sees no recipe cards and the timing assertion sees `Total 30 min` rather than 20. The fixed timing journey passes. Fixed A–Z results are correctly ordered but the test included the footer h3; scoped the unchanged exact ordered-title assertion to `main h3`. CI run: https://github.com/aranlucas/janella-cookbook/actions/runs/42305254283 (artifact `e2e-recipe-journey`, baseline/1.json and baseline/2.json).
