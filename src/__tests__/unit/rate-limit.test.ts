import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// Ensure required public env vars exist BEFORE importing any module that may load src/env.js
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

// Mock the database to avoid actual DB connections
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

// Mock the schema
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

// Mock drizzle-orm helpers
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<any>("drizzle-orm");
  return {
    ...actual,
    eq: (..._args: any[]) => ({}),
    and: (..._args: any[]) => ({}),
  };
});

/**
 * Import the module under test lazily after setting env, to avoid early env validation
 * via src/env.js. Using dynamic import defers module evaluation until after setup.
 */
let rateLimit: any;
beforeAll(async () => {
  // Load rate-limit in a Node-like context to avoid client-side env guard.
  const mod = await import("~/lib/rate-limit");
  rateLimit = mod;
});

describe("rate-limit utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset method chains to be chainable (like in the working test)
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

  it("should provide rate limit functions", async () => {
    expect(rateLimit).toBeTruthy();
    const keys = Object.keys(rateLimit);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys).toContain("checkRateLimit");
    expect(keys).toContain("cleanupExpiredRateLimits");
  });

  it("should have callable rate limit functions", async () => {
    // Set up mock for the select().from().where() chain to resolve with empty array
    let whereResolve: (v: any) => void = () => {};
    const wherePromise = new Promise<any[]>((res) => {
      whereResolve = res;
    });
    mockDb.where.mockReturnValueOnce(wherePromise);
    
    // Resolve the where call with empty array (no existing rate limit record)
    whereResolve([]);
    
    expect(typeof rateLimit.checkRateLimit).toBe("function");
    expect(typeof rateLimit.cleanupExpiredRateLimits).toBe("function");
    
    // Test that the functions can be called without errors
    const result = await rateLimit.checkRateLimit("user1", "/test", 10, 60000);
    expect(result).toBeDefined();
    expect(result.allowed).toBe(true);
    
    await expect(rateLimit.cleanupExpiredRateLimits()).resolves.not.toThrow();
  });
});
