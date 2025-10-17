import { describe, it, expect, vi } from "vitest";
import {
  createNonce,
  buildContentSecurityPolicy,
  applySecurityHeaders,
  withNonceHeader,
  isApiRoute,
  SECURITY_HEADER_VALUES,
  API_ROBOTS_VALUE,
  NONCE_HEADER_KEY,
} from "~/lib/security-headers";

describe("security headers", () => {
  describe("createNonce", () => {
    it("creates a nonce using crypto.randomUUID when available", () => {
      const mockRandomUUID = vi.fn().mockReturnValue("test-uuid");
      const nonce = createNonce({ randomUUID: mockRandomUUID });
      expect(nonce).toBe("test-uuid");
      expect(mockRandomUUID).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("creates a nonce using crypto.getRandomValues when randomUUID not available", () => {
      const mockGetRandomValues = vi.fn((array: Uint8Array) => array);
      createNonce({ getRandomValues: mockGetRandomValues });
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));

      vi.restoreAllMocks();
    });
  });

  describe("buildContentSecurityPolicy", () => {
    it("builds CSP with nonce", () => {
      const nonce = "test-nonce";
      const csp = buildContentSecurityPolicy(nonce);

      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("https://us.i.posthog.com");
      expect(csp).toContain("https://api.prod.whoop.com");
    });
  });

  describe("applySecurityHeaders", () => {
    it("applies security headers to response", () => {
      const mockResponse = {
        headers: {
          set: vi.fn(),
        },
      } as any;

      const nonce = "test-nonce";
      const result = applySecurityHeaders(mockResponse, {
        nonce,
        isApiRoute: false,
      });

      expect(result).toBe(mockResponse);
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.any(String),
      );
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        "X-Frame-Options",
        "DENY",
      );
      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        "X-Content-Type-Options",
        "nosniff",
      );
      expect(mockResponse.headers.set).toHaveBeenCalledWith("x-nonce", nonce);
    });

    it("applies X-Robots-Tag for API routes", () => {
      const mockResponse = {
        headers: {
          set: vi.fn(),
        },
      } as any;

      applySecurityHeaders(mockResponse, { nonce: "test", isApiRoute: true });

      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        "X-Robots-Tag",
        API_ROBOTS_VALUE,
      );
    });
  });

  describe("withNonceHeader", () => {
    it("adds nonce header to headers", () => {
      const headers = new Headers({ existing: "value" });
      const result = withNonceHeader(headers, "test-nonce");

      expect(result.get(NONCE_HEADER_KEY)).toBe("test-nonce");
      expect(result.get("existing")).toBe("value");
    });
  });

  describe("isApiRoute", () => {
    it("returns true for /api/ paths", () => {
      expect(isApiRoute("/api/test")).toBe(true);
      expect(isApiRoute("/api/")).toBe(true);
    });

    it("returns true for /trpc paths", () => {
      expect(isApiRoute("/trpc/test")).toBe(true);
      expect(isApiRoute("/trpc")).toBe(true);
    });

    it("returns false for non-API paths", () => {
      expect(isApiRoute("/")).toBe(false);
      expect(isApiRoute("/workouts")).toBe(false);
      expect(isApiRoute("/api")).toBe(false); // doesn't start with /api/
    });
  });

  describe("constants", () => {
    it("exports SECURITY_HEADER_VALUES", () => {
      expect(SECURITY_HEADER_VALUES).toHaveProperty("X-Frame-Options", "DENY");
      expect(SECURITY_HEADER_VALUES).toHaveProperty(
        "X-Content-Type-Options",
        "nosniff",
      );
    });

    it("exports API_ROBOTS_VALUE", () => {
      expect(API_ROBOTS_VALUE).toBe("noindex");
    });

    it("exports NONCE_HEADER_KEY", () => {
      expect(NONCE_HEADER_KEY).toBe("x-nonce");
    });
  });
});
