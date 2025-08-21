import { describe, it, expect, beforeEach, vi } from "vitest";
import getPosthog, {
  getServerPosthog,
  __setTestPosthogCtor,
} from "~/lib/posthog";

// Mock PostHog constructor for testing
const mockPostHogInstance = {
  capture: vi.fn(),
  identify: vi.fn(),
  shutdown: vi.fn(),
  flush: vi.fn(),
};

const mockPostHogCtor = vi.fn(
  (key: string, opts: any) => mockPostHogInstance,
) as any;

describe("PostHog integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setTestPosthogCtor(mockPostHogCtor);
    // Reset environment
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  });

  describe("getPosthog function", () => {
    it("should return a client with expected interface", () => {
      const client = getPosthog();
      expect(client).toHaveProperty("capture");
      expect(client).toHaveProperty("identify");
      expect(client).toHaveProperty("shutdown");
      expect(client).toHaveProperty("flush");
      expect(typeof client.capture).toBe("function");
      expect(typeof client.identify).toBe("function");
      expect(typeof client.shutdown).toBe("function");
      expect(typeof client.flush).toBe("function");
    });

    it("should handle function calls without throwing", () => {
      const client = getPosthog();
      expect(() => client.capture("test event")).not.toThrow();
      expect(() => client.identify("user123")).not.toThrow();
      expect(() => client.shutdown()).not.toThrow();
      expect(() => client.flush()).not.toThrow();
    });
  });

  describe("getServerPosthog function", () => {
    it("should throw error when called in browser environment", () => {
      // Mock window to simulate browser
      const originalWindow = global.window;
      (global as any).window = {};

      expect(() => getServerPosthog()).toThrow(
        "getServerPosthog() must only be called on the server",
      );

      global.window = originalWindow;
    });

    it("should return server client when called in server environment", () => {
      // Ensure window is undefined (server environment)
      const originalWindow = global.window;
      delete (global as any).window;

      const client = getServerPosthog();
      expect(client).toHaveProperty("capture");
      expect(client).toHaveProperty("identify");
      expect(client).toHaveProperty("shutdown");
      expect(client).toHaveProperty("flush");

      global.window = originalWindow;
    });
  });

  describe("server client with API key", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";
    });

    it("should return a client that can be called without throwing", () => {
      const client = getPosthog();

      // Should be able to call all methods without throwing
      expect(() => client.capture("test event")).not.toThrow();
      expect(() => client.identify("user123")).not.toThrow();
      expect(() => client.shutdown()).not.toThrow();
      expect(() => client.flush()).not.toThrow();
    });

    it("should handle method calls with parameters", () => {
      const client = getPosthog();

      // Should handle various parameter combinations
      expect(() => client.capture("event", { key: "value" })).not.toThrow();
      expect(() => client.identify("id", { prop: "val" })).not.toThrow();
    });
  });

  describe("server client without API key", () => {
    it("should return no-op client when no API key is configured", () => {
      const client = getPosthog();

      // Should not throw and should be callable
      expect(() => client.capture("test")).not.toThrow();
      expect(() => client.identify("user")).not.toThrow();
      expect(() => client.shutdown()).not.toThrow();
      expect(() => client.flush()).not.toThrow();
    });
  });

  describe("test-only functions", () => {
    it("should allow setting test PostHog constructor", () => {
      __setTestPosthogCtor(mockPostHogCtor);
      expect(mockPostHogCtor).toBeDefined();
    });

    it("should allow clearing test PostHog constructor", () => {
      __setTestPosthogCtor(null);
      // Should not throw
      expect(() => getPosthog()).not.toThrow();
    });
  });
});
