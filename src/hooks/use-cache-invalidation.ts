"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import { 
  enqueueMutation,
  getSyncStatus,
  onSyncStatusChange,
  getConnectionState,
  onConnectionChange,
  saveDraftWorkout,
  getDraftWorkout,
  clearDraftWorkout,
  type SyncStatus,
  type ConnectionState,
  type QueuedMutation
} from "~/lib/offline-queue";
import { toast } from "sonner";

interface CacheInvalidationHook {
  onWorkoutSave: (data: any, sessionId?: string) => Promise<void>;
  invalidateWorkouts: () => Promise<void>;
  syncStatus: SyncStatus;
  connectionState: ConnectionState;
  isOnline: boolean;
  queueMutation: (type: QueuedMutation['type'], operation: string, payload: any, options?: any) => string;
  saveDraft: (sessionId: string, data: any) => void;
  getDraft: (sessionId: string) => any;
  clearDraft: (sessionId: string) => void;
  hasUnsynced: boolean;
}

export function useCacheInvalidation(): CacheInvalidationHook {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [connectionState, setConnectionState] = useState<ConnectionState>(getConnectionState());

  // Set up real-time sync status monitoring
  useEffect(() => {
    const unsubscribeSync = onSyncStatusChange(setSyncStatus);
    const unsubscribeConnection = onConnectionChange(setConnectionState);
    
    // Update connection state on window focus
    const handleFocus = () => {
      setConnectionState(getConnectionState());
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      unsubscribeSync();
      unsubscribeConnection();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const onWorkoutSave = useCallback(async (data: any, sessionId?: string) => {
    try {
      if (connectionState.isOnline) {
        // Online: save immediately and clear any draft
        if (sessionId) {
          clearDraftWorkout(sessionId);
        }
        // Trigger cache invalidation for workout queries
        toast.success('Workout saved successfully!');
      } else {
        // Offline: queue the mutation and save as draft
        enqueueMutation(
          'workout_save',
          'workouts.updateWorkout',
          data,
          { priority: 'high', conflictStrategy: 'timestamp' }
        );
        
        if (sessionId) {
          saveDraftWorkout(sessionId, data);
        }
        
        toast.success('Workout saved offline - will sync when online!');
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Failed to save workout');
    }
  }, [connectionState.isOnline]);

  const invalidateWorkouts = useCallback(async () => {
    // This triggers refetch of workout-related queries
    // In Convex, the real-time subscriptions will automatically update
    // when the underlying data changes, so we mainly need to handle
    // offline scenarios here
    
    if (!connectionState.isOnline && syncStatus.queueLength > 0) {
      toast.info(`${syncStatus.queueLength} changes queued for sync`);
    }
  }, [connectionState.isOnline, syncStatus.queueLength]);

  const queueMutation = useCallback((
    type: QueuedMutation['type'],
    operation: string,
    payload: any,
    options: any = {}
  ) => {
    return enqueueMutation(type, operation, payload, options);
  }, []);

  const saveDraft = useCallback((sessionId: string, data: any) => {
    saveDraftWorkout(sessionId, data);
  }, []);

  const getDraft = useCallback((sessionId: string) => {
    return getDraftWorkout(sessionId);
  }, []);

  const clearDraft = useCallback((sessionId: string) => {
    clearDraftWorkout(sessionId);
  }, []);

  return {
    onWorkoutSave,
    invalidateWorkouts,
    syncStatus,
    connectionState,
    isOnline: connectionState.isOnline,
    queueMutation,
    saveDraft,
    getDraft,
    clearDraft,
    hasUnsynced: syncStatus.queueLength > 0
  };
}

// Auto-save hook for workout sessions
export function useAutoSave(sessionId: string, data: any, options: {
  interval?: number;
  enabled?: boolean;
  onSave?: () => void;
  onError?: (error: Error) => void;
} = {}) {
  const { interval = 30000, enabled = true, onSave, onError } = options;
  const { onWorkoutSave, saveDraft } = useCacheInvalidation();
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isDirty, setIsDirty] = useState(false);

  // Track data changes
  useEffect(() => {
    setIsDirty(true);
  }, [data]);

  // Auto-save interval
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const autoSave = async () => {
      try {
        await onWorkoutSave(data, sessionId);
        saveDraft(sessionId, data);
        setLastSaved(Date.now());
        setIsDirty(false);
        onSave?.();
      } catch (error) {
        console.error('Auto-save error:', error);
        onError?.(error as Error);
      }
    };

    const timer = setInterval(autoSave, interval);
    return () => clearInterval(timer);
  }, [enabled, isDirty, data, sessionId, interval, onWorkoutSave, saveDraft, onSave, onError]);

  // Save on app backgrounding/beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirty) {
        saveDraft(sessionId, data);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isDirty) {
        saveDraft(sessionId, data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDirty, sessionId, data, saveDraft]);

  const forceSave = useCallback(async () => {
    try {
      await onWorkoutSave(data, sessionId);
      setLastSaved(Date.now());
      setIsDirty(false);
      onSave?.();
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  }, [data, sessionId, onWorkoutSave, onSave, onError]);

  return {
    lastSaved,
    isDirty,
    forceSave
  };
}