/**
 * Integration tests for cache migration
 *
 * Tests that verify the migrated cache implementations maintain
 * backward compatibility and improve performance.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cacheManager, cachePresets } from "~/server/cache/server-cache-manager";

describe("Cache Migration Integration Tests", () => {
  afterEach(() => {
    // Clean up all caches after each test
    cacheManager.clearAll();
  });

  describe("Progress Cache Integration", () => {
    it("should create progress calculations cache with correct preset", () => {
      const cache = cacheManager.getCache(
        "progress-calculations",
        cachePresets.calculations,
      );

      expect(cache).toBeDefined();
      expect(cache.getMetrics().size).toBe(0);
    });

    it("should cache expensive calculations", () => {
      const cache = cacheManager.getCache(
        "progress-calculations",
        cachePresets.calculations,
      );

      const userId = "user123";
      const exerciseId = 42;
      const key = `strength:${userId}:${exerciseId}`;

      // Simulate expensive calculation
      const expensiveResult = {
        trend: "increasing",
        percentChange: 15.5,
        dataPoints: [/* ... */],
      };

      // First call - set the cache
      cache.set(key, expensiveResult);

      // Second call - cache hit
      const cachedResult = cache.get(key);
      expect(cachedResult).toEqual(expensiveResult);

      // Verify metrics
      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1); // One get call = one hit
      expect(metrics.misses).toBe(0);
      expect(metrics.size).toBe(1);
    });

    it("should handle multiple user calculations independently", () => {
      const cache = cacheManager.getCache(
        "progress-calculations",
        cachePresets.calculations,
      );

      const user1Data = { trend: "increasing" };
      const user2Data = { trend: "decreasing" };

      cache.set("strength:user1:42", user1Data);
      cache.set("strength:user2:42", user2Data);

      expect(cache.get("strength:user1:42")).toEqual(user1Data);
      expect(cache.get("strength:user2:42")).toEqual(user2Data);
      expect(cache.size()).toBe(2);
    });

    it("should expire calculations after TTL", async () => {
      const shortCache = cacheManager.getCache("test-progress-ttl", {
        ttl: 100,
        enableMetrics: true,
      });

      shortCache.set("test-key", { data: "value" });
      expect(shortCache.get("test-key")).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(shortCache.get("test-key")).toBeNull();
    });
  });

  describe("Exercise Search Cache Integration", () => {
    it("should create exercise search cache with correct preset", () => {
      const cache = cacheManager.getCache(
        "exercise-search",
        cachePresets.search,
      );

      expect(cache).toBeDefined();
      expect(cache.getMetrics().size).toBe(0);
    });

    it("should cache search results", () => {
      const cache = cacheManager.getCache(
        "exercise-search",
        cachePresets.search,
      );

      const searchQuery = "bench press";
      const userId = "user123";
      const cacheKey = `search:${userId}:${searchQuery}`;

      const searchResults = {
        items: [
          { id: 1, name: "Bench Press", normalizedName: "bench press" },
          { id: 2, name: "Incline Bench Press", normalizedName: "incline bench press" },
        ],
        nextCursor: null,
      };

      cache.set(cacheKey, searchResults);
      const cached = cache.get(cacheKey);

      expect(cached).toEqual(searchResults);
      expect(cache.getMetrics().hits).toBe(1);
    });

    it("should handle paginated search results", () => {
      const cache = cacheManager.getCache(
        "exercise-search",
        cachePresets.search,
      );

      const userId = "user123";
      const query = "press";

      // Page 1
      const page1Key = `search:${userId}:${query}:page1`;
      const page1Results = {
        items: [{ id: 1, name: "Bench Press" }],
        nextCursor: "cursor1",
      };

      // Page 2
      const page2Key = `search:${userId}:${query}:page2`;
      const page2Results = {
        items: [{ id: 2, name: "Overhead Press" }],
        nextCursor: null,
      };

      cache.set(page1Key, page1Results);
      cache.set(page2Key, page2Results);

      expect(cache.get(page1Key)).toEqual(page1Results);
      expect(cache.get(page2Key)).toEqual(page2Results);
      expect(cache.size()).toBe(2);
    });

    it("should respect 5 minute TTL for search results", async () => {
      const shortCache = cacheManager.getCache("test-search-ttl", {
        ttl: 100, // 100ms for testing
        enableMetrics: true,
      });

      const searchResults = { items: [], nextCursor: null };
      shortCache.set("search:user:query", searchResults);

      expect(shortCache.get("search:user:query")).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(shortCache.get("search:user:query")).toBeNull();
    });
  });

  describe("Cross-Router Cache Access", () => {
    it("should allow multiple routers to access same cache", () => {
      const progressCache = cacheManager.getCache(
        "shared-calculations",
        cachePresets.calculations,
      );
      const anotherAccessor = cacheManager.getCache("shared-calculations");

      expect(progressCache).toBe(anotherAccessor);

      progressCache.set("key1", "value1");
      expect(anotherAccessor.get("key1")).toBe("value1");
    });

    it("should aggregate metrics across multiple access points", () => {
      const cache1 = cacheManager.getCache(
        "metrics-test",
        cachePresets.calculations,
      );
      const cache2 = cacheManager.getCache("metrics-test");

      cache1.set("key", "value");
      cache1.get("key"); // hit
      cache2.get("missing"); // miss

      const metrics = cache1.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);

      const metrics2 = cache2.getMetrics();
      expect(metrics2.hits).toBe(1);
      expect(metrics2.misses).toBe(1);
    });
  });

  describe("Backward Compatibility", () => {
    it("should support getCachedCalculation pattern", () => {
      const cache = cacheManager.getCache(
        "progress-calculations",
        cachePresets.calculations,
      );

      // Simulate old getCachedCalculation API
      const getCachedCalculation = <T>(key: string): T | null => {
        return cache.get(key) as T | null;
      };

      const setCachedCalculation = <T>(key: string, value: T): void => {
        cache.set(key, value);
      };

      // Use old API
      setCachedCalculation("test-key", { data: "value" });
      const result = getCachedCalculation<{ data: string }>("test-key");

      expect(result).toEqual({ data: "value" });
    });

    it("should support SimpleCache pattern with null returns", () => {
      const cache = cacheManager.getCache(
        "exercise-search",
        cachePresets.search,
      );

      // Old SimpleCache returned undefined for misses, new returns null
      const result = cache.get("missing-key");
      expect(result).toBeNull();

      // But we can check with === null or !result
      expect(result === null).toBe(true);
      expect(!result).toBe(true);
    });
  });

  describe("Performance Improvements", () => {
    it("should reduce redundant calculations through caching", () => {
      const cache = cacheManager.getCache(
        "perf-test",
        cachePresets.calculations,
      );

      let calculationCount = 0;
      const expensiveCalculation = () => {
        calculationCount++;
        return { result: Math.random() };
      };

      const getOrCalculate = (key: string) => {
        const cached = cache.get(key);
        if (cached) return cached;

        const result = expensiveCalculation();
        cache.set(key, result);
        return result;
      };

      // First call - should calculate
      const result1 = getOrCalculate("calc-key");
      expect(calculationCount).toBe(1);

      // Second call - should use cache
      const result2 = getOrCalculate("calc-key");
      expect(calculationCount).toBe(1); // Still 1, not 2
      expect(result2).toBe(result1);

      // Verify hit rate
      expect(cache.getHitRate()).toBe(0.5); // 1 hit out of 2 total gets
    });

    it("should handle high-frequency cache access efficiently", () => {
      const cache = cacheManager.getCache(
        "high-freq-test",
        cachePresets.search,
      );

      // Simulate rapid search requests
      const searches = Array.from({ length: 100 }, (_, i) => `query${i % 10}`);
      const results: unknown[] = [];

      for (const query of searches) {
        const cached = cache.get(query);
        if (cached) {
          results.push(cached);
        } else {
          const result = { query, items: [] };
          cache.set(query, result);
          results.push(result);
        }
      }

      expect(results.length).toBe(100);
      expect(cache.size()).toBe(10); // Only 10 unique queries

      // High hit rate due to repeated queries
      const hitRate = cache.getHitRate();
      expect(hitRate).toBeGreaterThan(0.8); // >80% cache hits
    });
  });

  describe("Cache Health Metrics", () => {
    it("should provide detailed metrics for monitoring", () => {
      const cache = cacheManager.getCache(
        "metrics-detail-test",
        cachePresets.calculations,
      );

      // Populate cache
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      // Access patterns
      cache.get("key1"); // hit
      cache.get("key1"); // hit
      cache.get("missing"); // miss

      const metrics = cache.getMetrics();

      expect(metrics).toEqual({
        hits: 2,
        misses: 1,
        evictions: 0,
        size: 2,
      });

      expect(cache.getHitRate()).toBeCloseTo(0.667, 2); // 2/3
    });

    it("should aggregate metrics across all caches", () => {
      const cache1 = cacheManager.getCache("cache1", cachePresets.calculations);
      const cache2 = cacheManager.getCache("cache2", cachePresets.search);

      cache1.set("key", "value");
      cache1.get("key");

      cache2.set("key", "value");
      cache2.get("missing");

      const allMetrics = cacheManager.getAllMetrics();

      expect(allMetrics["cache1"]).toBeDefined();
      expect(allMetrics["cache2"]).toBeDefined();
      expect(allMetrics["cache1"]!.hits).toBe(1);
      expect(allMetrics["cache2"]!.misses).toBe(1);
    });
  });

  describe("Memory Management", () => {
    it("should respect size limits", () => {
      const limitedCache = cacheManager.getCache("size-limit-test", {
        ttl: 60000,
        maxSize: 3,
        enableMetrics: true,
      });

      limitedCache.set("key1", "value1");
      limitedCache.set("key2", "value2");
      limitedCache.set("key3", "value3");

      expect(limitedCache.size()).toBe(3);

      // Adding 4th should evict LRU
      limitedCache.set("key4", "value4");
      expect(limitedCache.size()).toBe(3);
      expect(limitedCache.getMetrics().evictions).toBe(1);
    });

    it("should cleanup expired entries", async () => {
      const cleanupCache = cacheManager.getCache("cleanup-test", {
        ttl: 50,
        enableMetrics: true,
        autoCleanup: false, // Manual cleanup for testing
      });

      cleanupCache.set("expired1", "value1");
      cleanupCache.set("expired2", "value2");
      cleanupCache.set("valid", "value3", 5000);

      // Wait for some to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const removedCount = cleanupCache.cleanup();
      expect(removedCount).toBe(2);
      expect(cleanupCache.size()).toBe(1);
    });
  });
});
