import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// JSDOM provides window + localStorage, ensure it's clean and stable
function resetStorage() {
  window.localStorage.clear();
}

describe("offline-queue", () => {
  beforeEach(() => {
    resetStorage();
    // Note: removed timers since they're causing issues in vitest
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty queue and length=0 when nothing stored", async () => {
    const mod = await import("~/lib/offline-queue");
    expect(mod.getQueue()).toEqual([]);
    expect(mod.getQueueLength()).toBe(0);
  });

  it("enqueueWorkoutSave persists a new item and returns its id", async () => {
    const mod = await import("~/lib/offline-queue");

    const id = mod.enqueueWorkoutSave({
      sessionId: 1,
      exercises: [
        {
          exerciseName: "Bench Press",
          unit: "kg",
          sets: [{ id: "s1", weight: 60, reps: 8, unit: "kg" }],
        },
      ],
    });

    expect(typeof id).toBe("string");
    const q = mod.getQueue();
    expect(q).toHaveLength(1);
    expect(q[0]?.id).toBe(id);
    expect(q[0]?.type).toBe("workout_save");
    expect(q[0]?.attempts).toBe(0);
    expect(q[0]?.payload.sessionId).toBe(1);
  });

  it("dequeue removes from front (FIFO) and returns the item", async () => {
    const mod = await import("~/lib/offline-queue");

    const first = mod.enqueueWorkoutSave({
      sessionId: 1,
      exercises: [
        {
          exerciseName: "Squat",
          unit: "kg",
          sets: [{ id: "s1", weight: 100, reps: 5, unit: "kg" }],
        },
      ],
    });
    const second = mod.enqueueWorkoutSave({
      sessionId: 2,
      exercises: [
        {
          exerciseName: "Deadlift",
          unit: "kg",
          sets: [{ id: "s1", weight: 140, reps: 3, unit: "kg" }],
        },
      ],
    });

    const a = mod.dequeue();
    expect(a?.id).toBe(first);
    const b = mod.dequeue();
    expect(b?.id).toBe(second);
    expect(mod.getQueueLength()).toBe(0);
    // dequeuing empty queue returns undefined
    expect(mod.dequeue()).toBeUndefined();
  });

  it("updateItem patches an existing item and bumps updatedAt, no-ops for unknown id", async () => {
    const mod = await import("~/lib/offline-queue");

    const id = mod.enqueueWorkoutSave({
      sessionId: 1,
      exercises: [
        {
          exerciseName: "Pull Up",
          unit: "kg",
          sets: [{ id: "s1", reps: 10, unit: "kg" }],
        },
      ],
    });

    const before = mod.getQueue().find((i) => i.id === id)!;
    expect(before.attempts).toBe(0);

    // advance time to see updatedAt change
    vi.setSystemTime(new Date("2024-01-01T00:05:00.000Z"));
    mod.updateItem(id, { attempts: 2, lastError: "network" });

    const after = mod.getQueue().find((i) => i.id === id)!;
    expect(after.attempts).toBe(2);
    expect(after.lastError).toBe("network");
    expect(after.updatedAt).toBeGreaterThan(before.updatedAt);

    // unknown id should not throw nor change queue
    const snapshot = JSON.stringify(mod.getQueue());
    mod.updateItem("missing", { attempts: 99 });
    expect(JSON.stringify(mod.getQueue())).toBe(snapshot);
  });

  it("requeueFront puts an item back to the front for retry", async () => {
    const mod = await import("~/lib/offline-queue");

    const id1 = mod.enqueueWorkoutSave({
      sessionId: 1,
      exercises: [
        {
          exerciseName: "OHP",
          unit: "kg",
          sets: [{ id: "s1", weight: 40, reps: 8, unit: "kg" }],
        },
      ],
    });
    const id2 = mod.enqueueWorkoutSave({
      sessionId: 2,
      exercises: [
        {
          exerciseName: "Row",
          unit: "kg",
          sets: [{ id: "s1", weight: 60, reps: 10, unit: "kg" }],
        },
      ],
    });

    // pop one, then requeue it to the front
    const item = mod.dequeue()!;
    expect(item.id).toBe(id1);

    // simulate an attempt increment externally before requeue
    item.attempts += 1;
    mod.requeueFront(item);

    const q = mod.getQueue();
    expect(q[0]?.id).toBe(id1);
    expect(q[1]?.id).toBe(id2);
  });

  it("pruneExhausted removes items whose attempts >= MAX_ATTEMPTS", async () => {
    const mod = await import("~/lib/offline-queue");

    // Enqueue three, then force attempts to differing levels
    const ids = [
      mod.enqueueWorkoutSave({
        sessionId: 11,
        exercises: [
          {
            exerciseName: "A",
            unit: "kg",
            sets: [{ id: "s1", reps: 5, unit: "kg" }],
          },
        ],
      }),
      mod.enqueueWorkoutSave({
        sessionId: 22,
        exercises: [
          {
            exerciseName: "B",
            unit: "kg",
            sets: [{ id: "s1", reps: 5, unit: "kg" }],
          },
        ],
      }),
      mod.enqueueWorkoutSave({
        sessionId: 33,
        exercises: [
          {
            exerciseName: "C",
            unit: "kg",
            sets: [{ id: "s1", reps: 5, unit: "kg" }],
          },
        ],
      }),
    ];

    // attempts: 7 (kept), 8 (pruned), 9 (pruned)
    mod.updateItem(ids[0]!, { attempts: 7 });
    mod.updateItem(ids[1]!, { attempts: 8 });
    mod.updateItem(ids[2]!, { attempts: 9 });

    mod.pruneExhausted();

    const q = mod.getQueue();
    expect(q.map((i) => i.attempts)).toEqual([7]);
    expect(q.map((i) => i.payload.sessionId)).toEqual([11]);
  });

  it("clearQueue empties persisted queue", async () => {
    const mod = await import("~/lib/offline-queue");
    mod.enqueueWorkoutSave({
      sessionId: 1,
      exercises: [
        {
          exerciseName: "Bench",
          unit: "kg",
          sets: [{ id: "s1", reps: 5, unit: "kg" }],
        },
      ],
    });
    expect(mod.getQueueLength()).toBe(1);
    mod.clearQueue();
    expect(mod.getQueue()).toEqual([]);
    expect(mod.getQueueLength()).toBe(0);
  });

  it("is resilient to malformed localStorage values", async () => {
    const mod = await import("~/lib/offline-queue");

    // Put non-JSON
    window.localStorage.setItem("offline.queue.v1", "not-json");
    expect(mod.getQueue()).toEqual([]);

    // Put JSON that is not an array
    window.localStorage.setItem(
      "offline.queue.v1",
      JSON.stringify({ hello: "world" }),
    );
    expect(mod.getQueue()).toEqual([]);

    // Put an empty array string
    window.localStorage.setItem("offline.queue.v1", JSON.stringify([]));
    expect(mod.getQueue()).toEqual([]);
  });
});
