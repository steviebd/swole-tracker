/**
 * Unified Server-Side Cache Manager
 *
 * Consolidates duplicate in-memory caching across server-side routers.
 * Replaces:
 * - progress.ts calculation cache (lines 74-93)
 * - exercises.ts SimpleCache class (lines 13-42)
 *
 * Features:
 * - TTL-based expiration
 * - Cache metrics (hits/misses)
 * - Automatic cleanup of expired entries
 * - Size limits to prevent memory leaks
 * - Multiple cache instances support
 */

interface CacheEntry<T> {
  value: T;
  expires: number;
  lastAccessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Maximum number of entries (prevents memory leaks) */
  maxSize?: number;
  /** Enable automatic cleanup of expired entries */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval?: number;
  /** Enable detailed metrics tracking */
  enableMetrics?: boolean;
}

/**
 * Generic server-side cache with TTL and size management
 */
export class ServerCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };
  private options: Required<CacheOptions>;
  private cleanupTimer?: NodeJS.Timeout | null;

  constructor(options: CacheOptions) {
    this.options = {
      maxSize: options.maxSize ?? 1000,
      autoCleanup: options.autoCleanup ?? true,
      cleanupInterval: options.cleanupInterval ?? 5 * 60 * 1000, // 5 minutes
      enableMetrics: options.enableMetrics ?? true,
      ttl: options.ttl,
    };

    // Start automatic cleanup if enabled
    if (this.options.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    // Cache miss
    if (!entry) {
      if (this.options.enableMetrics) {
        this.metrics.misses++;
      }
      return null;
    }

    // Check expiration
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      if (this.options.enableMetrics) {
        this.metrics.misses++;
        this.metrics.evictions++;
      }
      return null;
    }

    // Cache hit - update access time
    entry.lastAccessed = Date.now();
    if (this.options.enableMetrics) {
      this.metrics.hits++;
    }

    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key: string, value: T, customTtl?: number): void {
    const ttl = customTtl ?? this.options.ttl;

    // Check size limit and evict LRU if needed
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expires: now + ttl,
      lastAccessed: now,
    });

    this.metrics.size = this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.metrics.size = this.cache.size;
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.metrics.size = 0;
    this.metrics.evictions += this.cache.size;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): Readonly<CacheMetrics> {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: this.cache.size,
    };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total === 0 ? 0 : this.metrics.hits / total;
  }

  /**
   * Manually trigger cleanup of expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.metrics.evictions += removed;
      this.metrics.size = this.cache.size;
    }

    return removed;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
      this.metrics.size = this.cache.size;
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    // Prevent timer from keeping process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys (useful for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clear();
  }
}

/**
 * Pre-configured cache instances for common use cases
 */
export const cachePresets = {
  /**
   * For expensive calculations (1 hour TTL)
   * Replaces: progress.ts calculation cache
   */
  calculations: {
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 500,
    autoCleanup: true,
    enableMetrics: true,
  },

  /**
   * For API search results (5 minutes TTL)
   * Replaces: exercises.ts SimpleCache
   */
  search: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
    autoCleanup: true,
    enableMetrics: true,
  },

  /**
   * For session data (30 minutes TTL)
   */
  session: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 200,
    autoCleanup: true,
    enableMetrics: true,
  },

  /**
   * For aggregation queries (15 minutes TTL)
   */
  aggregation: {
    ttl: 15 * 60 * 1000, // 15 minutes
    maxSize: 300,
    autoCleanup: true,
    enableMetrics: true,
  },
} as const;

/**
 * Singleton cache manager for easy access across routers
 */
class CacheManager {
  private caches = new Map<string, ServerCache<unknown>>();

  /**
   * Get or create a named cache instance
   */
  getCache<T = unknown>(name: string, options?: CacheOptions): ServerCache<T> {
    if (!this.caches.has(name)) {
      if (!options) {
        throw new Error(
          `Cache "${name}" does not exist and no options provided`,
        );
      }
      this.caches.set(name, new ServerCache<T>(options));
    }
    return this.caches.get(name) as ServerCache<T>;
  }

  /**
   * Get all cache metrics
   */
  getAllMetrics(): Record<string, CacheMetrics> {
    const metrics: Record<string, CacheMetrics> = {};
    for (const [name, cache] of this.caches.entries()) {
      metrics[name] = cache.getMetrics();
    }
    return metrics;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Destroy all caches and cleanup resources
   */
  destroyAll(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

/**
 * Helper functions for backward compatibility
 */

/**
 * Create a calculation cache (replaces progress.ts cache)
 */
export function createCalculationCache<T = unknown>(): ServerCache<T> {
  return new ServerCache<T>(cachePresets.calculations);
}

/**
 * Create a search cache (replaces exercises.ts SimpleCache)
 */
export function createSearchCache<T = unknown>(): ServerCache<T> {
  return new ServerCache<T>(cachePresets.search);
}
