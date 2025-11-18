import type { z } from "zod";
import type {
  warmupSetDataSchema,
  warmupPatternSchema,
  warmupPreferencesSchema,
  warmupDetectionOptionsSchema,
  exerciseSetSchema,
  volumeBreakdownSchema,
} from "../schemas/warmup";

/**
 * TypeScript types inferred from Zod schemas
 */

export type WarmupSetData = z.infer<typeof warmupSetDataSchema>;

export type WarmupPattern = z.infer<typeof warmupPatternSchema>;

export type WarmupPreferences = z.infer<typeof warmupPreferencesSchema>;

export type WarmupDetectionOptions = z.infer<typeof warmupDetectionOptionsSchema>;

export type ExerciseSetInput = z.infer<typeof exerciseSetSchema>;

export type VolumeBreakdown = z.infer<typeof volumeBreakdownSchema>;

/**
 * Extended types for internal use
 */

export interface SetDetectionResult {
  warmupSets: Array<{ weight: number; reps: number }>;
  workingSets: Array<{ weight: number; reps: number }>;
}

export interface WarmupProtocolConfig {
  strategy: "percentage" | "fixed";
  percentages?: number[];
  setsCount?: number;
  repsStrategy?: "match_working" | "descending" | "fixed";
  fixedReps?: number;
}
