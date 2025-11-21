import { z } from "zod";

/**
 * Warm-Up Set Data Schema
 * Represents a single warm-up set with weight, reps, and percentage of working weight
 */
export const warmupSetDataSchema = z.object({
  setNumber: z.number().int().positive(),
  weight: z.number().nonnegative(),
  reps: z.number().int().positive(),
  percentageOfTop: z.number().min(0).max(1).optional(), // 0-1 (e.g., 0.6 = 60%)
});

/**
 * Warm-Up Pattern Schema
 * Represents detected or generated warm-up pattern for an exercise
 */
export const warmupPatternSchema = z.object({
  confidence: z.enum(["low", "medium", "high"]),
  sets: z.array(warmupSetDataSchema),
  source: z.enum(["history", "protocol", "default"]),
  sessionCount: z.number().int().nonnegative(),
});

/**
 * Warm-Up Preferences Schema
 * User's warm-up configuration preferences
 */
export const warmupPreferencesSchema = z.object({
  strategy: z.enum(["percentage", "fixed", "history", "none"]),
  setsCount: z.number().int().min(1).max(5).default(3),
  percentages: z.array(z.number().int().min(20).max(95)).default([40, 60, 80]),
  repsStrategy: z.enum(["match_working", "descending", "fixed"]).default("match_working"),
  fixedReps: z.number().int().min(1).max(20).default(5),
  enableMovementPatternSharing: z.boolean().default(false),
});

/**
 * Warm-Up Detection Options Schema
 * Parameters for pattern detection algorithm
 */
export const warmupDetectionOptionsSchema = z.object({
  userId: z.string(),
  exerciseName: z.string(),
  targetWorkingWeight: z.number().nonnegative(),
  targetWorkingReps: z.number().int().positive(),
  minSessions: z.number().int().positive().default(2),
  lookbackSessions: z.number().int().positive().default(10),
});

/**
 * Exercise Set Schema (for database operations)
 */
export const exerciseSetSchema = z.object({
  id: z.string().uuid().optional(),
  sessionExerciseId: z.number().int(),
  userId: z.string(),
  setNumber: z.number().int().positive(),
  setType: z.enum(["warmup", "working", "backoff", "drop"]).default("working"),
  weight: z.number().nonnegative().nullable(),
  reps: z.number().int().positive(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  restSeconds: z.number().int().nonnegative().nullable().optional(),
  completed: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
});

/**
 * Volume Breakdown Schema
 * Separates volume by set type
 */
export const volumeBreakdownSchema = z.object({
  total: z.number().nonnegative(),
  working: z.number().nonnegative(),
  warmup: z.number().nonnegative(),
  backoff: z.number().nonnegative(),
  drop: z.number().nonnegative(),
});
