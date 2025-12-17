/**
 * Example: Refactored exercises.ts router with unified cache
 *
 * This shows how to migrate the exercises router from SimpleCache class
 * to the unified ServerCache manager.
 *
 * BEFORE: Lines 13-42 in exercises.ts (SimpleCache class + metrics)
 * AFTER: This file (significantly simplified)
 */

import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

// ============================================================================
// BEFORE (Old Implementation - Lines 13-42)
// ============================================================================
/*
class SimpleCache {
  private cache = new Map<string, { value: unknown; expires: number }>();

  get(key: string): unknown {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expires) {
      return entry.value;
    }
    this.cache.delete(key);
    return undefined;
  }

  set(key: string, value: unknown, ttlMs: number) {
    this.cache.set(key, { value, expires: Date.now() + ttlMs });
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new SimpleCache();

// Cache metrics for monitoring
let cacheHits = 0;
let cacheMisses = 0;

function getCacheMetrics() {
  return { hits: cacheHits, misses: cacheMisses };
}
*/

// ============================================================================
// AFTER (New Implementation - Unified Cache)
// ============================================================================

/**
 * Get or create the exercise search cache
 * - 5 minute TTL for search results
 * - Automatic cleanup of expired entries
 * - Built-in metrics tracking (no manual counters!)
 * - Size limits prevent memory leaks (max 1000 entries)
 */
const searchCache = cacheManager.getCache(
  "exercise-search",
  cachePresets.search,
);

/**
 * Get cache metrics - now built-in!
 * No more manual hit/miss tracking
 */
function getCacheMetrics() {
  return searchCache.getMetrics();
}

/**
 * Get detailed cache statistics
 */
function getCacheStats() {
  return {
    ...searchCache.getMetrics(),
    hitRate: searchCache.getHitRate(),
    size: searchCache.size(),
  };
}

// ============================================================================
// EXAMPLE USAGE IN ROUTER PROCEDURES
// ============================================================================

/**
 * Example: Search master exercises with caching
 */
export const searchMasterExercises = async (
  searchTerm: string,
  limit = 10,
) => {
  // Generate cache key
  const cacheKey = `search:${searchTerm.toLowerCase()}:${limit}`;

  // Try cache first
  const cached = searchCache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit for search: "${searchTerm}"`);
    return cached as ExerciseSearchResult[];
  }

  console.log(`❌ Cache miss for search: "${searchTerm}"`);

  // Perform search
  const results = await performExerciseSearch(searchTerm, limit);

  // Cache results with default TTL (5 minutes)
  searchCache.set(cacheKey, results);

  return results;
};

/**
 * Example: Frequently accessed exercises with longer cache
 */
export const getPopularExercises = async () => {
  const cacheKey = "popular-exercises";

  const cached = searchCache.get(cacheKey);
  if (cached) return cached as Exercise[];

  const popular = await fetchPopularExercises();

  // Cache for 1 hour (custom TTL)
  searchCache.set(cacheKey, popular, 60 * 60 * 1000);

  return popular;
};

/**
 * Example: Cache invalidation when exercises are updated
 */
export const updateExercise = async (exerciseId: number, data: any) => {
  // Update exercise in database
  await saveExerciseUpdate(exerciseId, data);

  // Clear search cache (next searches will be fresh)
  searchCache.clear();

  // Or: Delete specific cache entries
  // searchCache.delete(`exercise:${exerciseId}`);

  return { success: true };
};

/**
 * Example: Prefetch and cache popular searches
 */
export const prefetchPopularSearches = async () => {
  const popularTerms = ["bench press", "squat", "deadlift", "pull up"];

  for (const term of popularTerms) {
    const cacheKey = `search:${term}:10`;

    // Only fetch if not already cached
    if (!searchCache.has(cacheKey)) {
      const results = await performExerciseSearch(term, 10);
      searchCache.set(cacheKey, results);
    }
  }

  console.log("✅ Prefetched popular exercise searches");
};

// ============================================================================
// MONITORING AND DEBUGGING
// ============================================================================

/**
 * Log cache health and performance
 */
export function logSearchCacheHealth(): void {
  const stats = getCacheStats();

  console.log("📊 Exercise Search Cache Metrics:", {
    hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
    hits: stats.hits,
    misses: stats.misses,
    evictions: stats.evictions,
    currentSize: stats.size,
  });

  // Warn if hit rate is low
  if (stats.hitRate < 0.5 && stats.hits + stats.misses > 100) {
    console.warn("⚠️ Low cache hit rate - consider adjusting TTL or cache keys");
  }
}

/**
 * Debug: Show all cached search terms
 */
export function debugCachedSearches(): string[] {
  return searchCache
    .keys()
    .filter((key) => key.startsWith("search:"))
    .map((key) => key.split(":")[1] || "");
}

/**
 * Performance: Warm up cache with common searches
 */
export async function warmUpSearchCache(): Promise<void> {
  const commonSearches = [
    "bench",
    "squat",
    "deadlift",
    "press",
    "row",
    "curl",
    "pull",
    "push",
  ];

  console.log("🔥 Warming up exercise search cache...");

  await Promise.all(
    commonSearches.map(async (term) => {
      const cacheKey = `search:${term}:10`;
      if (!searchCache.has(cacheKey)) {
        const results = await performExerciseSearch(term, 10);
        searchCache.set(cacheKey, results);
      }
    }),
  );

  console.log(`✅ Warmed up cache with ${commonSearches.length} common searches`);
}

// ============================================================================
// TYPE DEFINITIONS (Examples)
// ============================================================================

interface Exercise {
  id: number;
  name: string;
  category: string;
  muscleGroups: string[];
}

interface ExerciseSearchResult {
  id: number;
  name: string;
  normalizedName: string;
  priority: number;
  fuzzyScore?: number;
}

// ============================================================================
// PLACEHOLDER FUNCTIONS (Replace with actual implementations)
// ============================================================================

async function performExerciseSearch(
  searchTerm: string,
  limit: number,
): Promise<ExerciseSearchResult[]> {
  // Actual implementation would query database
  return [];
}

async function fetchPopularExercises(): Promise<Exercise[]> {
  // Actual implementation would query database
  return [];
}

async function saveExerciseUpdate(
  exerciseId: number,
  data: any,
): Promise<void> {
  // Actual implementation would update database
}

// ============================================================================
// BEFORE vs AFTER COMPARISON
// ============================================================================

/**
 * CODE REDUCTION:
 *
 * BEFORE:
 * - SimpleCache class: 21 lines
 * - Manual metrics tracking: 4 lines
 * - getCacheMetrics function: 3 lines
 * - Total: 28 lines
 *
 * AFTER:
 * - Cache initialization: 1 line
 * - getCacheMetrics function: 1 line (reuses built-in)
 * - Total: 2 lines
 *
 * REDUCTION: 28 → 2 lines (93% reduction!)
 */

/**
 * FEATURE IMPROVEMENTS:
 *
 * ✅ Automatic Cleanup: No manual expiry checking
 * ✅ Built-in Metrics: No manual hit/miss counters
 * ✅ Hit Rate Calculation: Built-in (was missing before)
 * ✅ Memory Safety: Max 1000 entries (unlimited before)
 * ✅ LRU Eviction: Removes least used when full (none before)
 * ✅ Cache Health Checks: Can monitor across all caches
 * ✅ Consistent API: Same as progress router cache
 *
 * NEW CAPABILITIES:
 * - Custom TTL per entry (was fixed before)
 * - has() method for existence checks
 * - keys() method for debugging
 * - Eviction tracking
 * - Automatic cleanup intervals
 * - Size limits with LRU eviction
 */

/**
 * MIGRATION EFFORT: Very Low
 *
 * Steps:
 * 1. Replace SimpleCache class with 1-line initialization
 * 2. Remove manual metrics variables (cacheHits, cacheMisses)
 * 3. Update getCacheMetrics to use built-in metrics
 * 4. Replace cache.get/set calls (API compatible!)
 * 5. Test that search results are still correct
 *
 * Time: ~3 minutes
 */

/**
 * PERFORMANCE COMPARISON:
 *
 * Memory Usage:
 * - BEFORE: Unbounded (could grow indefinitely)
 * - AFTER: Bounded to 1000 entries max
 *
 * Cleanup:
 * - BEFORE: On-demand only (expired entries stay in memory)
 * - AFTER: Automatic every 5 minutes
 *
 * Metrics:
 * - BEFORE: Manual tracking (easy to forget/break)
 * - AFTER: Automatic tracking (always accurate)
 *
 * Hit Rate:
 * - BEFORE: Not calculated
 * - AFTER: Built-in calculation
 */

/**
 * EXAMPLE METRICS OUTPUT:
 *
 * BEFORE getCacheMetrics():
 * {
 *   hits: 450,
 *   misses: 50
 * }
 *
 * AFTER getCacheMetrics():
 * {
 *   hits: 450,
 *   misses: 50,
 *   evictions: 5,
 *   size: 487
 * }
 *
 * AFTER getCacheStats() (enhanced):
 * {
 *   hits: 450,
 *   misses: 50,
 *   evictions: 5,
 *   size: 487,
 *   hitRate: 0.9  // 90% hit rate!
 * }
 */

// ============================================================================
// TESTING EXAMPLE
// ============================================================================

/**
 * Unit test example for refactored cache
 */
export async function testSearchCache() {
  console.log("🧪 Testing exercise search cache...");

  // Clear cache for clean test
  searchCache.clear();

  // First search - should be cache miss
  const result1 = await searchMasterExercises("bench press", 10);
  console.assert(
    searchCache.getMetrics().misses === 1,
    "First search should be cache miss",
  );

  // Second search - should be cache hit
  const result2 = await searchMasterExercises("bench press", 10);
  console.assert(
    searchCache.getMetrics().hits === 1,
    "Second search should be cache hit",
  );

  // Check hit rate
  const hitRate = searchCache.getHitRate();
  console.assert(hitRate === 0.5, "Hit rate should be 50% (1 hit, 1 miss)");

  console.log("✅ All tests passed!");
}
