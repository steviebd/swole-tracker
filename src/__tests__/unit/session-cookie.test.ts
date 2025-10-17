// Set env vars for testing
process.env.WORKER_SESSION_SECRET = "test-secret-for-testing-1234567890";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createDrizzleMock } from "~/__tests__/test-utils/mock-factories";

// Mock crypto globally for this test file
Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: {
      importKey: vi.fn().mockResolvedValue({}),
      sign: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])), // Mock signature as Uint8Array
      verify: vi.fn().mockResolvedValue(true),
    },
    randomUUID: vi.fn(() => "test-session-uuid-123"),
    getRandomValues: vi.fn(),
  },
  writable: true,
});

import {
  SessionCookie,
  type WorkOSSession,
  setSessionCookieDbForTesting,
  resetSessionCookieDbForTesting,
} from "~/lib/session-cookie";

// Mock database store
const mockSessions: any[] = [];

describe("SessionCookie", () => {
  const validSession: WorkOSSession = {
    userId: "test-user-id",
    organizationId: "test-org-id",
    accessToken: "test.access.token",
    refreshToken: "test.refresh.token",
    expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  const expiredSession: WorkOSSession = {
    userId: "test-user-id",
    organizationId: "test-org-id",
    accessToken: "test.access.token",
    refreshToken: "test.refresh.token",
    expiresAt: Math.floor(Date.now() / 1000) - 100, // 100 seconds ago
  };

  const createRequestWithCookie = (cookieHeader?: string) =>
    ({
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "cookie" && cookieHeader ? cookieHeader : null,
      },
    }) as unknown as Request;

  beforeEach(() => {
    mockSessions.length = 0; // Clear sessions
    vi.clearAllMocks();

    const mockDb = createDrizzleMock();

    setSessionCookieDbForTesting(mockDb as any);
  });

  afterEach(() => {
    resetSessionCookieDbForTesting();
  });

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
    it.skip("should extract and verify session from request cookies", async () => {
      const cookieString = await SessionCookie.create(validSession);

      const mockRequest = createRequestWithCookie(cookieString);

      const result = await SessionCookie.get(mockRequest);

      expect(result).toEqual(validSession);
    });

    it("should return null when no session cookie exists", async () => {
      const mockRequest = createRequestWithCookie();

      const result = await SessionCookie.get(mockRequest);

      expect(result).toBeNull();
    });

    it("should return null for invalid cookie signature", async () => {
      const mockRequest = createRequestWithCookie(
        "workos_session=invalid.data.signature",
      );

      const result = await SessionCookie.get(mockRequest);

      expect(result).toBeNull();
    });

    it.skip("should parse session when refresh token is missing", async () => {
      const sessionWithoutRefresh: WorkOSSession = {
        ...validSession,
        refreshToken: null,
      };

      const cookieString = await SessionCookie.create(sessionWithoutRefresh);
      const mockRequest = createRequestWithCookie(cookieString);

      const result = await SessionCookie.get(mockRequest);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(validSession.userId);
      expect(result?.refreshToken).toBeNull();
    });
  });

  describe("hasSession", () => {
    it.skip("should return true when valid session exists", async () => {
      const cookieString = await SessionCookie.create(validSession);
      const mockRequest = createRequestWithCookie(cookieString);

      const result = await SessionCookie.hasSession(mockRequest);

      expect(result).toBe(true);
    });

    it("should return false when no session exists", async () => {
      const mockRequest = createRequestWithCookie();

      const result = await SessionCookie.hasSession(mockRequest);

      expect(result).toBe(false);
    });
  });

  describe("destroy", () => {
    it("should create a cookie deletion string", async () => {
      const mockRequest = new Request("http://localhost");
      const cookieString = await SessionCookie.destroy(mockRequest);

      expect(cookieString).toContain("workos_session=");
      expect(cookieString).toContain("Max-Age=0");
      expect(cookieString).toContain("HttpOnly");
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
