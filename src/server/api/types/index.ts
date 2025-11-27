import { type DrizzleDb } from "~/server/db";

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
export type PlaybookSessionData = any;

// Session data type for insights
export type SessionData = any;

// Cache entry type for calculations
export interface CacheEntry<T = any> {
  value: T;
  expires: number;
}
