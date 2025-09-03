# TODO: Implement Persistent Client-Side Caching

This document outlines the plan to implement a robust, multi-layered caching strategy to improve application performance and reduce latency. The strategy leverages the existing TanStack Query setup to cache data in the browser's `localStorage`.

---

### Phase 1: Configure Web App Cache Persistence

The goal is to make TanStack Query's in-memory cache persist in `localStorage` for the web application.

1.  **Modify TRPC/QueryClient Setup:** Edit `src/trpc/react.tsx` or a related client setup file (e.g., `src/trpc/query-client.ts`).
2.  **Create a Persister:** Use `createSyncStoragePersister` to create a persister that uses `window.localStorage`.
3.  **Wrap the Query Client:** Use the `persistQueryClient` function from `@tanstack/react-query-persist-client` to wrap the existing Query Client, linking it to the `localStorage` persister. This will automatically save and restore the query cache across sessions.

---

### Phase 2: Implement Caching Strategies

Apply different caching rules based on the data type to optimize performance.

1.  **Static Data (e.g., Workout Templates):**
    *   For tRPC queries like `api.templates.getAll`, configure a long `staleTime` (e.g., `1000 * 60 * 60 * 24 * 14` for 14 days).
    *   **Benefit:** The app will fetch templates once and then use the local cache for subsequent visits, only refetching after the long stale time has passed. This will make loading the templates page nearly instant after the first visit.

2.  **Additive & Historic Data (e.g., Workouts, Sessions):**
    *   For queries like `api.workouts.getRecent`, keep the default `staleTime` (0), which shows cached data while refetching in the background.
    *   **Benefit:** The UI will feel instant by displaying cached data immediately, while ensuring the user sees the latest data moments later.
    *   **Invalidation:** Verify that mutations (like `api.workouts.save` or `api.templates.create`) correctly call `utils.invalidateQueries` to mark the relevant data as stale.

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