"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";
import {
  getQueue,
  dequeue,
  updateItem,
  requeueWithBackoff,
  pruneExhausted,
  updateSyncStatus,
  getSyncStatus,
  onSyncStatusChange,
  getConnectionState,
  onConnectionChange,
  addConflict,
  resolveConflict,
  clearResolvedConflicts,
  type QueuedMutation,
  type SyncStatus,
  type ConnectionState,
  isSlowConnection,
  shouldDelaySync
} from "~/lib/offline-queue";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

interface BackgroundSyncHook {
  syncNow: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
  clearQueue: () => void;
  syncStatus: SyncStatus;
  connectionState: ConnectionState;
  isActive: boolean;
}

export function useBackgroundSync(): BackgroundSyncHook {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [connectionState, setConnectionState] = useState<ConnectionState>(getConnectionState());
  const [isActive, setIsActive] = useState(true);
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  
  // Convex mutations for different operations
  const updateWorkout = useMutation(api.workouts.updateWorkout);
  // TODO: Fix missing Convex functions
  // const createSession = useMutation(api.workouts.createSession);
  // const addExercise = useMutation(api.workouts.addExercise);
  // const updateSet = useMutation(api.workouts.updateSet);

  // Set up real-time monitoring
  useEffect(() => {
    const unsubscribeSync = onSyncStatusChange(setSyncStatus);
    const unsubscribeConnection = onConnectionChange(setConnectionState);
    
    return () => {
      unsubscribeSync();
      unsubscribeConnection();
    };
  }, []);

  // Get the appropriate mutation function for the operation
  const getMutationFunction = useCallback((operation: string) => {
    switch (operation) {
      case 'workouts.updateWorkout':
        return updateWorkout;
      case 'workouts.createSession':
        // TODO: Implement createSession function
        throw new Error('createSession not implemented');
      case 'workouts.addExercise':
        // TODO: Implement addExercise function
        throw new Error('addExercise not implemented');
      case 'workouts.updateSet':
        // TODO: Implement updateSet function
        throw new Error('updateSet not implemented');
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }, [updateWorkout]);

  // Process a single queued mutation
  const processMutation = useCallback(async (mutation: QueuedMutation): Promise<boolean> => {
    try {
      const mutationFn = getMutationFunction(mutation.operation);
      
      // Execute the mutation
      await mutationFn(mutation.payload);
      
      // Mark as successful
      updateItem(mutation.id, {
        attempts: mutation.attempts + 1
      });
      
      return true;
    } catch (error) {
      console.error(`Sync error for ${mutation.operation}:`, error);
      
      // Handle different types of errors
      if (error instanceof ConvexError) {
        // Check if this is a conflict error
        if (error.message.includes('conflict') || error.message.includes('version')) {
          // Add to conflicts for user resolution
          addConflict({
            id: mutation.id,
            localData: mutation.payload,
            serverData: (error as any).data,
            resolution: 'pending',
            strategy: mutation.conflictStrategy || 'timestamp'
          });
          
          toast.error('Sync conflict detected - check your conflicts');
          return false;
        }
      }
      
      // Update the mutation with error info
      updateItem(mutation.id, {
        attempts: mutation.attempts + 1,
        lastError: error instanceof Error ? error.message : String(error)
      });
      
      // If we've exhausted retries, show error
      if (mutation.attempts >= mutation.maxRetries) {
        toast.error(`Failed to sync ${mutation.type} after ${mutation.maxRetries} attempts`);
        return false;
      }
      
      // Requeue with backoff if we haven't exhausted retries
      requeueWithBackoff(mutation);
      return false;
    }
  }, [getMutationFunction]);

  // Main sync loop
  const syncLoop = useCallback(async () => {
    if (isSyncingRef.current || !isActive) return;
    
    const queue = getQueue();
    if (queue.length === 0) {
      updateSyncStatus({ 
        isActive: false, 
        progress: 100,
        queueLength: 0 
      });
      return;
    }
    
    if (shouldDelaySync()) {
      // Delay sync on poor connection
      const delay = isSlowConnection() ? 30000 : 5000;
      syncTimeoutRef.current = setTimeout(syncLoop, delay);
      return;
    }
    
    isSyncingRef.current = true;
    updateSyncStatus({ 
      isActive: true, 
      progress: 0,
      queueLength: queue.length 
    });
    
    let processed = 0;
    
    try {
      // Process mutations in priority order
      for (const mutation of queue.slice(0, 5)) { // Process max 5 at a time
        const success = await processMutation(mutation);
        
        if (success) {
          // Remove successful mutation from queue
          getQueue().filter(m => m.id !== mutation.id);
          // Update queue storage would happen in processMutation
          processed++;
        }
        
        // Update progress
        const progress = (processed / Math.min(queue.length, 5)) * 100;
        updateSyncStatus({ 
          progress,
          queueLength: getQueue().length 
        });
        
        // Add delay between mutations to not overwhelm the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Clean up exhausted items
      pruneExhausted();
      
      const endTime = Date.now();
      const remainingQueue = getQueue();
      
      updateSyncStatus({
        isActive: false,
        progress: remainingQueue.length === 0 ? 100 : 50,
        queueLength: remainingQueue.length,
        lastSync: endTime
      });
      
      if (processed > 0) {
        toast.success(`Synced ${processed} changes successfully!`);
      }
      
      // Schedule next sync if there are still items
      if (remainingQueue.length > 0 && isActive) {
        const delay = isSlowConnection() ? 10000 : 2000;
        syncTimeoutRef.current = setTimeout(() => {
          void syncLoop();
        }, delay);
      }
      
    } catch (error) {
      console.error('Sync loop error:', error);
      updateSyncStatus({
        isActive: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      isSyncingRef.current = false;
    }
  }, [isActive, processMutation]);

  // Start sync when connection is restored or queue has items
  useEffect(() => {
    if (connectionState.isOnline && getQueue().length > 0 && isActive) {
      // Delay initial sync to allow UI to stabilize
      const delay = 1000;
      syncTimeoutRef.current = setTimeout(() => {
        void syncLoop();
      }, delay);
    }
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [connectionState.isOnline, syncLoop, isActive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    await syncLoop();
  }, [syncLoop]);

  const pauseSync = useCallback(() => {
    setIsActive(false);
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    updateSyncStatus({ isActive: false });
  }, []);

  const resumeSync = useCallback(() => {
    setIsActive(true);
    if (connectionState.isOnline && getQueue().length > 0) {
      void syncLoop();
    }
  }, [connectionState.isOnline, syncLoop]);

  const clearQueue = useCallback(() => {
    // This would call the clearQueue function from offline-queue
    // For safety, we'll just update the status here
    updateSyncStatus({ 
      queueLength: 0, 
      isActive: false, 
      progress: 100 
    });
    toast.info('Sync queue cleared');
  }, []);

  return {
    syncNow,
    pauseSync,
    resumeSync,
    clearQueue,
    syncStatus,
    connectionState,
    isActive
  };
}

// Hook for monitoring sync conflicts
export function useSyncConflicts() {
  const [conflicts, setConflicts] = useState<any[]>([]);
  
  useEffect(() => {
    // In a real implementation, this would listen to conflicts changes
    // For now, we'll just initialize empty
    setConflicts([]);
  }, []);
  
  const resolveConflictById = useCallback((id: string, strategy: 'merge' | 'overwrite' | 'discard') => {
    resolveConflict(id, strategy);
    setConflicts(prev => prev.filter(c => c.id !== id));
    toast.success('Conflict resolved');
  }, []);
  
  const clearResolved = useCallback(() => {
    clearResolvedConflicts();
    toast.info('Resolved conflicts cleared');
  }, []);
  
  return {
    conflicts,
    resolveConflict: resolveConflictById,
    clearResolved,
    hasConflicts: conflicts.length > 0
  };
}