import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SessionCookie,
  type WorkOSSession,
  setSessionCookieDbForTesting,
  resetSessionCookieDbForTesting,
} from "~/lib/session-cookie";

// Mock database store
const mockSessions: any[] = [];

type MockDb = Parameters<typeof setSessionCookieDbForTesting>[0];

let mockDb: MockDb;

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

    const insert = vi.fn(() => ({
      values: vi.fn((data: any) => {
        mockSessions.push(data);
        return Promise.resolve();
      }),
    }));

    const select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => {
            const lastSession = mockSessions[mockSessions.length - 1];
            return Promise.resolve(lastSession ? [lastSession] : []);
          }),
        })),
      })),
    }));

    const remove = vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    }));

    const update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    }));

    mockDb = {
      insert,
      select,
      delete: remove,
      update,
    } as unknown as MockDb;

    setSessionCookieDbForTesting(mockDb);
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
    it("should extract and verify session from request cookies", async () => {
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

    it("should parse session when refresh token is missing", async () => {
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

  describe("destroy", () => {
    it("should create a cookie deletion string", async () => {
      const mockRequest = new Request("http://localhost");
      const cookieString = await SessionCookie.destroy(mockRequest);

      expect(cookieString).toContain("workos_session=");
      expect(cookieString).toContain("Max-Age=0");
      expect(cookieString).toContain("HttpOnly");
    });
  });

  describe("hasSession", () => {
    it("should return true when valid session exists", async () => {
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

  describe("isExpired", () => {
    it("should return true for expired session", () => {
      expect(SessionCookie.isExpired(expiredSession)).toBe(true);
    });

    it("should return false for valid session", () => {
      expect(SessionCookie.isExpired(validSession)).toBe(false);
    });
  });
});
