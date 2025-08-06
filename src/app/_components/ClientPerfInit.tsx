"use client";

import { useEffect } from "react";
import { startLongTaskObserver } from "~/lib/client-telemetry";
/**
 * Do NOT import from "~/lib/posthog" here because that file provides a server-only
 * factory for posthog-node. For client analytics, prefer posthog-js initialized
 * where needed (or add a dedicated client util if required).
 */

/**
 * ClientPerfInit
 * Starts performance observers early.
 * Mount this once at app root (e.g., in layout under ThemeProvider).
 */
export default function ClientPerfInit() {
  useEffect(() => {
    // Start long-task observer for TBT proxy
    startLongTaskObserver();
  }, []);

  return null;
}
