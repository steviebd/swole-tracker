import { TRPCError } from "@trpc/server";
import { checkRateLimit } from "~/lib/rate-limit";
import { env } from "~/env";
import { logger, logSecurityEvent } from "~/lib/logger";
import { t } from "~/server/api/trpc";
import type { TRPCContext } from "~/server/api/trpc";

export interface RateLimitOptions {
  endpoint: string;
  limit: number;
  windowMs: number;
  skipIfDisabled?: boolean;
}

/**
 * Lightweight handler shape our unit tests call directly.
 * Matches: const mw = rateLimitMiddleware(opts); await mw({ ctx, next })
 */
type MiddlewareNext = () => Promise<unknown>;
type RateLimitHandler = (args: {
  ctx: TRPCContext;
  next: MiddlewareNext;
}) => Promise<unknown>;

/**
 * Factory that returns a plain async handler usable in tests and in routers.
 */
export const rateLimitMiddleware = ({
  endpoint,
  limit,
  windowMs,
  skipIfDisabled = false,
}: RateLimitOptions): RateLimitHandler => {
  return async ({ ctx, next }) => {
    if (!env.RATE_LIMIT_ENABLED && skipIfDisabled) {
      return next();
    }
    if (!ctx.user?.id) {
      return next();
    }
    try {
      const result = await checkRateLimit(
        ctx.db,
        ctx.user.id,
        endpoint,
        limit,
        windowMs,
      );
      if (!result.allowed) {
        logSecurityEvent(`Rate limit exceeded for ${endpoint}`, ctx.user.id, {
          endpoint,
          limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
        });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        });
      }
      // Rate limit check passed - no need to log success to avoid noise
      return next();
    } catch (error: unknown) {
      if (error instanceof TRPCError) {
        throw error;
      }
      logger.error(`Rate limit check failed for ${endpoint}`, error, {
        userId: ctx.user?.id,
        endpoint,
      });
      return next();
    }
  };
};

/**
 * Adapter to use the same handler inside t.middleware within routers.
 * Usage in router: .middleware(asTrpcMiddleware(rateLimitMiddleware(opts)))
 */
export const asTrpcMiddleware = (handler: RateLimitHandler) =>
  t.middleware(async ({ ctx, next }) => {
    // Execute our plain handler for side-effects and error throwing semantics,
    // then return the original next() result to satisfy tRPC's expected type.
    // Create a clean context object without optional properties that might be undefined
    const cleanCtx: TRPCContext = {
      db: ctx.db,
      user: ctx.user,
      requestId: ctx.requestId,
      headers: ctx.headers,
      ...(ctx.timings && { timings: ctx.timings }),
    };
    await handler({ ctx: cleanCtx, next });
    return next();
  });

// Pre-configured rate limiting middleware for common operations (plain handlers)
export const templateRateLimit = t.middleware(async ({ ctx, next }) => {
  const handler = rateLimitMiddleware({
    endpoint: "template_operations",
    limit: env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ?? 0,
    windowMs: 60 * 60 * 1000, // 1 hour
    skipIfDisabled: true,
  });
  // Create a clean context object without optional properties that might be undefined
  const cleanCtx: TRPCContext = {
    db: ctx.db,
    user: ctx.user,
    requestId: ctx.requestId,
    headers: ctx.headers,
    ...(ctx.timings && { timings: ctx.timings }),
  };
  await handler({ ctx: cleanCtx, next });
  return next();
});

export const workoutRateLimit = t.middleware(async ({ ctx, next }) => {
  const handler = rateLimitMiddleware({
    endpoint: "workout_operations",
    limit: env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR ?? 0,
    windowMs: 60 * 60 * 1000, // 1 hour
    skipIfDisabled: true,
  });
  // Create a clean context object without optional properties that might be undefined
  const cleanCtx: TRPCContext = {
    db: ctx.db,
    user: ctx.user,
    requestId: ctx.requestId,
    headers: ctx.headers,
    ...(ctx.timings && { timings: ctx.timings }),
  };
  await handler({ ctx: cleanCtx, next });
  return next();
});

export const apiCallRateLimit = t.middleware(async ({ ctx, next }) => {
  const handler = rateLimitMiddleware({
    endpoint: "api_calls",
    limit: env.RATE_LIMIT_API_CALLS_PER_MINUTE ?? 0,
    windowMs: 60 * 1000, // 1 minute
    skipIfDisabled: false, // Always enforce API call limits
  });
  // Create a clean context object without optional properties that might be undefined
  const cleanCtx: TRPCContext = {
    db: ctx.db,
    user: ctx.user,
    requestId: ctx.requestId,
    headers: ctx.headers,
    ...(ctx.timings && { timings: ctx.timings }),
  };
  await handler({ ctx: cleanCtx, next });
  return next();
});

export const whoopSyncRateLimit = t.middleware(async ({ ctx, next }) => {
  const handler = rateLimitMiddleware({
    endpoint: "whoop_sync",
    limit: env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR ?? 0,
    windowMs: 60 * 60 * 1000, // 1 hour
    skipIfDisabled: false, // Always enforce Whoop sync limits
  });
  // Create a clean context object without optional properties that might be undefined
  const cleanCtx: TRPCContext = {
    db: ctx.db,
    user: ctx.user,
    requestId: ctx.requestId,
    headers: ctx.headers,
    ...(ctx.timings && { timings: ctx.timings }),
  };
  await handler({ ctx: cleanCtx, next });
  return next();
});
