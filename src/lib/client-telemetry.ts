"use client";

/**
 * Lightweight client telemetry utilities for Phase 3.
 * - Device type derivation from UA
 * - Theme capture from DOM (ThemeProvider sets data-theme on <html>)
 * - Performance metrics (rough TTI/TBT proxies) + input latency sampling
 */

type DeviceType = "android" | "ios" | "ipad" | "desktop" | "other";

export function getDeviceType(): DeviceType {
  if (typeof navigator === "undefined") return "other";
  const uaParts: Array<unknown> = [navigator.userAgent, (navigator as unknown as { vendor?: string }).vendor, (window as unknown as { opera?: string | undefined }).opera];
  const ua = uaParts.find((p): p is string => typeof p === "string") ?? "";
  const uaLower = ua.toLowerCase();

  // Basic checks; not bulletproof, but adequate for coarse-grained analytics
  if (uaLower.includes("android")) return "android";
  // iPadOS on iPad can report as Mac; check for touch support
  const isIpad =
    uaLower.includes("ipad") ||
    ((uaLower.includes("macintosh") || uaLower.includes("mac os x")) && typeof document !== "undefined" && "ontouchend" in document);
  if (isIpad) return "ipad";
  if (uaLower.includes("iphone") || uaLower.includes("ipod")) return "ios";

  // Desktop common markers
  if (
    uaLower.includes("windows nt") ||
    uaLower.includes("macintosh") ||
    uaLower.includes("x11") ||
    uaLower.includes("linux x86_64")
  )
    return "desktop";
  return "other";
}

export function getThemeUsed(): string | null {
  if (typeof document === "undefined") return null;
  // ThemeProvider sets data-theme on document.documentElement
  const t = document.documentElement?.dataset?.theme;
  return t ?? null;
}

/**
 * Rough TTI and TBT proxies:
 * - TTI proxy: time until network quiet + idle callback or next tick after hydration.
 * - TBT proxy: sum of long tasks duration since navigationStart (uses PerformanceObserver if available).
 */
let longTaskTotal = 0;
let longTaskObserverStarted = false;

export function startLongTaskObserver() {
  if (typeof PerformanceObserver === "undefined" || longTaskObserverStarted) return;
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // As per Long Task spec, entry.duration > 50ms indicates a long task. Sum overage as a rough proxy.
        longTaskTotal += entry.duration;
      }
    });
    obs.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
    longTaskObserverStarted = true;
  } catch {
    // noop
  }
}

export function collectTTI_TBT(): { tti?: number; tbt?: number } {
  if (typeof performance === "undefined") return {};
  const navEntry = performance.getEntriesByType("navigation")[0];
  const nav = (navEntry && typeof (navEntry as PerformanceNavigationTiming).domContentLoadedEventEnd === "number"
    ? (navEntry as PerformanceNavigationTiming)
    : undefined);
  const tbt = Math.round(longTaskTotal);

  // TTI proxy:
  // If First Contentful Paint exists, use domContentLoadedEventEnd or loadEventEnd as rough readiness time.
  let tti: number | undefined = undefined;
  try {
    const paints = performance.getEntriesByType("paint") as PerformanceEntry[];
    const fcp = paints.find((p) => p.name === "first-contentful-paint");
    const navStart = nav?.startTime ?? 0;
    const ready = (nav?.domContentLoadedEventEnd ?? nav?.loadEventEnd ?? performance.now());
    const fcpTime = fcp ? fcp.startTime : navStart;
    // take max(fcp, ready) as naive readiness
    tti = Math.round(Math.max(fcpTime, ready));
  } catch {
    // ignore
  }

  return { tti, tbt };
}

/**
 * Input latency sampling: call recordInputLatencyStart() on input start and recordInputLatencyEnd() on end.
 * snapshotInputLatency() returns summary and clears samples.
 */
type InputSample = { start: number; end: number };
const inputSamples: InputSample[] = [];

export function recordInputLatencyStart(): number | null {
  if (typeof performance === "undefined") return null;
  return performance.now();
}

export function recordInputLatencyEnd(startToken: number | null) {
  if (typeof performance === "undefined" || startToken == null) return;
  const end = performance.now();
  inputSamples.push({ start: startToken, end });
}

export function snapshotInputLatency(): { samples: number[]; avg?: number; p95?: number } {
  const durations = inputSamples.map((s) => Math.max(0, s.end - s.start));
  inputSamples.length = 0;
  if (durations.length === 0) return { samples: [] };

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / sorted.length) * 100) / 100;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95Base = sorted.length > 0 ? sorted[Math.min(sorted.length - 1, p95Index)] : undefined;
  const p95 = typeof p95Base === "number" ? Math.round(p95Base * 100) / 100 : undefined;

  return { samples: durations, avg, p95 };
}

/**
 * Snapshot combined metrics for emission to server.
 */
export function snapshotMetricsBlob(): Record<string, unknown> {
  const { tti, tbt } = collectTTI_TBT();
  const input = snapshotInputLatency();
  return {
    tti,
    tbt,
    inputLatency: input,
    ts: Date.now(),
  };
}

/**
 * Haptics helper
 */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  const vib = (navigator as unknown as { vibrate?: (p: number | number[]) => boolean }).vibrate;
  if (typeof vib !== "function") return;
  try {
    vib(pattern);
  } catch {
    // ignore
  }
}
