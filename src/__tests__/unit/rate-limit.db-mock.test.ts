import { describe, it, expect, vi, beforeEach } from "vitest";

// Ensure public env so any transitive env validation passes
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

// Mock the KV storage used by rate-limit.ts
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
};

// Mock the global RATE_LIMIT_KV binding
Object.defineProperty(globalThis, "RATE_LIMIT_KV", {
  value: mockKV,
  writable: true,
  configurable: true,
});

describe("rate-limit (KV behavior simulated)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Reset KV mocks
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);
    mockKV.delete.mockResolvedValue(undefined);
    mockKV.list.mockResolvedValue({ keys: [] });
  });

  it("creates new rate limit record if none exists and allows request", async () => {
    // Mock no existing record
    mockKV.get.mockResolvedValue(null);

    const mod = await import("~/lib/rate-limit");

    const res = await mod.checkRateLimit(
      "userA",
      "/endpoint",
      5,
      1000 * 60 * 60,
    );
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4); // limit - 1 for new record

    // Ensure put called to create record
    expect(mockKV.put).toHaveBeenCalledTimes(1);

    // Debug: log the actual result
    console.log("Actual result:", res);
  });

  it("denies when limit already reached", async () => {
    // Mock existing record with requests === limit
    mockKV.get.mockResolvedValue(
      JSON.stringify({
        requests: 3,
        windowStart: Date.now(),
        createdAt: Date.now(),
      }),
    );

    const mod = await import("~/lib/rate-limit");

    const res = await mod.checkRateLimit(
      "userB",
      "/endpoint",
      3,
      1000 * 60 * 60,
    );
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
    expect(typeof res.retryAfter).toBe("number");
    expect(mockKV.put).toHaveBeenCalledTimes(0); // No update when denied
  });

  it("increments request count when under limit", async () => {
    // Mock existing record with fewer than limit
    mockKV.get.mockResolvedValue(
      JSON.stringify({
        requests: 1,
        windowStart: Date.now(),
        createdAt: Date.now(),
      }),
    );

    const mod = await import("~/lib/rate-limit");

    const res = await mod.checkRateLimit(
      "userC",
      "/endpoint",
      3,
      1000 * 60 * 60,
    );
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(1); // 3 - existing(1) - 1
    expect(mockKV.put).toHaveBeenCalledTimes(1); // Update called
  });

  it("cleanupExpiredRateLimits is now a no-op since KV auto-expires", async () => {
    // Mock some expired keys (though they're not used in the no-op function)
    mockKV.list.mockResolvedValue({
      keys: [
        { name: "rate_limit:user1:endpoint:1000" },
        { name: "rate_limit:user2:endpoint:2000" },
      ],
    });

    const mod = await import("~/lib/rate-limit");

    // The function is now a no-op since KV entries auto-expire with TTL
    await mod.cleanupExpiredRateLimits();

    // Should not call delete since cleanup is no longer needed
    expect(mockKV.delete).toHaveBeenCalledTimes(0);
  });
});
