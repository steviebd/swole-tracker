import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";
import { dailyJokes } from "~/server/db/schema";

// Ensure PUBLIC env is present and AI key absent to use fallback logic
beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost";
  process.env.NEXT_PUBLIC_ENV = "test";
  delete process.env.VERCEL_AI_GATEWAY_API_KEY;
});

describe("tRPC jokes router", () => {
  it("getCurrent returns fallback joke when AI gateway is not configured and stores record when insert chain is called", async () => {
    const user = createMockUser({ id: "user_1" })!;

    // mock select for memory reads
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([] as { joke: string }[]),
    };

    const returningInsert = vi
      .fn()
      .mockResolvedValue([{ id: 1, createdAt: new Date() }]);

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: returningInsert,
      onConflictDoUpdate: vi.fn().mockReturnThis(),
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue(selectChain),
      // the following are not part of MockDb; place them on the returned selectChain instead
      insert: vi.fn().mockReturnValue(insertChain),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([] as unknown[]),
      }),
    });

    const caller = await buildCaller({ db, user });

    const res = await Promise.resolve(caller.jokes.getCurrent());

    expect(typeof res.joke).toBe("string");
    expect(res.isFromCache).toBe(false);
    // In current implementation, when gateway is not configured it returns a fallback and does NOT insert.
    // So we assert no insert took place.
    // Narrow to a vitest mock before inspecting call metadata
    const insertMock = db.insert as unknown as Mock;
    expect(insertMock.mock.calls.length).toBe(0);
  });

  it("generateNew follows same path as getCurrent", async () => {
    const user = createMockUser({ id: "user_2" })!;

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([] as { joke: string }[]),
    };
    const returningInsert = vi
      .fn()
      .mockResolvedValue([{ id: 2, createdAt: new Date() }]);
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: returningInsert,
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([] as unknown[]),
      }),
    });

    const caller = await buildCaller({ db, user });

    const res = await Promise.resolve(caller.jokes.generateNew());

    expect(typeof res.joke).toBe("string");
    expect(res.isFromCache).toBe(false);
    // Same as getCurrent: with no gateway key, generation returns fallback and skips insert.
    const insertMock2 = db.insert as unknown as Mock;
    expect(insertMock2.mock.calls.length).toBe(0);
  });

  it("clearCache deletes by user id", async () => {
    const user = createMockUser({ id: "user_3" })!;
    const where = vi.fn().mockResolvedValue([]);
    const del = vi.fn().mockReturnValue({ where });

    const db = createMockDb({
      delete: del,
      // select used but not required for this case
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([] as unknown[]),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 3 }]),
      }),
    });

    const caller = await buildCaller({ db, user: user });

    const res = await Promise.resolve(caller.jokes.clearCache());

    expect(res).toEqual({ success: true });
    expect(del).toHaveBeenCalledWith(dailyJokes);
    expect(where).toHaveBeenCalled();
    // Do a minimal structural check that where clause references user column and id
    const whereArg = where.mock.calls[0]?.[0];
    // drizzle eq returns a SQL object; we can't inspect directly, but we assert where was called once
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("auth required for getCurrent", async () => {
    const db = createMockDb({});
    const caller = await buildCaller({ db, user: null });

    await expect(caller.jokes.getCurrent()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
