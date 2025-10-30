import { describe, it, expect, beforeAll, vi } from "vitest";
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
import { buildContentSecurityPolicy } from "~/lib/security-headers";

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
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await expect(decryptToken("invalid_encrypted_data")).rejects.toThrow();
      consoleErrorSpy.mockRestore();
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

  describe("Security Headers Validation", () => {
    it("should deny generic inline script execution", () => {
      const nonce = "test-nonce";
      const csp = buildContentSecurityPolicy(nonce);

      expect(csp).toContain(`script-src 'self'`);
      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    });

    it("should allow inline styles with unsafe-inline for React compatibility", () => {
      const nonce = "test-nonce";
      const csp = buildContentSecurityPolicy(nonce);

      expect(csp).toContain(`style-src 'self' 'unsafe-inline'`);
      expect(csp).not.toContain("'unsafe-hashes'");
      expect(csp).not.toContain("sha256-");
    });
  });
});
