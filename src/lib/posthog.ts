/**
 * PostHog client factory.
 *
 * IMPORTANT:
 * - Never import "posthog-node" in client/browser code. It depends on node:fs and will break Turbopack.
 * - For client-side analytics use "posthog-js".
 * - For server-side events use "posthog-node", but only in server-only modules.
 */
/**
 * Isomorphic PostHog facade.
 *
 * - Do NOT import "posthog-node" in client bundles.
 * - Default export is a factory usable in Node (server) tests and server code.
 * - In the browser, it returns a no-op client.
 */
let nodeClient: import("posthog-node").PostHog | null = null;

// Test-only override hook: allows unit tests to inject a PostHog constructor
// without importing server-only modules in jsdom. Not used in production.
type PHCtor = new (
  key: string,
  opts: { host?: string; flushAt?: number; flushInterval?: number },
) => import("posthog-node").PostHog;
let __TEST_ONLY_PostHogCtor: PHCtor | null = null;
export function __setTestPosthogCtor(ctor: PHCtor | null) {
  __TEST_ONLY_PostHogCtor = ctor;
}

function getServerClient() {
  if (!nodeClient) {
    // Use require to avoid static analysis bundling in client
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) {
      // No key configured: return a no-op to keep server paths import-safe in tests
      return getBrowserClient();
    }
    // Prefer injected ctor in tests; fall back to real module
    const PH =
      __TEST_ONLY_PostHogCtor ??
      (require("posthog-node") as typeof import("posthog-node")).PostHog;

    nodeClient = new PH(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return nodeClient;
}

function getBrowserClient() {
  // Minimal no-op shim with same surface used in tests
  const noop = () => undefined;
  return {
    capture: noop,
    identify: noop,
    shutdown: noop,
    flush: noop,
  } as any;
}

/**
 * Default export: returns a PostHog-like client.
 * - On server (no window), returns posthog-node instance
 * - On browser, returns no-op shim
 */
export default function getPosthog() {
  // Prefer server client in Node/test. getServerClient will no-op if key missing.
  if (typeof window === "undefined") {
    return getServerClient();
  }
  // In the browser always return a no-op shim; apps should use posthog-js directly instead.
  return getBrowserClient();
}

/**
 * Explicit server-only accessor for RSC/route handlers if needed.
 * Kept for compatibility but now safe to import without throwing at module load.
 */
export function getServerPosthog() {
  if (typeof window !== "undefined") {
    throw new Error("getServerPosthog() must only be called on the server");
  }
  return getServerClient();
}
