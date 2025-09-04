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
      expect(() => {
        checkRateLimit(userId, endpoint, limit, windowMs);
      }).not.toThrow();
    });
  });

  describe("cleanupExpiredRateLimits", () => {
    it("should call cleanupExpiredRateLimits function", async () => {
      expect(() => {
        cleanupExpiredRateLimits();
      }).not.toThrow();
    });
  });
});
