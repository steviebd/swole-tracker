# Performance Refactor Opportunities

## Summary
- Focus database work on reducing Cloudflare Worker ↔️ D1 round trips by reusing bindings per request, adopting prepared statements, and leaning on batch operations for write-heavy flows.
- Harden monitoring and schema hygiene so we can target slow queries and keep indexes aligned with access patterns before attempting larger feature work.
- Tighten production delivery with smarter bundling, caching, and background processing so the UI remains responsive even when the network is slow.

## Cloudflare Worker ↔️ D1 Interaction

### 1. Make the D1 binding explicit per request
The current `db` export relies on global symbols or `env.DB`, which works but makes it easy to accidentally reuse a stale binding across requests or fall back to the Infisical-provided connection when the Worker context is not set up correctly.【F:src/server/db/index.ts†L1-L210】

*Refactor ideas*
- Thread the Cloudflare `env.DB` binding into request handlers (e.g., via App Router route handlers or tRPC context) and instantiate a request-scoped Drizzle client instead of a global proxy. That lets us:
  - Attach request metadata (request id, user id) to a prepared statement cache.
  - Decide per request whether to use the primary region or a read replica (when available) and opt into eventual-consistency routes.
- Expose an escape hatch for background jobs to opt into a long-lived connection so bulk jobs can reuse statements safely without relying on implicit globals.

### 2. Adopt prepared statements and reduce raw SQL string building
Several hot paths construct raw SQL strings with interpolated variables (e.g., `getLastExerciseData` and `getLatestPerformanceForTemplateExercise`).【F:src/server/api/routers/workouts.ts†L150-L300】 On Workers, every query today is parsed and planned on D1, adding latency.

*Refactor ideas*
- Use Drizzle’s `.prepare()` support on the D1 client so these multi-CTE queries are compiled once per Worker instance.
- When we must fall back to raw SQL, parameterize the statements to let D1 cache query plans across executions and avoid string concatenation bugs.
- For the exercise lookups, consider precomputing “latest set per exercise” materialized views (or denormalized tables populated by the existing batch utilities) so the Worker returns cached aggregates instead of running large CTEs on every request.

### 3. Collapse sequential queries into batched transactions
Workflow methods like `workouts.start` issue multiple sequential reads (`findFirst` for duplicates, template fetch, then insert) which translates into several network round trips to D1.【F:src/server/api/routers/workouts.ts†L320-L394】 We already have transaction helpers and batch utilities that can be leveraged for this pattern.【F:src/server/db/utils.ts†L1-L200】

*Refactor ideas*
- Wrap the duplicate-session check, template fetch, and insert inside a single `db.batch()` or transaction that reuses the same prepared statements.
- Where possible, rely on existing `batchInsertWorkouts` / `batchUpdateSessionExercises` helpers so we enqueue full workout payloads and let the database resolve relationships server-side instead of bouncing between the Worker and client for each set.

### 4. Plug monitoring into query execution paths
We ship a `monitorQuery` helper and `DatabaseMonitor`, but nothing invokes it around the actual read/write methods, so we cannot see hot spots or error rates today.【F:src/server/db/monitoring.ts†L1-L90】

*Refactor ideas*
- Introduce lightweight wrappers in the tRPC router layer that call `monitorQuery("workouts.getRecent", () => ctx.db.query...)` so we capture latency without touching every resolver.
- Emit timing + D1 diagnostic headers (e.g., `cf-cache-status`, `server-timing`) into the logger for correlation with PostHog events.
- Use these metrics to decide when to add composite indexes or denormalized columns before we hit production limits.

### 5. Revisit indexing and computed column strategies
The schema defines many per-column indexes but still leans on runtime calculations for metrics like `one_rm_estimate` and `volume_load` that are recomputed in the API layer.【F:src/server/db/schema.ts†L1-L200】【F:src/server/api/routers/workouts.ts†L47-L148】

*Refactor ideas*
- Persist derivative metrics via triggers or scheduled jobs so reads can rely on indexed fields instead of deriving values on the fly.
- Audit index selectivity (e.g., `session_exercise_user_exercise_weight_idx`) after capturing monitoring data; if they are low-selectivity we can consolidate to fewer, more targeted composite indexes and shrink D1 storage.

## Application & Production Delivery

### 6. Cache read-heavy responses at the edge
Next.js App Router handlers are executed in the Worker, so we can use the Workers Cache API or RSC streaming caches for anonymous/public routes. D1 reads that do not change per request (e.g., master exercise catalog, jokes) could be cached for seconds to minutes to avoid hitting the database on every request.【F:src/server/api/routers/workouts.ts†L47-L148】

### 7. Background flush for the offline queue
The offline queue persists workout saves client-side and flushes them when connectivity resumes, but the Worker still processes each payload synchronously when it finally arrives.【F:src/lib/offline-queue.ts†L1-L119】

*Refactor ideas*
- Convert the Worker mutation endpoint to enqueue writes (via Queue or durable object) and return immediately, letting a background processor batch writes with the `batchInsertWorkouts` helper.
- Surface queue depth metrics so we can monitor when clients are falling back to offline mode.

### 8. Optimize bundle splits and React hydration
We already split vendor and UI component chunks in `next.config.js`, but we can go further by lazy-loading dashboards, sharing React Query caches between RSC and client components, and enabling Partial Prerendering for largely static pages.【F:next.config.js†L1-L74】

*Refactor ideas*
- Move analytics + AI helper code behind dynamic imports so the initial dashboard payload focuses on the workout logger.
- Audit React Query caches to ensure data fetched in RSC is dehydrated instead of re-requested on the client.
- Adopt streaming Suspense boundaries so the Worker can flush meaningful HTML before D1 writes finish.

### 9. Production diagnostics and failure budgets
We lack an explicit performance SLO, so it’s hard to tell when code changes regress latency versus network noise.

*Refactor ideas*
- Emit `Server-Timing` headers from API routes with D1 latency, cache hits, and queue durations so observability tools can chart them.
- Define alert thresholds (e.g., 95th percentile mutation latency) using the metrics collected via `monitorQuery` and Cloudflare Analytics. Tie these to CI (fail if regression exceeds budget).

These refactors give us a roadmap: start with instrumentation, then target the noisiest hot paths with batching and caching, and finally refine the UX delivery so users experience the wins.
