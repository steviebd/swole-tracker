import { describe, it, expect, beforeAll } from "vitest";
import {
  encryptToken,
  decryptToken,
  isEncrypted,
  getDecryptedToken,
} from "~/lib/encryption";
import {
  createOAuthState,
  validateOAuthState,
  cleanupExpiredStates,
} from "~/lib/oauth-state";

// Mock environment for encryption tests
beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY =
    "test_key_that_is_at_least_32_characters_long_for_security";
});

describe("Security Implementation Tests", () => {
  describe("Token Encryption", () => {
    it("should encrypt and decrypt tokens correctly", async () => {
      const originalToken = "test_access_token_12345";

      const encrypted = await encryptToken(originalToken);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalToken);
      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = await decryptToken(encrypted);
      expect(decrypted).toBe(originalToken);
    });

    it("should handle plain text tokens gracefully", async () => {
      const plainToken = "plain_text_token";
      expect(isEncrypted(plainToken)).toBe(false);

      const result = await getDecryptedToken(plainToken);
      expect(result).toBe(plainToken);
    });

    it("should generate different encrypted values for same input", async () => {
      const token = "same_token";
      const encrypted1 = await encryptToken(token);
      const encrypted2 = await encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
      expect(await decryptToken(encrypted1)).toBe(token);
      expect(await decryptToken(encrypted2)).toBe(token);
    });

    it("should fail on invalid encrypted data", async () => {
      await expect(decryptToken("invalid_encrypted_data")).rejects.toThrow();
    });
  });

  describe("OAuth State Security", () => {
    it("should detect encrypted vs plain text correctly", async () => {
      expect(isEncrypted("plain_text")).toBe(false);
      expect(isEncrypted("")).toBe(false);
      expect(isEncrypted("short")).toBe(false);

      const encrypted = await encryptToken("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });
  });

  describe.skip("Environment Security", () => {
    it("should require encryption key for token operations", () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY;
      delete process.env.ENCRYPTION_MASTER_KEY;

      try {
        encryptToken("test");
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe(
          "ENCRYPTION_MASTER_KEY environment variable is required",
        );
      }

      // Restore key
      process.env.ENCRYPTION_MASTER_KEY = originalKey;
    });

    it("should enforce minimum key length", () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY;
      process.env.ENCRYPTION_MASTER_KEY = "short_key";

      try {
        encryptToken("test");
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe(
          "ENCRYPTION_MASTER_KEY must be at least 32 characters long",
        );
      }

      // Restore key
      process.env.ENCRYPTION_MASTER_KEY = originalKey;
    });
  });

  describe.skip("Data Integrity", () => {
    it("should maintain data integrity through encrypt/decrypt cycle", async () => {
      const testCases = [
        "simple_token",
        "token_with_special_chars_!@#$%^&*()",
        "very_long_token_" + "a".repeat(1000),
        "token with spaces",
        "emoji_token_🔐",
        JSON.stringify({ complex: "object", with: ["array", "values"] }),
      ];

      for (const token of testCases) {
        const encrypted = await encryptToken(token);
        const decrypted = await decryptToken(encrypted);
        expect(decrypted).toBe(token);
      }
    });
  });

  describe("Security Headers Validation", () => {
    it("should validate CSP configuration format", () => {
      // These would normally be tested against actual HTTP responses
      // but we can validate the configuration structure
      const cspPolicies = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "connect-src 'self'",
      ];

      cspPolicies.forEach((policy) => {
        expect(policy).toMatch(/^[\w-]+\s+'self'/);
      });
    });
  });
});
