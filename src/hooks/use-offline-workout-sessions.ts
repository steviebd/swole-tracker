"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  createLocalWorkoutSession,
  getLocalSession,
  updateLocalSession,
  markSessionSynced,
  getSyncQueue,
  dequeueSyncItem,
  updateSyncItem,
  requeueSyncItem,
  pruneExhaustedSyncItems,
  getSyncQueueLength,
  type OfflineWorkoutSession,
} from "~/lib/offline-workout-sessions";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

type SyncStatus = "idle" | "syncing" | "error" | "done";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoff(attempt: number) {
  // 500ms * 2^attempt, capped at 8s
  return Math.min(500 * Math.pow(2, attempt), 8000);
}

export function useOfflineWorkoutSessions() {
  const [syncQueueSize, setSyncQueueSize] = useState<number>(() =>
    typeof window !== "undefined" ? getSyncQueueLength() : 0,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const router = useRouter();

  const utils = api.useUtils();
  const createServerSession = api.workouts.start.useMutation();

  const refreshSyncCount = useCallback(() => {
    if (typeof window === "undefined") return;
    setSyncQueueSize(getSyncQueueLength());
  }, []);

  /**
   * Create a workout session offline-first
   */
  const createWorkoutSession = useCallback(
    async (
      templateId: number,
      workoutDate: Date = new Date(),
      telemetry?: {
        theme_used?: string;
        device_type?: "android" | "ios" | "desktop" | "ipad" | "other";
        perf_metrics?: any;
      }
    ): Promise<OfflineWorkoutSession> => {
      // Create locally first
      const session = createLocalWorkoutSession(templateId, workoutDate, telemetry);
      
      // Update sync queue size
      setSyncQueueSize(prev => prev + 1);
      
      // Try to sync immediately if online
      if (navigator.onLine) {
        // Don't await - let it sync in background
        void syncPendingSessions();
      }
      
      return session;
    },
    [],
  );

  /**
   * Sync pending sessions to server
   */
  const syncPendingSessions = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus("syncing");
    setLastSyncError(null);

    try {
      pruneExhaustedSyncItems();

      // Process sync queue
      while (true) {
        const item = dequeueSyncItem();
        if (!item) break;

        if (item.type !== "workout_session_create") {
          continue;
        }

        try {
          // Update session status to syncing
          updateLocalSession(item.session.localId, {
            status: "syncing",
            syncAttempts: item.attempts + 1,
          });

          // Create session on server
          const result = await createServerSession.mutateAsync({
            templateId: item.session.templateId,
            workoutDate: item.session.workoutDate,
            theme_used: item.session.theme_used,
            device_type: item.session.device_type,
            perf_metrics: item.session.perf_metrics,
          });

          // Mark as synced
          markSessionSynced(item.session.localId, result.sessionId);

          // Invalidate related queries
          await utils.workouts.getRecent.invalidate();

          // Reduce queue size
          setSyncQueueSize(prev => Math.max(0, prev - 1));

        } catch (err) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as Error).message)
              : "Network or server error";

          // Update session with error
          updateLocalSession(item.session.localId, {
            status: "sync_failed",
            lastSyncError: message,
          });

          const attempts = item.attempts + 1;
          updateSyncItem(item.id, { attempts });

          if (attempts >= 5) {
            // Give up on this item
            setLastSyncError(
              "Some workout sessions failed to sync after multiple attempts.",
            );
          } else {
            // Wait with exponential backoff then requeue
            await sleep(backoff(item.attempts));
            requeueSyncItem({ ...item, attempts });
          }

          // Exit loop to avoid tight retry loops
          break;
        }
      }

      setSyncStatus("done");
    } catch {
      setSyncStatus("error");
      setLastSyncError("Unexpected error while syncing workout sessions.");
    } finally {
      isSyncingRef.current = false;
      // Small debounce before returning to idle
      setTimeout(() => setSyncStatus("idle"), 500);
    }
  }, [createServerSession, utils.workouts.getRecent]);

  /**
   * Navigate to workout session (local ID based)
   */
  const navigateToSession = useCallback(
    (localId: string) => {
      const session = getLocalSession(localId);
      if (!session) return;

      if (session.serverSessionId) {
        // Use server ID if available
        router.push(`/workout/session/${session.serverSessionId}`);
      } else {
        // Use local ID for offline sessions
        router.push(`/workout/session/local/${localId}`);
      }
    },
    [router],
  );

  // Auto-sync when coming back online
  useEffect(() => {
    const onOnline = () => {
      if (getSyncQueueLength() > 0) {
        void syncPendingSessions();
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "offline.sync_queue.v1") {
        setSyncQueueSize(getSyncQueueLength());
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("storage", onStorage);
    };
  }, [syncPendingSessions]);

  return {
    // Actions
    createWorkoutSession,
    syncPendingSessions,
    navigateToSession,
    refreshSyncCount,
    
    // State
    syncQueueSize,
    syncStatus,
    lastSyncError,
    isSyncing: syncStatus === "syncing",
    
    // Utilities
    getSession: getLocalSession,
  };
}
