# PDR: Stabilise Offline Sync, Session Persistence, and Dashboard Freshness

## Background
- Users report stale UI after creating templates or finishing workouts; optimistic updates do not line up with the query keys that the list views and dashboards rely on.
- Offline syncing succeeds eventually, but on-device state (cache, queue inspector) does not refresh, so people stay in limbo until a full reload.
- WorkOS sessions abruptly expire in under an hour even though the cookie advertises 30 days. When someone steps away longer than that, every protected route bounces them back to login.
- “Recent workouts” shows placeholders for sessions that were started and abandoned, and fresh completions take a long time to surface. Product guidance: drop abandoned sessions after 4 hours and require a re-login only if the user stays away for 72 hours.

## Goals / Success Criteria
- Session cookies remain valid for 72 hours of inactivity, while the WorkOS access token still rotates hourly behind the scenes.
- Completing a template creation or workout immediately updates any view that displays it (`/templates`, dashboard recents) without waiting for network round-trips.
- Offline queue UI reflects the latest queue contents, and the React Query cache scopes correctly per user (no leakage across accounts).
- Recent-workout feeds exclude abandoned sessions, and the system reclaims stragglers ≥4 hours old.
- Document additional hotspots so future work can extend the same fixes across other lagging screens.

## Non-Goals
- No new UI/UX design work beyond keeping existing flows (e.g. `/templates/new` → `/templates`) but ensure data consistency there.
- Do not re-architect the entire offline system or add background sync jobs beyond what is necessary for accuracy.

## Proposal & Implementation Plan
1. ✅ **Session Longevity Revamp**
   - Extend `sessions` schema (if needed) or reuse existing columns to track two timestamps: `sessionExpiresAt` (≥72 hours) and `accessTokenExpiresAt` (~1 hour). Keep `expiresAt` for backwards compatibility but migrate usage.
   - In `SessionCookie.create`, set `sessionExpiresAt` to `now + 72h` and `accessTokenExpiresAt` to the WorkOS token’s expiry. Update `SessionCookie.get` / `SessionCookie.isExpired` to check the longer window.
   - Update middleware refresh path to bump both expiries on success: persist the refreshed access token and push `sessionExpiresAt` forward another 72 hours.
   - Ensure `/api/auth/session` respects the longer window and returns 401 only when `sessionExpiresAt` has passed.
   - QA: verify cookie persists across 72 h simulation (adjust timestamps in tests) and that forced refresh still happens hourly. Add Vitest coverage for the new expiry math.

2. ✅ **Template List Instant Refresh**
   - Align optimistic cache writes with the actual query key shape. Instead of `setData(undefined, …)`, call `queryClient.setQueriesData` targeting all active `templates.getAll` queries (iterate via `utils.templates.getAll.getQueryKey({ search, sort })`).
   - After mutation success, keep redirect to `/templates`, but ensure the landing page can render from the already-updated cache. Only `invalidateQueries` if you need server confirmation.
   - Validate offline scenario: creating while offline should enqueue mutation and add an optimistic entry scoped to the current user.

3. ✅ **Offline Queue Reactivity**
   - Replace the static `useMemo` in `useOfflineSaveQueue` with state derived from storage events. Subscribe to queue changes (including `enqueue`, `writeQueue`) and update both `queueSize` and the item list.
   - Consider exposing `useQueueItems()` hook or updating the existing hook to return a snapshot that re-renders when storage changes.
   - Cover with unit tests (Vitest + jsdom) to confirm storage events propagate.

4. ✅ **Per-User Cache Scoping**
   - Call `setOfflineCacheUser(userId)` inside `TRPCReactProvider` before `setupOfflinePersistence(queryClient)`. When `userId` changes, clear the old cache namespace and hydrate a fresh persister.
   - Audit logout/sign-out flows to ensure `clearAllOfflineData` wipes all scoped keys.

5. ✅ **Recent Workouts Hygiene**
   - Update `workouts.getRecent` to filter out sessions lacking exercises (e.g. `EXISTS (SELECT 1 FROM session_exercise WHERE …)`).
   - Implement cleanup in the router or a cron endpoint to delete or archive sessions older than 4 hours with zero exercises; perform this prune silently (no UI prompts) either on resume or via background job.
   - Expand optimistic cache updates to cover all active limits (`setQueriesData` on `getRecent` with varying `limit`). Mirror the delete mutation logic accordingly.
   - Verify the `/workout` dashboard, `/workouts`, and `RecentWorkoutsSection` reflect completed sessions instantly.

6. ✅ **Audit & Report Additional Lag Hotspots**
   - Build a comprehensive inventory of cached screens/components:
     1. **Dashboard/Home (`DashboardContent`, `StatsCards`, `QuickActionCards`, `RecentWorkoutsSection`, `RecentAchievements`)**
     2. **Progress analytics (`ProgressDashboard`, `WeeklyProgressSection`, strength/volume modals)**
     3. **Whoop integration surfaces (`WhoopIntegrationSection`, recovery/sleep/body measurement panels, `/connect-whoop`)**
     4. **AI & wellness features (`session-debrief-panel`, health advice components, wellness history, suggestions)**
     5. **Workout history & detail views (`workout-history`, `/workouts`, `/workout/session/*`)**
     6. **Template + exercise management beyond the primary flow (exercise manager, linking modals)**
     7. **Offline/Sync indicators (`enhanced-sync-indicator`, `sync-indicator`, conflict resolution modal)**
   - For each bucket:
     - Enumerate the tRPC queries/mutations involved (query key shape, invalidation strategy, optimistic update hooks, offline queue interactions).
     - Identify current stale behaviours (manual testing notes, known bugs) and map to required fixes (e.g., broaden `setQueriesData`, add targeted invalidations, trigger background refetch after offline flush).
     - Document dependencies on React Query persistence so we can ensure cache scope applies uniformly once Step 4 lands.
   - Summarise findings back in this file (new subsection per bucket) and spin out follow-up tasks or TODOs for any surfaces requiring code changes beyond the items already defined here. Implementation order can follow impact, but nothing should remain unreviewed.

## Task Breakdown
1. Schema & session service refactor, with tests (`session-cookie.ts`, middleware, auth routes).
2. Template mutation cache alignment (`template-form.tsx`, `templates-list.tsx`, related hooks).
3. Offline queue hook reactivity over localStorage events (`use-offline-save-queue.ts` + tests).
4. TRPC provider cache scoping adjustments (`trpc/react.tsx`, `offline-storage.ts`).
5. Recent workout filtering, cleanup routine, and optimistic cache broadening (`workouts` router, `useWorkoutSessionState`, dashboard components).
6. Complete cached-surface audit and log action items per bucket (append to this file or link out).

## Risks / Mitigations
- **Session expiry migration**: changing semantics could log out users if applied incorrectly. Mitigate with migration path and dual-field fallback.
- **Cache key fan-out**: updating all query keys risks stale references or memory bloat. Keep helper utilities to iterate keys safely.
- **Offline queue churn**: more frequent state updates could increase re-render cost. Debounce storage listeners or batch updates if needed.
- **Cleanup job edge cases**: deleting empty sessions must not touch in-progress workouts; use the 4 hour cutoff and confirm some heartbeat writes mark “active” sessions.

## Cached-Surface Audit Findings
- **Dashboard / Home**
  - Queries: `progress.getWorkoutDates` (week/month variants with staggered `staleTime`) and `progress.getVolumeProgression` via `useSharedWorkoutData` (`src/hooks/use-shared-workout-data.ts:12`). Mutations: none; relies on `workouts.save` side effects.
  - Gaps: workout saves (online/offline) never invalidate `progress.*` queries, so `StatsCards` (`src/app/_components/StatsCards.tsx:15`) and `RecentAchievements` (`src/app/_components/RecentAchievements.tsx:7`) show stale streak/volume data. Offline flush only touches `workouts.getRecent`/`templates.getAll`.
  - Actions: expand post-save invalidations to cover `progress.getWorkoutDates`, `progress.getVolumeProgression`, `progress.getConsistencyStats`, and `progress.getPersonalRecords` for active time ranges; mirror that in offline queue flush. Consider `queryClient.setQueriesData` to update “this week” counts immediately.

- **Progress Analytics**
  - Queries: multiple `progress.*` under `ProgressDashboard` and related modals (`src/app/_components/ProgressDashboard.tsx:9`, `ProgressionModal.tsx:22`, `ConsistencyAnalysisModal.tsx:24`, `VolumeTrackingSection.tsx:16`).
  - Gaps: same missing invalidations; staleTime (10–30 min) means heavy lag after a workout. Some modals fetch on open without prewarm, so offline saves leave them blank until manual refresh.
  - Actions: reuse dashboard invalidation set; add `setQueriesData` patterns for localized metrics when data is available (e.g., append new workout volume). Evaluate whether modal queries should share cached data via `useSharedWorkoutData`.

- **Whoop Integration**
  - Queries: `whoop.getIntegrationStatus`, `whoop.getLatestRecoveryData`, `whoop.getWorkouts` (`src/app/_components/WhoopIntegrationSection.tsx:292`).
  - Gaps: no periodic refetch (`refetchInterval` absent) and no automatic refresh after webhook or manual sync, so data can stay stale until hard reload. Error states (expired tokens) rely on manual navigation.
  - Actions: add background refetch (e.g., interval when tab visible), trigger targeted invalidation after `/api/whoop/sync` endpoints, and consider optimistic updates when workouts are imported.

- **AI & Wellness (Session Debriefs, Health Advice, Wellness History)**
  - Queries: `sessionDebriefs.listBySession`, `sessionDebriefs.*` mutations (`src/app/_components/session-debrief-panel.tsx:117`); likely `healthAdvice`/`wellness` routers elsewhere (needs code follow-up).
  - Gaps: offline workout save triggers asynchronous debrief generation but no invalidation when job completes; UI may stay stale without manual refresh. Pinned/dismiss mutations rely on invalidate but optimistics limited.
  - Actions: introduce event-driven invalidation (e.g., SSE or polling) after generation; ensure queue flush invalidates debrief list for affected session IDs; add optimistic updates for markViewed/pin toggles.

- **Workout History & Detail**
  - Queries: `workouts.getRecent` (various limits), `workouts.getById`, `workouts.getHistory` inside `workout-history` (`src/app/_components/workout-history.tsx:60`).
  - Gaps: issue already noted—optimistic updates only target `{limit:5}`; history component paginates using `cursor`, not refreshed after offline flush. Idle-session cleanup missing.
  - Actions: implement broad `setQueriesData` for all `workouts.getRecent` inputs, add hooks to refresh paginated history when affected session IDs change, run silent prune for empty sessions and invalidate relevant queries.

- **Template / Exercise Management**
  - Queries: `templates.getAll` (with filters), exercise master data (`src/app/_components/exercise-manager.tsx:63`), linking utilities.
  - Gaps: current fix plan covers template creation path; additional actions needed for duplication/delete undo (ensure same query-key coverage) and exercise linking mutations (lack optimistic updates -> stale lists).
  - Actions: extend plan to update `exercise-manager` caches after link/unlink/merge, possibly by refreshing specific `exercises.*` keys or applying optimistic transforms.

- **Offline / Sync Indicators**
  - Components: `enhanced-sync-indicator`, `sync-indicator`, `SessionDebriefPanel` offline banners, queue modal (`src/hooks/use-offline-save-queue.ts:248`).
  - Gaps: indicator statuses rely on `useOfflineSaveQueue` snapshot which currently freezes (`useMemo` without deps). Storage listener improvements from Step 3 will help; also need to ensure indicator invalidates when caches refresh post-flush so UI transitions from “pending” to “synced”.
  - Actions: after hook refactor, audit indicator logic to confirm status transitions; add tests around storage events and queue length updates.
