/**
 * Minimal offline queue persisted to localStorage.
 * Scope: workout save payloads. FIFO with bounded retries.
 */
export type SaveWorkoutPayload = {
  sessionId: number;
  exercises: Array<{
    templateExerciseId?: number;
    exerciseName: string;
    sets: Array<{
      id: string; // ensure id is present to satisfy API input types
      weight?: number;
      reps?: number;
      sets?: number;
      unit: "kg" | "lbs";
    }>;
    unit: "kg" | "lbs";
  }>;
};

type QueueItem = {
  id: string; // uuid-like
  type: "workout_save";
  payload: SaveWorkoutPayload;
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "offline.queue.v1";
const MAX_ATTEMPTS = 8;
export const QUEUE_UPDATED_EVENT = "offline-queue:updated";

function now() {
  return Date.now();
}

function readQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueueItem[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    try {
      window.dispatchEvent(
        new CustomEvent(QUEUE_UPDATED_EVENT, {
          detail: {
            size: items.length,
            items,
          },
        }),
      );
    } catch {
      // Ignore event dispatch failures (e.g., CustomEvent not supported)
    }
  } catch (error) {
    // Silently handle localStorage errors (quota exceeded, etc.)
    console.warn("Failed to write to localStorage:", error);
  }
}

function uuid() {
  return `q_${Math.random().toString(36).slice(2)}_${now().toString(36)}`;
}

export function getQueue(): QueueItem[] {
  return readQueue();
}

export function getQueueLength(): number {
  return readQueue().length;
}

export { readQueue, writeQueue };
export type { QueueItem };

export function enqueueWorkoutSave(payload: SaveWorkoutPayload) {
  const q = readQueue();
  const item: QueueItem = {
    id: uuid(),
    type: "workout_save",
    payload,
    attempts: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  q.push(item);
  writeQueue(q);
  return item.id;
}

export function dequeue(): QueueItem | undefined {
  const q = readQueue();
  const item = q.shift();
  if (item) writeQueue(q);
  return item;
}

export function updateItem(id: string, patch: Partial<QueueItem>) {
  const q = readQueue();
  const idx = q.findIndex((i) => i.id === id);
  if (idx === -1) return;
  q[idx] = { ...q[idx]!, ...patch, updatedAt: now() };
  writeQueue(q);
}

export function requeueFront(item: QueueItem) {
  const q = readQueue();
  q.unshift(item);
  writeQueue(q);
}

export function removeItem(id: string) {
  const q = readQueue();
  const filtered = q.filter((i) => i.id !== id);
  writeQueue(filtered);
}

export function pruneExhausted() {
  const q = readQueue().filter((i) => i.attempts < MAX_ATTEMPTS);
  writeQueue(q);
}

/**
 * Clear queue (for tests/debug).
 */
export function clearQueue() {
  writeQueue([]);
}
