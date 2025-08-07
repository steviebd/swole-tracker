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

    // Inject constructor BEFORE first getClient() call so the lazy factory builds with our spy
    const posthogMod = await import("~/lib/posthog");
    posthogMod.__setTestPosthogCtor(PHCtor as any);

    const getClient = (await import("~/lib/posthog")).default as () => any;
    const client = getClient();

    // wait a tick to allow async ctor promise to resolve inside the module
    await new Promise((r) => setTimeout(r, 0));

    expect(PHCtor).toHaveBeenCalledWith("ph_test_key", expect.objectContaining({ host: "https://app.posthog.com" }));
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

    // restore env
    if (prevHost === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    else process.env.NEXT_PUBLIC_POSTHOG_HOST = prevHost;
    if (prevKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = prevKey;
  });
});
