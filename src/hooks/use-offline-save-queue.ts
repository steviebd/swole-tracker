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
  type SaveWorkoutPayload,
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

export function useOfflineSaveQueue() {
  const [queueSize, setQueueSize] = useState<number>(() =>
    typeof window !== "undefined" ? getQueueLength() : 0,
  );
  const [status, setStatus] = useState<FlushStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const isFlushingRef = useRef(false);

  const utils = api.useUtils();
  const saveWorkout = api.workouts.save.useMutation();

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

    try {
      pruneExhausted();

      // Process FIFO
      // We will drain the queue in this session unless errors request a retry
      while (true) {
        const item = dequeue();
        if (!item) break;

        if (item.type !== "workout_save") {
          // Unknown item; skip
          continue;
        }

        try {
          // Attempt to save
          await saveWorkout.mutateAsync({
            sessionId: item.payload.sessionId,
            exercises: item.payload.exercises,
          });

          // On success, invalidate recent workouts etc.
          await utils.workouts.getRecent.invalidate();

          // Reduce count
          setQueueSize((n) => Math.max(0, n - 1));
        } catch (err) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as Error).message)
              : "Network or server error";

          // Network-ish failures: requeue with backoff
          const attempts = item.attempts + 1;
          updateItem(item.id, { attempts, lastError: message });

          if (attempts >= 8) {
            // Give up on this item for now; keep it in storage but don't requeue to front
            setLastError(
              "Some items failed to sync after multiple attempts. See Sync Indicator for details.",
            );
          } else {
            // Wait with exponential backoff then requeue at front for immediate retry later
            await sleep(backoff(item.attempts));
            requeueFront({ ...item, attempts });
          }

          // Exit loop for now to avoid tight retry loops; let user trigger flush again
          break;
        }
      }

      setStatus("done");
    } catch (e) {
      setStatus("error");
      setLastError("Unexpected error while flushing queue.");
    } finally {
      isFlushingRef.current = false;
      // Small debounce before returning to idle
      setTimeout(() => setStatus("idle"), 500);
    }
  }, [saveWorkout, utils.workouts.getRecent]);

  // Auto-flush when coming back online
  useEffect(() => {
    const onOnline = () => {
      if (getQueueLength() > 0) {
        void flush();
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "offline.queue.v1") {
        setQueueSize(getQueueLength());
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("storage", onStorage);
    };
  }, [flush]);

  const items = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getQueue();
  }, [queueSize]);

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
