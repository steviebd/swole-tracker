import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  shouldRotateToken,
  migrateTokens,
  rotateOAuthTokens,
} from "~/lib/token-rotation";

// Mock external dependencies
vi.mock("~/env", () => ({
  env: {
    WHOOP_CLIENT_ID: "test-client-id",
    WHOOP_CLIENT_SECRET: "test-client-secret",
  },
}));

vi.mock("~/lib/encryption", () => ({
  encryptToken: vi.fn().mockImplementation(async (token: string) => {
    if (
      process.env["ENCRYPTION_MASTER_KEY"]?.length &&
      process.env["ENCRYPTION_MASTER_KEY"].length >= 32
    ) {
      return `encrypted-${token}`;
    }
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be at least 32 characters long",
    );
  }),
  getDecryptedToken: vi.fn().mockImplementation(async (token: string) => {
    if (token.startsWith("encrypted-")) {
      return token.replace("encrypted-", "");
    }
    return token;
  }),
  isEncrypted: vi.fn().mockImplementation((token: string) => {
    return token.startsWith("encrypted-");
  }),
}));

// Mock fetch for WHOOP API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Disable MSW for this test
beforeEach(() => {
  // Override any MSW handlers
  global.fetch = mockFetch;
});

describe("token rotation", () => {
  let encryptToken: any;
  let getDecryptedToken: any;
  let isEncrypted: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const encryption = await import("~/lib/encryption");
    encryptToken = encryption.encryptToken;
    getDecryptedToken = encryption.getDecryptedToken;
    isEncrypted = encryption.isEncrypted;

    // Reset mock implementations after clearing - use the original mock implementations
    encryptToken.mockImplementation(async (token: string) => {
      if (
        process.env["ENCRYPTION_MASTER_KEY"]?.length &&
        process.env["ENCRYPTION_MASTER_KEY"].length >= 32
      ) {
        return `encrypted-${token}`;
      }
      throw new Error(
        "ENCRYPTION_MASTER_KEY must be at least 32 characters long",
      );
    });
    getDecryptedToken.mockImplementation(async (token: string) => {
      if (token.startsWith("encrypted-")) {
        return token.replace("encrypted-", "");
      }
      return token;
    });
    isEncrypted.mockImplementation((token: string) => {
      return token.startsWith("encrypted-");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("shouldRotateToken", () => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const sevenDays = 7 * oneDay;

    it("returns true when forceRotation is true", () => {
      expect(shouldRotateToken(null, null, true)).toBe(true);
    });

    it("returns true when expiresAt is null and lastRotated is null", () => {
      expect(shouldRotateToken(null, null)).toBe(true);
    });

    it("returns false when expiresAt is null and lastRotated is recent", () => {
      const recent = new Date(now.getTime() - oneDay);
      expect(shouldRotateToken(null, recent)).toBe(false);
    });

    it("returns true when expiresAt is null and lastRotated is old", () => {
      const old = new Date(now.getTime() - sevenDays - oneHour);
      expect(shouldRotateToken(null, old)).toBe(true);
    });

    it("returns true when token expires within 24 hours", () => {
      const expiresSoon = new Date(now.getTime() + oneHour);
      expect(shouldRotateToken(expiresSoon, null)).toBe(true);
    });

    it("returns false when token expires after 24 hours", () => {
      const expiresLater = new Date(now.getTime() + oneDay + oneHour);
      expect(shouldRotateToken(expiresLater, null)).toBe(false);
    });

    it("returns true when token is older than 7 days", () => {
      const farFuture = new Date(now.getTime() + 365 * oneDay);
      const oldRotation = new Date(now.getTime() - sevenDays - oneHour);
      expect(shouldRotateToken(farFuture, oldRotation)).toBe(true);
    });

    it("returns false when token is newer than 7 days", () => {
      const farFuture = new Date(now.getTime() + 365 * oneDay);
      const recentRotation = new Date(now.getTime() - oneDay);
      expect(shouldRotateToken(farFuture, recentRotation)).toBe(false);
    });

    it("handles string dates", () => {
      const expiresSoon = new Date(now.getTime() + oneHour).toISOString();
      expect(shouldRotateToken(expiresSoon, null)).toBe(true);
    });

    it("handles number timestamps", () => {
      const expiresSoon = now.getTime() + oneHour;
      expect(shouldRotateToken(expiresSoon, null)).toBe(true);
    });

    it("handles invalid dates gracefully", () => {
      expect(shouldRotateToken("invalid", null)).toBe(true);
      expect(shouldRotateToken(new Date("invalid"), null)).toBe(true);
    });

    it("respects minimum rotation interval when within buffer window", () => {
      const expiresSoon = new Date(now.getTime() + oneHour);
      const recentlyRotated = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      expect(shouldRotateToken(expiresSoon, recentlyRotated)).toBe(false);
    });

    it("ignores minimum rotation interval when outside buffer window", () => {
      const expiresSoon = new Date(now.getTime() + oneHour);
      const rotatedLongAgo = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago
      expect(shouldRotateToken(expiresSoon, rotatedLongAgo)).toBe(true);
    });
  });

  describe("migrateTokens", () => {
    it("skips migration when ENCRYPTION_MASTER_KEY is not available", async () => {
      delete process.env["ENCRYPTION_MASTER_KEY"];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any;

      const result = await migrateTokens(mockDb);

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toEqual([]);
    });

    it("migrates plain-text tokens when encryption key is available", async () => {
      process.env["ENCRYPTION_MASTER_KEY"] =
        "test-key-that-is-at-least-32-characters-long";

      const mockIntegrations = [
        {
          id: "int-1",
          user_id: "user-1",
          provider: "whoop",
          accessToken: "plain-access-token",
          refreshToken: "plain-refresh-token",
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockIntegrations),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      } as any;

      const result = await migrateTokens(mockDb);

      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.migrated).toBe(true);
      expect(encryptToken).toHaveBeenCalledTimes(2);
    });

    it("skips already encrypted tokens", async () => {
      process.env["ENCRYPTION_MASTER_KEY"] =
        "test-key-that-is-at-least-32-characters-long";

      isEncrypted.mockReturnValue(true);

      const mockIntegrations = [
        {
          id: "int-1",
          user_id: "user-1",
          provider: "whoop",
          accessToken: "encrypted-access-token",
          refreshToken: "encrypted-refresh-token",
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockIntegrations),
          }),
        }),
      } as any;

      const result = await migrateTokens(mockDb);

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
      expect(encryptToken).not.toHaveBeenCalled();
    });
  });

  describe("rotateOAuthTokens", () => {
    it("returns error when integration not found", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any;

      const result = await rotateOAuthTokens(mockDb, "user-1", "whoop");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Integration not found");
      expect(result.rotated).toBe(false);
    });

    it("returns error when no refresh token available", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-1",
        provider: "whoop",
        accessToken: "access-token",
        refreshToken: null,
        expiresAt: null,
        updatedAt: new Date(),
        isActive: true,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockIntegration]),
          }),
        }),
      } as any;

      // Disable migration to avoid update function issues
      delete process.env["ENCRYPTION_MASTER_KEY"];

      const result = await rotateOAuthTokens(mockDb, "user-1", "whoop");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No refresh token available");
      expect(result.rotated).toBe(false);
    });

    it("returns decrypted access token when rotation not needed", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-1",
        provider: "whoop",
        accessToken: "encrypted-access-token",
        refreshToken: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Expires in 2 days
        updatedAt: new Date(Date.now() - 60 * 60 * 1000), // Updated 1 hour ago
        isActive: true,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockIntegration]),
          }),
        }),
      } as any;

      // Set up encryption key for proper decryption
      process.env["ENCRYPTION_MASTER_KEY"] =
        "test-key-that-is-at-least-32-characters-long";

      const result = await rotateOAuthTokens(mockDb, "user-1", "whoop");

      expect(result.success).toBe(true);
      expect(result.rotated).toBe(false);
      expect(result.newAccessToken).toBe("access-token");
      expect(getDecryptedToken).toHaveBeenCalledWith("encrypted-access-token");
    });

    it("performs token rotation when needed", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-1",
        provider: "whoop",
        accessToken: "encrypted-access-token",
        refreshToken: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
        isActive: true,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockIntegration]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      } as any;

      // Mock WHOOP token refresh
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      // Set up encryption key for proper encryption
      process.env["ENCRYPTION_MASTER_KEY"] =
        "test-key-that-is-at-least-32-characters-long";

      const result = await rotateOAuthTokens(mockDb, "user-1", "whoop");

      expect(result.success).toBe(true);
      expect(result.rotated).toBe(true);
      expect(result.newAccessToken).toBe("new-access-token");
      expect(encryptToken).toHaveBeenCalledTimes(2);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("handles WHOOP token refresh failure", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-1",
        provider: "whoop",
        accessToken: "encrypted-access-token",
        refreshToken: "encrypted-refresh-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
        isActive: true,
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockIntegration]),
          }),
        }),
      } as any;

      // Disable migration to avoid update function issues
      delete process.env["ENCRYPTION_MASTER_KEY"];

      // Set up encryption key
      process.env["ENCRYPTION_MASTER_KEY"] =
        "test-key-that-is-at-least-32-characters-long";

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      } as any);

      const result = await rotateOAuthTokens(mockDb, "user-1", "whoop");

      expect(result.success).toBe(false);
      expect(result.rotated).toBe(false);
      expect(result.error).toContain("WHOOP token refresh failed");
    });
  });
});
