# TODO: Implement Persistent Client-Side Caching

This document outlines the plan to implement a robust, multi-layered caching strategy to improve application performance and reduce latency. The strategy leverages the existing TanStack Query setup to cache data in the browser's `localStorage`.

**Performance Goals:**
- Near-instant page loads after first visit
- Seamless offline data access
- Reduced API calls and bandwidth usage
- Improved user experience with optimistic updates

---

### Phase 1: Configure Web App Cache Persistence

The goal is to make TanStack Query's in-memory cache persist in `localStorage` for the web application.

1.  **Install Dependencies:**
    *   Add `@tanstack/react-query-persist-client` to handle cache persistence

2.  **Modify TRPC/QueryClient Setup:** Edit `src/trpc/react.tsx` or a related client setup file (e.g., `src/trpc/query-client.ts`).

3.  **Create a Persister:** Use `createSyncStoragePersister` to create a persister that uses `window.localStorage`.

4.  **Wrap the Query Client:** Use the `persistQueryClient` function from `@tanstack/react-query-persist-client` to wrap the existing Query Client, linking it to the `localStorage` persister. This will automatically save and restore the query cache across sessions.

5.  **Cache Size Management (localStorage ~5MB limit):**
    *   Implement automatic cache size monitoring
    *   At 80% capacity (4MB): Start LRU eviction of oldest cached queries
    *   At 90% capacity (4.5MB): Aggressive cleanup of non-essential cached data
    *   At 95% capacity: Fall back to in-memory only caching
    *   Handle `QuotaExceededError` gracefully without user notification

6.  **Error Handling Strategy:**
    *   Catch `QuotaExceededError` and fall back to in-memory caching
    *   Handle corrupted cache data by clearing and reinitializing
    *   Log cache errors to PostHog analytics
    *   Implement cache health checks on app startup

---

### Phase 2: Implement Caching Strategies

Apply different caching rules based on the data type to optimize performance.

1.  **Static Data (Templates, User Settings):**
    *   For tRPC queries like `api.templates.getAll`, configure a long `staleTime` (e.g., `1000 * 60 * 60 * 24 * 14` for 14 days).
    *   **Benefit:** The app will fetch templates once and then use the local cache for subsequent visits, only refetching after the long stale time has passed. This will make loading the templates page nearly instant after the first visit.

2.  **WHOOP Data:**
    *   For queries like `api.whoop.getWorkouts`, configure long `staleTime` (e.g., `1000 * 60 * 60 * 24 * 7` for 7 days).
    *   **Rationale:** WHOOP relies on push notifications and APIs, so we showcase available data without frequent refetching.
    *   Cache WHOOP sync status and workout data for offline access.

3.  **Additive & Historic Data (Workouts, Sessions):**
    *   For queries like `api.workouts.getRecent`, keep the default `staleTime` (0), which shows cached data while refetching in the background.
    *   **Benefit:** The UI will feel instant by displaying cached data immediately, while ensuring the user sees the latest data moments later.
    *   **Invalidation:** Verify that mutations (like `api.workouts.save` or `api.templates.create`) correctly call `utils.invalidateQueries` to mark the relevant data as stale.

4.  **Cache Invalidation Triggers:**
    *   Auth logout: Clear all cached data
    *   App version updates: Clear stale cache entries
    *   Implement selective invalidation for specific data types

---

### Phase 3: Optimistic Updates for Workout Sessions

To prevent latency and avoid duplicate entries when saving a workout session, we will implement a detailed optimistic update strategy for the `api.workouts.save` mutation located in `src/hooks/useWorkoutSessionState.ts`.

The current implementation only applies optimistic updates to the `getRecent` query. This needs to be extended to the `getById` query which is used on the `/workout/session/id` page.

**Implementation Steps:**

1.  **Extend `onMutate` in `api.workouts.save.useMutation`:**
    *   In addition to `getRecent`, cancel the `getById` query for the current session to prevent conflicting refetches: `await utils.workouts.getById.cancel({ id: sessionId });`
    *   Store the previous state of the `getById` query for potential rollback: `const previousWorkoutById = utils.workouts.getById.getData({ id: sessionId });`
    *   Update the cache for `getById` with the optimistic data:
        '''typescript
        utils.workouts.getById.setData({ id: sessionId }, (oldData) => {
            if (!oldData) {
                return optimisticWorkout; // Or a shaped optimistic object
            }
            return {
                ...oldData,
                ...optimisticWorkout,
            };
        });
        '''
    *   Return `previousWorkoutById` from `onMutate` to make it available in the `onError` context.

2.  **Update `onError`:**
    *   Add logic to restore the previous state of the `getById` query if the mutation fails:
        '''typescript
        if (context?.previousWorkoutById) {
            utils.workouts.getById.setData(
                { id: sessionId },
                context.previousWorkoutById,
            );
        }
        '''

3.  **Update `onSettled`:**
    *   Invalidate the `getById` query to ensure the UI is updated with the final data from the server: `void utils.workouts.getById.invalidate({ id: sessionId });`

---

### Phase 4: Performance Monitoring & UI Indicators

**Cache Performance Metrics:**
*   Integrate with existing PostHog analytics setup in `src/lib/posthog.ts`
*   Track cache hit/miss rates, size usage, and performance improvements
*   Monitor cache eviction events and quota errors
*   Add metrics for offline data access patterns

**Sync Status Indicators:**
*   Add sync indicator near profile image in header
*   Status levels:
    *   Green dot: All data synced
    *   Yellow dot: Syncing in progress  
    *   Red dot: Sync failed
    *   Gray dot: Offline mode
*   Show detailed sync status in user profile or settings

---

### Phase 5: Offline-First Enhancements

**Offline Data Access:**
*   Ensure cached workout data, templates, and WHOOP data remain accessible offline
*   Implement graceful degradation when network is unavailable
*   Queue mutations for retry when connection is restored (leverage existing offline queue in `src/lib/offline-queue.ts`)

**Cache Warmup:**
*   On app startup, preload essential data (user templates, recent workouts)
*   Background sync of WHOOP data when network is available
*   Smart prefetching based on user navigation patterns

---

### Implementation Priority

1. **Phase 1**: Basic localStorage persistence (highest impact)
2. **Phase 2**: Caching strategies for different data types
3. **Phase 4**: Performance monitoring and sync indicators  
4. **Phase 3**: Extended optimistic updates
5. **Phase 5**: Advanced offline features

**Success Metrics:**
- Page load times reduced by 50%+ on repeat visits
- Cache hit rate >80% for static data
- Zero perceived latency for cached interactions
- Graceful offline experience with full data access