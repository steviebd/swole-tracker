// Note: This file has been migrated from Supabase to use tRPC APIs
// Legacy WorkoutOperationsClient has been removed in favor of tRPC procedures

// Types for workout data
export interface WorkoutTemplate {
  id: number;
  name: string;
  user_id: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface WorkoutSession {
  id: number;
  user_id: string;
  templateId: number;
  workoutDate: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface SessionExercise {
  id: number;
  user_id: string;
  sessionId: number;
  templateExerciseId: number | null;
  exerciseName: string;
  weight: string | null;
  reps: number | null;
  sets: number | null;
  unit: string;
  createdAt: string;
}

// Legacy client-side operations - replaced with tRPC
// This is a stub to prevent build errors during migration
export class WorkoutOperationsClient {
  constructor() {
    console.warn('WorkoutOperationsClient is deprecated. Use tRPC procedures instead.');
  }

  async getWorkoutTemplates(userId: string): Promise<WorkoutTemplate[]> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC templates.getAll instead.');
  }

  async createWorkoutTemplate(userId: string, name: string): Promise<WorkoutTemplate> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC templates.create instead.');
  }

  async getRecentWorkouts(userId: string, limit = 5): Promise<Pick<WorkoutSession, "id" | "templateId" | "workoutDate" | "createdAt">[]> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC workouts.getRecent instead.');
  }

  async getWorkoutSession(userId: string, sessionId: number): Promise<WorkoutSession> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC workouts.getSession instead.');
  }

  async createWorkoutSession(userId: string, templateId: number, workoutDate: string): Promise<WorkoutSession> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC workouts.create instead.');
  }

  async getSessionExercises(userId: string, sessionId: number): Promise<SessionExercise[]> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC workouts.getSessionExercises instead.');
  }

  async createSessionExercise(userId: string, sessionId: number, exercise: Omit<SessionExercise, 'id' | 'user_id' | 'sessionId' | 'createdAt'>): Promise<SessionExercise> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC workouts.addExercise instead.');
  }

  async updateSessionExercise(userId: string, exerciseId: number, updates: Partial<Omit<SessionExercise, 'id' | 'user_id' | 'sessionId' | 'createdAt'>>): Promise<SessionExercise> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC workouts.updateExercise instead.');
  }

  async deleteSessionExercise(userId: string, exerciseId: number): Promise<void> {
    throw new Error('WorkoutOperationsClient is deprecated. Use tRPC workouts.deleteExercise instead.');
  }
}

// Legacy hook - replaced with tRPC
export function useWorkoutOperations() {
  console.warn('useWorkoutOperations is deprecated. Use tRPC hooks instead.');
  return new WorkoutOperationsClient();
}