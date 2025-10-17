import { describe, it, expect } from "vitest";
import { shouldRotateToken } from "~/lib/token-rotation";

describe("token rotation", () => {
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
  });
});
