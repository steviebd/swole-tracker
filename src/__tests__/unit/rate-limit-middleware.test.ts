import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  rateLimitMiddleware, 
  asTrpcMiddleware,
  templateRateLimit,
  workoutRateLimit,
  apiCallRateLimit,
  whoopSyncRateLimit
} from "~/lib/rate-limit-middleware";
import { TRPCError } from "@trpc/server";

// Mock env before importing anything that reads it
vi.mock("~/env", () => ({
  env: {
    RATE_LIMIT_ENABLED: true,
    RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR: 1000,
    RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR: 1000,
    RATE_LIMIT_API_CALLS_PER_MINUTE: 1000,
    WHOOP_SYNC_RATE_LIMIT_PER_HOUR: 1000,
    NODE_ENV: "test",
  },
}));
const { env } = await import("~/env");

// Mock the server-side rate-limit module to avoid importing db/env server code
vi.mock("~/lib/rate-limit", () => {
  return {
    checkRateLimit: vi.fn(),
  };
});
const rateLimitLib = await import("~/lib/rate-limit");

// Mock logger to prevent log output during tests
vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
  logSecurityEvent: vi.fn(),
}));

describe("rate-limit-middleware", () => {
  const next = vi.fn(async () => ({ ok: true }));
  const ctxBase = { user: { id: "user_1" }, requestIp: "127.0.0.1" } as any;
  const origRateLimitEnabled = env.RATE_LIMIT_ENABLED;

  beforeEach(() => {
    vi.restoreAllMocks();
    next.mockClear();
    // Reset env to original state
    vi.mocked(env).RATE_LIMIT_ENABLED = origRateLimitEnabled;
  });

  function makeCtx(extra?: Record<string, unknown>) {
    return { ctx: { ...ctxBase, ...extra }, next } as any;
  }

  it("calls next immediately when skipIfDisabled is true and feature is disabled", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "test_skip",
      limit: 10,
      windowMs: 1000,
      skipIfDisabled: true,
    });
    vi.mocked(env).RATE_LIMIT_ENABLED = false;

    const res = await mw(makeCtx({}));

    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("still enforces rate limit when skipIfDisabled is false and feature is disabled", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "test_enforce",
      limit: 10,
      windowMs: 1000,
      skipIfDisabled: false,
    });
    vi.mocked(env).RATE_LIMIT_ENABLED = false;

    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: new Date(Date.now() + 500),
      } as any);

    const res = await mw(makeCtx({}));

    expect(allowSpy).toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("enforces rate limit when enabled and under limit", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "test_endpoint",
      limit: 2,
      windowMs: 1000,
    });
    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: 1,
        resetTime: new Date(Date.now() + 500),
      } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalledWith("user_1", "test_endpoint", 2, 1000);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("logs debug info when rate limit passes", async () => {
    const { logger } = await import("~/lib/logger");
    
    const mw = rateLimitMiddleware({
      endpoint: "debug_endpoint",
      limit: 5,
      windowMs: 1000,
    });
    
    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetTime: new Date(Date.now() + 1000),
    } as any);

    await mw(makeCtx({}));

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Rate limit check passed"),
      expect.objectContaining({
        userId: "user_1",
        endpoint: "debug_endpoint",
      })
    );
  });

  it("blocks when at exact limit and returns structured error", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "at_limit",
      limit: 1,
      windowMs: 1000,
    });
    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: new Date(Date.now() + 1000),
      retryAfter: 1,
    } as any);

    await expect(mw(makeCtx({}))).rejects.toMatchObject({
      message: expect.stringContaining("Rate limit exceeded"),
      code: "TOO_MANY_REQUESTS",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("skips when user missing (middleware returns next)", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "no_identity",
      limit: 5,
      windowMs: 1000,
    });
    const spy = vi.spyOn(rateLimitLib, "checkRateLimit" as any);
    await mw({ ctx: {}, next } as any);
    expect(spy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("skips when user.id is undefined", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "no_user_id",
      limit: 5,
      windowMs: 1000,
    });
    const spy = vi.spyOn(rateLimitLib, "checkRateLimit" as any);
    await mw({ ctx: { user: { id: undefined } }, next } as any);
    expect(spy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("skips when user is null", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "null_user",
      limit: 5,
      windowMs: 1000,
    });
    const spy = vi.spyOn(rateLimitLib, "checkRateLimit" as any);
    await mw({ ctx: { user: null }, next } as any);
    expect(spy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("continues when rate limit check throws non-TRPC error", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "error_endpoint",
      limit: 5,
      windowMs: 1000,
    });
    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockRejectedValue(
      new Error("Database error"),
    );

    const res = await mw(makeCtx({}));
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("continues when rate limit check throws non-TRPC error with null user", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "error_endpoint_null_user",
      limit: 5,
      windowMs: 1000,
    });
    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockRejectedValue(
      new Error("Database error"),
    );

    const res = await mw({ ctx: { user: null }, next } as any);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("logs error when rate limit check throws non-TRPC error", async () => {
    const { logger } = await import("~/lib/logger");
    
    const mw = rateLimitMiddleware({
      endpoint: "error_logging",
      limit: 5,
      windowMs: 1000,
    });
    
    const error = new Error("Database connection failed");
    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockRejectedValue(error);

    const res = await mw(makeCtx({}));
    
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Rate limit check failed"),
      error,
      expect.objectContaining({
        userId: "user_1",
        endpoint: "error_logging",
      })
    );
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("rethrows TRPCError from rate limit check", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "trpc_error",
      limit: 5,
      windowMs: 1000,
    });
    const trpcError = new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Custom error",
    });

    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockRejectedValue(
      trpcError,
    );

    await expect(mw(makeCtx({}))).rejects.toThrow(trpcError);
    expect(next).not.toHaveBeenCalled();
  });

  it("logs error when rate limit check throws non-TRPC error", async () => {
    const { logger } = await import("~/lib/logger");
    
    const mw = rateLimitMiddleware({
      endpoint: "error_logging",
      limit: 5,
      windowMs: 1000,
    });
    
    const error = new Error("Database connection failed");
    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockRejectedValue(error);

    const res = await mw(makeCtx({}));
    
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Rate limit check failed"),
      error,
      expect.objectContaining({
        userId: "user_1",
        endpoint: "error_logging",
      })
    );
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("enforces rate limit when disabled but skipIfDisabled is false", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "always_enforce",
      limit: 5,
      windowMs: 1000,
      skipIfDisabled: false,
    });
    vi.mocked(env).RATE_LIMIT_ENABLED = false;

    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 500),
      } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("should handle large limit values", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "large_limit",
      limit: 1000000,
      windowMs: 1000,
    });
    
    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: 999999,
        resetTime: new Date(Date.now() + 500),
      } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalledWith("user_1", "large_limit", 1000000, 1000);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("should handle small window values", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "small_window",
      limit: 5,
      windowMs: 1,
    });
    
    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 1),
      } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalledWith("user_1", "small_window", 5, 1);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("should handle large window values", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "large_window",
      limit: 5,
      windowMs: 86400000, // 24 hours
    });
    
    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 86400000),
      } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalledWith("user_1", "large_window", 5, 86400000);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("should handle negative limit values", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "negative_limit",
      limit: -5,
      windowMs: 1000,
    });
    
    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: -6,
        resetTime: new Date(Date.now() + 500),
      } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalledWith("user_1", "negative_limit", -5, 1000);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("should handle negative window values", async () => {
    const mw = rateLimitMiddleware({
      endpoint: "negative_window",
      limit: 5,
      windowMs: -1000,
    });
    
    const allowSpy = vi
      .spyOn(rateLimitLib, "checkRateLimit" as any)
      .mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() - 1000),
      } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalledWith("user_1", "negative_window", 5, -1000);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  describe("asTrpcMiddleware", () => {
    it("should return a tRPC middleware object", () => {
      const handler = rateLimitMiddleware({
        endpoint: "trpc_wrapper",
        limit: 5,
        windowMs: 1000,
      });
      
      const trpcMw = asTrpcMiddleware(handler);
      
      // Should be a tRPC middleware object
      expect(trpcMw).toBeDefined();
      expect(typeof trpcMw).toBe("object");
      // tRPC middleware should have the _middlewares property
      expect(trpcMw).toHaveProperty('_middlewares');
    });

    it("should execute the handler logic correctly", async () => {
      const handler = rateLimitMiddleware({
        endpoint: "trpc_wrapper_exec",
        limit: 5,
        windowMs: 1000,
      });
      
      vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      const result = await handler({ ctx, next });
      
      // Should call next function once
      expect(next).toHaveBeenCalledOnce();
      // The result should be from the next call
      expect(result).toEqual({ result: "success" });
    });

    it("should rethrow TRPCError from handler", async () => {
      const handler = rateLimitMiddleware({
        endpoint: "trpc_wrapper_error",
        limit: 5,
        windowMs: 1000,
      });
      
      const trpcError = new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded",
      });
      
      vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockRejectedValue(trpcError);
      
      const trpcMw = asTrpcMiddleware(handler);
      
      // Mock the tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // We can't directly call the tRPC middleware, but we can test the handler
      await expect(handler({ ctx, next })).rejects.toThrow(trpcError);
    });

    it("should continue execution when handler throws non-TRPC error", async () => {
      const handler = rateLimitMiddleware({
        endpoint: "trpc_wrapper_non_trpc_error",
        limit: 5,
        windowMs: 1000,
      });
      
      const error = new Error("Database error");
      vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockRejectedValue(error);
      
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      const result = await handler({ ctx, next });
      
      // Should continue execution and call next
      expect(next).toHaveBeenCalledOnce();
      expect(result).toEqual({ result: "success" });
    });
  });

  describe("Logging", () => {
    it("should log when rate limit is exceeded", async () => {
      const { logSecurityEvent } = await import("~/lib/logger");
      
      const mw = rateLimitMiddleware({
        endpoint: "logged_endpoint",
        limit: 1,
        windowMs: 1000,
      });
      
      vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 1000),
        retryAfter: 1,
      } as any);

      await expect(mw(makeCtx({}))).rejects.toThrow();

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.stringContaining("Rate limit exceeded"),
        "user_1",
        expect.objectContaining({
          endpoint: "logged_endpoint",
          limit: 1,
        })
      );
    });

    it("should log debug info when rate limit passes", async () => {
      const { logger } = await import("~/lib/logger");
      
      const mw = rateLimitMiddleware({
        endpoint: "debug_endpoint",
        limit: 5,
        windowMs: 1000,
      });
      
      vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 1000),
      } as any);

      await mw(makeCtx({}));

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Rate limit check passed"),
        expect.objectContaining({
          userId: "user_1",
          endpoint: "debug_endpoint",
        })
      );
    });
  });

  describe("Pre-configured middleware", () => {
    it("should define templateRateLimit middleware", () => {
      expect(templateRateLimit).toBeDefined();
      expect(typeof templateRateLimit).toBe("object");
    });

    it("should define workoutRateLimit middleware", () => {
      expect(workoutRateLimit).toBeDefined();
      expect(typeof workoutRateLimit).toBe("object");
    });

    it("should define apiCallRateLimit middleware", () => {
      expect(apiCallRateLimit).toBeDefined();
      expect(typeof apiCallRateLimit).toBe("object");
    });

    it("should define whoopSyncRateLimit middleware", () => {
      expect(whoopSyncRateLimit).toBeDefined();
      expect(typeof whoopSyncRateLimit).toBe("object");
    });

    // Note: These tests are checking the underlying rateLimitMiddleware logic
    // that's used by the pre-configured tRPC middlewares, since we can't
    // directly execute tRPC middleware objects in unit tests.
    
    it("should create templateRateLimit with correct configuration", async () => {
      // Mock env values for this test
      vi.mocked(env).RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR = 1000;
      vi.mocked(env).RATE_LIMIT_ENABLED = true;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by templateRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "template_operations",
        limit: env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ?? 0,
        windowMs: 60 * 60 * 1000, // 1 hour
        skipIfDisabled: true,
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should call checkRateLimit with correct parameters matching templateRateLimit
      expect(checkRateLimitSpy).toHaveBeenCalledWith("user_1", "template_operations", 1000, 60 * 60 * 1000);
      expect(next).toHaveBeenCalled();
    });

    it("should create workoutRateLimit with correct configuration", async () => {
      // Mock env values for this test
      vi.mocked(env).RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR = 1000;
      vi.mocked(env).RATE_LIMIT_ENABLED = true;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by workoutRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "workout_operations",
        limit: env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR ?? 0,
        windowMs: 60 * 60 * 1000, // 1 hour
        skipIfDisabled: true,
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should call checkRateLimit with correct parameters matching workoutRateLimit
      expect(checkRateLimitSpy).toHaveBeenCalledWith("user_1", "workout_operations", 1000, 60 * 60 * 1000);
      expect(next).toHaveBeenCalled();
    });

    it("should create apiCallRateLimit with correct configuration", async () => {
      // Mock env values for this test
      vi.mocked(env).RATE_LIMIT_API_CALLS_PER_MINUTE = 1000;
      vi.mocked(env).RATE_LIMIT_ENABLED = true;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by apiCallRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "api_calls",
        limit: env.RATE_LIMIT_API_CALLS_PER_MINUTE ?? 0,
        windowMs: 60 * 1000, // 1 minute
        skipIfDisabled: false, // Always enforce API call limits
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should call checkRateLimit with correct parameters matching apiCallRateLimit
      expect(checkRateLimitSpy).toHaveBeenCalledWith("user_1", "api_calls", 1000, 60 * 1000);
      expect(next).toHaveBeenCalled();
    });

    it("should create whoopSyncRateLimit with correct configuration", async () => {
      // Mock env values for this test
      vi.mocked(env).WHOOP_SYNC_RATE_LIMIT_PER_HOUR = 1000;
      vi.mocked(env).RATE_LIMIT_ENABLED = true;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by whoopSyncRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "whoop_sync",
        limit: env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR ?? 0,
        windowMs: 60 * 60 * 1000, // 1 hour
        skipIfDisabled: false, // Always enforce Whoop sync limits
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should call checkRateLimit with correct parameters matching whoopSyncRateLimit
      expect(checkRateLimitSpy).toHaveBeenCalledWith("user_1", "whoop_sync", 1000, 60 * 60 * 1000);
      expect(next).toHaveBeenCalled();
    });

    it("should skip templateRateLimit when disabled and skipIfDisabled is true", async () => {
      // Mock env values for this test
      vi.mocked(env).RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR = 1000;
      vi.mocked(env).RATE_LIMIT_ENABLED = false;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any);
      
      // Create the underlying handler that would be used by templateRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "template_operations",
        limit: env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ?? 0,
        windowMs: 60 * 60 * 1000, // 1 hour
        skipIfDisabled: true,
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should skip when disabled due to skipIfDisabled: true
      expect(checkRateLimitSpy).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should enforce apiCallRateLimit even when disabled due to skipIfDisabled false", async () => {
      // Mock env values for this test
      vi.mocked(env).RATE_LIMIT_API_CALLS_PER_MINUTE = 1000;
      vi.mocked(env).RATE_LIMIT_ENABLED = false;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by apiCallRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "api_calls",
        limit: env.RATE_LIMIT_API_CALLS_PER_MINUTE ?? 0,
        windowMs: 60 * 1000, // 1 minute
        skipIfDisabled: false, // Always enforce API call limits
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should enforce even when disabled due to skipIfDisabled: false
      expect(checkRateLimitSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should enforce whoopSyncRateLimit even when disabled due to skipIfDisabled false", async () => {
      // Mock env values for this test
      vi.mocked(env).WHOOP_SYNC_RATE_LIMIT_PER_HOUR = 1000;
      vi.mocked(env).RATE_LIMIT_ENABLED = false;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by whoopSyncRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "whoop_sync",
        limit: env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR ?? 0,
        windowMs: 60 * 60 * 1000, // 1 hour
        skipIfDisabled: false, // Always enforce Whoop sync limits
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should enforce even when disabled due to skipIfDisabled: false
      expect(checkRateLimitSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should handle case when env variables are undefined", async () => {
      // Mock env values to be undefined
      vi.mocked(env).RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR = undefined as any;
      vi.mocked(env).RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR = undefined as any;
      vi.mocked(env).RATE_LIMIT_API_CALLS_PER_MINUTE = undefined as any;
      vi.mocked(env).WHOOP_SYNC_RATE_LIMIT_PER_HOUR = undefined as any;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by templateRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "template_operations",
        limit: env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ?? 0,
        windowMs: 60 * 60 * 1000, // 1 hour
        skipIfDisabled: true,
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should work correctly even with default values (0)
      expect(checkRateLimitSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should handle case when env variables are zero", async () => {
      // Mock env values to be zero
      vi.mocked(env).RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR = 0;
      vi.mocked(env).RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR = 0;
      vi.mocked(env).RATE_LIMIT_API_CALLS_PER_MINUTE = 0;
      vi.mocked(env).WHOOP_SYNC_RATE_LIMIT_PER_HOUR = 0;
      
      const checkRateLimitSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
        allowed: true,
        remaining: 4,
        resetTime: new Date(Date.now() + 500),
      } as any);
      
      // Create the underlying handler that would be used by templateRateLimit
      const handler = rateLimitMiddleware({
        endpoint: "template_operations",
        limit: env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ?? 0,
        windowMs: 60 * 60 * 1000, // 1 hour
        skipIfDisabled: true,
      });
      
      // Create a mock tRPC middleware context
      const ctx = makeCtx().ctx;
      const next = vi.fn().mockResolvedValue({ result: "success" });
      
      // Execute the handler directly
      await handler({ ctx, next });
      
      // Should work correctly even with zero env values
      expect(checkRateLimitSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});