import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiCallRateLimit, rateLimitMiddleware, templateRateLimit, whoopSyncRateLimit, workoutRateLimit } from "~/lib/rate-limit-middleware";

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

describe("rate-limit-middleware", () => {
  const next = vi.fn(async () => ({ ok: true }));
  const ctxBase = { user: { id: "user_1" }, requestIp: "127.0.0.1" } as any;
  const origRateLimitEnabled = env.RATE_LIMIT_ENABLED;

  beforeEach(() => {
    vi.restoreAllMocks();
    next.mockClear();
  });
  // ensure env restored
  // @ts-expect-error test restore
  env.RATE_LIMIT_ENABLED = origRateLimitEnabled;
  function makeCtx(extra?: Record<string, unknown>) {
    return { ctx: { ...ctxBase, ...extra }, next } as any;
  }

  it("calls next immediately when skipIfDisabled is true and feature is disabled", async () => {
    const mw = rateLimitMiddleware({ endpoint: "test_skip", limit: 10, windowMs: 1000, skipIfDisabled: true });
    const original = env.RATE_LIMIT_ENABLED;
    env.RATE_LIMIT_ENABLED = false;

    const res = await mw(makeCtx({}));

    env.RATE_LIMIT_ENABLED = original;
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("enforces rate limit when enabled and under limit", async () => {
    const mw = rateLimitMiddleware({ endpoint: "test_endpoint", limit: 2, windowMs: 1000 });
    const allowSpy = vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
      allowed: true,
      remaining: 1,
      resetTime: new Date(Date.now() + 500),
    } as any);

    const res = await mw(makeCtx({}));
    expect(allowSpy).toHaveBeenCalledWith("user_1", "test_endpoint", 2, 1000);
    expect(next).toHaveBeenCalledOnce();
    expect(res).toEqual({ ok: true });
  });

  it("blocks when over limit and returns structured error", async () => {
    const mw = rateLimitMiddleware({ endpoint: "blocked", limit: 1, windowMs: 1000 });
    vi.spyOn(rateLimitLib, "checkRateLimit" as any).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: new Date(Date.now() + 1000),
      retryAfter: 1,
    } as any);

    await expect(mw(makeCtx({}))).rejects.toMatchObject({
      message: expect.stringContaining("Rate limit exceeded"),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("skips when user missing (middleware returns next)", async () => {
    const mw = rateLimitMiddleware({ endpoint: "no_identity", limit: 5, windowMs: 1000 });
    const spy = vi.spyOn(rateLimitLib, "checkRateLimit" as any);
    await mw({ ctx: {}, next } as any);
    expect(spy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

});
});
