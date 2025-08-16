/**
 * Enhanced offline storage utilities with background sync and conflict resolution
 */

import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { type QueryClient } from "@tanstack/react-query";
import { offlineQueue, syncStatus, type QueueOperationType } from "./mobile-offline-queue";

// Storage key versioning for cache invalidation
const CACHE_VERSION = "swole-tracker-cache-v2";
const BACKGROUND_SYNC_INTERVAL = 30000; // 30 seconds

// Enhanced persister with compression for large datasets
const createEnhancedPersister = () => {
  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  
  return createSyncStoragePersister({
    storage,
    key: CACHE_VERSION,
    serialize: (data) => {
      try {
        // Compress large workout datasets
        const serialized = JSON.stringify(data);
        if (serialized.length > 100000) { // 100KB threshold
          console.log("Large cache detected, consider data pruning");
        }
        return serialized;
      } catch {
        return "{}";
      }
    },
    deserialize: (data) => {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    },
  });
};

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
          staleTime: Infinity, // Keep offline data fresh
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
  };
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
 * Clear all offline data (for logout or data reset)
 */
export async function clearAllOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Clear query cache
  localStorage.removeItem(CACHE_VERSION);
  
  // Clear offline queue
  await offlineQueue.clearQueue();
  
  // Clear sync status
  await syncStatus.updateSyncStatus({
    lastSync: 0,
    pendingOperations: 0,
    failedOperations: 0,
  });
}

/**
 * Get offline storage statistics for debugging
 */
export async function getOfflineStorageStats(): Promise<{
  cacheSize: string;
  queueStatus: any;
  syncStatus: any;
}> {
  const cacheSize = (() => {
    if (typeof window === "undefined") return "0 KB";
    const cache = localStorage.getItem(CACHE_VERSION);
    if (!cache) return "0 KB";
    const sizeInBytes = new Blob([cache]).size;
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  })();

  const queueStatus = await offlineQueue.getQueueStatus();
  const currentSyncStatus = await syncStatus.getSyncStatus();

  return {
    cacheSize,
    queueStatus,
    syncStatus: currentSyncStatus,
  };
}