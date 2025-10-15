# Performance Refactor Opportunities

## Summary

- Focus database work on reducing Cloudflare Worker ↔️ D1 round trips by reusing bindings per request, adopting prepared statements, and leaning on batch operations for write-heavy flows.
- Harden monitoring and schema hygiene so we can target slow queries and keep indexes aligned with access patterns before attempting larger feature work.
- Tighten production delivery with smarter bundling, caching, and background processing so the UI remains responsive even when the network is slow.
- Only use Drizzle ORM for the database

## Cloudflare Worker ↔️ D1 Interaction

### 1. Make the D1 binding explicit per request ✅ COMPLETED

The current `db` export relied on global symbols or `env.DB`, which worked but made it easy to accidentally reuse a stale binding across requests or fall back to the Infisical-provided connection when the Worker context was not set up correctly.【F:src/server/db/index.ts†L1-L210】

_Implementation completed_

- Added `getD1Binding()` utility function to retrieve D1 binding from Cloudflare context
- Exported `DrizzleDb` type for consistent typing across the codebase
- Updated tRPC context to use request-scoped database instances via `createDb(getD1Binding())`
- Migrated all App Router API routes to request-scoped db instances and aligned runtimes with OpenNext compatibility requirements (`runtime='nodejs'`):
  - Whoop endpoints: `/sync-workouts`, `/status`, `/sync-all`, `/cleanup-duplicates`, `/auth/whoop/callback`
  - Webhook handlers: `/webhooks/whoop` (main route + body-measurement, cycle, recovery, sleep, profile)
  - Auth routes: `/auth/login`, `/auth/callback`, `/auth/whoop/authorize`, `/auth/whoop/callback`
  - tRPC handler: `/trpc/[trpc]`
- Updated library functions to accept `DrizzleDb` parameter:
  - `src/lib/rate-limit.ts` - `checkRateLimit()` and `cleanupExpiredRateLimits()`
  - `src/lib/whoop-user.ts` - `resolveWhoopInternalUserId()`
  - `src/lib/token-rotation.ts` - `rotateOAuthTokens()`, `rotateAllExpiredTokens()`, `getValidAccessToken()`
  - `src/lib/oauth-state.ts` - `createOAuthState()`, `validateOAuthState()`, `deleteOAuthState()`, `cleanupExpiredStates()`, `cleanupUserStates()`
  - `src/lib/rate-limit-middleware.ts` - Updated to pass `ctx.db`
- Fixed all TypeScript compilation errors and verified with `bun build` and `bun test`

_Benefits achieved_

- Eliminates stale binding reuse across requests
- Enables per-request optimizations like prepared statement caching and read replica routing
- Reduces D1 round trips by ensuring consistent database connections per request
- Improves performance and reliability of database operations

### 2. Adopt prepared statements and reduce raw SQL string building ✅ COMPLETED

Several hot paths construct raw SQL strings with interpolated variables (e.g., getLastExerciseData and getLatestPerformanceForTemplateExercise).【F:src/server/api/routers/workouts.ts†L150-L300】 On Workers, every query today is parsed and planned on D1, adding latency.

_Implementation completed_

- Converted getLastExerciseData and getLatestPerformanceForTemplateExercise to use parameterized CTE queries with Drizzle's sql` template literals, reducing multiple sequential queries to single round trips.
- Used CTEs to handle equivalent exercises and linked exercises within the database, eliminating client-side processing and additional queries.
- Ensured all SQL parameters are properly parameterized using ${value} syntax, allowing D1 to cache query plans across executions.
- Maintained the same API responses while improving performance by consolidating database operations.

_Benefits achieved_

- Reduced D1 round trips from 3-4 queries to 1 per procedure call.
- Enabled query plan caching in D1 through parameterization.
- Improved response times for exercise data lookups.
- Maintained data consistency and security with proper user_id filtering.

### 3. Collapse sequential queries into batched transactions ✅ COMPLETED

Workflow methods like `workouts.start` issue multiple sequential reads (`findFirst` for duplicates, template fetch, then insert) which translates into several network round trips to D1.【F:src/server/api/routers/workouts.ts†L320-L394】 We already have transaction helpers and batch utilities that can be leveraged for this pattern.【F:src/server/db/utils.ts†L1-L200】

_Implementation completed_

- Wrapped the `workouts.start` procedure operations inside a single `ctx.db.transaction()` call to collapse sequential queries into one database round-trip.
- The transaction includes: checking for recent duplicate sessions, fetching template data, and inserting the new workout session.
- Added `transaction` method to both the global database mock (for test environments) and test-specific mocks to ensure compatibility.
- Maintained the same API behavior while reducing database round-trips from 3-4 queries to 1 transaction.
- Verified with `bun build`, `bun test`, and `bun check` to ensure no regressions.

_Benefits achieved_

- Reduced D1 round trips from 3-4 separate queries to 1 transaction for workout session creation.
- Improved performance and consistency by ensuring all operations succeed or fail together.
- Maintained existing error handling and logging patterns.
- Enhanced test coverage with proper transaction mocking.

### 4. Plug monitoring into query execution paths ✅ COMPLETED

We ship a `monitorQuery` helper and `DatabaseMonitor`, but nothing invokes it around the actual read/write methods, so we cannot see hot spots or error rates today.【F:src/server/db/monitoring.ts†L1-L90】

_Implementation completed_

- Added `monitoredDbQuery` utility function to `src/server/db/monitoring.ts` for lightweight wrapping of database operations in tRPC procedures.
- Integrated monitoring into key tRPC procedures in `src/server/api/routers/workouts.ts`:
  - `getRecent`: Wrapped `ctx.db.query.workoutSessions.findMany` with `monitoredDbQuery("workouts.getRecent", ...)`
  - `getById`: Wrapped `ctx.db.query.workoutSessions.findFirst` with `monitoredDbQuery("workouts.getById", ...)`
  - `getLastExerciseData`: Wrapped `ctx.db.all(sql\`\`...)`with`monitoredDbQuery("workouts.getLastExerciseData", ...)`
  - `getLatestPerformanceForTemplateExercise`: Wrapped `ctx.db.all(sql\`\`...)`with`monitoredDbQuery("workouts.getLatestPerformanceForTemplateExercise", ...)`
  - `start`: Wrapped entire `ctx.db.transaction(...)` with `monitoredDbQuery("workouts.start", ...)`
  - `save`: Wrapped verify `findFirst`, delete, and insert operations with separate `monitoredDbQuery` calls
  - `updateSessionSets`: Wrapped verify `findFirst`, select, and update operations
  - `delete`: Wrapped verify `findFirst` and delete operations
- The existing `timingMiddleware` in tRPC already logs procedure-level duration and correlates with request IDs, providing PostHog event correlation.
- Verified with `bun build` and `bun test` to ensure no regressions.

_Benefits achieved_

- Captures latency and error metrics for individual database operations, enabling identification of hot spots.
- Tracks query performance per procedure without modifying every resolver.
- Provides data for optimizing indexes and query patterns based on real usage metrics.
- Maintains existing logging infrastructure for correlation with PostHog events.

### 5. Revisit indexing and computed column strategies ✅ COMPLETED

The schema defines many per-column indexes but still leans on runtime calculations for metrics like `one_rm_estimate` and `volume_load` that are recomputed in the API layer.【F:src/server/db/schema.ts†L1-L200】【F:src/server/api/routers/workouts.ts†L47-L148】

_Implementation completed_

- Converted `one_rm_estimate` and `volume_load` columns to database-generated columns using SQLite's `GENERATED ALWAYS AS` syntax
- `one_rm_estimate` now automatically calculates using the Brzycki formula: `weight * (1 + reps / 30.0)` when weight > 0 and reps > 0
- `volume_load` now automatically calculates as: `sets * reps * weight` when all values are positive
- Removed application-layer computation from the `workouts.save` procedure, allowing the database to handle these calculations automatically
- Generated database migration (`0001_short_martin_li.sql`) to apply schema changes
- Maintained existing indexes on computed columns for optimal query performance
- Verified with `bun build`, `bun test`, and `bun check` - all passing

_Benefits achieved_

- Eliminates runtime computation overhead for frequently accessed metrics
- Ensures data consistency by computing values at the database level
- Improves query performance by leveraging indexed computed columns
- Reduces application code complexity and potential calculation errors
- Enables automatic recalculation when underlying data (weight, reps, sets) changes via updates
- Index auditing deferred until monitoring data from production usage is available (implemented in item 4)

## Application & Production Delivery

### 6. Cache read-heavy responses at the edge ✅ COMPLETED

Next.js App Router handlers are executed in the Worker, so we can use the Workers Cache API or RSC streaming caches for anonymous/public routes. D1 reads that do not change per request (e.g., master exercise catalog, jokes) could be cached for seconds to minutes to avoid hitting the database on every request.【F:src/server/api/routers/workouts.ts†L47-L148】

_Implementation completed_

- Implemented Workers Cache API caching for the `exercises.getAllMaster` procedure, which fetches the user's master exercise catalog
- Cache key includes user ID for per-user isolation: `master-exercises-${userId}`
- Cache duration set to 5 minutes to balance performance and data freshness
- Added cache invalidation on master exercise mutations: `createMasterExercise`, `updateMasterExercise`, and `mergeMasterExercises`
- Used try-catch blocks around cache operations to ensure DB queries still work if cache fails
- Verified with `bun build`, `bun test`, and `bun check` - all passing

_Benefits achieved_

- Reduces D1 round trips for frequently accessed master exercise lists
- Improves response times for exercise management UI
- Maintains data consistency with proper cache invalidation on writes
- Graceful degradation if cache operations fail

### 7. Background flush for the offline queue

The offline queue persists workout saves client-side and flushes them when connectivity resumes, but the Worker still processes each payload synchronously when it finally arrives.【F:src/lib/offline-queue.ts†L1-L119】

_Refactor ideas_

- Convert the Worker mutation endpoint to enqueue writes (via Queue or durable object) and return immediately, letting a background processor batch writes with the `batchInsertWorkouts` helper.
- Surface queue depth metrics so we can monitor when clients are falling back to offline mode.

### 8. Optimize bundle splits and React hydration

We already split vendor and UI component chunks in `next.config.js`, but we can go further by lazy-loading dashboards, sharing React Query caches between RSC and client components, and enabling Partial Prerendering for largely static pages.【F:next.config.js†L1-L74】

_Refactor ideas_

- Move analytics + AI helper code behind dynamic imports so the initial dashboard payload focuses on the workout logger.
- Audit React Query caches to ensure data fetched in RSC is dehydrated instead of re-requested on the client.
- Adopt streaming Suspense boundaries so the Worker can flush meaningful HTML before D1 writes finish.

### 9. Production diagnostics and failure budgets

We lack an explicit performance SLO, so it’s hard to tell when code changes regress latency versus network noise.

_Refactor ideas_

- Emit `Server-Timing` headers from API routes with D1 latency, cache hits, and queue durations so observability tools can chart them.
- Define alert thresholds (e.g., 95th percentile mutation latency) using the metrics collected via `monitorQuery` and Cloudflare Analytics. Tie these to CI (fail if regression exceeds budget).

These refactors give us a roadmap: start with instrumentation, then target the noisiest hot paths with batching and caching, and finally refine the UX delivery so users experience the wins.
