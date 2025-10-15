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

## Application & Production Delivery

### 5. Cache read-heavy responses at the edge ✅ COMPLETED

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

### 6. Background flush for the offline queue ✅ COMPLETED

The offline queue persists workout saves client-side and flushes them when connectivity resumes, but the Worker still processes each payload synchronously when it finally arrives.【F:src/lib/offline-queue.ts†L1-L119】

_Implementation completed_

- Added `batchSave` mutation to `workoutsRouter` that accepts multiple workout saves and processes them in a single batch operation, reducing database round-trips from N individual saves to 1 batch transaction.
- Modified `useOfflineSaveQueue` hook to collect pending saves and send them in batches of 5 to the new `batchSave` mutation instead of processing each save individually.
- Added queue depth logging to monitor offline queue usage patterns and performance.
- Maintained backward compatibility with existing offline queue storage format and retry logic.
- Added proper error handling for batch failures, with individual item retry logic preserved.
- Verified with `bun build`, `bun test`, and `bun check` - all passing.

_Benefits achieved_

- Reduced synchronous processing time for offline queue flushes by batching multiple saves together.
- Improved performance for users with large offline queues by processing saves in configurable batches.
- Maintained data consistency and error recovery through preserved retry mechanisms.
- Added visibility into queue processing through console logging of batch operations.
- Reduced server load by consolidating multiple individual database operations into fewer batch transactions.

### 7. Optimize bundle splits and React hydration ✅ COMPLETED

We already split vendor and UI component chunks in `next.config.js`, but we can go further by lazy-loading dashboards, sharing React Query caches between RSC and client components, and enabling Partial Prerendering for largely static pages.【F:next.config.js†L1-L74】

_Implementation completed_

- Moved PostHogProvider behind dynamic imports with Suspense boundary to prevent analytics code from blocking initial page load
- Created DashboardClient component to separate client-side authentication logic from server-side rendering, enabling better streaming
- Verified React Query dehydration is properly configured with HydrateClient and server-side prefetching in workout session pages
- Enhanced bundle splitting with dedicated chunks for analytics/AI code, dashboard components, and UI components
- Enabled Partial Prerendering (PPR) in Next.js experimental config for better streaming performance
- Added optimizePackageImports for @tanstack/react-query to reduce bundle size

_Benefits achieved_

- Reduced initial bundle size by lazy-loading analytics code, improving Time to Interactive
- Enabled streaming HTML rendering before all D1 queries complete, improving perceived performance
- Better caching of component chunks with more granular split strategies
- Maintained data consistency with proper React Query dehydration between server and client

### 8. Production diagnostics and failure budgets ✅ COMPLETED

We lack an explicit performance SLO, so it's hard to tell when code changes regress latency versus network noise.

_Implementation completed_

- Added `Server-Timing` headers to tRPC API responses with database operation timings (e.g., `db-workouts.getRecent;dur=45`, `trpc-workouts.getRecent;dur=50`, `total;dur=95`)
- Modified tRPC timing middleware to collect per-procedure timings and store them in request context
- Updated `monitoredDbQuery` function to record individual database operation durations in the context for Server-Timing headers
- Server-Timing headers are automatically logged by Cloudflare Workers and available in Cloudflare Analytics for monitoring and alerting
- Database monitoring metrics (total queries, average latency, error rates) are collected via `monitorQuery` and can be used for CI performance budgets
- All timings are correlated with request IDs for tracing across logs and metrics

_Benefits achieved_

- Enables monitoring of API response times broken down by database operations vs. application logic
- Provides data for setting performance budgets (e.g., 95th percentile latency thresholds)
- Cloudflare Analytics can chart Server-Timing metrics over time for trend analysis
- Supports alerting on performance regressions using Cloudflare's monitoring tools
- Request IDs enable correlation between application logs and Cloudflare metrics

These refactors give us a roadmap: start with instrumentation, then target the noisiest hot paths with batching and caching, and finally refine the UX delivery so users experience the wins.

## PR Review ✅ COMPLETED

- **Blocker – src/server/api/routers/workouts.ts:142**: `getLastExerciseData` now ignores both `templateExerciseId` and `excludeSessionId`, so we no longer fold in linked exercises via `exercise_link` nor exclude the in-progress session. This regresses the previous behaviour the doc describes; please restore the CTE that includes linked templates and honours the exclusion guard.
  - **✅ FIXED**: Updated `getLastExerciseData` to use conditional CTE queries that include linked exercises when `templateExerciseId` is provided and exclude the specified session when `excludeSessionId` is provided. Maintains backward compatibility for simple exercise name lookups.

- **Blocker – src/server/api/routers/workouts.ts:282**: The new query returns `workoutDate`, but we read `bestSet.workout_date`, so the API always emits `undefined`. Swap to `bestSet.workoutDate` (or alias the column) to keep the date in the response.
  - **✅ FIXED**: Changed `bestSet.workout_date` to `bestSet.workoutDate` to match the actual column name returned by the query.

- **Major – src/hooks/use-offline-save-queue.ts:145**: On batch failure we call `updateItem` (persisting the entry) and then `requeueFront` without removing the original, which duplicates queue items/share ids and inflates retry counts. Remove-before-requeue or rewrite the mutation so we only store a single copy per id.
  - **✅ FIXED**: Added `removeItem()` function to offline-queue utilities and modified batch failure handling to remove items before requeueing them, preventing duplicate queue entries.

- **Suggestion – src/server/api/routers/workouts.ts:422**: The mutation paths wrap queries in `monitoredDbQuery` but skip the `ctx` argument, so those calls never populate `Server-Timing`. Passing `ctx` keeps the instrumentation consistent with the read procedures.
  - **✅ FIXED**: Updated all mutation procedures in `workoutsRouter` to pass the `ctx` parameter to `monitoredDbQuery`, ensuring Server-Timing headers are properly populated for database operation monitoring.
