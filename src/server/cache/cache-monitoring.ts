/**
 * Cache Monitoring and Analytics Integration
 *
 * Provides utilities for tracking cache performance and health metrics.
 * Integrates with PostHog for analytics and logging.
 */

import { cacheManager } from "./server-cache-manager";

export interface CacheHealthReport {
  timestamp: number;
  caches: Record<
    string,
    {
      hits: number;
      misses: number;
      evictions: number;
      size: number;
      hitRate: number;
      status: "healthy" | "warning" | "critical";
      issues: string[];
    }
  >;
  overall: {
    totalHits: number;
    totalMisses: number;
    totalEvictions: number;
    totalSize: number;
    averageHitRate: number;
    status: "healthy" | "warning" | "critical";
  };
}

/**
 * Health thresholds for cache monitoring
 */
export const CACHE_HEALTH_THRESHOLDS = {
  HIT_RATE_WARNING: 0.5, // Warn if hit rate < 50%
  HIT_RATE_CRITICAL: 0.3, // Critical if hit rate < 30%
  EVICTION_RATE_WARNING: 0.1, // Warn if eviction rate > 10%
  EVICTION_RATE_CRITICAL: 0.2, // Critical if eviction rate > 20%
  SIZE_WARNING: 0.8, // Warn if cache is 80% full
  SIZE_CRITICAL: 0.95, // Critical if cache is 95% full
  MIN_SAMPLES: 100, // Minimum requests before checking hit rate
} as const;

/**
 * Generate comprehensive cache health report
 */
export function generateCacheHealthReport(): CacheHealthReport {
  const allMetrics = cacheManager.getAllMetrics();
  const timestamp = Date.now();

  let totalHits = 0;
  let totalMisses = 0;
  let totalEvictions = 0;
  let totalSize = 0;
  let cacheCount = 0;

  const caches: CacheHealthReport["caches"] = {};

  for (const [name, metrics] of Object.entries(allMetrics)) {
    const totalRequests = metrics.hits + metrics.misses;
    const hitRate = totalRequests === 0 ? 0 : metrics.hits / totalRequests;
    const evictionRate =
      totalRequests === 0 ? 0 : metrics.evictions / totalRequests;

    // Determine health status
    const issues: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check hit rate (only if we have enough samples)
    if (totalRequests >= CACHE_HEALTH_THRESHOLDS.MIN_SAMPLES) {
      if (hitRate < CACHE_HEALTH_THRESHOLDS.HIT_RATE_CRITICAL) {
        status = "critical";
        issues.push(
          `Critical: Hit rate ${(hitRate * 100).toFixed(1)}% is below ${CACHE_HEALTH_THRESHOLDS.HIT_RATE_CRITICAL * 100}%`,
        );
      } else if (hitRate < CACHE_HEALTH_THRESHOLDS.HIT_RATE_WARNING) {
        status = "warning";
        issues.push(
          `Warning: Hit rate ${(hitRate * 100).toFixed(1)}% is below ${CACHE_HEALTH_THRESHOLDS.HIT_RATE_WARNING * 100}%`,
        );
      }
    }

    // Check eviction rate
    if (evictionRate > CACHE_HEALTH_THRESHOLDS.EVICTION_RATE_CRITICAL) {
      status = "critical";
      issues.push(
        `Critical: Eviction rate ${(evictionRate * 100).toFixed(1)}% is above ${CACHE_HEALTH_THRESHOLDS.EVICTION_RATE_CRITICAL * 100}%`,
      );
    } else if (evictionRate > CACHE_HEALTH_THRESHOLDS.EVICTION_RATE_WARNING) {
      if (status !== "critical") {
        status = "warning";
      }
      issues.push(
        `Warning: Eviction rate ${(evictionRate * 100).toFixed(1)}% is above ${CACHE_HEALTH_THRESHOLDS.EVICTION_RATE_WARNING * 100}%`,
      );
    }

    caches[name] = {
      hits: metrics.hits,
      misses: metrics.misses,
      evictions: metrics.evictions,
      size: metrics.size,
      hitRate,
      status,
      issues,
    };

    // Accumulate totals
    totalHits += metrics.hits;
    totalMisses += metrics.misses;
    totalEvictions += metrics.evictions;
    totalSize += metrics.size;
    cacheCount++;
  }

  // Calculate overall metrics
  const totalRequests = totalHits + totalMisses;
  const averageHitRate = totalRequests === 0 ? 0 : totalHits / totalRequests;

  // Determine overall status
  let overallStatus: "healthy" | "warning" | "critical" = "healthy";
  const criticalCaches = Object.values(caches).filter(
    (c) => c.status === "critical",
  );
  const warningCaches = Object.values(caches).filter(
    (c) => c.status === "warning",
  );

  if (criticalCaches.length > 0) {
    overallStatus = "critical";
  } else if (warningCaches.length > 0) {
    overallStatus = "warning";
  }

  return {
    timestamp,
    caches,
    overall: {
      totalHits,
      totalMisses,
      totalEvictions,
      totalSize,
      averageHitRate,
      status: overallStatus,
    },
  };
}

/**
 * Log cache health report to console
 */
export function logCacheHealth(): void {
  const report = generateCacheHealthReport();

  console.log("\n" + "=".repeat(60));
  console.log("📊 CACHE HEALTH REPORT");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(
    `Overall Status: ${getStatusEmoji(report.overall.status)} ${report.overall.status.toUpperCase()}`,
  );
  console.log(
    `Average Hit Rate: ${(report.overall.averageHitRate * 100).toFixed(2)}%`,
  );
  console.log(
    `Total Requests: ${report.overall.totalHits + report.overall.totalMisses}`,
  );
  console.log(`Total Evictions: ${report.overall.totalEvictions}`);
  console.log(`Total Entries: ${report.overall.totalSize}`);

  console.log("\n" + "-".repeat(60));
  console.log("Individual Caches:");
  console.log("-".repeat(60));

  for (const [name, cache] of Object.entries(report.caches)) {
    const totalRequests = cache.hits + cache.misses;
    console.log(`\n${getStatusEmoji(cache.status)} ${name.toUpperCase()}`);
    console.log(`  Status: ${cache.status}`);
    console.log(`  Hit Rate: ${(cache.hitRate * 100).toFixed(2)}%`);
    console.log(`  Hits: ${cache.hits}`);
    console.log(`  Misses: ${cache.misses}`);
    console.log(`  Evictions: ${cache.evictions}`);
    console.log(`  Size: ${cache.size} entries`);

    if (cache.issues.length > 0) {
      console.log(`  Issues:`);
      cache.issues.forEach((issue) => console.log(`    - ${issue}`));
    }
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Send cache metrics to PostHog (or other analytics)
 */
export async function trackCacheMetrics(): Promise<void> {
  const report = generateCacheHealthReport();

  try {
    // Note: This assumes PostHog is available globally
    // In production, you'd import and use PostHog client properly
    if (typeof window !== "undefined" && (window as any).posthog) {
      const posthog = (window as any).posthog;

      // Track overall cache health
      posthog.capture("cache_health_report", {
        timestamp: report.timestamp,
        overall_status: report.overall.status,
        overall_hit_rate: report.overall.averageHitRate,
        total_hits: report.overall.totalHits,
        total_misses: report.overall.totalMisses,
        total_evictions: report.overall.totalEvictions,
        total_size: report.overall.totalSize,
      });

      // Track individual cache metrics
      for (const [name, cache] of Object.entries(report.caches)) {
        posthog.capture("cache_metrics", {
          cache_name: name,
          status: cache.status,
          hit_rate: cache.hitRate,
          hits: cache.hits,
          misses: cache.misses,
          evictions: cache.evictions,
          size: cache.size,
          issues: cache.issues,
        });
      }
    }
  } catch (error) {
    console.warn("Failed to track cache metrics:", error);
  }
}

/**
 * Get emoji for cache status
 */
function getStatusEmoji(status: "healthy" | "warning" | "critical"): string {
  switch (status) {
    case "healthy":
      return "✅";
    case "warning":
      return "⚠️";
    case "critical":
      return "🔴";
  }
}

/**
 * Setup automatic cache monitoring
 */
export function setupCacheMonitoring(options?: {
  /** How often to log cache health (ms). Default: 5 minutes */
  logInterval?: number;
  /** How often to track to analytics (ms). Default: 15 minutes */
  trackInterval?: number;
  /** Enable console logging. Default: true in dev, false in prod */
  enableLogging?: boolean;
  /** Enable analytics tracking. Default: true */
  enableTracking?: boolean;
}): () => void {
  const {
    logInterval = 5 * 60 * 1000, // 5 minutes
    trackInterval = 15 * 60 * 1000, // 15 minutes
    enableLogging = process.env.NODE_ENV === "development",
    enableTracking = true,
  } = options ?? {};

  const timers: NodeJS.Timeout[] = [];

  // Setup logging
  if (enableLogging) {
    const logTimer = setInterval(() => {
      logCacheHealth();
    }, logInterval);

    if (logTimer.unref) {
      logTimer.unref();
    }
    timers.push(logTimer);

    // Log immediately on startup
    logCacheHealth();
  }

  // Setup analytics tracking
  if (enableTracking) {
    const trackTimer = setInterval(() => {
      void trackCacheMetrics();
    }, trackInterval);

    if (trackTimer.unref) {
      trackTimer.unref();
    }
    timers.push(trackTimer);
  }

  // Return cleanup function
  return () => {
    timers.forEach((timer) => clearInterval(timer));
  };
}

/**
 * Get cache recommendations based on health report
 */
export function getCacheRecommendations(report: CacheHealthReport): string[] {
  const recommendations: string[] = [];

  for (const [name, cache] of Object.entries(report.caches)) {
    const totalRequests = cache.hits + cache.misses;

    // Low hit rate
    if (
      cache.hitRate < CACHE_HEALTH_THRESHOLDS.HIT_RATE_WARNING &&
      totalRequests >= CACHE_HEALTH_THRESHOLDS.MIN_SAMPLES
    ) {
      recommendations.push(
        `${name}: Consider increasing TTL or reviewing cache key strategy (hit rate: ${(cache.hitRate * 100).toFixed(1)}%)`,
      );
    }

    // High eviction rate
    if (cache.evictions / totalRequests > 0.1 && totalRequests > 0) {
      recommendations.push(
        `${name}: Consider increasing maxSize (eviction rate: ${((cache.evictions / totalRequests) * 100).toFixed(1)}%)`,
      );
    }

    // Cache nearly full
    if (cache.size > 0) {
      // We don't have maxSize here, but could add it
      recommendations.push(
        `${name}: Monitor cache size (${cache.size} entries) - may need size adjustment`,
      );
    }
  }

  // Overall recommendations
  if (report.overall.averageHitRate < 0.5) {
    recommendations.push(
      "Overall: Low average hit rate suggests caching strategy needs review",
    );
  }

  if (report.overall.totalEvictions > report.overall.totalSize) {
    recommendations.push(
      "Overall: High eviction count suggests caches may be too small",
    );
  }

  return recommendations;
}

/**
 * Export cache health report as JSON (for external monitoring)
 */
export function exportCacheHealthJSON(): string {
  const report = generateCacheHealthReport();
  return JSON.stringify(report, null, 2);
}

/**
 * Health check endpoint handler (for monitoring services)
 */
export function cacheHealthCheck(): {
  status: number;
  body: {
    healthy: boolean;
    status: "healthy" | "warning" | "critical";
    report: CacheHealthReport;
    recommendations: string[];
  };
} {
  const report = generateCacheHealthReport();
  const recommendations = getCacheRecommendations(report);

  return {
    status: report.overall.status === "critical" ? 503 : 200,
    body: {
      healthy: report.overall.status !== "critical",
      status: report.overall.status,
      report,
      recommendations,
    },
  };
}
