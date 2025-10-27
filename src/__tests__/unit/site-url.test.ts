import { describe, it, expect, vi } from "vitest";
import {
  resolveSiteUrl,
  resolveWorkOSRedirectUri,
  resolveWhoopRedirectUri,
} from "~/lib/site-url";

// Mock env and logger
vi.mock("~/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: undefined,
    WHOOP_REDIRECT_URI: undefined,
  },
}));

vi.mock("~/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe("site-url utilities", () => {
  describe("resolveSiteUrl", () => {
    it("should return default localhost URL when no env or preferred", () => {
      expect(resolveSiteUrl()).toBe("http://localhost:3000");
    });

    it("should return preferred URL when provided", () => {
      expect(resolveSiteUrl("https://example.com")).toBe("https://example.com");
    });

    it("should extract origin from URL object", () => {
      const url = new URL("https://example.com/path");
      expect(resolveSiteUrl(url)).toBe("https://example.com");
    });

    it("should extract origin from object with origin property", () => {
      const obj = { origin: "https://example.com" };
      expect(resolveSiteUrl(obj)).toBe("https://example.com");
    });
  });

  describe("resolveWorkOSRedirectUri", () => {
    it("should append /api/auth/callback to resolved site URL", () => {
      expect(resolveWorkOSRedirectUri()).toBe(
        "http://localhost:3000/api/auth/callback",
      );
      expect(resolveWorkOSRedirectUri("https://example.com")).toBe(
        "https://example.com/api/auth/callback",
      );
    });
  });

  describe("resolveWhoopRedirectUri", () => {
    it("should append /api/auth/whoop/callback when no env var", () => {
      expect(resolveWhoopRedirectUri()).toBe(
        "http://localhost:3000/api/auth/whoop/callback",
      );
      expect(resolveWhoopRedirectUri("https://example.com")).toBe(
        "https://example.com/api/auth/whoop/callback",
      );
    });
  });
});
