/**
 * Tests for Unified Server-Side Cache Manager
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ServerCache,
  cacheManager,
  cachePresets,
  createCalculationCache,
  createSearchCache,
} from "~/server/cache/server-cache-manager";

describe("ServerCache", () => {
  let cache: ServerCache<string>;

  beforeEach(() => {
    cache = new ServerCache<string>({ ttl: 1000 });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe("Basic Operations", () => {
    it("should cache and retrieve values", () => {
      cache.set("key", "value");
      expect(cache.get("key")).toBe("value");
    });

    it("should return null for missing keys", () => {
      expect(cache.get("missing")).toBeNull();
    });

    it("should check if key exists", () => {
      cache.set("key", "value");
      expect(cache.has("key")).toBe(true);
      expect(cache.has("missing")).toBe(false);
    });

    it("should delete specific keys", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      expect(cache.has("key1")).toBe(true);
      expect(cache.delete("key1")).toBe(true);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(true);
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
    });
  });

  describe("TTL Expiration", () => {
    it("should expire entries after TTL", async () => {
      cache.set("key", "value");
      expect(cache.get("key")).toBe("value");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(cache.get("key")).toBeNull();
    });

    it("should support custom TTL per entry", async () => {
      cache.set("short", "value", 100); // 100ms TTL
      cache.set("long", "value", 2000); // 2s TTL

      // Both should be available initially
      expect(cache.get("short")).toBe("value");
      expect(cache.get("long")).toBe("value");

      // Wait for short to expire
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get("short")).toBeNull();
      expect(cache.get("long")).toBe("value");
    });
  });

  describe("Metrics", () => {
    it("should track hits and misses", () => {
      cache.set("key", "value");

      // Hit
      cache.get("key");

      // Miss
      cache.get("missing");

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(cache.getHitRate()).toBe(0.5);
    });

    it("should calculate hit rate correctly", () => {
      cache.set("key", "value");

      // Multiple hits
      cache.get("key");
      cache.get("key");
      cache.get("key");

      // One miss
      cache.get("missing");

      expect(cache.getHitRate()).toBe(0.75); // 3 hits / 4 total
    });

    it("should handle zero requests for hit rate", () => {
      expect(cache.getHitRate()).toBe(0);
    });

    it("should reset metrics", () => {
      cache.set("key", "value");
      cache.get("key");
      cache.get("missing");

      cache.resetMetrics();

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.evictions).toBe(0);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict LRU when cache is full", () => {
      const smallCache = new ServerCache<string>({ ttl: 60000, maxSize: 3 });

      // Fill cache to capacity
      smallCache.set("a", "1");
      smallCache.set("b", "2");
      smallCache.set("c", "3");

      // At this point, all entries have the same lastAccessed time
      // The LRU algorithm will evict the first one it encounters ("a")

      // Add "d" - should evict one entry
      smallCache.set("d", "4");

      // Check that exactly one entry was evicted
      const keys = smallCache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain("d");

      // Check metrics
      const metrics = smallCache.getMetrics();
      expect(metrics.evictions).toBe(1);

      smallCache.destroy();
    });

    it("should not evict when updating existing key", () => {
      const smallCache = new ServerCache<string>({ ttl: 60000, maxSize: 2 });

      smallCache.set("a", "1");
      smallCache.set("b", "2");

      // Update existing key - should not trigger eviction
      smallCache.set("a", "updated");

      expect(smallCache.has("a")).toBe(true);
      expect(smallCache.has("b")).toBe(true);
      expect(smallCache.get("a")).toBe("updated");

      const metrics = smallCache.getMetrics();
      expect(metrics.evictions).toBe(0);

      smallCache.destroy();
    });
  });

  describe("Automatic Cleanup", () => {
    it("should cleanup expired entries", async () => {
      cache.set("expired1", "value", 50);
      cache.set("expired2", "value", 50);
      cache.set("valid", "value", 2000);

      // Wait for some entries to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(2);
      expect(cache.has("expired1")).toBe(false);
      expect(cache.has("expired2")).toBe(false);
      expect(cache.has("valid")).toBe(true);
    });

    it("should track eviction metrics for cleanup", async () => {
      cache.set("expired", "value", 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const beforeMetrics = cache.getMetrics();
      cache.cleanup();
      const afterMetrics = cache.getMetrics();

      expect(afterMetrics.evictions).toBe(beforeMetrics.evictions + 1);
    });
  });

  describe("Utility Methods", () => {
    it("should return current size", () => {
      expect(cache.size()).toBe(0);

      cache.set("key1", "value1");
      expect(cache.size()).toBe(1);

      cache.set("key2", "value2");
      expect(cache.size()).toBe(2);

      cache.delete("key1");
      expect(cache.size()).toBe(1);
    });

    it("should return all keys", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const keys = cache.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });
  });
});

describe("CacheManager", () => {
  afterEach(() => {
    cacheManager.clearAll();
  });

  it("should create and retrieve named caches", () => {
    const cache1 = cacheManager.getCache("test1", cachePresets.calculations);
    const cache2 = cacheManager.getCache("test2", cachePresets.search);

    expect(cache1).toBeInstanceOf(ServerCache);
    expect(cache2).toBeInstanceOf(ServerCache);

    // Should return same instance on subsequent calls
    const cache1Again = cacheManager.getCache("test1");
    expect(cache1Again).toBe(cache1);
  });

  it("should throw error when getting non-existent cache without options", () => {
    expect(() => {
      cacheManager.getCache("non-existent");
    }).toThrow('Cache "non-existent" does not exist and no options provided');
  });

  it("should get metrics for all caches", () => {
    const cache1 = cacheManager.getCache("test1", cachePresets.calculations);
    const cache2 = cacheManager.getCache("test2", cachePresets.search);

    cache1.set("key", "value");
    cache1.get("key");

    cache2.set("key", "value");
    cache2.get("missing");

    const allMetrics = cacheManager.getAllMetrics();

    expect(allMetrics["test1"]).toBeDefined();
    expect(allMetrics["test2"]).toBeDefined();
    expect(allMetrics["test1"]?.hits).toBe(1);
    expect(allMetrics["test1"]?.misses).toBe(0);
    expect(allMetrics["test2"]?.hits).toBe(0);
    expect(allMetrics["test2"]?.misses).toBe(1);
  });

  it("should clear all caches", () => {
    const cache1 = cacheManager.getCache("test1", cachePresets.calculations);
    const cache2 = cacheManager.getCache("test2", cachePresets.search);

    cache1.set("key1", "value1");
    cache2.set("key2", "value2");

    expect(cache1.size()).toBe(1);
    expect(cache2.size()).toBe(1);

    cacheManager.clearAll();

    expect(cache1.size()).toBe(0);
    expect(cache2.size()).toBe(0);
  });
});

describe("Cache Presets", () => {
  it("should have calculation preset with correct values", () => {
    expect(cachePresets.calculations.ttl).toBe(60 * 60 * 1000); // 1 hour
    expect(cachePresets.calculations.maxSize).toBe(500);
    expect(cachePresets.calculations.autoCleanup).toBe(true);
    expect(cachePresets.calculations.enableMetrics).toBe(true);
  });

  it("should have search preset with correct values", () => {
    expect(cachePresets.search.ttl).toBe(5 * 60 * 1000); // 5 minutes
    expect(cachePresets.search.maxSize).toBe(1000);
    expect(cachePresets.search.autoCleanup).toBe(true);
    expect(cachePresets.search.enableMetrics).toBe(true);
  });

  it("should have session preset with correct values", () => {
    expect(cachePresets.session.ttl).toBe(30 * 60 * 1000); // 30 minutes
    expect(cachePresets.session.maxSize).toBe(200);
    expect(cachePresets.session.autoCleanup).toBe(true);
    expect(cachePresets.session.enableMetrics).toBe(true);
  });

  it("should have aggregation preset with correct values", () => {
    expect(cachePresets.aggregation.ttl).toBe(15 * 60 * 1000); // 15 minutes
    expect(cachePresets.aggregation.maxSize).toBe(300);
    expect(cachePresets.aggregation.autoCleanup).toBe(true);
    expect(cachePresets.aggregation.enableMetrics).toBe(true);
  });
});

describe("Helper Functions", () => {
  it("should create calculation cache", () => {
    const cache = createCalculationCache() as ServerCache<string>;

    expect(cache).toBeInstanceOf(ServerCache);
    cache.set("test", "value");
    expect(cache.get("test")).toBe("value");
    cache.destroy();
  });

  it("should create search cache", () => {
    const cache = createSearchCache() as ServerCache<string>;

    expect(cache).toBeInstanceOf(ServerCache);
    cache.set("test", "value");
    expect(cache.get("test")).toBe("value");
    cache.destroy();
  });
});

describe("Cache Options", () => {
  it("should use default options when not specified", () => {
    const cache = new ServerCache({ ttl: 1000 });

    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");

    const metrics = cache.getMetrics();
    expect(metrics.size).toBe(1);

    cache.destroy();
  });

  it("should respect custom options", () => {
    const cache = new ServerCache({
      ttl: 2000,
      maxSize: 10,
      autoCleanup: false,
      enableMetrics: false,
    });

    // Metrics should be disabled
    cache.set("key", "value");
    cache.get("key");
    cache.get("missing");

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(0);
    expect(metrics.misses).toBe(0);

    cache.destroy();
  });
});
