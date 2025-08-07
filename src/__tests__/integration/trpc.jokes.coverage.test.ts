import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";
import { dailyJokes } from "~/server/db/schema";

// Ensure PUBLIC env is present and AI key absent to use fallback logic
beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_ENV = "test";
  delete process.env.VERCEL_AI_GATEWAY_API_KEY;
});

describe("tRPC jokes router additional coverage", () => {
  it("generateNew returns fallback joke when AI gateway is not configured", async () => {
    const user = createMockUser({ id: "user_joke_1" })!;

    // mock select for memory reads
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([] as { joke: string }[]),
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([] as unknown[]),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([] as unknown[]),
      }),
    });

    const caller = await buildCaller({ db, user });

    const res = await caller.jokes.generateNew();

    expect(typeof res.joke).toBe("string");
    expect(res.joke).toContain("Vercel AI Gateway not configured");
    expect(res.isFromCache).toBe(false);
  });

  it("getCurrent handles case when no AI gateway is configured", async () => {
    const user = createMockUser({ id: "user_joke_2" })!;

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([] as { joke: string }[]),
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([] as unknown[]),
      }),
    });

    const caller = await buildCaller({ db, user });

    const res = await caller.jokes.getCurrent();

    expect(typeof res.joke).toBe("string");
    expect(res.joke).toContain("Vercel AI Gateway not configured");
    expect(res.isFromCache).toBe(false);
  });

  it("generateNew handles case when no AI gateway is configured", async () => {
    const user = createMockUser({ id: "user_joke_3" })!;

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([] as { joke: string }[]),
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([] as unknown[]),
      }),
    });

    const caller = await buildCaller({ db, user });

    const res = await caller.jokes.generateNew();

    expect(typeof res.joke).toBe("string");
    expect(res.joke).toContain("Vercel AI Gateway not configured");
    expect(res.isFromCache).toBe(false);
  });

  it("clearCache handles case when no jokes exist to delete", async () => {
    const user = createMockUser({ id: "user_joke_4" })!;
    
    const where = vi.fn().mockResolvedValue([]);
    const del = vi.fn().mockReturnValue({ where });

    const db = createMockDb({
      delete: del,
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([] as unknown[]),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([] as unknown[]),
      }),
    });

    const caller = await buildCaller({ db, user });

    const res = await caller.jokes.clearCache();

    expect(res).toEqual({ success: true });
    expect(del).toHaveBeenCalledWith(dailyJokes);
    expect(where).toHaveBeenCalled();
  });

  it("auth required for generateNew", async () => {
    const db = createMockDb({});
    const caller = await buildCaller({ db, user: null });

    await expect(caller.jokes.generateNew()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("auth required for clearCache", async () => {
    const db = createMockDb({});
    const caller = await buildCaller({ db, user: null });

    await expect(caller.jokes.clearCache()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
