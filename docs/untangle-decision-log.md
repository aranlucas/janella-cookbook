# Whole repository untangle decision log

The exact requested skill was fetched and read before work, and re-read on resume.
Both Comments and Tests are selected. AGENTS.md excludes components/ui from edits.
Read README, ROADMAP and recipe-workflow before changes. Work stays in the bound worktree.

Baseline before edits: clean worktree; Vitest 7 files / 58 tests passed;
TypeScript passed. The resumed server edits also pass TypeScript.
Baseline Vite warning: path resolution plugin duplicates native Vite support.
Intermittent tool transport timeouts are not application test failures.

## Inventory and redesign

Server decisions were recorded before edits in [server decisions](untangle-server-decisions.md).
Frontend inventory covers forms, search, session/shopping, chat and component reachability;
its decisions are recorded separately before edits. Configuration, CI, API envelopes,
error classes, parser integrations, schemas and tests were also inspected.

- Normalize API errors once at their boundary. apiError currently converts and classifies
  the same exception several times. Its sole-use formatting wrapper renames fields only
  for apiError to rename them back. Keep the AppError contract, status overrides and
  transient database Retry-After behavior, removing the redundant formatting layer.
- Retain separate error subclasses: they encode distinct application failures and keep
  the base error independent from provider/database classification.
- Preserve save-key recovery, optimistic locking, embedding stale-write guards,
  extraction bounds, public-address validation and external transcript fallbacks.
  They protect documented requirements rather than accidental implementation details.
- Keep UI primitives untouched and do not redesign product behavior or expand roadmap scope.
- Test cleanup comes last. Preserve independently useful regression coverage; do not remove
  tests merely because they exercise stable behavior or require mocks.

## Validation and review

Pending final sequential checks, behavior tests and independent convergence review.
No deployment or protection bypass. PR and merge are authorized after checks and review.

## Resumed validation and review findings

- Parallel Vitest had five import/test timeouts under machine load, not assertion
  mismatches. One-worker run passes all 7 files / 58 tests.
- Lint failed while Tailwind precomputed unchanged CSS after its 60-second limit;
  retry with native `--threads=1`, without weakening rules.
- Independent review identified private saveKey leakage through semantic hydration;
  Prisma search reads now explicitly omit it (keyword included for the same contract).
- New browser-store regressions assert independently required behavior: shared recent
  ordering/deduplication, subscription notifications and storage-denial recovery.
  These catch omitted notification or diverging reader/writer contracts.

## Independent review follow-up decisions

- Share database wake-up classification and automatic retry countdown between route
  and global error boundaries. Their independent copies already disagree on unreachable
  database messages. Keep distinct presentation and the global HTML shell; share only
  recovery policy and timer lifecycle. Retain the three-second external DB wake-up delay.
- Remove unused generateRecipeEmbedding and its result type; the search projection
  now owns the complete generation/persistence lifecycle and has the only live callers.

Dependency follow-through: repository import/config inspection found no remaining
consumers of the six packages supporting deleted AI elements (Rive, xyflow,
ansi-to-react, media-chrome, react-jsx-parser, tokenlens). Remove those direct
packages and the obsolete ansi-to-react override. Replace vite-tsconfig-paths
with native Vite resolve.tsconfigPaths and remove that plugin dependency.
Other dependency candidates are retained until peer/tool requirements justify removal.

Final review found no further structural redesign after the following cleanup:
remove unused legacy recipe request/response interfaces and dead not-found/database
classification helpers; remove restating action/search/schema comments. Test cleanup
is now last: remove MCP non-call assertions that never invoke a handler, supply real
private fields to privacy fixtures, and wait for streamed categories before E2E branch
choices. Keep remaining protocol/parser/transaction/search/auth regression coverage.

Final independent audit: no further worthwhile structural redesign or regression found;
remaining comment labels identified across helpers, schema, chat, shopping and API
queries removed. Retained external-provider limits, units, safety narrowing and
transaction/concurrency explanations. React checklist applied to changed components.
Current validation: TypeScript passes, 60/60 Vitest pass, production build underway.

Final validation update: production build completed successfully, including route
prerendering. Full lint passes with native `--threads=1`; TypeScript and 60 Vitest
tests pass. Initial Playwright browser cases could not launch packaged headless
Chromium (SIGSEGV before navigation). No coredump is available; available memory
alone does not establish a cause. Retrying the identical suite with installed
system Chromium through temporary declarative configuration outside the repository.

Follow-up import inspection also confirmed no source/config consumers for the
preexisting direct Google SDK, ai-fallback, motion, date-fns and Radix controllable
state dependencies. Remove those five direct entries; pnpm retains transitive peer
requirements as needed. No replacement dependency was added.

System Chromium E2E: 38 passed / 3 skipped in 1.2 minutes. Includes recipe lifecycle,
manual save/recovery, ingredient keyword search, favorites, cooking and shopping.
Optional embedding calls returned provider 401; saves and keyword fallback still passed.
Live-provider checks remain opt-in. Packaged Chromium launch failure is an environment
limitation; no code/test weakening was used to make browser tests pass.

Final dependency follow-through validation: TypeScript and all 60 Vitest tests pass.
`format:check` reports only the unchanged docs/design/recipe-workflow.md; all changed
files pass formatting. Preserve that unrelated preexisting formatting issue.
`git diff --check` passes and components/ui has no diff.
