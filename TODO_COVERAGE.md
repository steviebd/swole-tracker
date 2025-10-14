# Coverage Improvement TODOs

## Current Status
- [ ] Re-run `bun coverage` once dependencies can be installed successfully. The current attempt fails because `vitest` isn't available (`bun install` is blocked by registry 403s in this environment). See if CI/CD already caches `node_modules` or add a step that bootstraps them before collecting coverage.

## Test Infrastructure Prep
- [ ] Add a lightweight script (e.g., `scripts/setup-tests.ts`) that seeds required environment variables/mocks so coverage runs don't depend on live services. Document the command in `README.md` once the setup script lands.
- [ ] Capture baseline coverage locally (once installs succeed) and drop the generated `coverage-summary.json` in the PR comment to track progress toward 75%.

## Library-Focused Coverage Wins
- [ ] Expand `src/__tests__/unit/offline-queue.test.ts` to exercise the browser code paths (`updateItem`, `requeueFront`, `pruneExhausted`) by shimming `window.localStorage`. This validates retry bookkeeping and exhausted-item pruning in `src/lib/offline-queue.ts`.
- [ ] Create a dedicated test suite for `CacheManager` in `src/lib/offline-storage.ts` to cover `performCacheCleanup`, quota handling, and `trackCacheEvent` fallbacks by mocking `localStorage` and `posthog`.
- [ ] Add unit tests for `initializeOfflinePersistence` and `setOfflineCacheScope` in `src/lib/offline-storage.ts` to confirm persister wiring, cache key versioning, and background sync timers.
- [ ] Write tests for `useOfflineSaveQueue` (`src/hooks/use-offline-save-queue.ts`) to ensure failed mutations requeue correctly, exponential backoff applies, and successful mutations clear `offline.queue.v1`.
- [ ] Cover `src/lib/rate-limit-middleware.ts` by asserting it calls `workoutRateLimit`/`templateRateLimit` before resolver execution and surfaces `RateLimitError` metadata.

## Hook Coverage Targets
- [ ] Add React Testing Library tests for `useOnlineStatus` (`src/hooks/use-online-status.ts`) to verify initial optimistic `true` value, hydration update from `navigator.onLine`, and cleanup of `online`/`offline` listeners.
- [ ] Test `useOfflineStorage` (`src/hooks/use-offline-storage.ts`) to ensure it switches cache scopes when auth state changes and triggers `persistQueryClient` rehydration.
- [ ] Add tests for `useWorkoutSessionState` (`src/hooks/useWorkoutSessionState.ts`) covering optimistic set updates, undo behavior, and conflict resolution on flush.
- [ ] Cover `useHealthAdvice` (`src/hooks/useHealthAdvice.ts`) by mocking the tRPC client to test loading/error states and cache invalidation on manual refresh.

## Server API Router Coverage
- [ ] Introduce integration-like tests for `templatesRouter.create` and `templatesRouter.update` to assert master exercise linking via `createAndLinkMasterExercise` and rejection when linking is disabled (`src/server/api/routers/templates.ts`).
- [ ] Add tests for `templatesRouter.getAll` sorting branches (`recent`, `lastUsed`, `mostUsed`, `name`) to ensure the `orderBy` logic executes with mocked Drizzle queries.
- [ ] Cover `workoutsRouter.getLastExerciseData` (`src/server/api/routers/workouts.ts`) to validate linked master exercise lookups, exclusion filters, and fallback to direct name matching.
- [ ] Test `workoutsRouter.complete` to ensure it persists exercises, triggers `generateAndPersistDebrief`, and prunes stale template links.
- [ ] Write unit tests for `session-debrief` service (`src/server/api/services/session-debrief.ts`) to cover: skipping when an active debrief exists, rate limit error propagation, and metadata serialization for inserted rows.
- [ ] Cover `whoopRouter.sync` and webhook handlers (`src/server/api/routers/whoop.ts` and `src/server/api/routers/webhooks.ts`) to assert signature validation and deduplication logic.
- [ ] Add tests for `insightsRouter.getExerciseInsights` (`src/server/api/routers/insights.ts`) to validate linked exercise lookups, unit normalization, and recommendation logic.

## UI & Component Coverage
- [ ] Expand `src/__tests__/components/theme-selector.test.tsx` to cover keyboard interactions, accessibility attributes, and theme persistence in `localStorage`.
- [ ] Add component tests for `RecentWorkouts` (`src/app/_components/recent-workouts.tsx`) to validate loading skeletons, error state rendering, and navigation links for view/repeat actions.
- [ ] Create tests for `SyncIndicator` (`src/app/_components/sync-indicator.tsx`) verifying the indicator reacts to `useSyncIndicator` hook states (idle, syncing, error).

## Milestones Toward 75%
- Aim for ~10% coverage gain from library + hook tests, another ~15% from router/service suites, and the remainder from UI/component coverage. Re-run `bun coverage` after each cluster lands to ensure steady progress toward the 75% target.
