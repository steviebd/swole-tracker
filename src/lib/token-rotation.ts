import type { DrizzleDb } from "~/server/db";
import { userIntegrations } from "~/server/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { env } from "~/env";
import { encryptToken, getDecryptedToken, isEncrypted } from "./encryption";

/**
 * Automatic OAuth token rotation for enhanced security
 * Includes migration strategy for handling encrypted vs plain-text tokens
 */

interface TokenRotationResult {
  success: boolean;
  newAccessToken?: string;
  rotated: boolean;
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
  const minRotationInterval = 10 * 60 * 1000; // Avoid rotating more than once every 10 minutes

  if (!expiresAt) {
    // Without a reliable expiry, rotate if we've never rotated before
    if (!lastRotated) {
      return true;
    }

    // Otherwise fall back to max age check below
  }

  if (expiresAt) {
    const timeToExpiry = expiresAt.getTime() - now.getTime();

    // Rotate immediately if already expired
    if (timeToExpiry <= 0) {
      return true;
    }

    // Rotate when within the buffer window and we haven't rotated recently
    if (timeToExpiry < rotationBuffer) {
      if (!lastRotated) {
        return true;
      }

      if (now.getTime() - lastRotated.getTime() >= minRotationInterval) {
        return true;
      }
    }
  }

  // Rotate if token is older than 7 days
  if (lastRotated && now.getTime() - lastRotated.getTime() > maxTokenAge) {
    return true;
  }

  return false;
}

/**
 * Migrate plain-text tokens to encrypted format when ENCRYPTION_MASTER_KEY is available
 * This function safely converts tokens without affecting functionality
 */
export async function migrateTokens(
  db: DrizzleDb,
  userId?: string,
): Promise<{
  migrated: number;
  skipped: number;
  failed: number;
  results: Array<{
    userId: string;
    provider: string;
    migrated: boolean;
    error?: string;
  }>;
}> {
  const results: Array<{
    userId: string;
    provider: string;
    migrated: boolean;
    error?: string;
  }> = [];
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Check if encryption key is available
    if (!process.env["ENCRYPTION_MASTER_KEY"]) {
      console.log(
        "Token migration: Skipping migration - ENCRYPTION_MASTER_KEY not available",
      );
      return { migrated: 0, skipped: 0, failed: 0, results: [] };
    }

    // Get integrations to migrate (active ones, optionally filtered by user)
    const integrations = await db
      .select({
        id: userIntegrations.id,
        user_id: userIntegrations.user_id,
        provider: userIntegrations.provider,
        accessToken: userIntegrations.accessToken,
        refreshToken: userIntegrations.refreshToken,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.isActive, true),
          ...(userId ? [eq(userIntegrations.user_id, userId)] : []),
        ),
      );

    for (const integration of integrations) {
      try {
        let accessTokenMigrated = false;
        let refreshTokenMigrated = false;

        // Migrate access token if it's plain-text
        if (integration.accessToken && !isEncrypted(integration.accessToken)) {
          console.log("Token migration: Migrating access token", {
            userId: integration.user_id.substring(0, 8) + "...",
            provider: integration.provider,
          });

          const encryptedAccessToken = await encryptToken(
            integration.accessToken,
          );
          await db
            .update(userIntegrations)
            .set({
              accessToken: encryptedAccessToken,
              updatedAt: new Date(),
            })
            .where(eq(userIntegrations.id, integration.id));

          accessTokenMigrated = true;
        }

        // Migrate refresh token if it's plain-text
        if (
          integration.refreshToken &&
          !isEncrypted(integration.refreshToken)
        ) {
          console.log("Token migration: Migrating refresh token", {
            userId: integration.user_id.substring(0, 8) + "...",
            provider: integration.provider,
          });

          const encryptedRefreshToken = await encryptToken(
            integration.refreshToken,
          );
          await db
            .update(userIntegrations)
            .set({
              refreshToken: encryptedRefreshToken,
              updatedAt: new Date(),
            })
            .where(eq(userIntegrations.id, integration.id));

          refreshTokenMigrated = true;
        }

        if (accessTokenMigrated || refreshTokenMigrated) {
          results.push({
            userId: integration.user_id.substring(0, 8) + "...",
            provider: integration.provider,
            migrated: true,
          });
          migrated++;
        } else {
          results.push({
            userId: integration.user_id.substring(0, 8) + "...",
            provider: integration.provider,
            migrated: false,
          });
          skipped++;
        }
      } catch (error) {
        console.error("Token migration failed for integration:", {
          userId: integration.user_id.substring(0, 8) + "...",
          provider: integration.provider,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        results.push({
          userId: integration.user_id.substring(0, 8) + "...",
          provider: integration.provider,
          migrated: false,
          error: error instanceof Error ? error.message : "Migration failed",
        });
        failed++;
      }
    }
  } catch (error) {
    console.error("Token migration process failed:", error);
  }

  console.log("Token migration completed", { migrated, skipped, failed });
  return { migrated, skipped, failed, results };
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
      return { success: false, rotated: false, error: "Integration not found" };
    }

    // Migrate tokens to encrypted format if needed and key is available
    if (process.env["ENCRYPTION_MASTER_KEY"]) {
      const migrationResult = await migrateTokens(db, userId);
      if (migrationResult.migrated > 0) {
        console.log("Token rotation: Migrated tokens during rotation", {
          userId: userId.substring(0, 8) + "...",
          provider,
          migrated: migrationResult.migrated,
        });

        // Re-fetch integration in case tokens were migrated
        const [updatedIntegration] = await db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.user_id, userId),
              eq(userIntegrations.provider, provider),
              eq(userIntegrations.isActive, true),
            ),
          );

        if (updatedIntegration) {
          integration.accessToken = updatedIntegration.accessToken;
          integration.refreshToken = updatedIntegration.refreshToken;
        }
      }
    }

    if (!integration.refreshToken) {
      return {
        success: false,
        rotated: false,
        error: "No refresh token available",
      };
    }

    const currentExpiresAt = normalizeDate(integration.expiresAt);
    const lastRotatedAt = normalizeDate(integration.updatedAt);

    // Check if rotation is needed
    if (!shouldRotateToken(currentExpiresAt, lastRotatedAt)) {
      try {
        console.log(
          "Token rotation: No rotation needed, decrypting access token",
          {
            userId: userId.substring(0, 8) + "...",
            provider,
            tokenLength: integration.accessToken.length,
          },
        );

        const decryptedAccessToken = await getDecryptedToken(
          integration.accessToken,
        );

        console.log("Token rotation: Access token decryption successful", {
          userId: userId.substring(0, 8) + "...",
          provider,
        });

        return {
          success: true,
          rotated: false,
          newAccessToken: decryptedAccessToken,
        };
      } catch (decryptError) {
        console.error(
          "Token rotation: Access token decryption failed when no rotation needed",
          {
            userId: userId.substring(0, 8) + "...",
            provider,
            error:
              decryptError instanceof Error
                ? decryptError.message
                : "Unknown decryption error",
            tokenLength: integration.accessToken.length,
          },
        );

        // Attempt recovery for access token as well
        if (integration.accessToken.length > 10) {
          console.log(
            "Token rotation: Attempting recovery with plain-text access token",
            {
              userId: userId.substring(0, 8) + "...",
              provider,
            },
          );
          return {
            success: true,
            rotated: false,
            newAccessToken: integration.accessToken,
          };
        } else {
          return {
            success: false,
            rotated: false,
            error: `Access token decryption failed: ${decryptError instanceof Error ? decryptError.message : "Unknown error"}`,
          };
        }
      }
    }

    // Decrypt refresh token with error recovery
    let decryptedRefreshToken: string;
    try {
      console.log("Token rotation: Attempting to decrypt refresh token", {
        userId: userId.substring(0, 8) + "...",
        provider,
        tokenLength: integration.refreshToken!.length,
        isEncrypted: integration.refreshToken!.startsWith("ey") ? false : true, // rough heuristic
      });

      decryptedRefreshToken = await getDecryptedToken(
        integration.refreshToken!,
      );

      console.log("Token rotation: Refresh token decryption successful", {
        userId: userId.substring(0, 8) + "...",
        provider,
      });
    } catch (decryptError) {
      console.error("Token rotation: Refresh token decryption failed", {
        userId: userId.substring(0, 8) + "...",
        provider,
        error:
          decryptError instanceof Error
            ? decryptError.message
            : "Unknown decryption error",
        tokenLength: integration.refreshToken!.length,
      });

      // Attempt recovery: if decryption fails, try to use the token as-is (might be plain text)
      // This provides backward compatibility during migration
      if (integration.refreshToken!.length > 10) {
        // basic sanity check
        console.log(
          "Token rotation: Attempting recovery with plain-text token",
          {
            userId: userId.substring(0, 8) + "...",
            provider,
          },
        );
        decryptedRefreshToken = integration.refreshToken!;
      } else {
        return {
          success: false,
          rotated: false,
          error: `Refresh token decryption failed: ${decryptError instanceof Error ? decryptError.message : "Unknown error"}`,
        };
      }
    }

    // Perform token refresh based on provider
    const tokenResult = await refreshProviderToken(
      provider,
      decryptedRefreshToken,
    );

    if (!tokenResult.success || !tokenResult.accessToken) {
      const result: TokenRotationResult = {
        success: false,
        rotated: false,
      };
      if (tokenResult.error) {
        result.error = tokenResult.error;
      }
      return result;
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
      rotated: true,
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
      rotated: false,
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

    const result: {
      success: boolean;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
      error?: string;
    } = {
      success: true,
      accessToken: tokens.access_token,
    };
    if (tokens.refresh_token) {
      result.refreshToken = tokens.refresh_token;
    }
    return result;
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
 * Includes automatic token migration during rotation
 */
export async function rotateAllExpiredTokens(db: DrizzleDb): Promise<{
  rotated: number;
  failed: number;
  migrated: number;
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
  let migrated = 0;

  try {
    // First, run migration for all users if encryption key is available
    if (process.env["ENCRYPTION_MASTER_KEY"]) {
      console.log("Bulk token rotation: Running migration for all users");
      const migrationResult = await migrateTokens(db);
      migrated = migrationResult.migrated;
      console.log("Bulk token rotation: Migration completed", {
        migrated: migrationResult.migrated,
        skipped: migrationResult.skipped,
        failed: migrationResult.failed,
      });
    }

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

      const resultItem: {
        userId: string;
        provider: string;
        success: boolean;
        error?: string;
      } = {
        userId: integration.user_id.substring(0, 8) + "...",
        provider: integration.provider,
        success: result.success,
      };
      if (result.error) {
        resultItem.error = result.error;
      }
      results.push(resultItem);

      if (result.success) {
        rotated++;
      } else {
        failed++;
      }
    }
  } catch (error) {
    console.error("Bulk token rotation failed:", error);
  }

  return { rotated, failed, migrated, results };
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

    const result1: { token: string | null; error?: string } = { token: null };
    if (rotationResult.error) {
      result1.error = rotationResult.error;
    }
    return result1;
  } catch (error) {
    const result2: { token: string | null; error?: string } = { token: null };
    if (error instanceof Error) {
      result2.error = error.message;
    } else {
      result2.error = "Failed to get valid token";
    }
    return result2;
  }
}
