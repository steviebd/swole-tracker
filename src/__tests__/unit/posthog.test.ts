import { describe, it, expect, vi, beforeEach } from "vitest";
import getPosthog, {
  getServerPosthog,
  __setTestPosthogCtor,
  __resetTestPosthogClient,
} from "~/lib/posthog";

describe("posthog", () => {
  beforeEach(() => {
    __setTestPosthogCtor(null);
    __resetTestPosthogClient();
    // Reset environment
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  });

  describe("getPosthog", () => {
    it("returns browser client in browser environment", () => {
      const originalWindow = global.window;
      global.window = {} as any;

      const client = getPosthog();
      expect(client).toHaveProperty("capture");
      expect(client).toHaveProperty("identify");
      expect(client).toHaveProperty("shutdown");
      expect(client).toHaveProperty("flush");

      // Test that methods are no-ops
      expect(() => {
        client.capture("test");
        client.identify("test");
        client.shutdown();
        client.flush();
      }).not.toThrow();

      global.window = originalWindow;
    });

    it("returns server client in server environment", () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const client = getPosthog();
      expect(client).toHaveProperty("capture");
      expect(client).toHaveProperty("identify");
      expect(client).toHaveProperty("shutdown");
      expect(client).toHaveProperty("flush");

      global.window = originalWindow;
    });
  });

  describe("getServerPosthog", () => {
    it("throws error when called in browser environment", () => {
      const originalWindow = global.window;
      global.window = {} as any;

      expect(() => getServerPosthog()).toThrow(
        "getServerPosthog() must only be called on the server",
      );

      global.window = originalWindow;
    });

    it("returns server client in server environment", () => {
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

  describe("server client with test constructor", () => {
    it("uses test constructor when provided", async () => {
      const mockPostHog = vi.fn().mockReturnValue({
        capture: vi.fn(),
        identify: vi.fn(),
        shutdown: vi.fn(),
        flush: vi.fn(),
      });

      __setTestPosthogCtor(mockPostHog);
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "test-host";

      const originalWindow = global.window;
      delete (global as any).window;

      const client = getPosthog();

      // Trigger initialization
      client.capture("test-event");

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPostHog).toHaveBeenCalledWith("test-key", {
        api_host: "test-host",
        loaded: expect.any(Function),
      });

      global.window = originalWindow;
    });

    it("initializes PostHog client when capture is called", async () => {
      const mockPostHog = vi.fn().mockReturnValue({
        capture: vi.fn(),
        identify: vi.fn(),
        shutdown: vi.fn(),
        flush: vi.fn(),
      });

      __setTestPosthogCtor(mockPostHog);
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "test-host";

      const originalWindow = global.window;
      delete (global as any).window;

      const client = getPosthog();

      // Trigger initialization by calling capture
      client.capture("test-event");

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPostHog).toHaveBeenCalledTimes(1);
      expect(mockPostHog).toHaveBeenCalledWith("test-key", {
        api_host: "test-host",
        loaded: expect.any(Function),
      });

      global.window = originalWindow;
    });
  });
});
