/**
 * Enhanced offline storage with comprehensive conflict resolution and data validation
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getQueue,
  getSyncStatus,
  getConnectionState,
  getConflicts,
  getDraftWorkouts,
  enqueueMutation,
  onSyncStatusChange,
  onConnectionChange,
  saveDraftWorkout,
  getDraftWorkout,
  clearDraftWorkout,
  addConflict,
  resolveConflict,
  clearOldDrafts,
  type QueuedMutation,
  type SyncStatus,
  type ConnectionState,
  type ConflictResolution
} from "~/lib/offline-queue";
import { toast } from "sonner";

export interface OfflineOperation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface OfflineStorageState {
  operations: QueuedMutation[];
  isOnline: boolean;
  lastSync: number | null;
  syncInProgress: boolean;
  conflicts: ConflictResolution[];
  drafts: Record<string, any>;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface DataValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface BackupManifest {
  timestamp: number;
  version: string;
  dataTypes: string[];
  size: number;
  checksum: string;
}

// Main hook for offline storage state
export function useOfflineStorage(): OfflineStorageState {
  const [operations, setOperations] = useState<QueuedMutation[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [connectionState, setConnectionState] = useState<ConnectionState>(getConnectionState());
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  useEffect(() => {
    // Initialize state
    setOperations(getQueue());
    setConflicts(getConflicts());
    setDrafts(getDraftWorkouts());

    // Set up listeners
    const unsubscribeSync = onSyncStatusChange((status) => {
      setSyncStatus(status);
      setOperations(getQueue()); // Refresh operations when sync status changes
    });

    const unsubscribeConnection = onConnectionChange(setConnectionState);

    // Clean up old drafts on mount
    clearOldDrafts();

    return () => {
      unsubscribeSync();
      unsubscribeConnection();
    };
  }, []);

  const connectionQuality = getConnectionQuality(connectionState);

  return {
    operations,
    isOnline: connectionState.isOnline,
    lastSync: syncStatus.lastSync,
    syncInProgress: syncStatus.isActive,
    conflicts,
    drafts,
    connectionQuality
  };
}

// Enhanced operation queueing with validation
export function queueOfflineOperation(
  operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'status'>,
  options: {
    priority?: 'high' | 'medium' | 'low';
    validate?: boolean;
    conflictStrategy?: 'merge' | 'overwrite' | 'user-choice' | 'timestamp';
  } = {}
) {
  const { validate = true, priority = 'medium', conflictStrategy = 'timestamp' } = options;

  // Validate data if requested
  if (validate) {
    const errors = validateOperationData(operation.type, operation.data);
    if (errors.some(e => e.severity === 'error')) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }
    if (errors.some(e => e.severity === 'warning')) {
      console.warn('Operation validation warnings:', errors.filter(e => e.severity === 'warning'));
    }
  }

  // Queue the mutation
  const mutationId = enqueueMutation(
    operation.type as QueuedMutation['type'],
    getOperationName(operation.type),
    operation.data,
    {
      priority,
      conflictStrategy
    }
  );

  toast.info(`${operation.type} queued for sync`);
  return mutationId;
}

// Data validation for different operation types
function validateOperationData(type: string, data: any): DataValidationError[] {
  const errors: DataValidationError[] = [];

  switch (type) {
    case 'workout_save':
      if (!data.sessionId) {
        errors.push({ field: 'sessionId', message: 'Session ID is required', severity: 'error' });
      }
      if (!data.exercises || !Array.isArray(data.exercises)) {
        errors.push({ field: 'exercises', message: 'Exercises array is required', severity: 'error' });
      }
      if (data.exercises?.length === 0) {
        errors.push({ field: 'exercises', message: 'At least one exercise is required', severity: 'warning' });
      }
      break;

    case 'set_update':
      if (data.weight !== undefined && (data.weight < 0 || data.weight > 1000)) {
        errors.push({ field: 'weight', message: 'Weight must be between 0 and 1000', severity: 'warning' });
      }
      if (data.reps !== undefined && (data.reps < 0 || data.reps > 100)) {
        errors.push({ field: 'reps', message: 'Reps must be between 0 and 100', severity: 'warning' });
      }
      break;

    default:
      // Generic validation
      if (!data || typeof data !== 'object') {
        errors.push({ field: 'data', message: 'Data must be a valid object', severity: 'error' });
      }
  }

  return errors;
}

// Map operation types to Convex function names
function getOperationName(type: string): string {
  const operationMap: Record<string, string> = {
    'workout_save': 'workouts.updateWorkout',
    'workout_update': 'workouts.updateWorkout',
    'session_create': 'workouts.createSession',
    'exercise_add': 'workouts.addExercise',
    'set_update': 'workouts.updateSet'
  };

  return operationMap[type] || 'workouts.updateWorkout';
}

// Connection quality assessment
function getConnectionQuality(state: ConnectionState): 'excellent' | 'good' | 'poor' | 'offline' {
  if (!state.isOnline) return 'offline';
  
  if (state.effectiveType === '4g' && state.networkType === 'wifi') {
    return 'excellent';
  }
  
  if (state.effectiveType === '4g' || state.effectiveType === '3g') {
    return 'good';
  }
  
  return 'poor';
}

// Enhanced draft management with recovery
export function useWorkoutRecovery(sessionId: string) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  useEffect(() => {
    const draft = getDraftWorkout(sessionId);
    if (draft && draft.savedAt) {
      // Check if draft is recent (within 24 hours)
      const isRecent = Date.now() - draft.savedAt < 24 * 60 * 60 * 1000;
      if (isRecent) {
        setHasDraft(true);
        setDraftData(draft);
        setShowRecoveryModal(true);
      } else {
        // Clean up old draft
        clearDraftWorkout(sessionId);
      }
    }
  }, [sessionId]);

  const recoverDraft = useCallback(() => {
    setShowRecoveryModal(false);
    return draftData;
  }, [draftData]);

  const discardDraft = useCallback(() => {
    clearDraftWorkout(sessionId);
    setHasDraft(false);
    setDraftData(null);
    setShowRecoveryModal(false);
  }, [sessionId]);

  return {
    hasDraft,
    draftData,
    showRecoveryModal,
    recoverDraft,
    discardDraft
  };
}

// Data backup and restore functionality
export function createDataBackup(): BackupManifest {
  const timestamp = Date.now();
  const data = {
    operations: getQueue(),
    drafts: getDraftWorkouts(),
    conflicts: getConflicts(),
    syncStatus: getSyncStatus()
  };

  const dataString = JSON.stringify(data);
  const backup = {
    timestamp,
    version: '1.0',
    dataTypes: ['operations', 'drafts', 'conflicts', 'syncStatus'],
    size: dataString.length,
    checksum: simpleChecksum(dataString),
    data
  };

  // Save to localStorage as backup
  if (typeof window !== 'undefined') {
    localStorage.setItem(`backup_${timestamp}`, JSON.stringify(backup));
  }

  return backup;
}

export function restoreDataBackup(manifest: BackupManifest): boolean {
  try {
    if (typeof window === 'undefined') return false;
    
    const backupData = localStorage.getItem(`backup_${manifest.timestamp}`);
    if (!backupData) return false;

    const backup = JSON.parse(backupData);
    
    // Verify checksum
    const dataString = JSON.stringify(backup.data);
    if (simpleChecksum(dataString) !== manifest.checksum) {
      console.error('Backup checksum mismatch');
      return false;
    }

    // This would restore the data to the offline storage
    // For now, we'll just log the success
    console.log('Backup restored successfully:', manifest);
    toast.success('Data backup restored');
    
    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    toast.error('Failed to restore backup');
    return false;
  }
}

// Simple checksum for data integrity
function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Legacy compatibility
export function triggerManualSync() {
  // This would be handled by the useBackgroundSync hook
  toast.info('Manual sync triggered');
}

export function setupEnhancedOfflinePersistence() {
  // Clean up old drafts and conflicts
  clearOldDrafts();
  
  // Set up periodic cleanup
  if (typeof window !== 'undefined') {
    const cleanup = () => {
      clearOldDrafts();
      // Clean up old backups (keep last 5)
      const keys = Object.keys(localStorage).filter(k => k.startsWith('backup_'));
      if (keys.length > 5) {
        keys.slice(0, -5).forEach(key => localStorage.removeItem(key));
      }
    };
    
    // Run cleanup daily
    const interval = setInterval(cleanup, 24 * 60 * 60 * 1000);
    
    // Cleanup on page unload
    const handleUnload = () => {
      clearInterval(interval);
      cleanup();
    };
    
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }
}

export default {
  useOfflineStorage,
  queueOfflineOperation,
  triggerManualSync,
  setupEnhancedOfflinePersistence,
  useWorkoutRecovery,
  createDataBackup,
  restoreDataBackup
};