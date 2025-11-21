/**
 * Tests for token rotation utilities
 * Tests security-critical OAuth token management functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shouldRotateToken } from "~/lib/token-rotation";

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

describe("Token Rotation Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["ENCRYPTION_MASTER_KEY"] = "test-key-32-characters-long";
    console.error = vi.fn();
    console.log = vi.fn();

    // Mock fetch for WHOOP API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
      }),
    } as Response);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    delete process.env["ENCRYPTION_MASTER_KEY"];
    vi.restoreAllMocks();
  });

  describe("shouldRotateToken", () => {
    it("should return true when forceRotation is true", () => {
      expect(shouldRotateToken(new Date(), new Date(), true)).toBe(true);
    });

    it("should return true when token is expired", () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(shouldRotateToken(pastDate, new Date())).toBe(true);
    });

    it("should return true when within 24-hour buffer and last rotation was more than 10 minutes ago", () => {
      const expiresSoon = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
      const lastRotated = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      expect(shouldRotateToken(expiresSoon, lastRotated)).toBe(true);
    });

    it("should return false when within 24-hour buffer but last rotation was less than 10 minutes ago", () => {
      const expiresSoon = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
      const lastRotated = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      expect(shouldRotateToken(expiresSoon, lastRotated)).toBe(false);
    });

    it("should return true when token is older than 7 days", () => {
      const expiresFuture = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const lastRotated = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      expect(shouldRotateToken(expiresFuture, lastRotated)).toBe(true);
    });

    it("should return true when no expiry date and never rotated", () => {
      expect(shouldRotateToken(null, null)).toBe(true);
    });

    it("should return true when no expiry date but token is older than 7 days", () => {
      const lastRotated = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      expect(shouldRotateToken(null, lastRotated)).toBe(true);
    });

    it("should return false when token is valid and not old", () => {
      const expiresFuture = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
      const lastRotated = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      expect(shouldRotateToken(expiresFuture, lastRotated)).toBe(false);
    });

    it("should handle invalid date inputs gracefully", () => {
      expect(shouldRotateToken("invalid-date", "also-invalid")).toBe(true);
    });

    it("should handle empty string inputs", () => {
      expect(shouldRotateToken("", "")).toBe(true);
    });

    it("should handle number inputs (timestamps)", () => {
      const futureTimestamp = Date.now() + 48 * 60 * 60 * 1000;
      const pastTimestamp = Date.now() - 2 * 60 * 60 * 1000;
      expect(shouldRotateToken(futureTimestamp, pastTimestamp)).toBe(false);
    });

    it("should handle null and undefined inputs", () => {
      expect(shouldRotateToken(null, undefined)).toBe(true);
      expect(shouldRotateToken(undefined, null)).toBe(true);
      expect(shouldRotateToken(undefined, undefined)).toBe(true);
    });

    it("should handle zero timestamp", () => {
      expect(shouldRotateToken(0, new Date())).toBe(true);
    });

    it("should handle negative timestamps", () => {
      expect(shouldRotateToken(-1000, new Date())).toBe(true);
    });

    it("should handle edge case exactly at buffer boundary", () => {
      const exactlyAtBuffer = new Date(Date.now() + 24 * 60 * 60 * 1000); // Exactly 24 hours
      const longAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      expect(shouldRotateToken(exactlyAtBuffer, longAgo)).toBe(false); // 24h is outside buffer (< 24h)
    });

    it("should handle edge case exactly at min rotation interval", () => {
      const expiresSoon = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const exactlyMinInterval = new Date(Date.now() - 10 * 60 * 1000); // Exactly 10 minutes
      expect(shouldRotateToken(expiresSoon, exactlyMinInterval)).toBe(true);
    });

    it("should handle edge case exactly at max token age", () => {
      const expiresFuture = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const exactlyMaxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Exactly 7 days
      expect(shouldRotateToken(expiresFuture, exactlyMaxAge)).toBe(false); // 7 days is not > 7 days
    });
  });

  describe("Token Rotation Integration", () => {
    it("should have proper function exports", async () => {
      const tokenRotationModule = await import("~/lib/token-rotation");

      expect(typeof tokenRotationModule.shouldRotateToken).toBe("function");
      expect(typeof tokenRotationModule.migrateTokens).toBe("function");
      expect(typeof tokenRotationModule.rotateOAuthTokens).toBe("function");
      expect(typeof tokenRotationModule.rotateAllExpiredTokens).toBe(
        "function",
      );
      expect(typeof tokenRotationModule.getValidAccessToken).toBe("function");
    });

    it("should handle environment variable requirements", async () => {
      // Test that functions exist and can be called (basic smoke test)
      const { shouldRotateToken } = await import("~/lib/token-rotation");

      expect(() => shouldRotateToken(new Date(), new Date())).not.toThrow();
    });
  });
});
