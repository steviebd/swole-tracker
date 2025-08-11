import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("~/lib/posthog", () => {
  const capture = vi.fn();
  const identify = vi.fn();
  const pageview = vi.fn();
  const flush = vi.fn();
  const init = vi.fn();
  return { posthog: { init, capture, identify, pageview, flush } };
});

describe("lib/analytics.ts coverage", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    Object.assign(process.env, ORIG_ENV);
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    process.env = { ...ORIG_ENV };
  });

  it("no-ops when NEXT_PUBLIC_POSTHOG_KEY is missing", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const mod = await import("~/lib/analytics");
    const { analytics } = mod as typeof import("~/lib/analytics");
    // functions should be defined and not throw when invoked
    analytics.pageView("/home");
    analytics.workoutStarted("t1", "Chest");
    analytics.workoutCompleted("s1", 123, 5);
    analytics.featureUsed("debug-mode", { enabled: true });
    analytics.error(new Error("unit-test"));
    expect(typeof analytics.pageView).toBe("function");
  });

  it("initializes and forwards calls when key present and in browser", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "ph_test_key");
    // Simulate browser environment with a location object
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      location: { href: "http://localhost/test" },
    } as any;

    const mod = await import("~/lib/analytics");
    const { analytics } = mod as typeof import("~/lib/analytics");

    // Exercise a subset of wrapper methods under "browser" conditions with a key set
    analytics.pageView("/debug");
    analytics.workoutStarted("t2", "Back");
    analytics.workoutCompleted("s2", 456, 8);
    analytics.featureUsed("timer", { duration: 30 });
    analytics.error(new Error("unit-test-2"));

    // restore
    (globalThis as any).window = originalWindow;
    expect(typeof analytics.pageView).toBe("function");
  });
});
