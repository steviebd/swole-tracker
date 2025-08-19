// Note: Supabase removed - this file may need refactoring to use Cloudflare D1

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
export class WorkoutOperationsClient {
  private client: ReturnType<typeof createBrowserSupabaseClient>;

  constructor() {
    this.client = createBrowserSupabaseClient();
  }

  async getWorkoutTemplates(userId: string) {
    const { data, error } = await this.client
      .from("swole-tracker_workout_template")
      .select("*")
      .eq("user_id", userId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data as WorkoutTemplate[];
  }

  async createWorkoutTemplate(
    userId: string,
    name: string,
  ): Promise<WorkoutTemplate> {
    const { data, error } = await this.client
      .from("swole-tracker_workout_template")
      .insert({
        name,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkoutTemplate;
  }

  async getRecentWorkouts(
    userId: string,
    limit = 5,
  ): Promise<
    Pick<WorkoutSession, "id" | "templateId" | "workoutDate" | "createdAt">[]
  > {
    const { data, error } = await this.client
      .from("swole-tracker_workout_session")
      .select(
        `
        id,
        templateId,
        workoutDate,
        createdAt
      `,
      )
      .eq("user_id", userId)
      .order("workoutDate", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Pick<
      WorkoutSession,
      "id" | "templateId" | "workoutDate" | "createdAt"
    >[];
  }

  async getWorkoutSession(
    userId: string,
    sessionId: number,
  ): Promise<WorkoutSession> {
    const { data, error } = await this.client
      .from("swole-tracker_workout_session")
      .select("*")
      .eq("user_id", userId)
      .eq("id", sessionId)
      .single();

    if (error) throw error;
    return data as WorkoutSession;
  }

  async createWorkoutSession(
    userId: string,
    templateId: number,
    workoutDate: string,
  ): Promise<WorkoutSession> {
    const { data, error } = await this.client
      .from("swole-tracker_workout_session")
      .insert({
        user_id: userId,
        templateId,
        workoutDate,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkoutSession;
  }

  async getSessionExercises(
    userId: string,
    sessionId: number,
  ): Promise<SessionExercise[]> {
    const { data, error } = await this.client
      .from("swole-tracker_session_exercise")
      .select("*")
      .eq("user_id", userId)
      .eq("sessionId", sessionId)
      .order("createdAt", { ascending: true });

    if (error) throw error;
    return data as SessionExercise[];
  }

  async addSessionExercise(
    userId: string,
    sessionId: number,
    exercise: Omit<
      SessionExercise,
      "id" | "user_id" | "sessionId" | "createdAt"
    >,
  ): Promise<SessionExercise> {
    const { data, error } = await this.client
      .from("swole-tracker_session_exercise")
      .insert({
        user_id: userId,
        sessionId,
        ...exercise,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SessionExercise;
  }
}

// Server-side operations (use in Server Components and API routes)
export class WorkoutOperationsServer {
  private getClient = createServerSupabaseClient;

  constructor() {
    // Client getter is initialized above
  }

  async getWorkoutTemplates(userId: string) {
    const client = await this.getClient();

    const { data, error } = await client
      .from("swole-tracker_workout_template")
      .select("*")
      .eq("user_id", userId)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return data as WorkoutTemplate[];
  }

  async createWorkoutTemplate(
    userId: string,
    name: string,
  ): Promise<WorkoutTemplate> {
    const client = await this.getClient();

    const { data, error } = await client
      .from("swole-tracker_workout_template")
      .insert({
        name,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkoutTemplate;
  }

  async getRecentWorkouts(
    userId: string,
    limit = 5,
  ): Promise<
    Pick<WorkoutSession, "id" | "templateId" | "workoutDate" | "createdAt">[]
  > {
    const client = await this.getClient();

    const { data, error } = await client
      .from("swole-tracker_workout_session")
      .select(
        `
        id,
        templateId,
        workoutDate,
        createdAt
      `,
      )
      .eq("user_id", userId)
      .order("workoutDate", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Pick<
      WorkoutSession,
      "id" | "templateId" | "workoutDate" | "createdAt"
    >[];
  }
}

// Convenience hooks and functions
export function useWorkoutOperations() {
  return new WorkoutOperationsClient();
}

export function getServerWorkoutOperations() {
  return new WorkoutOperationsServer();
}