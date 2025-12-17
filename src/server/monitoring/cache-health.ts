import { setupCacheMonitoring } from "~/server/cache/cache-monitoring";

/**
 * Initialize cache monitoring on server startup
 *
 * This function sets up periodic logging and tracking of cache health metrics.
 * In development, logs are emitted to console every 5 minutes.
 * In production, metrics are sent to PostHog every 15 minutes.
 */
export function initializeCacheMonitoring(): () => void {
  return setupCacheMonitoring({
    logInterval: 5 * 60 * 1000, // Log every 5 minutes
    trackInterval: 15 * 60 * 1000, // Track to PostHog every 15 minutes
    enableLogging: process.env.NODE_ENV === "development",
    enableTracking: process.env.NODE_ENV === "production",
  });
}
