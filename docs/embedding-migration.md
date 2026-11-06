# Move semantic search to BGE-M3

## Replacement decision (checked November 6, 2026)

Use FreeLLMAPI family `bge-m3`: multilingual, 1024-dimensional vectors, currently hosted by [Cloudflare](https://developers.cloudflare.com/workers-ai/models/bge-m3/). FreeLLMAPI's [seeded catalog](https://github.com/tashfeenahmed/freellmapi/blob/main/server/src/db/migrations/20260101_000000_legacy_baseline.ts) includes Cloudflare `@cf/baai/bge-m3` and Hugging Face `BAAI/bge-m3`. Its [embedding router](https://github.com/tashfeenahmed/freellmapi/blob/main/server/src/services/embeddings.ts) falls back within a family, not between embedding models. This app keeps that routing and the existing five-second timeout; errors fall back to keyword search.

Cloudflare's [November 5 deprecation notice](https://developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/) and [EmbeddingGemma model page](https://developers.cloudflare.com/workers-ai/models/embeddinggemma-300m/) currently say **November 15, 2026**, earlier than the November 20 date in the original notification. The suggested `@cf/google/embeddinggemma-2` successor is still marked “available soon,” so this change does not depend on it. [BGE-base-en-v1.5](https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/) is available at 768 dimensions but is English-oriented; sharing EmbeddingGemma's dimension would not make its vectors compatible.

Availability is verified in Cloudflare documentation and current FreeLLMAPI upstream source, **not in the deployed Railway instance**. Its catalog requires authentication. Check the deployed client profile, enabled provider credentials and model catalog before rollout; upstream defaults do not prove production configuration.

## Storage and safety

- `Recipe.embedding` and its 768-dimensional data remain intact. The additive migration creates `RecipeEmbedding`, keyed by recipe and model/preprocessing version.
- New vectors use `bge-m3:v1`. An explicit legacy override uses `embeddinggemma-300m:v1`, never unlabelled old vectors. No old vector is relabelled, padded or truncated.
- Search requires the exact space and current `searchText`. A dimension-guarded SQL `CASE` also prevents distance calculations against another family's vectors if filters are reordered.
- Writes use the source text as a stale-job guard. Search checks it again, including after an older app instance updates a recipe during rolling deployment.
- Responses must identify the configured family and contain finite, nonzero vectors of the expected width. The router's [public response contract](https://github.com/tashfeenahmed/freellmapi/blob/main/server/src/routes/proxy.ts) returns the family as `model`, including after provider fallback. Unexpected model responses fail closed.
- The existing 8,000-character input bound and input preparation are unchanged. If preprocessing, pooling or an incompatible provider implementation changes, increment the space version and reindex. Model family alone is not a license to change pooling.

## Rollout checklist

No production migration, configuration change or inference call is performed by opening this PR.

1. Back up the database. Verify deployment settings and that FreeLLMAPI enables `bge-m3` for the cookbook client. Use a synthetic phrase for a smoke request; expect `model: "bge-m3"`, 1024 finite nonzero values, and an enabled provider. Do not set a different-width alias or `auto`.
2. Test the migration and application against an isolated development database first. For production, apply `pnpm db:migrate:deploy` through the established release process **before** deploying the new app. Do not use `db:push` on production. A missing table makes embedding jobs/search fail and fall back, so avoid that ordering error.
3. Deploy the new app with `FREELLM_EMBEDDING_MODEL=bge-m3` (or remove the old override to use the new default). An existing `embeddinggemma-300m` override is intentionally not silently rewritten. Coordinate the Vercel setting with deployment. Chat and recipe parsing settings do not change.
4. Initially, keyword search remains available while semantic coverage is empty. From the approved environment, load the same database, router URL/key and model settings as the app. `.env` and `.env.local` are loaded by the command; process environment values take precedence. Start with the default dry run:

   ```sh
   pnpm embeddings:reindex --limit=100
   ```

   This lists aggregate candidate counts only and makes no inference calls or writes. It selects recipes with nonblank stored search text and no current vector in this space.

5. After reviewing the target database and candidate count, run a small write batch:

   ```sh
   pnpm embeddings:reindex --write --limit=25
   ```

   This sends stored recipe search text to the configured FreeLLMAPI providers and may consume their quota. It is not run automatically at deployment or in a database migration. Continue in bounded batches until `candidates` is zero. The maximum per invocation is 10,000. Completed recipes are skipped on subsequent runs; errors stop the batch without discarding earlier successful rows. Recipes edited during a call are counted as `stale`, not indexed; rerun to pick up their latest text. No legacy vector is deleted.

6. Audit coverage, including old recipes with missing search text, using a read-only query:

   ```sql
   SELECT
     COUNT(*) AS total_recipes,
     COUNT(*) FILTER (WHERE r."searchText" IS NULL OR btrim(r."searchText") = '') AS missing_search_text,
     COUNT(e."recipeId") AS indexed_current_text
   FROM "Recipe" r
   LEFT JOIN "RecipeEmbedding" e
     ON e."recipeId" = r.id
     AND e.space = 'bge-m3:v1'
     AND e."searchText" = r."searchText";
   ```

   Recipes without stored search text are skipped rather than mutated by this command. Repair their projection through the normal recipe edit/save flow, then rerun the batch. Verify representative English and non-English searches and filters with actual recipes before considering the migration complete. The retained similarity threshold (0.35) is not a quality benchmark for the new model; evaluate retrieval quality during rollout.

## Rollback

Keep the additive table and both families' rows. Returning to the previous application release uses the untouched legacy column; recipes edited since rollout may be keyword-only because normal edits invalidate old vectors. This is safer than returning stale results. With the new release, an explicit `embeddinggemma-300m` setting can regenerate its own versioned index only while that family remains available; it does not reuse old unverified vectors. After retirement, prefer keyword fallback while fixing BGE-M3 availability rather than depending on legacy inference. Do not drop tables or mass-clear embeddings as part of rollback.

## Development verification

```sh
pnpm db:migrate:deploy
RUN_EMBEDDING_DB_TESTS=1 RUN_EMBEDDING_CONCURRENCY_TESTS=1 pnpm test
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
```

Only use an isolated development database for these tests. Inference is mocked. SQL tests exercise mixed dimensions, ignored legacy vectors, stale writes, fallback and resumable backfill; they are enabled in CI. The overlapping-transaction test needs a real PostgreSQL server and `RUN_EMBEDDING_CONCURRENCY_TESTS=1`; PGlite cannot establish that concurrency behavior. Normal unit tests also cover wrong-model responses, incorrect dimensions, zero vectors and provider errors.

The reindex entrypoint uses the maintained `jiti` loader (already present transitively, now declared directly) to reuse typed application modules with extensionless imports. Node's native type stripping alone cannot resolve those imports. No custom TypeScript loader or duplicate provider implementation is introduced.
