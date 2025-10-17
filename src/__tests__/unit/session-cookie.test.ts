// Set env vars for testing
process.env.WORKER_SESSION_SECRET = "test-secret-for-testing-1234567890";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  SessionCookie,
  type WorkOSSession,
  setSessionCookieDbForTesting,
  resetSessionCookieDbForTesting,
} from "~/lib/session-cookie";

type SessionRow = {
  id: string;
  userId: string;
  organizationId: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

function createSessionDbMock() {
  const store = new Map<string, SessionRow>();

  return {
    insert: vi.fn(() => ({
      values: async (value: SessionRow) => {
        store.set(value.id, { ...value });
      },
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: async () => {
            const [first] = Array.from(store.values());
            return first ? [first] : [];
          },
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => {
        store.clear();
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((patch: Partial<SessionRow>) => ({
        where: vi.fn(async () => {
          for (const [id, existing] of store.entries()) {
            store.set(id, { ...existing, ...patch });
          }
        }),
      })),
    })),
    setSession(session: SessionRow) {
      store.set(session.id, { ...session });
    },
  };
}

describe("SessionCookie", () => {
  let mockDb: ReturnType<typeof createSessionDbMock>;
  let originalCrypto: Crypto;

  const validSession: WorkOSSession = {
    userId: "test-user-id",
    organizationId: "test-org-id",
    accessToken: "test.access.token",
    refreshToken: "test.refresh.token",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };

  const expiredSession: WorkOSSession = {
    userId: "test-user-id",
    organizationId: "test-org-id",
    accessToken: "test.access.token",
    refreshToken: "test.refresh.token",
    expiresAt: Math.floor(Date.now() / 1000) - 100,
  };

  const createRequestWithCookie = (cookieHeader?: string) =>
    ({
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "cookie" && cookieHeader ? cookieHeader : null,
      },
    }) as unknown as Request;

  beforeEach(() => {
    mockDb = createSessionDbMock();
    setSessionCookieDbForTesting(mockDb as any);

    originalCrypto = globalThis.crypto;

    const cryptoMock = {
      subtle: {
        importKey: vi.fn().mockResolvedValue({}),
        sign: vi
          .fn()
          .mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])),
        verify: vi.fn().mockResolvedValue(true),
        decrypt: vi.fn(),
        deriveBits: vi.fn(),
        deriveKey: vi.fn(),
        digest: vi.fn(),
        encrypt: vi.fn(),
        generateKey: vi.fn(),
        wrapKey: vi.fn(),
        unwrapKey: vi.fn(),
        exportKey: vi.fn(),
      },
      randomUUID: vi.fn(() => "session-id-123") as any,
      getRandomValues: vi.fn((array: ArrayBufferView) => array),
    } satisfies Crypto;

    Object.defineProperty(globalThis, "crypto", {
      value: cryptoMock,
      writable: true,
    });
  });

  afterEach(() => {
    resetSessionCookieDbForTesting();
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      writable: true,
    });
  });

  describe("create", () => {
    it("should create a signed session cookie string", async () => {
      const cookieString = await SessionCookie.create(validSession);

      expect(cookieString).toBeDefined();
      expect(cookieString).toContain("workos_session=");
      expect(cookieString).toContain("HttpOnly");
      expect(cookieString).toContain("SameSite=lax");
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("should extract and verify session from request cookies", async () => {
      const sessionId = "session-123";
      const cookieString = `workos_session=${encodeURIComponent(`${sessionId}.signed`)}`;
      mockDb.setSession({
        id: sessionId,
        userId: validSession.userId,
        organizationId: validSession.organizationId ?? null,
        accessToken: validSession.accessToken,
        refreshToken: validSession.refreshToken,
        expiresAt: validSession.expiresAt,
      });

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

      const sessionId = "session-456";
      const cookieString = `workos_session=${encodeURIComponent(`${sessionId}.signed`)}`;
      mockDb.setSession({
        id: sessionId,
        userId: sessionWithoutRefresh.userId,
        organizationId: sessionWithoutRefresh.organizationId ?? null,
        accessToken: sessionWithoutRefresh.accessToken,
        refreshToken: sessionWithoutRefresh.refreshToken,
        expiresAt: sessionWithoutRefresh.expiresAt,
      });

      const mockRequest = createRequestWithCookie(cookieString);
      const result = await SessionCookie.get(mockRequest);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(validSession.userId);
      expect(result?.refreshToken).toBeNull();
    });
  });

  describe("hasSession", () => {
    it("should return true when valid session exists", async () => {
      const sessionId = "session-789";
      const cookieString = `workos_session=${encodeURIComponent(`${sessionId}.signed`)}`;
      mockDb.setSession({
        id: sessionId,
        userId: validSession.userId,
        organizationId: validSession.organizationId ?? null,
        accessToken: validSession.accessToken,
        refreshToken: validSession.refreshToken,
        expiresAt: validSession.expiresAt,
      });

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
