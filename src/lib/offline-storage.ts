/**
 * Enhanced offline storage utilities with background sync and conflict resolution
 * Consolidates offline storage, cache management, and background sync features
 */

import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { type QueryClient } from "@tanstack/react-query";

// Storage key versioning for cache invalidation
const CACHE_VERSION_PREFIX = "swole-tracker-cache-v3";
const LEGACY_CACHE_KEY = "swole-tracker-cache";
const DEFAULT_CACHE_SCOPE = "guest";

const sanitizeCacheScope = (value: string | null | undefined): string => {
  if (!value) return DEFAULT_CACHE_SCOPE;

  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
};

const buildCacheKey = (scope: string): string =>
  `${CACHE_VERSION_PREFIX}:${scope}`;

let activeCacheScope = DEFAULT_CACHE_SCOPE;

const getActiveCacheKey = (): string => buildCacheKey(activeCacheScope);
const CACHE_BUSTER = `${CACHE_VERSION_PREFIX}-schema-v1`;

// Cache size management constants (localStorage ~5MB limit)
const CACHE_SIZE_LIMITS = {
  WARNING_THRESHOLD: 4 * 1024 * 1024, // 4MB (80% of 5MB)
  AGGRESSIVE_CLEANUP: 4.5 * 1024 * 1024, // 4.5MB (90% of 5MB)
  FALLBACK_THRESHOLD: 4.75 * 1024 * 1024, // 4.75MB (95% of 5MB)
  MAX_CACHE_SIZE: 5 * 1024 * 1024, // 5MB theoretical localStorage limit
} as const;

/**
 * Cache management utilities
 */
class CacheManager {
  private isMemoryOnlyMode = false;
  private cacheKey = getActiveCacheKey();

  setCacheKey(key: string): void {
    this.cacheKey = key;
  }

  getCacheKey(): string {
    return this.cacheKey;
  }

  /**
   * Get current cache size in bytes
   */
  private getCacheSize(): number {
    if (typeof window === "undefined") return 0;
    const cache = localStorage.getItem(this.cacheKey);
    return cache ? new Blob([cache]).size : 0;
  }

  /**
   * Calculate available storage space
   */
  private getAvailableSpace(): number {
    return CACHE_SIZE_LIMITS.MAX_CACHE_SIZE - this.getCacheSize();
  }

  /**
   * Perform LRU-style cache cleanup
   */
  private performCacheCleanup(aggressive = false): void {
    if (typeof window === "undefined") return;

    try {
      const cacheData = localStorage.getItem(this.cacheKey);
      if (!cacheData) return;

      const parsedCache = JSON.parse(cacheData);
      const queries = parsedCache?.clientState?.queries;
      if (!queries) return;

      // Sort queries by last accessed time (LRU)
      const sortedQueries = Object.entries(queries)
        .map(([key, query]: [string, any]) => ({
          key,
          query,
          lastAccessed: query?.state?.dataUpdatedAt || 0,
          size: JSON.stringify(query).length,
        }))
        .sort((a, b) => a.lastAccessed - b.lastAccessed);

      // Determine cleanup threshold
      const targetReduction = aggressive ? 0.3 : 0.2; // Remove 30% or 20% of queries
      const queriesToRemove = Math.floor(
        sortedQueries.length * targetReduction,
      );

      // Remove oldest queries
      for (let i = 0; i < queriesToRemove; i++) {
        delete queries[sortedQueries[i]!.key];
      }

      // Save cleaned cache
      localStorage.setItem(this.cacheKey, JSON.stringify(parsedCache));

      // Track cleanup in PostHog
      void this.trackCacheEvent("cache_cleanup", {
        aggressive,
        queriesRemoved: queriesToRemove,
        newSize: this.getCacheSize(),
      });
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
      void this.trackCacheEvent("cache_cleanup_failed", {
        error: String(error),
      });
    }
  }

  /**
   * Handle quota exceeded errors gracefully
   */
  private handleQuotaExceeded(): void {
    this.isMemoryOnlyMode = true;

    try {
      // Clear all non-essential cached data
      localStorage.removeItem(this.cacheKey);
      void this.trackCacheEvent("quota_exceeded_fallback", {
        previousSize: this.getCacheSize(),
      });
    } catch (error) {
      console.warn("Failed to clear cache after quota exceeded:", error);
    }
  }

  /**
   * Check cache health and perform maintenance
   */
  performCacheHealthCheck(): boolean {
    if (typeof window === "undefined") return true;

    try {
      const currentSize = this.getCacheSize();

      // Check for corrupted cache data
      const cacheData = localStorage.getItem(this.cacheKey);
      if (cacheData) {
        JSON.parse(cacheData); // Will throw if corrupted
      }

      // Perform size-based maintenance
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
        memoryOnlyMode: this.isMemoryOnlyMode,
      });

      return true;
    } catch (error) {
      console.error("Cache health check failed:", error);

      // Clear corrupted cache
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
  private async trackCacheEvent(
    event: string,
    properties: Record<string, any>,
  ): Promise<void> {
    try {
      // Use dynamic import to avoid breaking server-side rendering
      if (typeof window !== "undefined" && (window as any).posthog) {
        (window as any).posthog.capture(`cache_${event}`, {
          ...properties,
          timestamp: typeof window !== "undefined" ? Date.now() : 0,
          cacheVersion: this.cacheKey,
        });
      }
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
      console.debug("Failed to track cache event:", error);
    }
  }

  /**
   * Get storage mode (memory-only or persistent)
   */
  isMemoryOnly(): boolean {
    return this.isMemoryOnlyMode;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; availableSpace: number; memoryOnly: boolean } {
    return {
      size: this.getCacheSize(),
      availableSpace: this.getAvailableSpace(),
      memoryOnly: this.isMemoryOnlyMode,
    };
  }
}

// Global cache manager instance
const cacheManager = new CacheManager();

export function setOfflineCacheUser(userId: string | null): void {
  activeCacheScope = sanitizeCacheScope(userId);
  cacheManager.setCacheKey(getActiveCacheKey());
}

export function getOfflineCacheKey(): string {
  return cacheManager.getCacheKey();
}

// Enhanced persister with size management and error handling
export const createEnhancedPersister = () => {
  const storage =
    typeof window !== "undefined" ? window.localStorage : undefined;

  return createSyncStoragePersister({
    storage: cacheManager.isMemoryOnly() ? undefined : storage, // Fall back to memory if needed
    key: cacheManager.getCacheKey(),
    serialize: (data) => {
      try {
        // Perform health check before serialization
        if (!cacheManager.performCacheHealthCheck()) {
          // Cache is unhealthy, use minimal serialization
          return JSON.stringify({ clientState: { queries: {} } });
        }

        const serialized = JSON.stringify(data);

        // Check if serialization would exceed limits
        if (serialized.length > CACHE_SIZE_LIMITS.WARNING_THRESHOLD) {
          console.log(
            "Large cache detected during serialization, performing cleanup",
          );
          cacheManager.performCacheHealthCheck();
        }

        return serialized;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "QuotaExceededError"
        ) {
          console.warn(
            "Storage quota exceeded, falling back to memory-only caching",
          );
          (cacheManager as any).handleQuotaExceeded();
        }

        console.warn("Cache serialization failed:", error);
        return JSON.stringify({ clientState: { queries: {} } });
      }
    },
    deserialize: (data: string): any => {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.warn(
          "Cache deserialization failed, clearing corrupted data:",
          error,
        );

        // Clear corrupted data
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(cacheManager.getCacheKey());
          }
        } catch (clearError) {
          console.error("Failed to clear corrupted cache:", clearError);
        }

        return { clientState: { queries: {} } };
      }
    },
  });
};

/**
 * Setup offline persistence with enhanced features
 */
export function setupOfflinePersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  void persistQueryClient({
    queryClient,
    persister: createEnhancedPersister(),
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    buster: CACHE_BUSTER,
    hydrateOptions: {},
    dehydrateOptions: {
      // Don't persist failed or loading queries
      shouldDehydrateQuery: (query) => {
        return query.state.status === "success";
      },
    },
  });
}

/**
 * Optimistic update helper for mutations
 */
export function createOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: any[],
  updateFn: (oldData: T | undefined) => T,
) {
  return {
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update
      queryClient.setQueryData<T>(queryKey, updateFn);

      return { previousData };
    },

    onError: (err: any, variables: any, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Refresh data after mutation
      void queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Conflict resolution for data synchronization
 */
export type ConflictResolution = "local" | "remote" | "merge";

export async function resolveDataConflict<T>(
  localData: T,
  remoteData: T,
  strategy: ConflictResolution = "remote",
): Promise<T> {
  switch (strategy) {
    case "local":
      return localData;
    case "remote":
      return remoteData;
    case "merge":
      // Simple merge strategy - in practice, this would be more sophisticated
      if (typeof localData === "object" && typeof remoteData === "object") {
        return { ...remoteData, ...localData };
      }
      return remoteData;
    default:
      return remoteData;
  }
}

/**
 * Clear all offline data (for logout or data reset)
 * Enhanced version that clears all offline storage
 */
export async function clearAllOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // Clear both old and new cache versions
    localStorage.removeItem(LEGACY_CACHE_KEY); // Legacy

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key === LEGACY_CACHE_KEY ||
        key.startsWith(`${CACHE_VERSION_PREFIX}:`)
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    // Track cache clear event
    void (cacheManager as any).trackCacheEvent("cache_cleared", {
      trigger: "logout_or_reset",
    });

    console.log("All offline data cleared successfully");
  } catch (error) {
    console.error("Failed to clear offline data:", error);
    void (cacheManager as any).trackCacheEvent("cache_clear_failed", {
      error: String(error),
    });
  }
}

/**
 * Get cache manager instance for advanced operations
 */
export function getCacheManager(): CacheManager {
  return cacheManager;
}
