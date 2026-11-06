# Database scale evidence

`confirmation.json` contains the separate 1000× breadth/fanout confirmation of the combined index changes: 40 randomized paired timings after warmup, result multiset equality checks, before/after query plans, and confidence intervals. `before-profile.json` preserves source SQL/schema snapshots. Workloads are SQL equivalents of the application ORM reads; application/network time is excluded.

## Reproduce plans with native PostgreSQL tools

Use a fresh, disposable PostgreSQL database with pgvector available. Set `BENCHMARK_DATABASE_URL` to that database. These files create the isolated `scale_bench` schema and synthetic domain rows. Run from this directory:

```sh
psql -X -v ON_ERROR_STOP=1 "$BENCHMARK_DATABASE_URL" -f schema-before.sql
psql -X -v ON_ERROR_STOP=1 -v roots=5000 -v children=5 "$BENCHMARK_DATABASE_URL" -f seed.psql -f queries.psql > before.log
psql -X -v ON_ERROR_STOP=1 "$BENCHMARK_DATABASE_URL" -c 'SET search_path TO scale_bench,public' -f fix.sql -f queries.psql > after.log
```

Use a fresh database per scenario. Breadth uses `(roots, children)` = `(5, 5)`, `(50, 5)`, `(500, 5)`, `(5000, 5)`; fanout uses `(5, 5)`, `(5, 50)`, `(5, 500)`, `(5, 5000)`. The native replay emits server timing/plan JSON; the archived confirmation additionally alternated the two independently seeded copies in randomized order and checked result equality. Its paired samples, not sequential replay logs, support the reported statistical comparison.

The baseline is synthetic, not current production volume. Fixed enum/singleton domains remain bounded. The confirmation's `speedup_ci95` describes the mean paired ratio; reported medians are separate estimates. Acceptance required a nonempty result, baseline median >0.05 ms, CI lower bound >1.2×, and one-sided sign-test p <0.05/10,000. These local, warm-cache microbenchmarks are not concurrent load tests or production capacity guarantees; host contention affected some samples. No production database was changed.
