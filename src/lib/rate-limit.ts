import type { DrizzleDb } from "~/server/db";
import { rateLimits } from "~/server/db/schema";
import { eq, and, lt } from "drizzle-orm";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export async function checkRateLimit(
  db: DrizzleDb,
  userId: string,
  endpoint: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000, // 1 hour in milliseconds
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const resetTime = new Date(windowStart.getTime() + windowMs);

  // Get or create rate limit record for this user and endpoint
  const [existingLimit] = await db
    .select()
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.user_id, userId),
        eq(rateLimits.endpoint, endpoint),
        eq(rateLimits.windowStart, windowStart.toISOString()),
      ),
    );

  if (!existingLimit) {
    // Create new rate limit record
    await db.insert(rateLimits).values({
      user_id: userId,
      endpoint,
      requests: 1,
      windowStart: windowStart.toISOString(),
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  // Check if limit exceeded
  if (existingLimit.requests >= limit) {
    const retryAfter = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter,
    };
  }

  // Increment request count
  await db
    .update(rateLimits)
    .set({
      requests: existingLimit.requests + 1,
      updatedAt: new Date(),
    })
    .where(eq(rateLimits.id, existingLimit.id));

  return {
    allowed: true,
    remaining: limit - existingLimit.requests - 1,
    resetTime,
  };
}

export async function cleanupExpiredRateLimits(db: DrizzleDb): Promise<void> {
  const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);

  await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, cutoffTime.toISOString()));
}
