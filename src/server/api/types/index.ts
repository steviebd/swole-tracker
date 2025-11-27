import { type DrizzleDb } from "~/server/db";
import { sessionExercises } from "~/server/db/schema";

// Re-export database type for convenience
export type { DrizzleDb as Database };

// Exercise search result type with fuzzy_score
export interface ExerciseSearchResult {
  id: number;
  name: string;
  normalizedName: string;
  createdAt: Date | string;
  source: "master" | "template" | "session";
  fuzzy_score?: number;
  priority_rank?: number;
}

// Processed set type for workout operations
export interface ProcessedSet {
  exerciseId: number;
  masterExerciseId: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  restSeconds: number | null;
  notes: string | null;
  setOrder?: number;
  workoutSessionId?: number;
}

// Master exercise link result
export interface MasterExerciseLinkResult {
  id: number;
  name: string;
  normalizedName: string;
  source: string;
}

// Playbook session data type - more flexible to accommodate various query results
export interface PlaybookSessionData {
  id: number;
  playbookWeekId: number;
  sessionNumber: number;
  sessionDate: Date | null;
  prescribedWorkoutJson: string;
  actualWorkoutId: number | null;
  adherenceScore: number | null;
  rpe: number | null;
  rpeNotes: string | null;
  deviation: string | null;
  activePlanType: "ai" | "algorithmic";
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  week: {
    id: number;
    playbookId: number;
    weekNumber: number;
    weekType: string;
    playbook: {
      name: string;
    };
  };
}

// Session data type for insights
export interface SessionData {
  id: number;
  workoutDate?: Date;
  date: Date;
  volume: number;
  est1RM: number;
  bestWeight?: number;
  bestSet?: {
    weight?: number;
    reps?: number;
    unit?: "kg" | "lbs";
    sets?: number;
    rpe?: number;
  };
  exercises?: (typeof sessionExercises.$inferSelect)[];
  [key: string]: any; // Allow additional properties from database query
}

// Cache entry type for calculations
export interface CacheEntry<T = any> {
  value: T;
  expires: number;
}
