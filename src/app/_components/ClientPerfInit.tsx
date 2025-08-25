"use client";

import { useEffect } from "react";
import { startLongTaskObserver } from "@/lib/client-telemetry";

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
