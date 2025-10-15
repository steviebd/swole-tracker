import type { DrizzleDb } from "~/server/db";
import { userIntegrations } from "~/server/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { env } from "~/env";
import { encryptToken, getDecryptedToken } from "./encryption";

/**
 * Automatic OAuth token rotation for enhanced security
 */

interface TokenRotationResult {
  success: boolean;
  newAccessToken?: string;
  error?: string;
}

function normalizeDate(
  value: Date | string | number | null | undefined,
): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const fromString = new Date(value);
    return Number.isNaN(fromString.getTime()) ? null : fromString;
  }

  return null;
}

/**
 * Check if a token needs rotation based on time or usage criteria
 */
export function shouldRotateToken(
  expiresAtInput: Date | string | number | null | undefined,
  lastRotatedInput: Date | string | number | null | undefined,
  forceRotation = false,
): boolean {
  if (forceRotation) return true;

  const expiresAt = normalizeDate(expiresAtInput);
  const lastRotated = normalizeDate(lastRotatedInput);

  const now = new Date();
  const rotationBuffer = 24 * 60 * 60 * 1000; // 24 hours before expiry
  const maxTokenAge = 7 * 24 * 60 * 60 * 1000; // 7 days max age

  if (!expiresAt) {
    // Without a reliable expiry, rotate if we've never rotated before
    if (!lastRotated) {
      return true;
    }

    // Otherwise fall back to max age check below
  }

  // Rotate if token expires within 24 hours
  if (expiresAt && expiresAt.getTime() - now.getTime() < rotationBuffer) {
    return true;
  }

  // Rotate if token is older than 7 days
  if (lastRotated && now.getTime() - lastRotated.getTime() > maxTokenAge) {
    return true;
  }

  return false;
}

/**
 * Rotate OAuth tokens for a specific user integration
 */
export async function rotateOAuthTokens(
  db: DrizzleDb,
  userId: string,
  provider: string,
): Promise<TokenRotationResult> {
  try {
    // Get current integration
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.isActive, true),
        ),
      );

    if (!integration) {
      return { success: false, error: "Integration not found" };
    }

    if (!integration.refreshToken) {
      return { success: false, error: "No refresh token available" };
    }

    const currentExpiresAt = normalizeDate(integration.expiresAt);
    const lastRotatedAt = normalizeDate(integration.updatedAt);

    // Check if rotation is needed
    if (!shouldRotateToken(currentExpiresAt, lastRotatedAt)) {
      return {
        success: true,
        newAccessToken: await getDecryptedToken(integration.accessToken),
      };
    }

    // Decrypt refresh token
    const decryptedRefreshToken = await getDecryptedToken(
      integration.refreshToken!,
    );

    // Perform token refresh based on provider
    const tokenResult = await refreshProviderToken(
      provider,
      decryptedRefreshToken,
    );

    if (!tokenResult.success || !tokenResult.accessToken) {
      return { success: false, error: tokenResult.error };
    }

    // Encrypt new tokens
    const encryptedAccessToken = await encryptToken(tokenResult.accessToken);
    const encryptedRefreshToken = tokenResult.refreshToken
      ? await encryptToken(tokenResult.refreshToken)
      : integration.refreshToken;

    // Calculate new expiry
    const expiresAt = tokenResult.expiresIn
      ? new Date(Date.now() + tokenResult.expiresIn * 1000)
      : currentExpiresAt;

    // Update database with new encrypted tokens
    await db
      .update(userIntegrations)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userIntegrations.id, integration.id));

    return {
      success: true,
      newAccessToken: tokenResult.accessToken,
    };
  } catch (error) {
    console.error("Token rotation failed:", {
      userId: userId.substring(0, 8) + "...",
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Token rotation failed",
    };
  }
}

/**
 * Refresh tokens for different OAuth providers
 */
async function refreshProviderToken(
  provider: string,
  refreshToken: string,
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  switch (provider.toLowerCase()) {
    case "whoop":
      return await refreshWhoopToken(refreshToken);
    default:
      return { success: false, error: `Unsupported provider: ${provider}` };
  }
}

/**
 * Refresh WHOOP OAuth tokens
 */
async function refreshWhoopToken(refreshToken: string): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  try {
    if (!env.WHOOP_CLIENT_ID || !env.WHOOP_CLIENT_SECRET) {
      return { success: false, error: "WHOOP credentials not configured" };
    }

    const tokenEndpoint = "https://api.prod.whoop.com/oauth/oauth2/token";

    const refreshRequest = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.WHOOP_CLIENT_ID,
      client_secret: env.WHOOP_CLIENT_SECRET,
    };

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(refreshRequest).toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `WHOOP token refresh failed: ${response.status} - ${response.statusText}`,
      };
    }

    const tokens = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) {
      return { success: false, error: "No access token in response" };
    }

    return {
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token refresh failed",
    };
  }
}

/**
 * Rotate tokens for all active integrations that need it
 * This can be called periodically (e.g., via a cron job)
 */
export async function rotateAllExpiredTokens(db: DrizzleDb): Promise<{
  rotated: number;
  failed: number;
  results: Array<{
    userId: string;
    provider: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const results: Array<{
    userId: string;
    provider: string;
    success: boolean;
    error?: string;
  }> = [];
  let rotated = 0;
  let failed = 0;

  try {
    // Get all active integrations that might need rotation
    const expiredIntegrations = await db
      .select({
        user_id: userIntegrations.user_id,
        provider: userIntegrations.provider,
        expiresAt: userIntegrations.expiresAt,
        updatedAt: userIntegrations.updatedAt,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.isActive, true),
          // Get tokens that expire within 48 hours or are older than 6 days
          lt(
            userIntegrations.expiresAt,
            new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          ),
        ),
      );

    for (const integration of expiredIntegrations) {
      const result = await rotateOAuthTokens(
        db,
        integration.user_id,
        integration.provider,
      );

      results.push({
        userId: integration.user_id.substring(0, 8) + "...",
        provider: integration.provider,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        rotated++;
      } else {
        failed++;
      }
    }
  } catch (error) {
    console.error("Bulk token rotation failed:", error);
  }

  return { rotated, failed, results };
}

/**
 * Get a valid access token, rotating if necessary
 * This is the main function to use when you need a token
 */
export async function getValidAccessToken(
  db: DrizzleDb,
  userId: string,
  provider: string,
): Promise<{ token: string | null; error?: string }> {
  try {
    const rotationResult = await rotateOAuthTokens(db, userId, provider);

    if (rotationResult.success && rotationResult.newAccessToken) {
      return { token: rotationResult.newAccessToken };
    }

    return { token: null, error: rotationResult.error };
  } catch (error) {
    return {
      token: null,
      error:
        error instanceof Error ? error.message : "Failed to get valid token",
    };
  }
}
