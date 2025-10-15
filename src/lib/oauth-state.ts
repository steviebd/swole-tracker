import type { DrizzleDb } from "~/server/db";
import { oauthStates } from "~/server/db/schema";
import { logger } from "~/lib/logger";
import { eq, and, lt, sql } from "drizzle-orm";

/**
 * Secure OAuth state management for preventing CSRF attacks
 */

export interface OAuthStateData {
  state: string;
  user_id: string;
  provider: string;
  redirect_uri: string;
  client_ip: string;
  user_agent_hash: string;
}

type CachedOAuthState = OAuthStateData & {
  expiresAt: Date;
};

const OAUTH_STATE_CACHE = new Map<string, CachedOAuthState>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function purgeExpiredCacheEntries() {
  const now = Date.now();
  for (const [key, cached] of OAUTH_STATE_CACHE.entries()) {
    if (cached.expiresAt.getTime() < now) {
      OAUTH_STATE_CACHE.delete(key);
    }
  }
}

function cacheOAuthState(state: CachedOAuthState) {
  purgeExpiredCacheEntries();
  OAUTH_STATE_CACHE.set(state.state, state);
}

function getCachedState(state: string) {
  purgeExpiredCacheEntries();
  return OAUTH_STATE_CACHE.get(state) ?? null;
}

function deleteCachedState(state: string) {
  OAUTH_STATE_CACHE.delete(state);
}

function cleanupCachedStates(userId: string, provider: string) {
  for (const [stateKey, cached] of OAUTH_STATE_CACHE.entries()) {
    if (cached.user_id === userId && cached.provider === provider) {
      OAUTH_STATE_CACHE.delete(stateKey);
    }
  }
}

/**
 * Generate a cryptographically secure state parameter with additional validation data
 */
export async function createOAuthState(
  db: DrizzleDb,
  userId: string,
  provider: string,
  redirectUri: string,
  clientIp: string,
  userAgent: string,
): Promise<string> {
  const state = crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(userAgent);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const userAgentHash = Array.from(hashArray, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

  await db.insert(oauthStates).values({
    state,
    user_id: userId,
    provider,
    redirect_uri: redirectUri,
    client_ip: clientIp,
    user_agent_hash: userAgentHash,
    expiresAt,
  });

  logger.debug("OAuth state created", {
    provider,
    userId: userId.substring(0, 8) + "...",
  });

  cacheOAuthState({
    state,
    user_id: userId,
    provider,
    redirect_uri: redirectUri,
    client_ip: clientIp,
    user_agent_hash: userAgentHash,
    expiresAt,
  });

  return state;
}

/**
 * Validate OAuth state parameter with additional security checks
 */
const STATE_LOOKUP_MAX_ATTEMPTS = 6;
const STATE_LOOKUP_BASE_DELAY_MS = 150;

async function findOAuthStateWithRetry(
  db: DrizzleDb,
  state: string,
  userId: string,
  provider: string,
): Promise<typeof oauthStates.$inferSelect | null> {
  for (let attempt = 1; attempt <= STATE_LOOKUP_MAX_ATTEMPTS; attempt += 1) {
    const [record] = await db
      .select()
      .from(oauthStates)
      .where(
        and(
          eq(oauthStates.state, state),
          eq(oauthStates.user_id, userId),
          eq(oauthStates.provider, provider),
        ),
      )
      .limit(1);

    if (record) {
      logger.debug("OAuth state located", {
        provider,
        attempt,
        userId: userId.substring(0, 8) + "...",
      });
      return record;
    }

    if (attempt < STATE_LOOKUP_MAX_ATTEMPTS) {
      // Remote D1 can exhibit replication lag in dev; retry with backoff before failing hard.
      const delayMs = STATE_LOOKUP_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.debug("OAuth state lookup retry", {
        provider,
        attempt,
        delayMs,
        userId: userId.substring(0, 8) + "...",
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

export async function validateOAuthState(
  db: DrizzleDb,
  state: string,
  userId: string,
  provider: string,
  clientIp: string,
  userAgent: string,
): Promise<{ isValid: boolean; redirectUri?: string }> {
  if (!state) {
    return { isValid: false };
  }

  try {
    // Clean up expired states first
    await cleanupExpiredStates(db);

    const encoder = new TextEncoder();
    const data = encoder.encode(userAgent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    const userAgentHash = Array.from(hashArray, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    const cachedState = getCachedState(state);
    if (cachedState) {
      const ipMatches = cachedState.client_ip === clientIp;
      const userAgentMatches = cachedState.user_agent_hash === userAgentHash;
      const userMatches =
        cachedState.user_id === userId && cachedState.provider === provider;

      if (ipMatches && userAgentMatches && userMatches) {
        await deleteOAuthState(db, state);
        return {
          isValid: true,
          redirectUri: cachedState.redirect_uri,
        };
      }

      logger.warn("OAuth state cache mismatch", {
        provider,
        userId: userId.substring(0, 8) + "...",
        ipMatches,
        userAgentMatches,
        userMatches,
      });
    }

    const stateRecord = await findOAuthStateWithRetry(
      db,
      state,
      userId,
      provider,
    );

    if (!stateRecord) {
      logger.warn("OAuth state validation failed to locate state", {
        provider,
        userId: userId.substring(0, 8) + "...",
      });
      return { isValid: false };
    }

    // Validate expiry
    if (new Date() > new Date(stateRecord.expiresAt)) {
      await deleteOAuthState(db, state);
      return { isValid: false };
    }

    // Validate IP address (optional - can be disabled for mobile apps)
    const ipMatches = stateRecord.client_ip === clientIp;

    // Validate User-Agent hash
    const userAgentMatches = stateRecord.user_agent_hash === userAgentHash;

    // For security, require both IP and User-Agent to match
    // Note: IP validation might need to be relaxed for mobile networks
    if (!ipMatches || !userAgentMatches) {
      // Log suspicious activity but don't immediately fail
      // This allows for legitimate cases like mobile network IP changes
      console.warn("OAuth state validation warning:", {
        stateMatches: true,
        ipMatches,
        userAgentMatches,
        provider,
        userId: userId.substring(0, 8) + "...",
      });

      // For now, we'll be lenient and allow the validation to pass
      // In a high-security environment, you might want to fail here
    }

    // Delete the used state to prevent replay attacks
    await deleteOAuthState(db, state);

    return {
      isValid: true,
      redirectUri: stateRecord.redirect_uri,
    };
  } catch (error) {
    console.error("OAuth state validation error:", error);
    return { isValid: false };
  }
}

/**
 * Delete a specific OAuth state
 */
export async function deleteOAuthState(
  db: DrizzleDb,
  state: string,
): Promise<void> {
  deleteCachedState(state);
  await db.delete(oauthStates).where(eq(oauthStates.state, state));
}

/**
 * Clean up expired OAuth states
 */
export async function cleanupExpiredStates(db: DrizzleDb): Promise<void> {
  purgeExpiredCacheEntries();
  await db
    .delete(oauthStates)
    .where(lt(oauthStates.expiresAt, sql`CURRENT_TIMESTAMP`));
}

/**
 * Clean up all OAuth states for a specific user and provider
 */
export async function cleanupUserStates(
  db: DrizzleDb,
  userId: string,
  provider: string,
): Promise<void> {
  cleanupCachedStates(userId, provider);
  await db
    .delete(oauthStates)
    .where(
      and(eq(oauthStates.user_id, userId), eq(oauthStates.provider, provider)),
    );
}

/**
 * Get client IP from request headers (handles proxies and load balancers)
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers in order of preference
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first IP
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback for development or direct connections
  return "unknown";
}
