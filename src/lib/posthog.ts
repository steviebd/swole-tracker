/**
 * PostHog client factory.
 *
 * IMPORTANT:
 * - Never import "posthog-node" in client/browser code. It depends on node:fs and will break Turbopack.
 * - For client-side analytics use "posthog-js".
 * - For server-side events use "posthog-node", but only in server-only modules.
 */
import "server-only";

let nodeClient: import("posthog-node").PostHog | null = null;

export function getServerPosthog() {
  if (typeof window !== "undefined") {
    // Guard against accidental client usage
    throw new Error("getServerPosthog() must only be called on the server");
  }
  if (!nodeClient) {
    const { PostHog } = require("posthog-node") as typeof import("posthog-node");
    nodeClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return nodeClient;
}

/**
 * Client stub so that importing from "~/lib/posthog" in the browser does not
 * pull "posthog-node". Client code should use posthog-js directly instead.
 */
export const posthogBrowser: null = null;
