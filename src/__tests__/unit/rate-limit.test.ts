import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  getRateLimitStatus,
  cleanupExpiredRateLimits,
} from "~/lib/rate-limit";

// Mock KV interface
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
};

// Mock globalThis to provide RATE_LIMIT_KV
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).RATE_LIMIT_KV = mockKV;
});

describe("checkRateLimit function", () => {
  it("should allow first request", async () => {
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);

    const result = await checkRateLimit("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetTime).toBeInstanceOf(Date);
    expect(mockKV.put).toHaveBeenCalled();
  });

  it("should increment existing request count", async () => {
    const existingRecord = {
      requests: 2,
      windowStart: Date.now(),
      createdAt: Date.now(),
    };
    mockKV.get.mockResolvedValue(JSON.stringify(existingRecord));
    mockKV.put.mockResolvedValue(undefined);

    const result = await checkRateLimit("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 5 - 3 = 2
    expect(mockKV.put).toHaveBeenCalled();
  });

  it("should block request when limit exceeded", async () => {
    const existingRecord = {
      requests: 5,
      windowStart: Date.now(),
      createdAt: Date.now(),
    };
    mockKV.get.mockResolvedValue(JSON.stringify(existingRecord));

    const result = await checkRateLimit("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });

  it("should handle KV errors gracefully", async () => {
    mockKV.get.mockRejectedValue(new Error("KV Error"));

    const result = await checkRateLimit("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should create proper KV key", async () => {
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);

    await checkRateLimit("user1", "test-endpoint", 5);

    const putCall = mockKV.put.mock.calls[0];
    if (putCall) {
      expect(putCall[0]).toMatch(/^rate_limit:user1:test-endpoint:\d+$/);
      expect(putCall[2]).toHaveProperty("expirationTtl");
    }
  });
});

describe("getRateLimitStatus function", () => {
  it("should return full limit for new user", async () => {
    mockKV.get.mockResolvedValue(null);

    const result = await getRateLimitStatus("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(result.resetTime).toBeInstanceOf(Date);
  });

  it("should return current status for existing user", async () => {
    const existingRecord = {
      requests: 3,
      windowStart: Date.now(),
      createdAt: Date.now(),
    };
    mockKV.get.mockResolvedValue(JSON.stringify(existingRecord));

    const result = await getRateLimitStatus("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should return blocked status when limit exceeded", async () => {
    const existingRecord = {
      requests: 5,
      windowStart: Date.now(),
      createdAt: Date.now(),
    };
    mockKV.get.mockResolvedValue(JSON.stringify(existingRecord));

    const result = await getRateLimitStatus("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });

  it("should handle KV errors gracefully", async () => {
    mockKV.get.mockRejectedValue(new Error("KV Error"));

    const result = await getRateLimitStatus("user1", "test-endpoint", 5);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });
});

describe("cleanupExpiredRateLimits function", () => {
  it("should be a no-op function", async () => {
    // This function is now a no-op since KV auto-expires
    await expect(cleanupExpiredRateLimits()).resolves.toBeUndefined();
  });
});

describe("Rate limiting with different windows", () => {
  it("should work with custom window size", async () => {
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);

    const customWindowMs = 30 * 60 * 1000; // 30 minutes
    const result = await checkRateLimit(
      "user1",
      "test-endpoint",
      5,
      customWindowMs,
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);

    // Verify TTL is calculated correctly for custom window
    const putCall = mockKV.put.mock.calls[0];
    if (putCall) {
      const expectedTtl = Math.ceil(customWindowMs / 1000) + 60;
      expect(putCall[2].expirationTtl).toBe(expectedTtl);
    }
  });
});

describe("Rate limit key generation", () => {
  it("should generate consistent keys for same parameters", async () => {
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);

    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const windowStart = Math.floor(now / windowMs) * windowMs;

    await checkRateLimit("user1", "test-endpoint", 5, windowMs);

    const putCall = mockKV.put.mock.calls[0];
    if (putCall) {
      const expectedKey = `rate_limit:user1:test-endpoint:${windowStart}`;
      expect(putCall[0]).toBe(expectedKey);
    }
  });

  it("should generate different keys for different users", async () => {
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);

    await checkRateLimit("user1", "test-endpoint", 5);
    await checkRateLimit("user2", "test-endpoint", 5);

    const call1 = mockKV.put.mock.calls[0];
    const call2 = mockKV.put.mock.calls[1];

    if (call1 && call2) {
      expect(call1[0]).not.toBe(call2[0]);
      expect(call1[0]).toContain("user1");
      expect(call2[0]).toContain("user2");
    }
  });

  it("should generate different keys for different endpoints", async () => {
    mockKV.get.mockResolvedValue(null);
    mockKV.put.mockResolvedValue(undefined);

    await checkRateLimit("user1", "endpoint1", 5);
    await checkRateLimit("user1", "endpoint2", 5);

    const call1 = mockKV.put.mock.calls[0];
    const call2 = mockKV.put.mock.calls[1];

    if (call1 && call2) {
      expect(call1[0]).not.toBe(call2[0]);
      expect(call1[0]).toContain("endpoint1");
      expect(call2[0]).toContain("endpoint2");
    }
  });
});
