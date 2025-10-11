# Offline Sync Regression – Recent Workouts Missing

This document captures everything needed to unwind the broken offline sync upgrade and return the app to a single, reliable queue that feeds the existing `workouts.save` mutation. The implementer can execute the plan step-by-step without rediscovering context.

---

## Problem Statement
- Recent workouts do not appear on the dashboard after an offline or flaky-session save.
- Sync indicator communicates success even when payloads are still in localStorage.
- Root cause is a half-migrated offline layer: workout saves still go to the legacy queue while the new background sync subsystem never flushes those items to D1.

---

## Current Architecture Snapshot
1. **Legacy queue (`offline.queue.v1`)**
   - Files: `src/lib/offline-queue.ts`, `src/hooks/use-offline-save-queue.ts`.
   - Triggered by `useWorkoutSessionState` when saving workouts.
   - Flushes only on `navigator.onLine` event or manual `flush()` call from `useOfflineSaveQueue`.

2. **New queue (`swole-tracker-offline-queue-v2`)**
   - Files: `src/lib/mobile-offline-queue.ts`, `src/lib/offline-storage.ts` (BackgroundSyncManager, cache analytics, etc.).
   - Intended to persist queue + offline sessions + analytics, but `BackgroundSyncManager.syncWorkout` is a stub; no actual mutation occurs.
   - Sync indicator (`src/hooks/use-sync-indicator.ts`, `src/components/global-status-tray.tsx`) listens exclusively to this queue.

3. **Resulting mismatch**
   - Real payloads sit in the legacy queue; status UI inspects the empty new queue; workouts never reach `ctx.db` and the dashboard stays empty.

---

## High-Level Strategy
We will **remove** the unfinished infrastructure and **double down** on the legacy queue with minimal, well-defined improvements:
1. Delete all code paths for `mobile-offline-queue` and friends.
2. Rebuild the sync indicator + tray on top of `useOfflineSaveQueue`.
3. Enhance legacy flushing triggers and visibility so payloads go out reliably.
4. Purge obsolete storage keys to avoid future confusion.

---

## Detailed Work Plan

### Phase 1 – Remove unused subsystems
1. **Delete files**
   - `src/lib/mobile-offline-queue.ts`
   - `src/lib/cache-analytics.ts` if only referenced by the new system.
   - `src/lib/offline-storage.ts` sections that instantiate `BackgroundSyncManager`, analytics, manual sync, etc.
   - `src/app/_components/offline-workout-manager.tsx`
   - Any tests or mocks for the above (search `__tests__`, `mocks`).

2. **Update exports/imports**
   - Search repo for `mobile-offline-queue`, `setupEnhancedOfflinePersistence`, `OfflineWorkoutManager`, `triggerManualSync`, `onSyncStatusChange`, `syncStatus`.
   - Replace or delete usages; ensure no dead references remain.

3. **Simplify persistence setup**
   - In `src/trpc/react.tsx`, keep React Query persistence but strip calls to `setupEnhancedOfflinePersistence`. Replace with a slimmer helper that only persists cache (or inline the logic).
   - Remove references to `cleanupRef`, `backgroundSyncManager`, online/offline listeners.

4. **Drop analytics hooks**
   - If `cache-analytics` was used only by the new stack, remove imports and delete file.

5. **Documentation cleanup**
   - Update `AGENTS.md`, `README.md`, or any architecture docs to remove mentions of the enhanced queue/background sync.

### Phase 2 – Harden the legacy queue
6. **Centralize queue flush helper**
   - Create a utility in `useOfflineSaveQueue` (e.g., `ensureFlushed()` or `flushIfOnline()`).
   - Expose queue metrics (length, last attempted flush, last error) to consumers.

7. **New flush triggers**
   - On app/client start: in `TRPCReactProvider` or a root-level client component, call `flush()` if `navigator.onLine` is true.
   - Listen to `visibilitychange`: when tab becomes visible and online, call `flush()`.
   - Optional: short interval (e.g., every 60s) while queue size > 0, but avoid tight loops.

8. **Manual controls**
   - Provide a dedicated hook (wraps `useOfflineSaveQueue`) that surfaces `queueSize`, `flush`, `status`, `lastError`. Export it for status tray usage.
   - Add console/info log on successful flush; on failure set `lastError` and provide user feedback (toast or badge).

9. **Improve retry feedback**
   - When `flush()` hits network errors, include the HTTP error or message in `lastError`.
   - Optionally emit a PostHog event (if analytics still desired) from the legacy flush path.

10. **Storage hygiene**
    - On initialization (e.g., inside the flush helper), remove keys associated with the deleted system:
      - `swole-tracker-offline-queue-v2`
      - `swole-tracker-offline-sessions-v1`
      - `swole-tracker-sync-status-v1`
    - Guard with `typeof window !== "undefined"`.

### Phase 3 – Rebuild sync indicator & tray
11. **Refactor `useSyncIndicator`** (`src/hooks/use-sync-indicator.ts`)
    - Consume the new helper from Phase 2 (no background sync callbacks).
    - Derive status based on:
      - `queueSize > 0` → “Syncing” (if flush running) or “Pending”.
      - `isFlushing` flag from `useOfflineSaveQueue`.
      - `lastError` → `status = "error"`.
    - Include `useIsFetching / useIsMutating` to show “Saving…” when mutations running.

12. **Update `GlobalStatusTray`** (`src/components/global-status-tray.tsx`)
    - Replace references to `sync.pendingOperations` / `sync.failedOperations` with the data from the new hook.
    - Ensure “Sync now” button calls `flush()` directly.
    - Remove offline session management UI (this was tied to `OfflineWorkoutManager`).

13. **Tailor copy**
    - Adjust badge text and tooltips to reflect the simplified state machine (e.g., “Pending (3)” when queue size is 3).

### Phase 4 – Verification & Migration Safeguards
14. **TypeScript & lint**
    - Run `bun check`, `bun lint`. Ensure no references to removed modules remain.

15. **Runtime smoke tests**
    - Start dev server, simulate offline save:
      1. Begin workout, disable network, save.
      2. Confirm queue length increments, badge shows pending state.
      3. Re-enable network; flush should trigger automatically and clear queue.
      4. Confirm D1 row exists (via tRPC response/log or by checking UI) and dashboard shows recent workout.

16. **Manual manual sync**
    - With queue items present, click “Sync now” → expect flush and success message.

17. **Bad network scenario**
    - Force failure (e.g., respond with 500). Confirm queue retains items, status = error, user sees message. Retry after network recovers.

18. **Migration cleanup**
    - Inspect `localStorage` after upgrade: verify only `offline.queue.v1` remains. Legacy keys should be cleared automatically.

19. **Docs & Comments**
    - Update inline comments in `useOfflineSaveQueue` to describe new triggers and expectations.
    - Document behavior in README/offline section: “Queue flushes on mount, visibility change, and manual command.”

---

## Risk & Mitigation Notes
- **Deleting new system**: ensure no other feature depends on `mobile-offline-queue` (search for `workoutManager`, `syncStatus`); if discovered, either migrate to legacy queue or coordinate with feature owners.
- **Analytics loss**: removing PostHog events tied to the new queue may reduce insight. Decide whether to port those events into legacy queue flush success/failure.
- **User Experience**: losing offline session UI (if previously surfaced) should be acceptable; if desired, reimplement a minimal view driven by the legacy queue counts.
- **Future migration**: Document lessons learned in `docs/architecture` so a future rework considers parity with existing flows before cutting over.

---

## Deliverables for Implementer
- PR(s) removing unused files and simplifying persistence.
- Updated status indicator + manual sync button using legacy queue data.
- Added flush triggers and queue cleanup logic.
- Tests or manual QA notes demonstrating offline save success → recent workout renders.
- Documentation updates reflecting final architecture.

---

## Ready-to-Use Checklist (copy into PR description)
- [ ] Removed `mobile-offline-queue.ts`, `OfflineWorkoutManager`, and stale background sync code.
- [ ] Simplified TRPC provider offline persistence; no background sync instantiation remains.
- [ ] Legacy queue flushes on mount, visibility change, manual trigger, and online event.
- [ ] Sync tray leverages legacy queue state; badge accurately reflects pending/error conditions.
- [ ] Obsolete localStorage keys cleared automatically.
- [ ] Verified offline save → flush → recent workout on dashboard.
- [ ] Lint, type check, and relevant tests pass.
- [ ] Documentation references updated to describe single-queue approach.

