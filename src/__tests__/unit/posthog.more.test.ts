import { describe, it, expect, vi, beforeEach } from "vitest";

describe("PostHogClient wrapper basic coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure server context for each test run
    // @ts-ignore
    delete (global as any).window;
  });

  it("constructs PostHog with env and returns client (server context)", async () => {
    const prevHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const prevKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
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

    // Import module and inject the constructor via test-only hook
    const posthogMod = await import("~/lib/posthog");
    // @ts-expect-error internal test hook
    posthogMod.__setTestPosthogCtor(PHCtor as any);
    const getClient = posthogMod.default as () => any;
    const client = getClient();

    expect(PHCtor).toHaveBeenCalledWith("ph_test_key", expect.objectContaining({ host: "https://app.posthog.com" }));
    expect(client).toBeTruthy();

    client.capture?.({ event: "evt" } as any);
    client.identify?.({ distinctId: "u1" } as any);
    client.flush?.();
    client.shutdown?.();

    expect(capture).toHaveBeenCalled();
    expect(identify).toHaveBeenCalled();
    expect(flush).toHaveBeenCalled();
    expect(shutdown).toHaveBeenCalled();

    // restore env
    if (prevHost === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    else process.env.NEXT_PUBLIC_POSTHOG_HOST = prevHost;
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = prevKey;
  });
});
