import { TRPCError } from "@trpc/server";
import { checkRateLimit } from "~/lib/rate-limit";
import { env } from "~/env";
import { logger, logSecurityEvent } from "~/lib/logger";

export interface RateLimitOptions {
  endpoint: string;
  limit: number;
  windowMs: number;
  skipIfDisabled?: boolean;
}

/**
 * tRPC middleware for rate limiting based on user and endpoint
 */
export const rateLimitMiddleware = ({ endpoint, limit, windowMs, skipIfDisabled = false }: RateLimitOptions) => {
  return async ({ ctx, next }: { ctx: any; next: any }) => {
    // Skip rate limiting if disabled and skipIfDisabled is true
    if (!env.RATE_LIMIT_ENABLED && skipIfDisabled) {
      return next();
    }

    // Skip rate limiting if user is not authenticated (should not happen with protectedProcedure)
    if (!ctx.user?.id) {
      return next();
    }

    try {
      const result = await checkRateLimit(ctx.user.id, endpoint, limit, windowMs);

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

      // Log rate limit info in development
      logger.debug(`Rate limit check passed for ${endpoint}`, {
        userId: ctx.user.id,
        endpoint,
        remaining: result.remaining,
        resetTime: result.resetTime,
      });

      return next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error(`Rate limit check failed for ${endpoint}`, error, {
        userId: ctx.user.id,
        endpoint,
      });

      // Allow request if rate limiting fails (graceful degradation)
      return next();
    }
  };
};

// Pre-configured rate limiting middleware for common operations
export const templateRateLimit = rateLimitMiddleware({
  endpoint: "template_operations",
  limit: env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR,
  windowMs: 60 * 60 * 1000, // 1 hour
  skipIfDisabled: true,
});

export const workoutRateLimit = rateLimitMiddleware({
  endpoint: "workout_operations", 
  limit: env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR,
  windowMs: 60 * 60 * 1000, // 1 hour
  skipIfDisabled: true,
});

export const apiCallRateLimit = rateLimitMiddleware({
  endpoint: "api_calls",
  limit: env.RATE_LIMIT_API_CALLS_PER_MINUTE,
  windowMs: 60 * 1000, // 1 minute
  skipIfDisabled: false, // Always enforce API call limits
});

export const whoopSyncRateLimit = rateLimitMiddleware({
  endpoint: "whoop_sync",
  limit: env.WHOOP_SYNC_RATE_LIMIT_PER_HOUR,
  windowMs: 60 * 60 * 1000, // 1 hour
  skipIfDisabled: false, // Always enforce Whoop sync limits
});
