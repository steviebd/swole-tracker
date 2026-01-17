const CACHE_VERSION_PREFIX = "swole-tracker-cache-v3";
const LEGACY_CACHE_KEY = "swole-tracker-cache";
const DEFAULT_CACHE_SCOPE = "guest";
const buildCacheKey = (scope) => `${CACHE_VERSION_PREFIX}:${scope}`;
let activeCacheScope = DEFAULT_CACHE_SCOPE;
const getActiveCacheKey = () => buildCacheKey(activeCacheScope);
const CACHE_SIZE_LIMITS = {
  WARNING_THRESHOLD: 4 * 1024 * 1024,
  // 4MB (80% of 5MB)
  AGGRESSIVE_CLEANUP: 4.5 * 1024 * 1024,
  // 4.5MB (90% of 5MB)
  FALLBACK_THRESHOLD: 4.75 * 1024 * 1024,
  // 4.75MB (95% of 5MB)
  MAX_CACHE_SIZE: 5 * 1024 * 1024
  // 5MB theoretical localStorage limit
};
class CacheManager {
  isMemoryOnlyMode = false;
  cacheKey = getActiveCacheKey();
  setCacheKey(key) {
    this.cacheKey = key;
  }
  getCacheKey() {
    return this.cacheKey;
  }
  /**
   * Get current cache size in bytes
   */
  getCacheSize() {
    if (typeof window === "undefined") return 0;
    const cache = localStorage.getItem(this.cacheKey);
    return cache ? new Blob([cache]).size : 0;
  }
  /**
   * Calculate available storage space
   */
  getAvailableSpace() {
    return CACHE_SIZE_LIMITS.MAX_CACHE_SIZE - this.getCacheSize();
  }
  /**
   * Perform LRU-style cache cleanup
   */
  performCacheCleanup(aggressive = false) {
    if (typeof window === "undefined") return;
    try {
      const cacheData = localStorage.getItem(this.cacheKey);
      if (!cacheData) return;
      const parsedCache = JSON.parse(cacheData);
      const queries = parsedCache?.clientState?.queries;
      if (!queries) return;
      const sortedQueries = Object.entries(queries).map(([key, query]) => ({
        key,
        query,
        lastAccessed: query?.state?.dataUpdatedAt || 0,
        size: JSON.stringify(query).length
      })).sort((a, b) => a.lastAccessed - b.lastAccessed);
      const targetReduction = aggressive ? 0.3 : 0.2;
      const queriesToRemove = Math.floor(
        sortedQueries.length * targetReduction
      );
      for (let i = 0; i < queriesToRemove; i++) {
        delete queries[sortedQueries[i].key];
      }
      localStorage.setItem(this.cacheKey, JSON.stringify(parsedCache));
      void this.trackCacheEvent("cache_cleanup", {
        aggressive,
        queriesRemoved: queriesToRemove,
        newSize: this.getCacheSize()
      });
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
      void this.trackCacheEvent("cache_cleanup_failed", {
        error: String(error)
      });
    }
  }
  /**
   * Handle quota exceeded errors gracefully
   */
  handleQuotaExceeded() {
    this.isMemoryOnlyMode = true;
    try {
      localStorage.removeItem(this.cacheKey);
      void this.trackCacheEvent("quota_exceeded_fallback", {
        previousSize: this.getCacheSize()
      });
    } catch (error) {
      console.warn("Failed to clear cache after quota exceeded:", error);
    }
  }
  /**
   * Check cache health and perform maintenance
   */
  performCacheHealthCheck() {
    if (typeof window === "undefined") return true;
    try {
      const currentSize = this.getCacheSize();
      const cacheData = localStorage.getItem(this.cacheKey);
      if (cacheData) {
        JSON.parse(cacheData);
      }
      if (currentSize >= CACHE_SIZE_LIMITS.FALLBACK_THRESHOLD) {
        console.warn("Cache size critical, falling back to memory-only mode");
        this.handleQuotaExceeded();
        return false;
      } else if (currentSize >= CACHE_SIZE_LIMITS.AGGRESSIVE_CLEANUP) {
        console.log("Performing aggressive cache cleanup");
        this.performCacheCleanup(true);
      } else if (currentSize >= CACHE_SIZE_LIMITS.WARNING_THRESHOLD) {
        console.log("Performing standard cache cleanup");
        this.performCacheCleanup(false);
      }
      void this.trackCacheEvent("cache_health_check", {
        cacheSize: currentSize,
        availableSpace: this.getAvailableSpace(),
        memoryOnlyMode: this.isMemoryOnlyMode
      });
      return true;
    } catch (error) {
      console.error("Cache health check failed:", error);
      try {
        localStorage.removeItem(this.cacheKey);
      } catch (clearError) {
        console.error("Failed to clear corrupted cache:", clearError);
      }
      void this.trackCacheEvent("cache_corrupted", { error: String(error) });
      return false;
    }
  }
  /**
   * Track cache-related events for analytics
   */
  async trackCacheEvent(event, properties) {
    try {
      if (typeof window !== "undefined" && window.posthog) {
        window.posthog.capture(`cache_${event}`, {
          ...properties,
          timestamp: typeof window !== "undefined" ? Date.now() : 0,
          cacheVersion: this.cacheKey
        });
      }
    } catch (error) {
      console.debug("Failed to track cache event:", error);
    }
  }
  /**
   * Get storage mode (memory-only or persistent)
   */
  isMemoryOnly() {
    return this.isMemoryOnlyMode;
  }
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.getCacheSize(),
      availableSpace: this.getAvailableSpace(),
      memoryOnly: this.isMemoryOnlyMode
    };
  }
}
const cacheManager = new CacheManager();
async function clearAllOfflineData() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_CACHE_KEY);
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key === LEGACY_CACHE_KEY || key.startsWith(`${CACHE_VERSION_PREFIX}:`)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    void cacheManager.trackCacheEvent("cache_cleared", {
      trigger: "logout_or_reset"
    });
    console.log("All offline data cleared successfully");
  } catch (error) {
    console.error("Failed to clear offline data:", error);
    void cacheManager.trackCacheEvent("cache_clear_failed", {
      error: String(error)
    });
  }
}
export {
  clearAllOfflineData
};
