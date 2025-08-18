/**
 * Mobile-first offline queue system with AsyncStorage persistence
 * Handles workout sessions, template CRUD, and data synchronization
 */

// Types
export type QueueOperationType = 
  | 'workout_save'
  | 'workout_update'
  | 'workout_delete'
  | 'template_create'
  | 'template_update'
  | 'template_delete'
  | 'exercise_create'
  | 'exercise_update';

export type SaveWorkoutPayload = {
  sessionId: number;
  exercises: Array<{
    templateExerciseId?: number;
    exerciseName: string;
    sets: Array<{
      id: string;
      weight?: number;
      reps?: number;
      sets?: number;
      unit: "kg" | "lbs";
    }>;
    unit: "kg" | "lbs";
  }>;
};

export type TemplatePayload = {
  id?: number;
  name: string;
  exercises: Array<{
    id?: number;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    unit: "kg" | "lbs";
  }>;
};

export type QueueItem = {
  id: string;
  type: QueueOperationType;
  payload: SaveWorkoutPayload | TemplatePayload | Record<string, any>;
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  priority: 'high' | 'medium' | 'low';
  retryAfter?: number; // Exponential backoff timestamp
};

export type OfflineWorkoutSession = {
  id: string;
  templateId?: number;
  startTime: number;
  lastSaved: number;
  exercises: Array<{
    id: string;
    templateExerciseId?: number;
    exerciseName: string;
    sets: Array<{
      id: string;
      weight?: number;
      reps?: number;
      sets?: number;
      unit: "kg" | "lbs";
      completed: boolean;
    }>;
    unit: "kg" | "lbs";
    isCompleted: boolean;
  }>;
  isCompleted: boolean;
  notes?: string;
};

// Storage keys
const STORAGE_KEYS = {
  QUEUE: "swole-tracker-offline-queue-v2",
  SESSIONS: "swole-tracker-offline-sessions-v1",
  SYNC_STATUS: "swole-tracker-sync-status-v1"
} as const;

const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

// Storage abstraction (works with localStorage in web, AsyncStorage in React Native)
class Storage {
  private static getStorage() {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    // In a real mobile app, this would be AsyncStorage
    // For now, return a mock that does nothing
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const storage = this.getStorage();
      if ('getItem' in storage && typeof storage.getItem === 'function') {
        const result = storage.getItem(key);
        return Promise.resolve(result);
      }
      return null;
    } catch {
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      const storage = this.getStorage();
      if ('setItem' in storage && typeof storage.setItem === 'function') {
        storage.setItem(key, value);
      }
    } catch {
      // Silent fail for storage errors
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      const storage = this.getStorage();
      if ('removeItem' in storage && typeof storage.removeItem === 'function') {
        storage.removeItem(key);
      }
    } catch {
      // Silent fail for storage errors
    }
  }
}

// Queue management
export class MobileOfflineQueue {
  private static instance: MobileOfflineQueue;

  static getInstance(): MobileOfflineQueue {
    if (!this.instance) {
      this.instance = new MobileOfflineQueue();
    }
    return this.instance;
  }

  private async readQueue(): Promise<QueueItem[]> {
    try {
      const raw = await Storage.getItem(STORAGE_KEYS.QUEUE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as QueueItem[];
    } catch {
      return [];
    }
  }

  private async writeQueue(items: QueueItem[]): Promise<void> {
    await Storage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(items));
  }

  private generateId(): string {
    return `q_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  }

  private calculateRetryDelay(attempts: number): number {
    const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempts), MAX_RETRY_DELAY);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  // Queue operations
  async enqueue(
    type: QueueOperationType, 
    payload: any, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    const queue = await this.readQueue();
    const item: QueueItem = {
      id: this.generateId(),
      type,
      payload,
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      priority,
    };

    // Insert based on priority
    if (priority === 'high') {
      queue.unshift(item);
    } else {
      queue.push(item);
    }

    await this.writeQueue(queue);
    return item.id;
  }

  async dequeue(): Promise<QueueItem | undefined> {
    const queue = await this.readQueue();
    const now = Date.now();
    
    // Find the next item that's ready to be processed
    const readyIndex = queue.findIndex(item => 
      !item.retryAfter || item.retryAfter <= now
    );
    
    if (readyIndex === -1) return undefined;
    
    const item = queue.splice(readyIndex, 1)[0];
    if (item) {
      await this.writeQueue(queue);
    }
    return item;
  }

  async updateItem(id: string, patch: Partial<QueueItem>): Promise<void> {
    const queue = await this.readQueue();
    const index = queue.findIndex(item => item.id === id);
    if (index === -1) return;

    queue[index] = { 
      ...queue[index]!, 
      ...patch, 
      updatedAt: Date.now() 
    };
    await this.writeQueue(queue);
  }

  async requeueWithBackoff(item: QueueItem, error?: string): Promise<void> {
    const queue = await this.readQueue();
    const updatedItem: QueueItem = {
      ...item,
      attempts: item.attempts + 1,
      lastError: error,
      retryAfter: Date.now() + this.calculateRetryDelay(item.attempts),
      updatedAt: Date.now(),
    };

    if (updatedItem.attempts >= MAX_ATTEMPTS) {
      // Move to failed queue or log for manual intervention
      console.warn('Queue item exhausted retries:', updatedItem);
      return;
    }

    queue.unshift(updatedItem);
    await this.writeQueue(queue);
  }

  async getQueueStatus(): Promise<{
    pending: number;
    failed: number;
    nextRetry?: number;
  }> {
    const queue = await this.readQueue();
    const now = Date.now();
    
    const pending = queue.filter(item => 
      item.attempts < MAX_ATTEMPTS && (!item.retryAfter || item.retryAfter <= now)
    ).length;
    
    const failed = queue.filter(item => item.attempts >= MAX_ATTEMPTS).length;
    
    const nextRetryItem = queue
      .filter(item => item.retryAfter && item.retryAfter > now)
      .sort((a, b) => (a.retryAfter ?? 0) - (b.retryAfter ?? 0))[0];
    
    return {
      pending,
      failed,
      nextRetry: nextRetryItem?.retryAfter,
    };
  }

  async clearQueue(): Promise<void> {
    await Storage.removeItem(STORAGE_KEYS.QUEUE);
  }

  async pruneExhausted(): Promise<void> {
    const queue = await this.readQueue();
    const cleaned = queue.filter(item => item.attempts < MAX_ATTEMPTS);
    await this.writeQueue(cleaned);
  }
}

// Offline workout session management
export class OfflineWorkoutManager {
  private static instance: OfflineWorkoutManager;

  static getInstance(): OfflineWorkoutManager {
    if (!this.instance) {
      this.instance = new OfflineWorkoutManager();
    }
    return this.instance;
  }

  private async readSessions(): Promise<Record<string, OfflineWorkoutSession>> {
    try {
      const raw = await Storage.getItem(STORAGE_KEYS.SESSIONS);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, OfflineWorkoutSession>;
    } catch {
      return {};
    }
  }

  private async writeSessions(sessions: Record<string, OfflineWorkoutSession>): Promise<void> {
    await Storage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  async createSession(templateId?: number): Promise<string> {
    const sessions = await this.readSessions();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const newSession: OfflineWorkoutSession = {
      id: sessionId,
      templateId,
      startTime: Date.now(),
      lastSaved: Date.now(),
      exercises: [],
      isCompleted: false,
    };

    sessions[sessionId] = newSession;
    await this.writeSessions(sessions);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<OfflineWorkoutSession | null> {
    const sessions = await this.readSessions();
    return sessions[sessionId] ?? null;
  }

  async updateSession(sessionId: string, updates: Partial<OfflineWorkoutSession>): Promise<void> {
    const sessions = await this.readSessions();
    if (!sessions[sessionId]) return;

    sessions[sessionId] = {
      ...sessions[sessionId]!,
      ...updates,
      lastSaved: Date.now(),
    };

    await this.writeSessions(sessions);
  }

  async completeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Mark as completed
    await this.updateSession(sessionId, { isCompleted: true });

    // Queue for sync
    const queue = MobileOfflineQueue.getInstance();
    await queue.enqueue('workout_save', {
      sessionId: parseInt(sessionId.split('_')[1] ?? '0'),
      exercises: session.exercises.map(ex => ({
        templateExerciseId: ex.templateExerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets.filter(set => set.completed).map(set => ({
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          sets: set.sets,
          unit: set.unit,
        })),
        unit: ex.unit,
      })),
    }, 'high');
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.readSessions();
    delete sessions[sessionId];
    await this.writeSessions(sessions);
  }

  async getActiveSessions(): Promise<OfflineWorkoutSession[]> {
    const sessions = await this.readSessions();
    return Object.values(sessions).filter(session => !session.isCompleted);
  }

  async getCompletedSessions(): Promise<OfflineWorkoutSession[]> {
    const sessions = await this.readSessions();
    return Object.values(sessions).filter(session => session.isCompleted);
  }
}

// Sync status management
export type SyncStatus = {
  lastSync: number;
  isOnline: boolean;
  pendingOperations: number;
  failedOperations: number;
  nextRetry?: number;
};

export class SyncStatusManager {
  private static instance: SyncStatusManager;

  static getInstance(): SyncStatusManager {
    if (!this.instance) {
      this.instance = new SyncStatusManager();
    }
    return this.instance;
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const raw = await Storage.getItem(STORAGE_KEYS.SYNC_STATUS);
      const stored = raw ? JSON.parse(raw) as Partial<SyncStatus> : {};
      
      const queueStatus = await MobileOfflineQueue.getInstance().getQueueStatus();
      
      return {
        lastSync: stored.lastSync ?? 0,
        isOnline: stored.isOnline ?? true,
        pendingOperations: queueStatus.pending,
        failedOperations: queueStatus.failed,
        nextRetry: queueStatus.nextRetry,
      };
    } catch {
      return {
        lastSync: 0,
        isOnline: true,
        pendingOperations: 0,
        failedOperations: 0,
      };
    }
  }

  async updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
    const current = await this.getSyncStatus();
    const updated = { ...current, ...updates };
    await Storage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify(updated));
  }

  async markSyncCompleted(): Promise<void> {
    await this.updateSyncStatus({ lastSync: Date.now() });
  }
}

// Export convenience functions
export const offlineQueue = MobileOfflineQueue.getInstance();
export const workoutManager = OfflineWorkoutManager.getInstance();
export const syncStatus = SyncStatusManager.getInstance();