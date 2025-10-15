"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  enqueueWorkoutSave,
  getQueue,
  getQueueLength,
  dequeue,
  requeueFront,
  updateItem,
  pruneExhausted,
  readQueue,
  writeQueue,
  type SaveWorkoutPayload,
  type QueueItem,
} from "~/lib/offline-queue";
import { api } from "~/trpc/react";

type FlushStatus = "idle" | "flushing" | "error" | "done";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoff(attempt: number) {
  // 500ms * 2^attempt, capped at 8s
  return Math.min(500 * Math.pow(2, attempt), 8000);
}

/**
 * Clean up obsolete localStorage keys from the removed offline system
 */
function cleanupObsoleteStorageKeys() {
  if (typeof window === "undefined") return;

  const keysToRemove = [
    "swole-tracker-offline-queue-v2",
    "swole-tracker-offline-sessions-v1",
    "swole-tracker-sync-status-v1",
  ];

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Ignore errors when cleaning up
      console.debug("Failed to remove obsolete key:", key, error);
    }
  }
}

export function useOfflineSaveQueue() {
  const [queueSize, setQueueSize] = useState<number>(() =>
    typeof window !== "undefined" ? getQueueLength() : 0,
  );
  const [status, setStatus] = useState<FlushStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const isFlushingRef = useRef(false);

  const utils = api.useUtils();
  const saveWorkout = api.workouts.save.useMutation();
  const batchSaveWorkouts = api.workouts.batchSave.useMutation();

  const refreshCount = useCallback(() => {
    if (typeof window === "undefined") return;
    setQueueSize(getQueueLength());
  }, []);

  const enqueue = useCallback((payload: SaveWorkoutPayload) => {
    const id = enqueueWorkoutSave(payload);
    setQueueSize((n) => n + 1);
    return id;
  }, []);

  const flush = useCallback(async () => {
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;
    setStatus("flushing");
    setLastError(null);

    let processedCount = 0;
    let errorCount = 0;

    try {
      pruneExhausted();

      // Collect all valid workout save items for batch processing
      const itemsToProcess: QueueItem[] = [];
      const queueSnapshot = getQueue();
      const processedSessionIds = new Set<number>();

      for (const item of queueSnapshot) {
        if (item.type === "workout_save" && item.attempts < 8) {
          itemsToProcess.push(item);
        }
      }

      if (itemsToProcess.length === 0) {
        setStatus("done");
        return;
      }

      // Process in batches of 5 to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < itemsToProcess.length; i += batchSize) {
        const batch = itemsToProcess.slice(i, i + batchSize);

        try {
          // Prepare batch payload
          const workouts = batch.map((item) => ({
            sessionId: item.payload.sessionId,
            exercises: item.payload.exercises,
          }));

          // Attempt batch save
          await batchSaveWorkouts.mutateAsync({ workouts });

          // Track sessions so downstream caches can refresh
          for (const workout of workouts) {
            processedSessionIds.add(workout.sessionId);
          }

          // On success, remove processed items from queue and invalidate cache
          const processedIds = new Set(batch.map((item) => item.id));
          const currentQueue = readQueue();
          const filteredQueue = currentQueue.filter(
            (q: QueueItem) => !processedIds.has(q.id),
          );
          writeQueue(filteredQueue);

          // Update counts
          setQueueSize((n) => Math.max(0, n - batch.length));
          processedCount += batch.length;

          // Log queue processing metrics
          console.info(
            `Processed offline queue batch: ${batch.length} workouts, queue depth: ${getQueueLength()}`,
          );
        } catch (err) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as Error).message)
              : "Network or server error";

          // For batch failures, increment attempts for each item and requeue
          for (const item of batch) {
            const attempts = item.attempts + 1;
            updateItem(item.id, { attempts, lastError: message });

            if (attempts >= 8) {
              setLastError(
                `Failed to sync workout after ${attempts} attempts: ${message}`,
              );
              errorCount++;
            } else {
              // Requeue failed items at front for retry
              requeueFront({ ...item, attempts });
            }
          }

          // Exit after first batch failure to avoid cascading errors
          break;
        }
      }

      // Log success
      if (processedCount > 0) {
        console.info(`Successfully synced ${processedCount} workout(s)`);

        // Refresh dependent caches so UI reflects synced data
        const invalidations: Array<Promise<unknown>> = [
          utils.workouts.getRecent.invalidate(),
          utils.templates.getAll.invalidate(),
        ];

        for (const sessionId of processedSessionIds) {
          invalidations.push(
            utils.workouts.getById.invalidate({ id: sessionId }),
          );
        }

        try {
          await Promise.all(invalidations);
        } catch (invalidateError) {
          console.warn(
            "Failed to refresh caches after offline sync:",
            invalidateError,
          );
        }

        // Optional: emit PostHog event
        try {
          if (typeof window !== "undefined" && (window as any).posthog) {
            (window as any).posthog.capture("offline_sync_success", {
              itemsProcessed: processedCount,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          // Ignore analytics errors
        }
      }

      setStatus("done");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected error while flushing queue";
      setStatus("error");
      setLastError(message);
      errorCount++;

      // Log error
      console.warn("Queue flush failed:", message);

      // Optional: emit PostHog event for errors
      try {
        if (typeof window !== "undefined" && (window as any).posthog) {
          (window as any).posthog.capture("offline_sync_error", {
            error: message,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        // Ignore analytics errors
      }
    } finally {
      isFlushingRef.current = false;
      // Small debounce before returning to idle
      setTimeout(() => setStatus("idle"), 500);
      refreshCount();
    }
  }, [
    batchSaveWorkouts,
    refreshCount,
    utils.templates.getAll,
    utils.workouts.getById,
    utils.workouts.getRecent,
  ]);

  // Initialize and setup automatic flush triggers
  // The queue automatically flushes when:
  // - App starts (if online and queue has items)
  // - Network comes back online
  // - Tab becomes visible (if online and queue has items)
  // - Every 60 seconds (if online and queue has items)
  // - Manual trigger via flush() function
  useEffect(() => {
    // Clean up obsolete storage keys on initialization
    cleanupObsoleteStorageKeys();

    // Flush on app start if online and queue has items
    if (navigator.onLine && getQueueLength() > 0) {
      void flush();
    }

    const onOnline = () => {
      if (getQueueLength() > 0) {
        void flush();
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden && navigator.onLine && getQueueLength() > 0) {
        void flush();
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "offline.queue.v1") {
        setQueueSize(getQueueLength());
      }
    };

    // Periodic flush every 60 seconds if queue has items and online
    const intervalId = setInterval(() => {
      if (navigator.onLine && getQueueLength() > 0 && !isFlushingRef.current) {
        void flush();
      }
    }, 60000);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
      clearInterval(intervalId);
    };
  }, [flush]);

  const items = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getQueue();
  }, []);

  return {
    queueSize,
    status,
    lastError,
    items,
    enqueue,
    flush,
    refreshCount,
    isFlushing: status === "flushing",
  };
}
