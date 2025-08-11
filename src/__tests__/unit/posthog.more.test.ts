import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock posthog-node globally
vi.mock("posthog-node", () => {
  const mockCapture = vi.fn();
  const mockIdentify = vi.fn();
  const mockShutdown = vi.fn();
  const mockFlush = vi.fn();

  const MockPostHog = vi.fn(() => ({
    capture: mockCapture,
    identify: mockIdentify,
    shutdown: mockShutdown,
    flush: mockFlush,
  }));

  return {
    PostHog: MockPostHog,
    mockCapture,
    mockIdentify,
    mockShutdown,
    mockFlush,
  };
});

describe("PostHogClient wrapper basic coverage", () => {
  let originalEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    // Store original environment variables
    originalEnv = {
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    };

    vi.resetModules();
    vi.clearAllMocks();

    // Ensure server context for each test run
    delete (global as any).window;

    // Clear any previously set test ctor
    const mod = await import("~/lib/posthog");
    mod.__setTestPosthogCtor(null);
  });

  afterEach(() => {
    // Restore original environment variables
    Object.keys(originalEnv).forEach((key) => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
  });

  it("constructs PostHog with env and returns client (server context)", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_test_key";

    const capture = vi.fn();
    const identify = vi.fn();
    const shutdown = vi.fn();
    const flush = vi.fn();

    const PHCtor = vi.fn().mockImplementation((_key: string, _opts: any) => ({
      capture,
      identify,
      shutdown,
      flush,
    }));

    // Inject constructor BEFORE first getClient() call so the lazy factory builds with our spy
    const posthogMod = await import("~/lib/posthog");
    posthogMod.__setTestPosthogCtor(PHCtor as any);

    const getClient = (await import("~/lib/posthog")).default as () => any;
    const client = getClient();

    // wait a tick to allow async ctor promise to resolve inside the module
    await new Promise((r) => setTimeout(r, 0));

    expect(PHCtor).toHaveBeenCalledWith(
      "ph_test_key",
      expect.objectContaining({ host: "https://app.posthog.com" }),
    );
    expect(client).toBeTruthy();

    client.capture?.({ event: "evt" } as any);
    client.identify?.({ distinctId: "u1" } as any);
    client.flush?.();
    client.shutdown?.();

    // allow microtasks to flush through our async lazy wrapper
    await new Promise((r) => setTimeout(r, 0));

    expect(capture).toHaveBeenCalled();
    expect(identify).toHaveBeenCalled();
    expect(flush).toHaveBeenCalled();
    expect(shutdown).toHaveBeenCalled();
  });

  it("returns a no-op client in the browser environment", async () => {
    // @ts-ignore
    global.window = {}; // Simulate browser environment
    const { default: getPosthog } = await import("~/lib/posthog");
    const client = getPosthog();

    expect(client).toBeTruthy();
    expect(client.capture("event")).toBeUndefined();
    expect(client.identify("id")).toBeUndefined();
    expect(client.shutdown()).toBeUndefined();
    expect(client.flush()).toBeUndefined();
  });

  it("loadPosthogCtor returns null in browser environment", async () => {
    // @ts-ignore
    global.window = {}; // Simulate browser environment
    const { loadPosthogCtor } = await import("~/lib/posthog");
    const ctor = await loadPosthogCtor();
    expect(ctor).toBeNull();
  });

  it("getServerClient returns existing nodeClient if already set", async () => {
    // Reset modules to get fresh import
    vi.resetModules();

    // Set up environment for server client creation
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_test_key";

    const mockClient = {
      capture: vi.fn(),
      identify: vi.fn(),
      shutdown: vi.fn(),
      flush: vi.fn(),
    };

    const PHCtor = vi.fn().mockImplementation(() => mockClient);

    const posthogMod = await import("~/lib/posthog");
    posthogMod.__setTestPosthogCtor(PHCtor as any);

    // First call creates the client
    const client1 = posthogMod.default();
    await new Promise((r) => setTimeout(r, 0));

    // Second call should return the same client
    const client2 = posthogMod.default();

    expect(client1).toBe(client2);
  });

  it("getServerClient returns no-op client when NEXT_PUBLIC_POSTHOG_KEY is not set", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

    const { default: getPosthog } = await import("~/lib/posthog");
    const client = getPosthog();

    expect(client).toBeTruthy();
    expect(client.capture("event")).toBeUndefined();
    expect(client.identify("id")).toBeUndefined();
    expect(client.shutdown()).toBeUndefined();
    expect(client.flush()).toBeUndefined();
  });

  it("calls shutdown and close on raw client", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_test_key";

    const shutdown = vi.fn();
    const close = vi.fn();

    const PHCtor = vi.fn().mockImplementation((_key: string, _opts: any) => ({
      shutdown,
      close,
    }));

    const posthogMod = await import("~/lib/posthog");
    posthogMod.__setTestPosthogCtor(PHCtor as any);

    const getClient = (await import("~/lib/posthog")).default as () => any;
    const client = getClient();

    await new Promise((r) => setTimeout(r, 0));

    client.shutdown();
    await new Promise((r) => setTimeout(r, 0));

    expect(shutdown).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("handles PostHogNode factory signature", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_test_key";

    const capture = vi.fn();
    const identify = vi.fn();
    const shutdown = vi.fn();
    const flush = vi.fn();

    // Simulate factory function instead of constructor
    const PHFactory = vi.fn((_key: string, _opts: any) => ({
      capture,
      identify,
      shutdown,
      flush,
    }));

    const posthogMod = await import("~/lib/posthog");
    posthogMod.__setTestPosthogCtor(PHFactory as any);

    const getClient = (await import("~/lib/posthog")).default as () => any;
    const client = getClient();

    await new Promise((r) => setTimeout(r, 0));

    expect(PHFactory).toHaveBeenCalledWith(
      "ph_test_key",
      expect.objectContaining({ host: "https://app.posthog.com" }),
    );
    expect(client).toBeTruthy();

    client.capture?.({ event: "evt" } as any);
    client.identify?.({ distinctId: "u1" } as any);
    client.flush?.();
    client.shutdown?.();

    await new Promise((r) => setTimeout(r, 0));

    expect(capture).toHaveBeenCalled();
    expect(identify).toHaveBeenCalled();
    expect(flush).toHaveBeenCalled();
    expect(shutdown).toHaveBeenCalled();
  });

  describe("getServerPosthog", () => {
    it("throws error when called in browser environment", async () => {
      // @ts-ignore
      global.window = {}; // Simulate browser environment
      const { getServerPosthog } = await import("~/lib/posthog");
      expect(() => getServerPosthog()).toThrow(
        "getServerPosthog() must only be called on the server",
      );
    });

    it("returns server client in server environment", async () => {
      process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://app.posthog.com";
      process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_test_key";

      const capture = vi.fn();
      const PHCtor = vi.fn().mockImplementation(() => ({ capture }));

      const posthogMod = await import("~/lib/posthog");
      posthogMod.__setTestPosthogCtor(PHCtor as any);

      const { getServerPosthog } = await import("~/lib/posthog");
      const client = getServerPosthog();

      await new Promise((r) => setTimeout(r, 0));

      expect(client).toBeTruthy();
      client.capture("event");
      await new Promise((r) => setTimeout(r, 0));
      expect(capture).toHaveBeenCalled();
    });
  });
});
