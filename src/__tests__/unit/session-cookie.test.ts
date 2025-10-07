import { describe, it, expect, vi } from "vitest";

// Mock the env before importing
vi.mock("~/env.js", () => ({
  env: {
    WORKER_SESSION_SECRET: "test_session_secret_32_chars_minimum_123456789",
    NODE_ENV: "test",
  },
}));

import { SessionCookie, type WorkOSSession } from "~/lib/session-cookie";

describe("SessionCookie", () => {
  const validSession: WorkOSSession = {
    userId: "test-user-id",
    organizationId: "test-org-id",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  const expiredSession: WorkOSSession = {
    userId: "test-user-id",
    organizationId: "test-org-id",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) - 100, // 100 seconds ago
  };

  describe("create", () => {
    it("should create a signed session cookie string", async () => {
      const cookieString = await SessionCookie.create(validSession);

      expect(cookieString).toBeDefined();
      expect(typeof cookieString).toBe("string");
      expect(cookieString).toContain("workos_session=");
      expect(cookieString).toContain("HttpOnly");
      expect(cookieString).toContain("SameSite=lax");
    });
  });

  describe("get", () => {
    it("should extract and verify session from request cookies", async () => {
      const cookieString = await SessionCookie.create(validSession);

      // Create a mock request with the cookie
      const mockRequest = new Request("http://localhost", {
        headers: {
          cookie: cookieString,
        },
      });

      const result = await SessionCookie.get(mockRequest);

      expect(result).toEqual(validSession);
    });

    it("should return null when no session cookie exists", async () => {
      const mockRequest = new Request("http://localhost");

      const result = await SessionCookie.get(mockRequest);

      expect(result).toBeNull();
    });

    it("should return null for invalid cookie signature", async () => {
      const mockRequest = new Request("http://localhost", {
        headers: {
          cookie: "workos_session=invalid.data.signature",
        },
      });

      const result = await SessionCookie.get(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe("destroy", () => {
    it("should create a cookie deletion string", () => {
      const cookieString = SessionCookie.destroy();

      expect(cookieString).toContain("workos_session=");
      expect(cookieString).toContain("Max-Age=0");
      expect(cookieString).toContain("HttpOnly");
    });
  });

  describe("hasSession", () => {
    it("should return true when valid session exists", async () => {
      const cookieString = await SessionCookie.create(validSession);
      const mockRequest = new Request("http://localhost", {
        headers: {
          cookie: cookieString,
        },
      });

      const result = await SessionCookie.hasSession(mockRequest);

      expect(result).toBe(true);
    });

    it("should return false when no session exists", async () => {
      const mockRequest = new Request("http://localhost");

      const result = await SessionCookie.hasSession(mockRequest);

      expect(result).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("should return true for expired session", () => {
      expect(SessionCookie.isExpired(expiredSession)).toBe(true);
    });

    it("should return false for valid session", () => {
      expect(SessionCookie.isExpired(validSession)).toBe(false);
    });
  });
});
