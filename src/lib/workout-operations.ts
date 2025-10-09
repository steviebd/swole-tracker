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

// Client-side operations (use in React components)
// NOTE: This class is deprecated. Use tRPC endpoints instead.
export class WorkoutOperationsClient {
  constructor() {
    // Deprecated - use tRPC instead
    console.warn(
      "WorkoutOperationsClient is deprecated. Use tRPC endpoints instead.",
    );
  }

  async getWorkoutTemplates(userId: string): Promise<WorkoutTemplate[]> {
    // Deprecated - use tRPC instead
    console.warn(
      "getWorkoutTemplates is deprecated. Use tRPC api.templates.getAll instead.",
    );
    return [];
  }

  async createWorkoutTemplate(
    userId: string,
    name: string,
  ): Promise<WorkoutTemplate> {
    // Deprecated - use tRPC instead
    console.warn(
      "createWorkoutTemplate is deprecated. Use tRPC api.templates.create instead.",
    );
    throw new Error("Deprecated method");
  }

  async getRecentWorkouts(
    userId: string,
    limit = 5,
  ): Promise<
    Pick<WorkoutSession, "id" | "templateId" | "workoutDate" | "createdAt">[]
  > {
    // Deprecated - use tRPC instead
    console.warn(
      "getRecentWorkouts is deprecated. Use tRPC api.workouts.getRecent instead.",
    );
    return [];
  }

  async getWorkoutSession(
    userId: string,
    sessionId: number,
  ): Promise<WorkoutSession> {
    // Deprecated - use tRPC instead
    console.warn(
      "getWorkoutSession is deprecated. Use tRPC api.workouts.getById instead.",
    );
    throw new Error("Deprecated method");
  }

  async createWorkoutSession(
    userId: string,
    templateId: number,
    workoutDate: string,
  ): Promise<WorkoutSession> {
    // Deprecated - use tRPC instead
    console.warn(
      "createWorkoutSession is deprecated. Use tRPC api.workouts.create instead.",
    );
    throw new Error("Deprecated method");
  }

  async getSessionExercises(
    userId: string,
    sessionId: number,
  ): Promise<SessionExercise[]> {
    // Deprecated - use tRPC instead
    console.warn(
      "getSessionExercises is deprecated. Use tRPC api.workouts.getSessionExercises instead.",
    );
    return [];
  }

  async addSessionExercise(
    userId: string,
    sessionId: number,
    exerciseName: string,
    templateExerciseId?: number,
  ): Promise<SessionExercise> {
    // Deprecated - use tRPC instead
    console.warn(
      "addSessionExercise is deprecated. Use tRPC api.workouts.addExercise instead.",
    );
    throw new Error("Deprecated method");
  }
}

// Factory function (deprecated)
export function createWorkoutOperationsClient(): WorkoutOperationsClient {
  return new WorkoutOperationsClient();
}
