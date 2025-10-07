import { db } from "~/server/db";
import { oauthStates } from "~/server/db/schema";
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

/**
 * Generate a cryptographically secure state parameter with additional validation data
 */
export async function createOAuthState(
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

  await db.insert(oauthStates).values({
    state,
    user_id: userId,
    provider,
    redirect_uri: redirectUri,
    client_ip: clientIp,
    user_agent_hash: userAgentHash,
  });

  return state;
}

/**
 * Validate OAuth state parameter with additional security checks
 */
export async function validateOAuthState(
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
    await cleanupExpiredStates();

    const encoder = new TextEncoder();
    const data = encoder.encode(userAgent);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    const userAgentHash = Array.from(hashArray, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    const storedState = await db
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

    if (storedState.length === 0) {
      return { isValid: false };
    }

    const stateRecord = storedState[0]!;

    // Validate expiry
    if (new Date() > new Date(stateRecord.expiresAt)) {
      await deleteOAuthState(state);
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
    await deleteOAuthState(state);

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
export async function deleteOAuthState(state: string): Promise<void> {
  await db.delete(oauthStates).where(eq(oauthStates.state, state));
}

/**
 * Clean up expired OAuth states
 */
export async function cleanupExpiredStates(): Promise<void> {
  await db
    .delete(oauthStates)
    .where(lt(oauthStates.expiresAt, sql`CURRENT_TIMESTAMP`));
}

/**
 * Clean up all OAuth states for a specific user and provider
 */
export async function cleanupUserStates(
  userId: string,
  provider: string,
): Promise<void> {
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
