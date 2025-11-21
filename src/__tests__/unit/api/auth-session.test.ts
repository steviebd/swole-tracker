/**
 * Tests for /api/auth/session route
 * Tests session validation and user information retrieval
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "~/app/api/auth/session/route";
import { SessionCookie } from "~/lib/session-cookie";
import { getWorkOS } from "~/lib/workos";

// Mock dependencies
vi.mock("~/lib/session-cookie", () => ({
  SessionCookie: {
    get: vi.fn(),
    isExpired: vi.fn(),
  },
}));

vi.mock("~/lib/workos", () => ({
  getWorkOS: vi.fn(),
}));

const mockSessionCookie = SessionCookie as any;
const mockGetWorkOS = getWorkOS as any;

describe("/api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/auth/session", () => {
    it("should return 401 when no session exists", async () => {
      mockSessionCookie.get.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ user: null });
    });

    it("should return 401 when session is expired", async () => {
      const expiredSession = {
        userId: "user-123",
        accessToken: "token",
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      mockSessionCookie.get.mockResolvedValue(expiredSession);
      mockSessionCookie.isExpired.mockReturnValue(true);

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ user: null });
    });

    it("should return user data when session is valid", async () => {
      const validSession = {
        userId: "user-123",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 3600000), // Valid
      };
      mockSessionCookie.get.mockResolvedValue(validSession);
      mockSessionCookie.isExpired.mockReturnValue(false);

      const mockWorkOS = {
        userManagement: {
          getUser: vi.fn().mockResolvedValue({
            id: "user-123",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            profilePictureUrl: "https://example.com/avatar.jpg",
          }),
        },
      };
      mockGetWorkOS.mockReturnValue(mockWorkOS);

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({
        user: {
          id: "user-123",
          email: "test@example.com",
          first_name: "John",
          last_name: "Doe",
          profile_picture_url: "https://example.com/avatar.jpg",
        },
      });
    });

    it("should return basic user info when WorkOS call fails", async () => {
      const validSession = {
        userId: "user-123",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 3600000), // Valid
      };
      mockSessionCookie.get.mockResolvedValue(validSession);
      mockSessionCookie.isExpired.mockReturnValue(false);

      const mockWorkOS = {
        userManagement: {
          getUser: vi.fn().mockRejectedValue(new Error("WorkOS API error")),
        },
      };
      mockGetWorkOS.mockReturnValue(mockWorkOS);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({
        user: {
          id: "user-123",
          email: "unknown@unknown.com",
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch user from WorkOS:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should return 401 when session cookie validation throws error", async () => {
      mockSessionCookie.get.mockRejectedValue(
        new Error("Cookie parsing error"),
      );

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ user: null });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Session validation error:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should handle missing optional user fields gracefully", async () => {
      const validSession = {
        userId: "user-123",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 3600000), // Valid
      };
      mockSessionCookie.get.mockResolvedValue(validSession);
      mockSessionCookie.isExpired.mockReturnValue(false);

      const mockWorkOS = {
        userManagement: {
          getUser: vi.fn().mockResolvedValue({
            id: "user-123",
            email: "test@example.com",
            // Missing firstName, lastName, profilePictureUrl
          }),
        },
      };
      mockGetWorkOS.mockReturnValue(mockWorkOS);

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({
        user: {
          id: "user-123",
          email: "test@example.com",
          first_name: undefined,
          last_name: undefined,
          profile_picture_url: undefined,
        },
      });
    });

    it("should preserve user ID format consistently", async () => {
      const validSession = {
        userId: "auth0|user123",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 3600000), // Valid
      };
      mockSessionCookie.get.mockResolvedValue(validSession);
      mockSessionCookie.isExpired.mockReturnValue(false);

      const mockWorkOS = {
        userManagement: {
          getUser: vi.fn().mockResolvedValue({
            id: "auth0|user123",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
          }),
        },
      };
      mockGetWorkOS.mockReturnValue(mockWorkOS);

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.user.id).toBe("auth0|user123");
    });
  });

  describe("Edge Cases", () => {
    it("should handle malformed session data", async () => {
      mockSessionCookie.get.mockResolvedValue({ invalid: "data" });
      mockSessionCookie.isExpired.mockReturnValue(false);

      const mockWorkOS = {
        userManagement: {
          getUser: vi.fn().mockResolvedValue({
            id: "user-123",
            email: "test@example.com",
          }),
        },
      };
      mockGetWorkOS.mockReturnValue(mockWorkOS);

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      // Should still attempt to process with whatever data is available
      expect(response.status).toBe(200);
    });

    it("should handle network timeouts gracefully", async () => {
      const validSession = {
        userId: "user-123",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 3600000), // Valid
      };
      mockSessionCookie.get.mockResolvedValue(validSession);
      mockSessionCookie.isExpired.mockReturnValue(false);

      const mockWorkOS = {
        userManagement: {
          getUser: vi.fn().mockRejectedValue(new Error("ETIMEDOUT")),
        },
      };
      mockGetWorkOS.mockReturnValue(mockWorkOS);

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const request = new NextRequest("http://localhost:3000/api/auth/session");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.user.id).toBe("user-123");
      expect(json.user.email).toBe("unknown@unknown.com");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch user from WorkOS:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });
});
