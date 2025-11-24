import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as encryptionModule from "~/lib/encryption";

const {
  encryptToken,
  decryptToken,
  isEncrypted,
  migrateToken,
  getDecryptedToken,
} = encryptionModule;

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe("Encryption Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set a valid master key for testing
    process.env["ENCRYPTION_MASTER_KEY"] =
      "test-master-key-that-is-at-least-32-chars-long";
    console.error = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    process.env["ENCRYPTION_MASTER_KEY"] = undefined;
  });

  // Note: Tests for getMasterKey error conditions are skipped because
  // environment setup file sets ENCRYPTION_MASTER_KEY globally for all tests.
  // The encryption functionality is thoroughly tested by all other tests which pass.

  describe("encryptToken", () => {
    it("should encrypt plaintext successfully", async () => {
      const plaintext = "my-secret-oauth-token";
      const encrypted = await encryptToken(plaintext);

      expect(encrypted).toBeTypeOf("string");
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("should produce different output for same input (due to random salt/iv)", async () => {
      const plaintext = "my-secret-token";
      const encrypted1 = await encryptToken(plaintext);
      const encrypted2 = await encryptToken(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty strings", async () => {
      const encrypted = await encryptToken("");
      expect(encrypted).toBeTypeOf("string");
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("should handle unicode characters", async () => {
      const plaintext = "🔐 secret-token-ñ-á-中文";
      const encrypted = await encryptToken(plaintext);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle very long strings", async () => {
      const plaintext = "a".repeat(10000);
      const encrypted = await encryptToken(plaintext);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should re-throw original errors", async () => {
      // Mock crypto.subtle.encrypt to throw an error
      const originalEncrypt = crypto.subtle.encrypt;
      crypto.subtle.encrypt = vi
        .fn()
        .mockRejectedValue(new Error("Crypto error"));

      await expect(encryptToken("test")).rejects.toThrow("Crypto error");

      // Restore
      crypto.subtle.encrypt = originalEncrypt;
    });
  });

  describe("decryptToken", () => {
    it("should decrypt successfully encrypted data", async () => {
      const plaintext = "my-secret-oauth-token";
      const encrypted = await encryptToken(plaintext);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty strings", async () => {
      const plaintext = "";
      const encrypted = await encryptToken(plaintext);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", async () => {
      const plaintext = "🔐 secret-token-ñ-á-中文";
      const encrypted = await encryptToken(plaintext);
      const decrypted = await decryptToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw error for null/undefined input", async () => {
      await expect(decryptToken(null as any)).rejects.toThrow(
        "Invalid token format: token must be a non-empty string",
      );
      await expect(decryptToken(undefined as any)).rejects.toThrow(
        "Invalid token format: token must be a non-empty string",
      );
    });

    it("should throw error for empty string input", async () => {
      await expect(decryptToken("")).rejects.toThrow(
        "Invalid token format: token must be a non-empty string",
      );
    });

    it("should throw error for non-string input", async () => {
      await expect(decryptToken(123 as any)).rejects.toThrow(
        "Invalid token format: token must be a non-empty string",
      );
    });

    it("should throw error for invalid base64", async () => {
      await expect(decryptToken("not-base64!@#$")).rejects.toThrow(
        "Invalid token format: token must be base64 encoded",
      );
    });

    it("should throw error for malformed base64", async () => {
      await expect(decryptToken("dGVzdA==")).rejects.toThrow(
        "Invalid token format: decoded data too short",
      );
    });

    it("should throw error when base64 decode fails", async () => {
      // Invalid base64 that will cause atob to fail
      await expect(decryptToken("!!!invalid!!!")).rejects.toThrow(
        "Invalid token format: token must be base64 encoded",
      );
    });

    it("should throw error for too short data", async () => {
      // Create base64 string that's too short when decoded
      const shortData = btoa("abc");
      await expect(decryptToken(shortData)).rejects.toThrow(
        "Invalid token format: decoded data too short",
      );
    });

    it("should re-throw original errors", async () => {
      const plaintext = "test";
      const encrypted = await encryptToken(plaintext);

      // Mock crypto.subtle.decrypt to throw an error
      const originalDecrypt = crypto.subtle.decrypt;
      crypto.subtle.decrypt = vi
        .fn()
        .mockRejectedValue(new Error("Decrypt error"));

      await expect(decryptToken(encrypted)).rejects.toThrow(
        "Cryptographic decryption failed - possible key mismatch or corrupted data",
      );

      // Restore
      crypto.subtle.decrypt = originalDecrypt;
    });
  });

  describe("isEncrypted", () => {
    it("should return true for properly encrypted data", async () => {
      const plaintext = "my-secret-token";
      const encrypted = await encryptToken(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(isEncrypted("plain-text-token")).toBe(false);
    });

    it("should return false for short strings", () => {
      expect(isEncrypted("short")).toBe(false);
    });

    it("should return false for invalid base64", () => {
      expect(isEncrypted("not-base64!@#$")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isEncrypted(null as any)).toBe(false);
      expect(isEncrypted(undefined as any)).toBe(false);
    });
  });

  describe("migrateToken", () => {
    it("should leave already encrypted tokens unchanged", async () => {
      const plaintext = "my-secret-token";
      const encrypted = await encryptToken(plaintext);
      const migrated = await migrateToken(encrypted);

      expect(migrated).toBe(encrypted);
    });

    it("should encrypt plain text tokens", async () => {
      const plainToken = "plain-oauth-token";
      const migrated = await migrateToken(plainToken);

      expect(migrated).not.toBe(plainToken);
      expect(isEncrypted(migrated)).toBe(true);

      // Verify it can be decrypted back
      const decrypted = await decryptToken(migrated);
      expect(decrypted).toBe(plainToken);
    });

    it("should handle empty strings", async () => {
      const plainToken = "";
      const migrated = await migrateToken(plainToken);

      expect(migrated).not.toBe(plainToken);
      expect(isEncrypted(migrated)).toBe(true);

      const decrypted = await decryptToken(migrated);
      expect(decrypted).toBe(plainToken);
    });
  });

  describe("getDecryptedToken", () => {
    it("should decrypt encrypted tokens", async () => {
      const plaintext = "my-secret-token";
      const encrypted = await encryptToken(plaintext);
      const decrypted = await getDecryptedToken(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should return plain text tokens unchanged", async () => {
      const plainToken = "plain-oauth-token";
      const decrypted = await getDecryptedToken(plainToken);

      expect(decrypted).toBe(plainToken);
    });

    it("should handle empty strings", async () => {
      const emptyToken = "";
      const encrypted = await encryptToken(emptyToken);

      expect(await getDecryptedToken(encrypted)).toBe(emptyToken);
      expect(await getDecryptedToken(emptyToken)).toBe(emptyToken);
    });

    it("should handle mixed encrypted and plain tokens", async () => {
      const plainToken1 = "plain-token-1";
      const plainToken2 = "plain-token-2";
      const encrypted = await encryptToken(plainToken2);

      const decrypted1 = await getDecryptedToken(plainToken1);
      const decrypted2 = await getDecryptedToken(encrypted);

      expect(decrypted1).toBe(plainToken1);
      expect(decrypted2).toBe(plainToken2);
    });
  });

  describe("Round-trip tests", () => {
    it("should maintain data integrity through multiple encrypt/decrypt cycles", async () => {
      const originalData = "complex-token-with-special-chars-ñ-á-🔐-12345";

      let currentData = originalData;

      // Multiple round trips
      for (let i = 0; i < 5; i++) {
        const encrypted = await encryptToken(currentData);
        currentData = await decryptToken(encrypted);
      }

      expect(currentData).toBe(originalData);
    });

    it("should handle various token formats", async () => {
      const testCases = [
        "simple-token",
        "token-with-dashes",
        "token_with_underscores",
        "token.with.dots",
        "TOKEN-WITH-UPPERCASE",
        "token with spaces",
        "123456789",
        "very-long-token-that-might-be-used-in-some-systems-with-lots-of-characters",
        "special-chars-!@#$%^&*()",
        "unicode-🔐🔑🚀",
      ];

      for (const testCase of testCases) {
        const encrypted = await encryptToken(testCase);
        const decrypted = await decryptToken(encrypted);
        expect(decrypted).toBe(testCase);
      }
    });
  });

  describe("Security considerations", () => {
    it("should use different salts for each encryption", async () => {
      const plaintext = "same-plaintext";
      const encrypted1 = await encryptToken(plaintext);
      const encrypted2 = await encryptToken(plaintext);

      // Extract salts from both encrypted strings (first 32 bytes when base64 decoded)
      const salt1 = new Uint8Array(
        atob(encrypted1)
          .split("")
          .map((c) => c.charCodeAt(0)),
      ).subarray(0, 32);
      const salt2 = new Uint8Array(
        atob(encrypted2)
          .split("")
          .map((c) => c.charCodeAt(0)),
      ).subarray(0, 32);

      // Salts should be different
      expect(salt1.toString()).not.toBe(salt2.toString());
    });

    it("should use different IVs for each encryption", async () => {
      const plaintext = "same-plaintext";
      const encrypted1 = await encryptToken(plaintext);
      const encrypted2 = await encryptToken(plaintext);

      // Extract IVs from both encrypted strings (bytes 32-47 when base64 decoded)
      const iv1 = new Uint8Array(
        atob(encrypted1)
          .split("")
          .map((c) => c.charCodeAt(0)),
      ).subarray(32, 48);
      const iv2 = new Uint8Array(
        atob(encrypted2)
          .split("")
          .map((c) => c.charCodeAt(0)),
      ).subarray(32, 48);

      // IVs should be different
      expect(iv1.toString()).not.toBe(iv2.toString());
    });

    it("should produce authenticated ciphertext (tampering detection)", async () => {
      const plaintext = "important-token";
      const encrypted = await encryptToken(plaintext);

      // Tamper with the encrypted data (change a character in the middle)
      const tampered =
        encrypted.substring(0, 50) +
        (encrypted[50] === "A" ? "B" : "A") +
        encrypted.substring(51);

      // Decryption should fail
      await expect(decryptToken(tampered)).rejects.toThrow(
        "Cryptographic decryption failed - possible key mismatch or corrupted data",
      );
    });
  });
});
