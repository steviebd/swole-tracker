/**
 * Example: Refactored progress.ts router with unified cache
 *
 * This shows how to migrate the progress router from manual cache
 * implementation to the unified ServerCache manager.
 *
 * BEFORE: Lines 74-93 in progress.ts
 * AFTER: This file (simplified, cleaner)
 */

import {
  cacheManager,
  cachePresets,
} from "~/server/cache/server-cache-manager";

// ============================================================================
// BEFORE (Old Implementation - Lines 74-93)
// ============================================================================
/*
const calculationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour TTL

export function getCachedCalculation<T>(key: string): T | null {
  const cached = calculationCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value as T;
  }
  if (cached) {
    calculationCache.delete(key); // Remove expired entry
  }
  return null;
}

export function setCachedCalculation<T>(key: string, value: T): void {
  calculationCache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL,
  });
}
*/

// ============================================================================
// AFTER (New Implementation - Unified Cache)
// ============================================================================

/**
 * Get or create the progress calculations cache
 * - 1 hour TTL for expensive calculations
 * - Automatic cleanup of expired entries
 * - Built-in metrics tracking
 * - Size limits prevent memory leaks
 */
const calculationCache = cacheManager.getCache(
  "progress-calculations",
  cachePresets.calculations,
);

/**
 * Get cached calculation result
 * @returns Cached value or null if not found/expired
 */
export function getCachedCalculation<T>(key: string): T | null {
  return calculationCache.get(key) as T | null;
}

/**
 * Cache calculation result
 * @param key - Cache key
 * @param value - Value to cache
 * @param customTtl - Optional custom TTL in ms (defaults to 1 hour)
 */
export function setCachedCalculation<T>(
  key: string,
  value: T,
  customTtl?: number,
): void {
  calculationCache.set(key, value, customTtl);
}

/**
 * Get cache health metrics for monitoring
 * New functionality enabled by unified cache!
 */
export function getCalculationCacheMetrics() {
  const metrics = calculationCache.getMetrics();
  return {
    ...metrics,
    hitRate: calculationCache.getHitRate(),
    size: calculationCache.size(),
  };
}

/**
 * Clear all cached calculations (useful for testing/debugging)
 */
export function clearCalculationCache(): void {
  calculationCache.clear();
}

// ============================================================================
// EXAMPLE USAGE IN ROUTER PROCEDURES
// ============================================================================

/**
 * Example: Using cache in a progress calculation procedure
 */
export const exampleProgressProcedure = async (userId: string) => {
  // Generate cache key
  const cacheKey = `strength-progression:${userId}:30d`;

  // Try to get from cache first
  const cached = getCachedCalculation<ProgressData>(cacheKey);
  if (cached) {
    console.log("✅ Cache hit for strength progression");
    return cached;
  }

  // Cache miss - perform expensive calculation
  console.log("❌ Cache miss - calculating strength progression");
  // const result = await performExpensiveCalculation(userId); // Placeholder for actual implementation
  const result = { placeholder: true };

  // Cache the result
  setCachedCalculation(cacheKey, result);

  return result;
};

/**
 * Example: Using cache with custom TTL for real-time data
 */
export const exampleRealtimeProcedure = async (userId: string) => {
  const cacheKey = `realtime-stats:${userId}`;

  const cached = getCachedCalculation<RealtimeStats>(cacheKey);
  if (cached) return cached;

  // const stats = await calculateRealtimeStats(userId); // Placeholder for actual implementation
  const stats = { placeholder: true };

  // Cache for only 5 minutes (real-time data)
  setCachedCalculation(cacheKey, stats, 5 * 60 * 1000);

  return stats;
};

/**
 * Example: Cache invalidation after mutation
 */
export const exampleMutationProcedure = async (userId: string, data: any) => {
  // Perform mutation
  // await saveWorkoutData(userId, data); // Placeholder for actual implementation

  // Invalidate related cache entries
  const cacheKeys = [
    `strength-progression:${userId}:30d`,
    `volume-progression:${userId}:30d`,
    `realtime-stats:${userId}`,
  ];

  cacheKeys.forEach((key) => calculationCache.delete(key));

  return { success: true };
};

// ============================================================================
// MONITORING AND DEBUGGING
// ============================================================================

/**
 * Log cache metrics for monitoring (call periodically or on-demand)
 */
export function logCacheHealth(): void {
  const metrics = getCalculationCacheMetrics();

  console.log("📊 Progress Calculation Cache Metrics:", {
    hitRate: `${(metrics.hitRate * 100).toFixed(2)}%`,
    hits: metrics.hits,
    misses: metrics.misses,
    evictions: metrics.evictions,
    currentSize: metrics.size,
  });

  // Optional: Send to PostHog or other analytics
  // posthog.capture('cache_metrics', metrics);
}

/**
 * Get all cache keys for debugging
 */
export function debugCacheKeys(): string[] {
  return calculationCache.keys();
}

// ============================================================================
// TYPE DEFINITIONS (Examples)
// ============================================================================

interface ProgressData {
  dates: string[];
  values: number[];
  trend: "up" | "down" | "stable";
}

interface RealtimeStats {
  currentStreak: number;
  weeklyVolume: number;
  lastWorkout: string;
}

// ============================================================================
// COMPARISON SUMMARY
// ============================================================================

/**
 * IMPROVEMENTS:
 *
 * ✅ Code Reduction: 19 lines → 8 lines (58% reduction)
 * ✅ Automatic Cleanup: No manual expiry checking needed
 * ✅ Built-in Metrics: Hit rate, evictions, size tracking
 * ✅ Memory Safety: Max size prevents unbounded growth
 * ✅ Better DX: Cleaner API, easier to understand
 * ✅ Monitoring: Can track cache health across all routers
 * ✅ Consistency: Same pattern used everywhere
 *
 * NEW FEATURES:
 * - Custom TTL per cache entry
 * - LRU eviction when size limit reached
 * - Automatic cleanup of expired entries
 * - Cache metrics for monitoring
 * - Clear/reset functionality
 *
 * MIGRATION EFFORT: Low
 * - Replace 2 functions with unified API
 * - Add cache initialization (1 line)
 * - Optional: Add metrics logging
 * - Total: ~5 minutes per router
 */
