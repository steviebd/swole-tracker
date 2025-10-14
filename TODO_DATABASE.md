# Database Performance TODO

This backlog captures the database-specific work needed to improve Cloudflare D1 responsiveness and reduce end-to-end latency across the workout flows.

## P0 — Query Hot Paths

- [x] Collapse the multi-roundtrip lookup in `src/server/api/routers/workouts.ts:80` (`getLastExerciseData`) into a single statement (use a CTE to resolve linked exercises and fetch the latest sets in one query).
- [x] Rework `getLatestPerformanceForTemplateExercise` in `src/server/api/routers/workouts.ts:210` to avoid three sequential selects; combine the link resolution and max-weight lookup into one grouped query.
- [x] Replace broad `with: { template: { with: { exercises: true }}, exercises: true }` selections in `src/server/api/routers/workouts.ts:36` and `src/server/api/routers/workouts.ts:57` with tailored column projections and pagination; current approach hydrates every set on each dashboard load.
- [x] Refactor `workout.updateSets` in `src/server/api/routers/workouts.ts` (search for `setIndex` logic near the end of the file) to batch updates with a single `UPDATE ... CASE` statement or Drizzle `batch` using prepared statements; the current per-set updates incur N network round trips even inside `ctx.db.batch`.

## P1 — Analytics & Aggregations

- [x] Push the computation in `src/server/api/routers/progress.ts` (multiple calls to `ctx.db.select` across ~lines 20–200) into SQL views/agg tables or at least cut the period comparisons to a single query; today each request performs 2–4 full scans of `session_exercise`.
- [x] Materialize the heavy transformations in `src/server/api/routers/insights.ts:1`–`220` (flattening sessions and computing 1RM/volume in JS) into a summary table updated on write or via a background worker so insights reads stay within one indexed select.
- [x] Audit `src/server/api/routers/templates.ts:60` query for case-insensitive search: `ILIKE` is not native to SQLite/D1; switch to `LOWER(name) LIKE LOWER(?)` with a computed column/index to keep search fast.
- [x] For Whoop sync fetches (`src/server/api/routers/whoop.ts:17` onward), add limits/pagination (e.g., `limit` query param) and consider caching latest records in KV to avoid replaying the entire history on each request.

## P1 — Schema & Indexes

- [x] Review the nine secondary indexes on `session_exercise` in `src/server/db/schema.ts:120`–`180`; prune any unused composites (e.g., weight + user) to speed up inserts/updates on D1. Capture actual query patterns before removing.
- [x] Add a composite index on `(user_id, masterExerciseId)` for `exercise_link` in `src/server/db/schema.ts:343`; current lookups (e.g., `workouts.ts:95`, `insights.ts:40`) filter by both columns but only hit single-column indexes.
- [x] Verify the data types for computed columns `one_rm_estimate`/`volume_load` (`session_exercise`) and ensure they are populated on write to avoid null-heavy scans in progress routes.

## P2 — Runtime & Caching

- [x] Introduce per-request caching for read-most queries (recent workouts, templates list, insights summaries) using Cloudflare `caches.default` or KV; wrap reads in a helper so we control TTL and bypass caching on writes.
- [x] Evaluate using the existing batch helpers in `src/server/db/utils.ts` from the offline queue/app flows; they are currently unused, so pushes/pulls still happen row-by-row.
- [x] Add request-scoped memoization in `src/server/db/index.ts` so repeated accesses to the same prepared statement within a Worker invocation reuse the statement instead of re-preparing through Drizzle.
- [x] Extend `src/server/db/monitoring.ts` to log slow queries (e.g., >150 ms) with the query text and binding count so we can capture D1 slowness in production.

## Investigation

- [x] Capture Cloudflare D1 traces under load (back-to-back `workouts` queries) to validate whether latency is network-bound or CPU-bound.
- [x] Assess whether a read replica (Cloudflare Smart Placement or caching layer) is needed once query consolidation is complete.
- [x] Prototype materialized summary tables for daily/weekly volume and 1RM (could be updated in the offline queue flush) to verify impact on dashboards.
