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
import { type PostHog as PostHogNode } from "posthog-node";

type PosthogSurface = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  shutdown: () => void;
  flush: () => void;
};

let nodeClient: PosthogSurface | null = null;

// Test-only override hook: allows unit tests to inject a PostHog constructor
// without importing server-only modules in jsdom. Not used in production.
type PHCtor =
  | (new (
      key: string,
      opts: { host?: string; flushAt?: number; flushInterval?: number },
    ) => PostHogNode)
  | ((
      key: string,
      opts: { host?: string; flushAt?: number; flushInterval?: number },
    ) => PostHogNode);
let __TEST_ONLY_PostHogCtor: PHCtor | null = null;
export function __setTestPosthogCtor(ctor: PHCtor | null) {
  __TEST_ONLY_PostHogCtor = ctor;
}

export async function loadPosthogCtor(): Promise<
  typeof PostHogNode | PHCtor | null
> {
  // Guard to prevent accidental client-side import
  if (typeof window !== "undefined") return null;
  if (__TEST_ONLY_PostHogCtor) return __TEST_ONLY_PostHogCtor;
  try {
    const mod = await import("posthog-node");
    return mod.PostHog;
  } catch (error) {
    console.warn("Failed to load posthog-node:", error);
    return null;
  }
}

function getServerClient(): PosthogSurface {
  // If we've already wrapped a node client, return it
  if (nodeClient) return nodeClient;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    // No key configured: return a no-op to keep server paths import-safe in tests
    return getBrowserClient();
  }

  // Eagerly construct once so tests can assert constructor call and return a stable client.
  const rawClientPromise = (async () => {
    const PH = await loadPosthogCtor();
    if (!PH) {
      console.warn(
        "PostHog constructor not available, analytics will be disabled",
      );
      return null;
    }

    const ctorOrFactory: PHCtor | typeof PostHogNode = PH as unknown as
      | PHCtor
      | typeof PostHogNode;

    // Always call once so tests can assert it was invoked with key+host.
    let instance: PostHogNode | null = null;
    try {
      // Try construct signature
      instance = new (ctorOrFactory as new (
        key: string,
        opts: { host?: string; flushAt?: number; flushInterval?: number },
      ) => PostHogNode)(key, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
      });
    } catch (constructError) {
      try {
        // Fallback to factory signature
        const factory = ctorOrFactory as (
          key: string,
          opts: { host?: string; flushAt?: number; flushInterval?: number },
        ) => PostHogNode;
        instance = factory(key, {
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          flushAt: 1,
          flushInterval: 0,
        });
      } catch (factoryError) {
        console.error("Failed to create PostHog instance:", {
          constructError,
          factoryError,
        });
        return null;
      }
    }
    return instance;
  })();

  const lazy: PosthogSurface = {
    capture: (event: string, properties?: Record<string, unknown>) => {
      // Intentionally fire-and-forget; mark as ignored to satisfy no-floating-promises
      void (async () => {
        try {
          const raw = (await rawClientPromise) as PostHogNode | null;
          if (raw) {
            const distinctId = "server";
            raw.capture({ distinctId, event, properties });
          }
        } catch (error) {
          console.warn("Failed to capture PostHog event:", event, error);
        }
      })();
    },
    identify: (id: string, props?: Record<string, unknown>) => {
      void (async () => {
        try {
          const raw = (await rawClientPromise) as PostHogNode | null;
          if (raw) {
            raw.identify({ distinctId: id, properties: props });
          }
        } catch (error) {
          console.warn("Failed to identify PostHog user:", id, error);
        }
      })();
    },
    shutdown: () => {
      void (async () => {
        try {
          const raw = (await rawClientPromise) as PostHogNode | null;
          if (raw) {
            raw.shutdown?.();
            // older versions
            (raw as unknown as { close?: () => void })?.close?.();
          }
        } catch (error) {
          console.warn("Failed to shutdown PostHog:", error);
        }
      })();
    },
    flush: () => {
      void (async () => {
        try {
          const raw = (await rawClientPromise) as PostHogNode | null;
          if (raw) {
            raw.flush?.();
          }
        } catch (error) {
          console.warn("Failed to flush PostHog:", error);
        }
      })();
    },
  };

  nodeClient = lazy;
  return nodeClient;
}

function getBrowserClient(): PosthogSurface {
  // Minimal no-op shim with same surface used in tests
  const noop = () => undefined;
  return {
    capture: noop,
    identify: noop,
    shutdown: noop,
    flush: noop,
  };
}

/**
 * Default export: returns a PostHog-like client.
 * - On server (no window), returns posthog-node instance
 * - On browser, returns no-op shim
 */
export default function getPosthog(): PosthogSurface {
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
export function getServerPosthog(): PosthogSurface /* import("posthog-node").PostHog */ {
  if (typeof window !== "undefined") {
    throw new Error("getServerPosthog() must only be called on the server");
  }
  return getServerClient();
}
