import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { rateLimitMiddleware } from "~/lib/rate-limit-middleware";
import * as rateLimit from "~/lib/rate-limit";
const { checkRateLimit } = rateLimit;

// vi.mock("~/env", () => ({
//   env: {
//     RATE_LIMIT_ENABLED: true,
//   },
// }));

// vi.mock("~/lib/logger", () => ({
//   logger: {
//     debug: vi.fn(),
//     error: vi.fn(),
//   },
//   logSecurityEvent: vi.fn(),
// }));

describe("rateLimitMiddleware", () => {
  const mockCtx = {
    user: { id: "user123" },
    db: {} as any,
    requestId: "req123",
    headers: new Headers(),
  };
  const mockNext = vi.fn(() => Promise.resolve("result"));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(rateLimit, "checkRateLimit");
  });

  it("should call next when rate limit is allowed", async () => {
    (rateLimit.checkRateLimit as any).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetTime: new Date(),
      retryAfter: 0,
    });

    const handler = rateLimitMiddleware({
      endpoint: "test_endpoint",
      limit: 10,
      windowMs: 60000,
    });

    const result = await handler({ ctx: mockCtx, next: mockNext });

    expect(rateLimit.checkRateLimit).toHaveBeenCalledWith(
      mockCtx.db,
      mockCtx.user.id,
      "test_endpoint",
      10,
      60000,
    );
    expect(mockNext).toHaveBeenCalled();
  });

  it("should throw TRPCError when rate limit is exceeded", async () => {
    (rateLimit.checkRateLimit as any).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: new Date(),
      retryAfter: 60,
    });

    const handler = rateLimitMiddleware({
      endpoint: "test_endpoint",
      limit: 10,
      windowMs: 60000,
    });

    await expect(handler({ ctx: mockCtx, next: mockNext })).rejects.toThrow(
      TRPCError,
    );

    expect(rateLimit.checkRateLimit).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should skip rate limiting when no user", async () => {
    const handler = rateLimitMiddleware({
      endpoint: "test_endpoint",
      limit: 10,
      windowMs: 60000,
    });

    const result = await handler({
      ctx: { ...mockCtx, user: null },
      next: mockNext,
    });

    expect(rateLimit.checkRateLimit).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should call next and log error when checkRateLimit throws", async () => {
    (rateLimit.checkRateLimit as any).mockRejectedValue(new Error("DB error"));

    const handler = rateLimitMiddleware({
      endpoint: "test_endpoint",
      limit: 10,
      windowMs: 60000,
    });

    const result = await handler({ ctx: mockCtx, next: mockNext });

    expect(rateLimit.checkRateLimit).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });
});
