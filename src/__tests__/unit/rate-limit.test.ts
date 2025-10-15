import { describe, it, expect, vi, beforeEach } from "vitest";

// Import after mocking
import { checkRateLimit, cleanupExpiredRateLimits } from "~/lib/rate-limit";

describe("rate-limit", () => {
  const userId = "user-123";
  const endpoint = "/api/whoop/sync";
  const limit = 10;
  const windowMs = 60 * 60 * 1000; // 1 hour

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkRateLimit", () => {
    it("should call checkRateLimit function", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => Promise.resolve()),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve()),
          })),
        })),
      } as any;
      const result = await checkRateLimit(
        mockDb,
        userId,
        endpoint,
        limit,
        windowMs,
      );
      expect(result).toEqual({
        allowed: true,
        remaining: 9,
        resetTime: expect.any(Date),
      });
    });
  });

  describe("cleanupExpiredRateLimits", () => {
    it("should call cleanupExpiredRateLimits function", async () => {
      const mockDb = {
        delete: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      } as any;
      const result = await cleanupExpiredRateLimits(mockDb);
      expect(result).toBeUndefined();
    });
  });
});
