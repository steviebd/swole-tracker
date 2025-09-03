/**
 * Enhanced offline storage utilities with background sync and conflict resolution
 * Consolidates offline storage, cache management, and background sync features
 */

import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { type QueryClient } from "@tanstack/react-query";
import { offlineQueue, syncStatus, type QueueOperationType } from "./mobile-offline-queue";
import { initializeCacheAnalytics, getCacheAnalytics } from "./cache-analytics";

// Storage key versioning for cache invalidation
const CACHE_VERSION = "swole-tracker-cache-v3";
const BACKGROUND_SYNC_INTERVAL = 30000; // 30 seconds

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

  /**
   * Get current cache size in bytes
   */
  private getCacheSize(): number {
    if (typeof window === "undefined") return 0;
    const cache = localStorage.getItem(CACHE_VERSION);
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
      const cacheData = localStorage.getItem(CACHE_VERSION);
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
      const queriesToRemove = Math.floor(sortedQueries.length * targetReduction);

      // Remove oldest queries
      for (let i = 0; i < queriesToRemove; i++) {
        delete queries[sortedQueries[i]!.key];
      }

      // Save cleaned cache
      localStorage.setItem(CACHE_VERSION, JSON.stringify(parsedCache));

      // Track cleanup in PostHog and analytics
      void this.trackCacheEvent("cache_cleanup", {
        aggressive,
        queriesRemoved: queriesToRemove,
        newSize: this.getCacheSize(),
      });

      const analytics = getCacheAnalytics();
      if (analytics) {
        analytics.recordCacheHealth({
          cacheSize: this.getCacheSize(),
          availableSpace: this.getAvailableSpace(),
          memoryOnlyMode: this.isMemoryOnlyMode,
          cleanupPerformed: true,
          queriesEvicted: queriesToRemove,
        });
      }
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
      void this.trackCacheEvent("cache_cleanup_failed", { error: String(error) });
    }
  }

  /**
   * Handle quota exceeded errors gracefully
   */
  private handleQuotaExceeded(): void {
    this.isMemoryOnlyMode = true;
    
    try {
      // Clear all non-essential cached data
      localStorage.removeItem(CACHE_VERSION);
      void this.trackCacheEvent("quota_exceeded_fallback", {
        previousSize: this.getCacheSize(),
      });

      const analytics = getCacheAnalytics();
      if (analytics) {
        analytics.recordQuotaExceeded({
          previousSize: this.getCacheSize(),
        });
      }
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
      const cacheData = localStorage.getItem(CACHE_VERSION);
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

      // Update cache analytics
      const analytics = getCacheAnalytics();
      if (analytics) {
        analytics.recordCacheHealth({
          cacheSize: currentSize,
          availableSpace: this.getAvailableSpace(),
          memoryOnlyMode: this.isMemoryOnlyMode,
        });
      }

      return true;
    } catch (error) {
      console.error("Cache health check failed:", error);
      
      // Clear corrupted cache
      try {
        localStorage.removeItem(CACHE_VERSION);
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
  private async trackCacheEvent(event: string, properties: Record<string, any>): Promise<void> {
    try {
      // Use dynamic import to avoid breaking server-side rendering
      if (typeof window !== "undefined" && (window as any).posthog) {
        (window as any).posthog.capture(`cache_${event}`, {
          ...properties,
          timestamp: Date.now(),
          cacheVersion: CACHE_VERSION,
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

// Enhanced persister with size management and error handling
const createEnhancedPersister = () => {
  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  
  return createSyncStoragePersister({
    storage: cacheManager.isMemoryOnly() ? undefined : storage, // Fall back to memory if needed
    key: CACHE_VERSION,
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
          console.log("Large cache detected during serialization, performing cleanup");
          cacheManager.performCacheHealthCheck();
        }

        return serialized;
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          console.warn("Storage quota exceeded, falling back to memory-only caching");
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
        console.warn("Cache deserialization failed, clearing corrupted data:", error);
        
        // Clear corrupted data
        try {
          if (typeof window !== "undefined") {
            localStorage.removeItem(CACHE_VERSION);
          }
        } catch (clearError) {
          console.error("Failed to clear corrupted cache:", clearError);
        }
        
        return { clientState: { queries: {} } };
      }
    },
  });
};

// Legacy persister for backward compatibility
const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "swole-tracker-cache",
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

/**
 * Background sync manager for processing offline queue
 */
class BackgroundSyncManager {
  private syncInterval?: NodeJS.Timeout;
  private isProcessing = false;
  private callbacks = new Set<(status: any) => void>();

  constructor(private queryClient: QueryClient) {}

  start() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      void this.processPendingOperations();
    }, BACKGROUND_SYNC_INTERVAL);

    // Also process immediately if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void this.processPendingOperations();
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  onSyncStatusChange(callback: (status: any) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(status: any) {
    this.callbacks.forEach(callback => callback(status));
  }

  async processPendingOperations(): Promise<void> {
    if (this.isProcessing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    this.isProcessing = true;
    
    try {
      let processedCount = 0;
      let item;
      
      // Process up to 5 items per batch to avoid blocking
      while ((item = await offlineQueue.dequeue()) && processedCount < 5) {
        try {
          await this.processQueueItem(item);
          processedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('Failed to process queue item:', item.type, errorMessage);
          
          // Re-queue with backoff
          await offlineQueue.requeueWithBackoff(item, errorMessage);
        }
      }

      if (processedCount > 0) {
        await syncStatus.markSyncCompleted();
        
        // Invalidate relevant queries after successful sync
        await this.invalidateQueriesAfterSync();
      }

      // Update sync status
      const status = await syncStatus.getSyncStatus();
      this.notifyCallbacks(status);
      
    } finally {
      this.isProcessing = false;
    }
  }

  private async processQueueItem(item: any): Promise<void> {
    const { type, payload } = item;
    
    // This would integrate with your tRPC mutations
    // For now, we'll simulate the API calls
    switch (type as QueueOperationType) {
      case 'workout_save':
        await this.syncWorkout(payload);
        break;
      case 'template_create':
      case 'template_update':
        await this.syncTemplate(payload);
        break;
      case 'template_delete':
        await this.deleteTemplate(payload);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  private async syncWorkout(payload: any): Promise<void> {
    // This would call your tRPC workout.save mutation
    // For demo purposes, we'll simulate success
    console.log('Syncing workout:', payload);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real implementation:
    // await api.workouts.save.mutate(payload);
  }

  private async syncTemplate(payload: any): Promise<void> {
    console.log('Syncing template:', payload);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In real implementation:
    // if (payload.id) {
    //   await api.templates.update.mutate(payload);
    // } else {
    //   await api.templates.create.mutate(payload);
    // }
  }

  private async deleteTemplate(payload: any): Promise<void> {
    console.log('Deleting template:', payload);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In real implementation:
    // await api.templates.delete.mutate({ id: payload.id });
  }

  private async invalidateQueriesAfterSync(): Promise<void> {
    // Invalidate relevant queries after successful sync
    await Promise.all([
      this.queryClient.invalidateQueries({ queryKey: ["workouts"] }),
      this.queryClient.invalidateQueries({ queryKey: ["templates"] }),
      this.queryClient.invalidateQueries({ queryKey: ["workouts", "getRecent"] }),
    ]);
  }
}

let backgroundSyncManager: BackgroundSyncManager | undefined;

/**
 * Enhanced offline persistence setup with background sync
 * This is the new primary function that includes all advanced features
 */
export function setupEnhancedOfflinePersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  const persister = createEnhancedPersister();
  
  void persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    buster: CACHE_VERSION,
    hydrateOptions: {
      // Ensure offline data is immediately available
      defaultOptions: {
        queries: {
          // Keep offline data fresh by setting a very long gcTime instead of staleTime
          gcTime: Infinity,
        },
      },
    },
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Persist successful queries and loading states for offline-first UX
        return query.state.status === "success" || query.state.status === "pending";
      },
      shouldDehydrateMutation: () => false, // Don't persist mutations
    },
  });

  // Initialize background sync
  backgroundSyncManager = new BackgroundSyncManager(queryClient);
  backgroundSyncManager.start();

  // Initialize cache analytics
  initializeCacheAnalytics(queryClient);

  // Listen for online/offline events
  const handleOnline = () => {
    void syncStatus.updateSyncStatus({ isOnline: true });
    void backgroundSyncManager?.processPendingOperations();
  };

  const handleOffline = () => {
    void syncStatus.updateSyncStatus({ isOnline: false });
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Cleanup function (would be called on app unmount)
  return () => {
    backgroundSyncManager?.stop();
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    
    // Cleanup cache analytics
    void import("./cache-analytics").then(({ destroyCacheAnalytics }) => {
      destroyCacheAnalytics();
    });
  };
}

/**
 * Legacy offline persistence setup for backward compatibility
 * Uses the simple persister without advanced features
 */
export function setupOfflinePersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return;

  void persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    buster: "swole-tracker-v1", // Increment to clear old cache
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
 * Manual sync trigger for user-initiated sync
 */
export async function triggerManualSync(): Promise<void> {
  if (!backgroundSyncManager) return;
  await backgroundSyncManager.processPendingOperations();
}

/**
 * Subscribe to sync status changes
 */
export function onSyncStatusChange(callback: (status: any) => void): () => void {
  if (!backgroundSyncManager) {
    return () => {
      // Empty cleanup function
    };
  }
  return backgroundSyncManager.onSyncStatusChange(callback);
}

/**
 * Optimistic update helper for mutations
 */
export function createOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: any[],
  updateFn: (oldData: T | undefined) => T
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
export type ConflictResolution = 'local' | 'remote' | 'merge';

export async function resolveDataConflict<T>(
  localData: T,
  remoteData: T,
  strategy: ConflictResolution = 'remote'
): Promise<T> {
  switch (strategy) {
    case 'local':
      return localData;
    case 'remote':
      return remoteData;
    case 'merge':
      // Simple merge strategy - in practice, this would be more sophisticated
      if (typeof localData === 'object' && typeof remoteData === 'object') {
        return { ...remoteData, ...localData };
      }
      return remoteData;
    default:
      return remoteData;
  }
}

/**
 * Clear offline cache (useful for debugging or user logout)
 * Legacy function maintained for backward compatibility
 */
export function clearOfflineCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("swole-tracker-cache");
}

/**
 * Clear all offline data (for logout or data reset)
 * Enhanced version that clears all offline storage
 */
export async function clearAllOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;
  
  try {
    // Clear both old and new cache versions
    localStorage.removeItem("swole-tracker-cache"); // Legacy
    localStorage.removeItem(CACHE_VERSION); // New version
    
    // Clear offline queue
    await offlineQueue.clearQueue();
    
    // Clear sync status
    await syncStatus.updateSyncStatus({
      lastSync: 0,
      pendingOperations: 0,
      failedOperations: 0,
    });

    // Track cache clear event
    void (cacheManager as any).trackCacheEvent("cache_cleared", {
      trigger: "logout_or_reset",
    });

    const analytics = getCacheAnalytics();
    if (analytics) {
      analytics.recordCacheCleared("logout");
    }

    console.log("All offline data cleared successfully");
  } catch (error) {
    console.error("Failed to clear offline data:", error);
    void (cacheManager as any).trackCacheEvent("cache_clear_failed", {
      error: String(error),
    });
  }
}

/**
 * Get cache size for debugging (legacy function)
 */
export function getCacheSize(): string {
  if (typeof window === "undefined") return "0 KB";

  // Check both old and new cache versions
  const legacyCache = localStorage.getItem("swole-tracker-cache");
  const newCache = localStorage.getItem(CACHE_VERSION);
  const cache = newCache || legacyCache;
  
  if (!cache) return "0 KB";

  const sizeInBytes = new Blob([cache]).size;
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get cache manager instance for advanced operations
 */
export function getCacheManager(): CacheManager {
  return cacheManager;
}

/**
 * Get comprehensive cache performance report for debugging
 */
export async function getCachePerformanceReport(): Promise<{
  analytics: {
    summary: string;
    metrics: any;
    recentEvents: any[];
    recommendations: string[];
  } | null;
  storageStats: {
    cacheSize: string;
    queueStatus: any;
    syncStatus: any;
    cacheStats: { size: number; availableSpace: number; memoryOnly: boolean };
  };
}> {
  // Get analytics report
  const analytics = getCacheAnalytics();
  const analyticsReport = analytics ? analytics.getCacheReport() : null;

  // Get storage stats
  const cacheSize = getCacheSize();
  const queueStatus = await offlineQueue.getQueueStatus();
  const currentSyncStatus = await syncStatus.getSyncStatus();
  const cacheStats = cacheManager.getStats();

  return {
    analytics: analyticsReport,
    storageStats: {
      cacheSize,
      queueStatus,
      syncStatus: currentSyncStatus,
      cacheStats,
    },
  };
}

/**
 * Get offline storage statistics for debugging (legacy function)
 */
export async function getOfflineStorageStats(): Promise<{
  cacheSize: string;
  queueStatus: any;
  syncStatus: any;
  cacheStats: { size: number; availableSpace: number; memoryOnly: boolean };
}> {
  const report = await getCachePerformanceReport();
  return report.storageStats;
}