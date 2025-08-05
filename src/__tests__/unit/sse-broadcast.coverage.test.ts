import { describe, it, expect, vi, beforeEach } from "vitest";

describe("lib/sse-broadcast.ts coverage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // Helper to create a mock WritableStream writer
  function makeWriter(collected: Uint8Array[], failOnWrite = false) {
    return {
      write: vi.fn(async (chunk: Uint8Array) => {
        if (failOnWrite) throw new Error("dead");
        collected.push(chunk);
      }),
      close: vi.fn(async () => {}),
    } as unknown as WritableStreamDefaultWriter<Uint8Array>;
  }

  it("adds/removes connections and broadcasts per-user, cleaning up dead writers", async () => {
    const mod = await import("~/lib/sse-broadcast");
    const { addConnection, removeConnection, broadcastWorkoutUpdate } = mod as typeof import("~/lib/sse-broadcast");

    const userA = "user_a";
    const userB = "user_b";

    const collectedA1: Uint8Array[] = [];
    const collectedA2: Uint8Array[] = [];
    const collectedB1: Uint8Array[] = [];

    const writerA1 = makeWriter(collectedA1);
    const writerA2 = makeWriter(collectedA2, true); // simulate dead writer
    const writerB1 = makeWriter(collectedB1);

    addConnection(userA, writerA1);
    addConnection(userA, writerA2);
    addConnection(userB, writerB1);

    // Broadcast to userA only
    await broadcastWorkoutUpdate(userA, { id: 1, reps: 10 });

    // writerA1 receives, writerA2 errors and is cleaned up, userB untouched
    expect((writerA1 as any).write).toHaveBeenCalledTimes(1);
    expect((writerA2 as any).write).toHaveBeenCalledTimes(1);
    expect((writerA2 as any).close).toHaveBeenCalledTimes(1);
    expect((writerB1 as any).write).not.toHaveBeenCalled();

    // Verify payload shape contains expected event fields
    const decoder = new TextDecoder();
    const message = decoder.decode(collectedA1[0]);
    expect(message).toContain("data:");
    expect(message).toContain("workout-updated");
    expect(message).toContain('"workout":{"id":1,"reps":10}');

    // Remove last active writer for userA and ensure map cleanup does not throw
    removeConnection(userA, writerA1);
    // Subsequent broadcast to empty A connections is a no-op
    await broadcastWorkoutUpdate(userA, { id: 2 });
    // userB still independent
    await broadcastWorkoutUpdate(userB, { id: 3 });
    expect((writerB1 as any).write).toHaveBeenCalledTimes(1);
  });

  it("no-ops when broadcasting to user with no connections", async () => {
    const mod = await import("~/lib/sse-broadcast");
    const { broadcastWorkoutUpdate } = mod as typeof import("~/lib/sse-broadcast");
    // should not throw
    await broadcastWorkoutUpdate("nobody", { anything: true });
    expect(true).toBe(true);
  });
});
