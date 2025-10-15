# Coverage Improvement TODOs

## Status Update (2025-10-15)

- All major TODO items have been completed as per the summary, including remaining UI component tests.
- Test suite passes (253 tests), lint and typecheck pass.
- Current coverage: 38.38% branches (below 75% target), but significant improvements made.
- Build has issues (esbuild EPIPE), but core functionality validated.

## Test Infrastructure Prep

- [x] Add a lightweight script (e.g., `scripts/setup-tests.ts`) that seeds required environment variables/mocks so coverage runs don't depend on live services. Document the command in `README.md` once the setup script lands.
- [x] Capture baseline coverage locally (once installs succeed) and drop the generated `coverage-summary.json` in the PR comment to track progress toward 75%.

## Library-Focused Coverage Wins

- [x] Expand `src/__tests__/unit/offline-queue.test.ts` to exercise the browser code paths (`updateItem`, `requeueFront`, `pruneExhausted`) by shimming `window.localStorage`. This validates retry bookkeeping and exhausted-item pruning in `src/lib/offline-queue.ts`.
- [x] Create a dedicated test suite for `CacheManager` in `src/lib/offline-storage.ts` to cover `performCacheCleanup`, quota handling, and `trackCacheEvent` fallbacks by mocking `localStorage` and `posthog`.
- [x] Add unit tests for `initializeOfflinePersistence` and `setOfflineCacheScope` in `src/lib/offline-storage.ts` to confirm persister wiring, cache key versioning, and background sync timers.
- [x] Write tests for `useOfflineSaveQueue` (`src/hooks/use-offline-save-queue.ts`) to ensure failed mutations requeue correctly, exponential backoff applies, and successful mutations clear `offline.queue.v1`.
- [x] Cover `src/lib/rate-limit-middleware.ts` by asserting it calls `workoutRateLimit`/`templateRateLimit` before resolver execution and surfaces `RateLimitError` metadata.

## Hook Coverage Targets

- [x] Add React Testing Library tests for `useOnlineStatus` (`src/hooks/use-online-status.ts`) to verify initial optimistic `true` value, hydration update from `navigator.onLine`, and cleanup of `online`/`offline` listeners.
- [x] Test `useOfflineStorage` (`src/hooks/use-offline-storage.ts`) to ensure it switches cache scopes when auth state changes and triggers `persistQueryClient` rehydration.
- [x] Add tests for `useWorkoutSessionState` (`src/hooks/useWorkoutSessionState.ts`) covering optimistic set updates, undo behavior, and conflict resolution on flush.
- [x] Cover `useHealthAdvice` (`src/hooks/useHealthAdvice.ts`) by mocking the tRPC client to test loading/error states and cache invalidation on manual refresh.

## Server API Router Coverage

- [x] Introduce integration-like tests for `templatesRouter.create` and `templatesRouter.update` to assert master exercise linking via `createAndLinkMasterExercise` and rejection when linking is disabled (`src/server/api/routers/templates.ts`).
- [x] Add tests for `templatesRouter.getAll` sorting branches (`recent`, `lastUsed`, `mostUsed`, `name`) to ensure the `orderBy` logic executes with mocked Drizzle queries.
- [x] Cover `workoutsRouter.getLastExerciseData` (`src/server/api/routers/workouts.ts`) to validate linked master exercise lookups, exclusion filters, and fallback to direct name matching.
- [x] Test `workoutsRouter.save` to ensure it persists exercises, triggers `generateAndPersistDebrief`, and prunes stale template links.
- [x] Write unit tests for `session-debrief` service (`src/server/api/services/session-debrief.ts`) to cover: skipping when an active debrief exists, rate limit error propagation, and metadata serialization for inserted rows.
- [x] Cover `whoopRouter.sync` and webhook handlers (`src/server/api/routers/whoop.ts` and `src/server/api/routers/webhooks.ts`) to assert signature validation and deduplication logic.
- [x] Add tests for `insightsRouter.getExerciseInsights` (`src/server/api/routers/insights.ts`) to validate linked exercise lookups, unit normalization, and recommendation logic.

## UI & Component Coverage

- [x] Add component tests for `RecentWorkouts` (`src/app/_components/recent-workouts.tsx`) to validate loading skeletons, error state rendering, and navigation links for view/repeat actions.
- [x] Create tests for `SyncIndicator` (`src/app/_components/sync-indicator.tsx`) verifying the indicator reacts to `useSyncIndicator` hook states (idle, syncing, error).

## Milestones Toward 75%

- Aim for ~10% coverage gain from library + hook tests, another ~15% from router/service suites, and the remainder from UI/component coverage. Re-run `bun coverage` after each cluster lands to ensure steady progress toward the 75% target.
