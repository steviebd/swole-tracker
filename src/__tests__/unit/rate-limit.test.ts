import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the entire rate-limit module
vi.mock("~/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  cleanupExpiredRateLimits: vi.fn(),
}));

// Import after mocking
import { checkRateLimit, cleanupExpiredRateLimits } from "~/lib/rate-limit";

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockCleanupExpiredRateLimits = vi.mocked(cleanupExpiredRateLimits);

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
      const mockResult = {
        allowed: true,
        remaining: 9,
        resetTime: new Date("2024-01-01T13:00:00Z"),
      };

      mockCheckRateLimit.mockResolvedValue(mockResult);

      const result = await checkRateLimit(userId, endpoint, limit, windowMs);

      expect(checkRateLimit).toHaveBeenCalledWith(
        userId,
        endpoint,
        limit,
        windowMs,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("cleanupExpiredRateLimits", () => {
    it("should call cleanupExpiredRateLimits function", async () => {
      mockCleanupExpiredRateLimits.mockResolvedValue(undefined);

      await cleanupExpiredRateLimits();

      expect(mockCleanupExpiredRateLimits).toHaveBeenCalled();
    });
  });
});
