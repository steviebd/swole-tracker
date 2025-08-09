import { describe, it, expect, vi, beforeEach } from "vitest";

// Ensure public env so any transitive env validation passes
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

// We will mock the drizzle db module used by rate-limit.ts
const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("~/server/db", () => {
  return {
    db: mockDb,
  };
});

// We also need to mock the schema symbols used in where clauses
const fakeTable = {
  user_id: {} as any,
  endpoint: {} as any,
  windowStart: {} as any,
  id: {} as any,
};
vi.mock("~/server/db/schema", () => {
  return {
    rateLimits: fakeTable,
  };
});

// drizzle-orm helpers can be no-op passthroughs for our tests
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<any>("drizzle-orm");
  return {
    ...actual,
    eq: (..._args: any[]) => ({}),
    and: (..._args: any[]) => ({}),
  };
});

describe("rate-limit (db behavior simulated)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Reset method chains to be chainable
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue?.([]); // in case previous test set to async
    mockDb.where.mockReturnThis?.();

    // For select().from().where() we want to return array result
    // We'll override per test with mockResolvedValueOnce for the awaited piece.

    mockDb.insert.mockReturnThis();
    mockDb.values.mockResolvedValue(undefined);

    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  it("creates new rate limit record if none exists and allows request", async () => {
    // Arrange: select().from().where() returns []
    // We'll simulate this by making the last call (where) return a Promise of [].
    // Our rate-limit code does: const [existingLimit] = await db.select().from(...).where(...)
    // So we need where to resolve to an array.
    let whereResolve: (v: any) => void = () => {};
    const wherePromise = new Promise<any[]>((res) => {
      whereResolve = res;
    });
    mockDb.where.mockReturnValueOnce(wherePromise);

    const mod = await import("~/lib/rate-limit");

    // Resolve the where call with empty array
    whereResolve([]);

    const res = await mod.checkRateLimit(
      "userA",
      "/endpoint",
      5,
      1000 * 60 * 60,
    );
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);

    // Ensure insert called to create record
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("denies when limit already reached", async () => {
    // Simulate existing record with requests === limit
    let whereResolve: (v: any) => void = () => {};
    const wherePromise = new Promise<any[]>((res) => {
      whereResolve = res;
    });
    mockDb.where.mockReturnValueOnce(wherePromise);

    const mod = await import("~/lib/rate-limit");

    whereResolve([{ id: 1, requests: 3 }]);

    const res = await mod.checkRateLimit(
      "userB",
      "/endpoint",
      3,
      1000 * 60 * 60,
    );
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
    expect(typeof res.retryAfter).toBe("number");
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("increments request count when under limit", async () => {
    // existing record with fewer than limit
    let whereResolve: (v: any) => void = () => {};
    const wherePromise = new Promise<any[]>((res) => {
      whereResolve = res;
    });
    mockDb.where.mockReturnValueOnce(wherePromise);

    const mod = await import("~/lib/rate-limit");

    whereResolve([{ id: 42, requests: 1 }]);

    const res = await mod.checkRateLimit(
      "userC",
      "/endpoint",
      3,
      1000 * 60 * 60,
    );
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(1); // 3 - existing(1) - 1
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.set).toHaveBeenCalled();
  });

  it("cleanupExpiredRateLimits deletes based on windowStart", async () => {
    const mod = await import("~/lib/rate-limit");

    // We do not assert exact timestamp equality; just ensure delete().where() is invoked.
    await mod.cleanupExpiredRateLimits();
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
  });
});
