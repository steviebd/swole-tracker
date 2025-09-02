/**
 * Enhanced offline queue with background sync and conflict resolution.
 * Supports multiple mutation types and intelligent retry strategies.
 */
export type SaveWorkoutPayload = {
  sessionId: number;
  exercises: Array<{
    templateExerciseId?: number;
    exerciseName: string;
    sets: Array<{
      id: string; // ensure id is present to satisfy API input types
      weight?: number;
      reps?: number;
      sets?: number;
      unit: "kg" | "lbs";
    }>;
    unit: "kg" | "lbs";
  }>;
};

export type QueuedMutation = {
  id: string;
  type: 'workout_save' | 'workout_update' | 'session_create' | 'exercise_add' | 'set_update';
  operation: string; // Convex function name
  payload: any;
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  maxRetries: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  conflictStrategy?: 'merge' | 'overwrite' | 'user-choice' | 'timestamp';
};

export interface ConnectionState {
  isOnline: boolean;
  networkType: 'wifi' | 'cellular' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  rtt?: number; // Round trip time
  downlink?: number; // Bandwidth estimate
}

export interface SyncStatus {
  isActive: boolean;
  progress: number; // 0-100
  queueLength: number;
  lastSync: number | null;
  nextRetry: number | null;
  error?: string;
}

export interface ConflictResolution {
  id: string;
  localData: any;
  serverData: any;
  resolution: 'pending' | 'resolved';
  strategy: 'merge' | 'overwrite' | 'user-choice' | 'timestamp';
  timestamp: number;
}

// Legacy support
type QueueItem = QueuedMutation;

const STORAGE_KEY = "offline.queue.v2";
const SYNC_STATUS_KEY = "offline.sync-status.v1";
const CONFLICTS_KEY = "offline.conflicts.v1";
const DRAFT_WORKOUTS_KEY = "offline.draft-workouts.v1";

const MAX_ATTEMPTS = 8;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000, 60000, 120000, 300000]; // Progressive backoff
const HIGH_PRIORITY_MAX_RETRIES = 12;
const MEDIUM_PRIORITY_MAX_RETRIES = 8;
const LOW_PRIORITY_MAX_RETRIES = 5;

// Sync callback registry
type SyncCallback = (status: SyncStatus) => void;
const syncCallbacks: Set<SyncCallback> = new Set();

// Connection listeners
type ConnectionCallback = (state: ConnectionState) => void;
const connectionCallbacks: Set<ConnectionCallback> = new Set();

function now() {
  return Date.now();
}

function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migrate old format
    return parsed.map(item => ({
      ...item,
      priority: item.priority || 'medium',
      maxRetries: item.maxRetries || MAX_ATTEMPTS,
      operation: item.operation || 'workouts.updateWorkout'
    }));
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedMutation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function readSyncStatus(): SyncStatus {
  if (typeof window === "undefined") {
    return { isActive: false, progress: 0, queueLength: 0, lastSync: null, nextRetry: null };
  }
  try {
    const raw = window.localStorage.getItem(SYNC_STATUS_KEY);
    if (!raw) return { isActive: false, progress: 0, queueLength: 0, lastSync: null, nextRetry: null };
    return JSON.parse(raw);
  } catch {
    return { isActive: false, progress: 0, queueLength: 0, lastSync: null, nextRetry: null };
  }
}

function writeSyncStatus(status: SyncStatus) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  // Notify all listeners
  syncCallbacks.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.warn('Sync callback error:', error);
    }
  });
}

function readConflicts(): ConflictResolution[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONFLICTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeConflicts(conflicts: ConflictResolution[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
}

function uuid() {
  return `q_${Math.random().toString(36).slice(2)}_${now().toString(36)}`;
}

// Network quality helpers
export function isSlowConnection(): boolean {
  const state = getConnectionState();
  return state.effectiveType === 'slow-2g' || state.effectiveType === '2g' || 
         (state.rtt !== undefined && state.rtt > 1000) ||
         (state.downlink !== undefined && state.downlink < 0.5);
}

export function shouldDelaySync(): boolean {
  const state = getConnectionState();
  return !state.isOnline || isSlowConnection();
}

export function getQueue(): QueuedMutation[] {
  return readQueue();
}

export function getQueueLength(): number {
  return readQueue().length;
}

export function getSyncStatus(): SyncStatus {
  const status = readSyncStatus();
  return {
    ...status,
    queueLength: getQueueLength()
  };
}

export function getConflicts(): ConflictResolution[] {
  return readConflicts();
}

export function enqueueMutation(
  type: QueuedMutation['type'],
  operation: string,
  payload: any,
  options: {
    priority?: QueuedMutation['priority'];
    conflictStrategy?: QueuedMutation['conflictStrategy'];
    maxRetries?: number;
  } = {}
) {
  const q = readQueue();
  const priority = options.priority || 'medium';
  const maxRetries = options.maxRetries ||
    (priority === 'high' ? HIGH_PRIORITY_MAX_RETRIES :
     priority === 'medium' ? MEDIUM_PRIORITY_MAX_RETRIES :
     LOW_PRIORITY_MAX_RETRIES);
  
  const item: QueuedMutation = {
    id: uuid(),
    type,
    operation,
    payload,
    priority,
    attempts: 0,
    maxRetries,
    createdAt: now(),
    updatedAt: now(),
    conflictStrategy: options.conflictStrategy
  };
  
  // Insert based on priority
  if (priority === 'high') {
    q.unshift(item);
  } else {
    q.push(item);
  }
  
  writeQueue(q);
  updateSyncStatus({ queueLength: q.length });
  return item.id;
}

// Legacy support
export function enqueueWorkoutSave(payload: SaveWorkoutPayload) {
  return enqueueMutation('workout_save', 'workouts.updateWorkout', payload, {
    priority: 'high',
    conflictStrategy: 'timestamp'
  });
}

export function dequeue(): QueuedMutation | undefined {
  const q = readQueue();
  // Sort by priority and creation time
  q.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.createdAt - b.createdAt;
  });
  
  const item = q.shift();
  if (item) {
    writeQueue(q);
    updateSyncStatus({ queueLength: q.length });
  }
  return item;
}

export function updateItem(id: string, patch: Partial<QueuedMutation>) {
  const q = readQueue();
  const idx = q.findIndex((i) => i.id === id);
  if (idx === -1) return;
  q[idx] = { ...q[idx]!, ...patch, updatedAt: now() };
  writeQueue(q);
}

export function requeueWithBackoff(item: QueuedMutation) {
  const q = readQueue();
  const retryDelay = RETRY_DELAYS[Math.min(item.attempts, RETRY_DELAYS.length - 1)] || 5000;
  const nextRetry = now() + retryDelay;
  
  // Update sync status with next retry time
  updateSyncStatus({ nextRetry });
  
  // Don't requeue immediately, let the sync system handle retries
  q.push({ ...item, updatedAt: now() });
  writeQueue(q);
}

export function requeueFront(item: QueuedMutation) {
  const q = readQueue();
  q.unshift(item);
  writeQueue(q);
}

export function pruneExhausted() {
  const q = readQueue().filter((i) => i.attempts < i.maxRetries);
  writeQueue(q);
  updateSyncStatus({ queueLength: q.length });
}

// Sync management functions
export function updateSyncStatus(updates: Partial<SyncStatus>) {
  const current = readSyncStatus();
  const updated = { ...current, ...updates };
  writeSyncStatus(updated);
}

export function onSyncStatusChange(callback: SyncCallback) {
  syncCallbacks.add(callback);
  return () => syncCallbacks.delete(callback);
}

export function onConnectionChange(callback: ConnectionCallback) {
  connectionCallbacks.add(callback);
  return () => connectionCallbacks.delete(callback);
}

export function getConnectionState(): ConnectionState {
  if (typeof window === "undefined" || !navigator.onLine) {
    return {
      isOnline: false,
      networkType: 'unknown',
      effectiveType: '4g'
    };
  }
  
  // Get network information if available
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    isOnline: navigator.onLine,
    networkType: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || '4g',
    rtt: connection?.rtt,
    downlink: connection?.downlink
  };
}

// Conflict resolution
export function addConflict(conflict: Omit<ConflictResolution, 'timestamp'>) {
  const conflicts = readConflicts();
  const newConflict: ConflictResolution = {
    ...conflict,
    timestamp: now()
  };
  conflicts.push(newConflict);
  writeConflicts(conflicts);
}

export function resolveConflict(id: string, resolution: 'merge' | 'overwrite' | 'discard') {
  const conflicts = readConflicts();
  const updated = conflicts.map(conflict => {
    if (conflict.id === id) {
      // Map 'discard' to 'user-choice' since it's not a valid strategy
      const strategy: 'merge' | 'overwrite' | 'user-choice' | 'timestamp' = 
        resolution === 'discard' ? 'user-choice' : (resolution as 'merge' | 'overwrite');
      return { ...conflict, resolution: 'resolved' as const, strategy };
    }
    return conflict;
  });
  writeConflicts(updated as ConflictResolution[]);
}

export function clearResolvedConflicts() {
  const conflicts = readConflicts().filter(c => c.resolution === 'pending');
  writeConflicts(conflicts);
}

// Draft workout management
export function saveDraftWorkout(sessionId: string, data: any) {
  if (typeof window === "undefined") return;
  const drafts = getDraftWorkouts();
  drafts[sessionId] = {
    ...data,
    savedAt: now()
  };
  window.localStorage.setItem(DRAFT_WORKOUTS_KEY, JSON.stringify(drafts));
}

export function getDraftWorkouts(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DRAFT_WORKOUTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getDraftWorkout(sessionId: string) {
  return getDraftWorkouts()[sessionId];
}

export function clearDraftWorkout(sessionId: string) {
  if (typeof window === "undefined") return;
  const drafts = getDraftWorkouts();
  delete drafts[sessionId];
  window.localStorage.setItem(DRAFT_WORKOUTS_KEY, JSON.stringify(drafts));
}

export function clearOldDrafts(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
  const drafts = getDraftWorkouts();
  const cutoff = now() - maxAge;
  const filtered = Object.fromEntries(
    Object.entries(drafts).filter(([, data]) => (data as any).savedAt > cutoff)
  );
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DRAFT_WORKOUTS_KEY, JSON.stringify(filtered));
  }
}

/**
 * Clear queue (for tests/debug).
 */
export function clearQueue() {
  writeQueue([]);
  updateSyncStatus({ queueLength: 0, isActive: false });
}

export function clearAll() {
  clearQueue();
  writeConflicts([]);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DRAFT_WORKOUTS_KEY);
    window.localStorage.removeItem(SYNC_STATUS_KEY);
  }
}
