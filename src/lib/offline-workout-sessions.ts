/**
 * Offline-first workout session management
 * Creates sessions locally first, syncs to server when online
 */

export type OfflineWorkoutSession = {
  localId: string; // UUID for local identification
  serverSessionId?: number; // Set when synced to server
  templateId: number;
  workoutDate: Date;
  status: "local" | "syncing" | "synced" | "sync_failed";
  createdAt: number;
  updatedAt: number;
  syncAttempts: number;
  lastSyncError?: string;
  // Optional telemetry
  theme_used?: string;
  device_type?: "android" | "ios" | "desktop" | "ipad" | "other";
  perf_metrics?: any;
};

type SyncQueueItem = {
  id: string;
  type: "workout_session_create";
  session: OfflineWorkoutSession;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

const SESSIONS_KEY = "offline.workout_sessions.v1";
const SYNC_QUEUE_KEY = "offline.sync_queue.v1";
const MAX_SYNC_ATTEMPTS = 5;

function now() {
  return Date.now();
}

function uuid() {
  return `ws_${Math.random().toString(36).slice(2)}_${now().toString(36)}`;
}

function readSessions(): OfflineWorkoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(session => ({
      ...session,
      workoutDate: new Date(session.workoutDate)
    }));
  } catch {
    return [];
  }
}

function writeSessions(sessions: OfflineWorkoutSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function readSyncQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({
      ...item,
      session: {
        ...item.session,
        workoutDate: new Date(item.session.workoutDate)
      }
    }));
  } catch {
    return [];
  }
}

function writeSyncQueue(queue: SyncQueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Create a workout session locally (offline-first)
 */
export function createLocalWorkoutSession(
  templateId: number,
  workoutDate: Date = new Date(),
  telemetry?: {
    theme_used?: string;
    device_type?: "android" | "ios" | "desktop" | "ipad" | "other";
    perf_metrics?: any;
  }
): OfflineWorkoutSession {
  const session: OfflineWorkoutSession = {
    localId: uuid(),
    templateId,
    workoutDate,
    status: "local",
    createdAt: now(),
    updatedAt: now(),
    syncAttempts: 0,
    ...telemetry,
  };

  const sessions = readSessions();
  sessions.push(session);
  writeSessions(sessions);

  // Add to sync queue
  queueForSync(session);

  return session;
}

/**
 * Get a session by local ID
 */
export function getLocalSession(localId: string): OfflineWorkoutSession | null {
  const sessions = readSessions();
  return sessions.find(s => s.localId === localId) || null;
}

/**
 * Get session by server session ID
 */
export function getSessionByServerId(serverSessionId: number): OfflineWorkoutSession | null {
  const sessions = readSessions();
  return sessions.find(s => s.serverSessionId === serverSessionId) || null;
}

/**
 * Update a session
 */
export function updateLocalSession(localId: string, updates: Partial<OfflineWorkoutSession>) {
  const sessions = readSessions();
  const index = sessions.findIndex(s => s.localId === localId);
  if (index === -1) return;

  sessions[index] = {
    ...sessions[index]!,
    ...updates,
    updatedAt: now(),
  };
  writeSessions(sessions);
}

/**
 * Mark session as synced with server
 */
export function markSessionSynced(localId: string, serverSessionId: number) {
  updateLocalSession(localId, {
    serverSessionId,
    status: "synced",
    syncAttempts: 0,
    lastSyncError: undefined,
  });
}

/**
 * Queue session for sync
 */
function queueForSync(session: OfflineWorkoutSession) {
  const queue = readSyncQueue();
  const item: SyncQueueItem = {
    id: uuid(),
    type: "workout_session_create",
    session,
    attempts: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  queue.push(item);
  writeSyncQueue(queue);
}

/**
 * Get pending sync queue
 */
export function getSyncQueue(): SyncQueueItem[] {
  return readSyncQueue();
}

/**
 * Dequeue next item for sync
 */
export function dequeueSyncItem(): SyncQueueItem | null {
  const queue = readSyncQueue();
  const item = queue.shift();
  if (item) writeSyncQueue(queue);
  return item || null;
}

/**
 * Update sync item (for retry tracking)
 */
export function updateSyncItem(id: string, updates: Partial<SyncQueueItem>) {
  const queue = readSyncQueue();
  const index = queue.findIndex(i => i.id === id);
  if (index === -1) return;

  queue[index] = {
    ...queue[index]!,
    ...updates,
    updatedAt: now(),
  };
  writeSyncQueue(queue);
}

/**
 * Requeue item at front for immediate retry
 */
export function requeueSyncItem(item: SyncQueueItem) {
  const queue = readSyncQueue();
  queue.unshift(item);
  writeSyncQueue(queue);
}

/**
 * Remove exhausted sync items
 */
export function pruneExhaustedSyncItems() {
  const queue = readSyncQueue().filter(i => i.attempts < MAX_SYNC_ATTEMPTS);
  writeSyncQueue(queue);
}

/**
 * Get sync queue length
 */
export function getSyncQueueLength(): number {
  return readSyncQueue().length;
}

/**
 * Get all local sessions
 */
export function getAllLocalSessions(): OfflineWorkoutSession[] {
  return readSessions();
}

/**
 * Clear all data (for tests/debug)
 */
export function clearAllLocalData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSIONS_KEY);
  window.localStorage.removeItem(SYNC_QUEUE_KEY);
}
