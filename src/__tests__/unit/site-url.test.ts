import { describe, it, expect, vi } from "vitest";
import {
  resolveSiteUrl,
  resolveWorkOSRedirectUri,
  resolveWhoopRedirectUri,
} from "~/lib/site-url";

// Mock the env module to ensure tests use localhost regardless of CI environment
vi.mock("~/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000", // Force use of localhost for tests
    WHOOP_REDIRECT_URI: undefined, // Force fallback to default
  },
}));

describe("site-url utilities", () => {
  describe("resolveSiteUrl", () => {
    it("should return default localhost URL when no env or preferred", () => {
      expect(resolveSiteUrl()).toBe("http://localhost:3000");
    });

    it("should return env URL when preferred is provided but env takes precedence", () => {
      // In the current implementation, env takes precedence over preferred
      expect(resolveSiteUrl("https://example.com")).toBe(
        "http://localhost:3000",
      );
    });

    it("should extract origin from URL object but env takes precedence", () => {
      const url = new URL("https://example.com/path");
      expect(resolveSiteUrl(url)).toBe("http://localhost:3000");
    });

    it("should extract origin from object with origin property but env takes precedence", () => {
      const obj = { origin: "https://example.com" };
      expect(resolveSiteUrl(obj)).toBe("http://localhost:3000");
    });
  });

  describe("resolveWorkOSRedirectUri", () => {
    it("should append /api/auth/callback to resolved site URL", () => {
      expect(resolveWorkOSRedirectUri()).toBe(
        "http://localhost:3000/api/auth/callback",
      );
      // Env takes precedence, so preferred is ignored
      expect(resolveWorkOSRedirectUri("https://example.com")).toBe(
        "http://localhost:3000/api/auth/callback",
      );
    });
  });

  describe("resolveWhoopRedirectUri", () => {
    it("should append /api/auth/whoop/callback when no env var", () => {
      expect(resolveWhoopRedirectUri()).toBe(
        "http://localhost:3000/api/auth/whoop/callback",
      );
      // Env takes precedence, so preferred is ignored
      expect(resolveWhoopRedirectUri("https://example.com")).toBe(
        "http://localhost:3000/api/auth/whoop/callback",
      );
    });
  });
});
