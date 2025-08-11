import { describe, it, expect, beforeEach, vi } from "vitest";

// JSDOM provides window + localStorage, ensure it's clean and stable
function resetStorage() {
  window.localStorage.clear();
}

describe("offline-workout-sessions", () => {
  beforeEach(() => {
    resetStorage();
    vi.useFakeTimers();
    // Start with a stable time for deterministic createdAt/updatedAt assertions when needed
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
  });

  it("returns empty sessions and queue when nothing stored", async () => {
    const mod = await import("~/lib/offline-workout-sessions");
    expect(mod.getAllLocalSessions()).toEqual([]);
    expect(mod.getSyncQueue()).toEqual([]);
    expect(mod.getSyncQueueLength()).toBe(0);
  });

  it("createLocalWorkoutSession creates a session with correct properties", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const templateId = 1;
    const workoutDate = new Date("2024-01-01T10:00:00.000Z");
    const session = mod.createLocalWorkoutSession(templateId, workoutDate);

    expect(session.localId).toMatch(/^ws_[a-z0-9]+_[a-z0-9]+$/);
    expect(session.templateId).toBe(templateId);
    expect(session.workoutDate).toEqual(workoutDate);
    expect(session.status).toBe("local");
    expect(session.createdAt).toBe(1704067200000); // 2024-01-01T00:00:00.000Z
    expect(session.updatedAt).toBe(1704067200000);
    expect(session.syncAttempts).toBe(0);
    expect(session.serverSessionId).toBeUndefined();
    expect(session.lastSyncError).toBeUndefined();

    // Check that it's stored
    const sessions = mod.getAllLocalSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual(session);
  });

  it("createLocalWorkoutSession adds session to sync queue", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session = mod.createLocalWorkoutSession(1);

    const queue = mod.getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.type).toBe("workout_session_create");
    expect(queue[0]?.session).toEqual(session);
    expect(queue[0]?.attempts).toBe(0);
    expect(queue[0]?.id).toMatch(/^ws_[a-z0-9]+_[a-z0-9]+$/);
    expect(mod.getSyncQueueLength()).toBe(1);
  });

  it("createLocalWorkoutSession includes telemetry when provided", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session = mod.createLocalWorkoutSession(1, new Date(), {
      theme_used: "dark",
      device_type: "ios",
      perf_metrics: { load_time: 100 },
    });

    expect(session.theme_used).toBe("dark");
    expect(session.device_type).toBe("ios");
    expect(session.perf_metrics).toEqual({ load_time: 100 });
  });

  it("getLocalSession retrieves session by localId", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session = mod.createLocalWorkoutSession(1);
    const retrieved = mod.getLocalSession(session.localId);
    expect(retrieved).toEqual(session);
  });

  it("getLocalSession returns null for non-existent session", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const retrieved = mod.getLocalSession("non-existent");
    expect(retrieved).toBeNull();
  });

  it("getSessionByServerId retrieves session by serverSessionId", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session = mod.createLocalWorkoutSession(1);
    mod.updateLocalSession(session.localId, { serverSessionId: 123 });

    const retrieved = mod.getSessionByServerId(123);
    expect(retrieved).toEqual({
      ...session,
      serverSessionId: 123,
      updatedAt: expect.any(Number),
    });
  });

  it("getSessionByServerId returns null for non-existent server session", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const retrieved = mod.getSessionByServerId(999);
    expect(retrieved).toBeNull();
  });

  it("updateLocalSession updates session properties", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session = mod.createLocalWorkoutSession(1);
    const originalUpdatedAt = session.updatedAt;

    // Advance time to see updatedAt change
    vi.setSystemTime(new Date("2024-01-01T00:05:00.000Z"));
    mod.updateLocalSession(session.localId, {
      status: "syncing",
      syncAttempts: 1,
    });

    const updated = mod.getLocalSession(session.localId)!;
    expect(updated.status).toBe("syncing");
    expect(updated.syncAttempts).toBe(1);
    expect(updated.updatedAt).toBeGreaterThan(originalUpdatedAt);
  });

  it("updateLocalSession does nothing for non-existent session", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    // Should not throw
    expect(() => {
      mod.updateLocalSession("non-existent", { status: "syncing" });
    }).not.toThrow();

    expect(mod.getAllLocalSessions()).toEqual([]);
  });

  it("markSessionSynced updates session with server ID and status", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session = mod.createLocalWorkoutSession(1);
    mod.markSessionSynced(session.localId, 456);

    const updated = mod.getLocalSession(session.localId)!;
    expect(updated.serverSessionId).toBe(456);
    expect(updated.status).toBe("synced");
    expect(updated.syncAttempts).toBe(0);
    expect(updated.lastSyncError).toBeUndefined();
  });

  it("dequeueSyncItem removes and returns item from front of queue", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session1 = mod.createLocalWorkoutSession(1);
    const session2 = mod.createLocalWorkoutSession(2);

    const item1 = mod.dequeueSyncItem();
    expect(item1?.session.localId).toBe(session1.localId);

    const item2 = mod.dequeueSyncItem();
    expect(item2?.session.localId).toBe(session2.localId);

    expect(mod.dequeueSyncItem()).toBeNull();
    expect(mod.getSyncQueueLength()).toBe(0);
  });

  it("updateSyncItem updates sync queue item properties", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session = mod.createLocalWorkoutSession(1);
    const item = mod.getSyncQueue()[0]!;

    const originalUpdatedAt = item.updatedAt;

    // Advance time to see updatedAt change
    vi.setSystemTime(new Date("2024-01-01T00:05:00.000Z"));
    mod.updateSyncItem(item.id, {
      attempts: 2,
      lastError: "network error",
    });

    const updatedItem = mod.getSyncQueue()[0]!;
    expect(updatedItem.attempts).toBe(2);
    expect(updatedItem.lastError).toBe("network error");
    expect(updatedItem.updatedAt).toBeGreaterThan(originalUpdatedAt);
  });

  it("updateSyncItem does nothing for non-existent item", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    // Should not throw
    expect(() => {
      mod.updateSyncItem("non-existent", { attempts: 2 });
    }).not.toThrow();

    expect(mod.getSyncQueue()).toEqual([]);
  });

  it("requeueSyncItem adds item to front of queue", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    const session1 = mod.createLocalWorkoutSession(1);
    const session2 = mod.createLocalWorkoutSession(2);

    // Dequeue first item
    const item = mod.dequeueSyncItem()!;

    // Requeue it
    mod.requeueSyncItem(item);

    const queue = mod.getSyncQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0]?.id).toBe(item.id);
    expect(queue[1]?.session.localId).toBe(session2.localId);
  });

  it("pruneExhaustedSyncItems removes items with max attempts", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    // Create three sessions
    const session1 = mod.createLocalWorkoutSession(1);
    const session2 = mod.createLocalWorkoutSession(2);
    const session3 = mod.createLocalWorkoutSession(3);

    const items = mod.getSyncQueue();
    expect(items).toHaveLength(3);

    // Update attempts to different levels
    mod.updateSyncItem(items[0]!.id, { attempts: 3 }); // kept
    mod.updateSyncItem(items[1]!.id, { attempts: 5 }); // pruned (MAX_SYNC_ATTEMPTS = 5)
    mod.updateSyncItem(items[2]!.id, { attempts: 7 }); // pruned

    mod.pruneExhaustedSyncItems();

    const remaining = mod.getSyncQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.attempts).toBe(3);
    expect(remaining[0]?.session.localId).toBe(session1.localId);
  });

  it("clearAllLocalData removes all stored data", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    mod.createLocalWorkoutSession(1);
    expect(mod.getAllLocalSessions()).toHaveLength(1);
    expect(mod.getSyncQueue()).toHaveLength(1);

    mod.clearAllLocalData();

    expect(mod.getAllLocalSessions()).toEqual([]);
    expect(mod.getSyncQueue()).toEqual([]);
  });

  it("is resilient to malformed localStorage values", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    // Put non-JSON in sessions
    window.localStorage.setItem("offline.workout_sessions.v1", "not-json");
    expect(mod.getAllLocalSessions()).toEqual([]);

    // Put JSON that is not an array in sessions
    window.localStorage.setItem(
      "offline.workout_sessions.v1",
      JSON.stringify({ hello: "world" })
    );
    expect(mod.getAllLocalSessions()).toEqual([]);

    // Put non-JSON in queue
    window.localStorage.setItem("offline.sync_queue.v1", "not-json");
    expect(mod.getSyncQueue()).toEqual([]);

    // Put JSON that is not an array in queue
    window.localStorage.setItem(
      "offline.sync_queue.v1",
      JSON.stringify({ hello: "world" })
    );
    expect(mod.getSyncQueue()).toEqual([]);
  });

  it("handles Date objects correctly when reading from storage", async () => {
    const mod = await import("~/lib/offline-workout-sessions");

    // Create a session
    const session = mod.createLocalWorkoutSession(1, new Date("2024-06-15T10:30:00.000Z"));

    // Simulate page reload by re-importing the module
    vi.resetModules();
    const mod2 = await import("~/lib/offline-workout-sessions");

    const retrieved = mod2.getLocalSession(session.localId)!;
    expect(retrieved.workoutDate).toEqual(new Date("2024-06-15T10:30:00.000Z"));
    expect(retrieved.workoutDate).toBeInstanceOf(Date);

    // Also check for sync queue items
    const queue = mod2.getSyncQueue();
    expect(queue[0]?.session.workoutDate).toEqual(new Date("2024-06-15T10:30:00.000Z"));
    expect(queue[0]?.session.workoutDate).toBeInstanceOf(Date);
  });

  it("works correctly when window is undefined (server-side)", async () => {
    // Save original window
    const originalWindow = (globalThis as any).window;

    // Remove window to simulate server-side
    delete (globalThis as any).window;

    const mod = await import("~/lib/offline-workout-sessions");

    // These should not throw and should return empty arrays
    expect(mod.getAllLocalSessions()).toEqual([]);
    expect(mod.getSyncQueue()).toEqual([]);
    expect(mod.getSyncQueueLength()).toBe(0);

    // This should not throw
    expect(() => {
      mod.clearAllLocalData();
    }).not.toThrow();

    // Restore window
    (globalThis as any).window = originalWindow;
  });
});