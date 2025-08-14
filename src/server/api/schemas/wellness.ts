import { z } from "zod";

// Manual wellness data schema (simplified 2-input system)
export const manualWellnessDataSchema = z.object({
  energyLevel: z.number().min(1).max(10),
  sleepQuality: z.number().min(1).max(10),
  deviceTimezone: z.string().min(1),
  notes: z.string().max(500).optional(),
});

// Wellness data entry schema for database operations
export const wellnessDataEntrySchema = z.object({
  id: z.number().optional(),
  userId: z.string(),
  sessionId: z.number().optional(),
  date: z.date(),
  wellnessData: manualWellnessDataSchema,
  hasWhoopData: z.boolean(),
  whoopData: z.object({
    recovery_score: z.number().min(0).max(100).optional(),
    sleep_performance: z.number().min(0).max(100).optional(),
    hrv_now_ms: z.number().positive().optional(),
    hrv_baseline_ms: z.number().positive().optional(),
    rhr_now_bpm: z.number().positive().optional(),
    rhr_baseline_bpm: z.number().positive().optional(),
    yesterday_strain: z.number().min(0).max(21).optional(),
  }).optional(),
  deviceTimezone: z.string(),
  submittedAt: z.date(),
  notes: z.string().max(500).optional(),
});

// Input schema for saving wellness data
export const saveWellnessSchema = z.object({
  sessionId: z.number().optional(),
  energyLevel: z.number().min(1).max(10),
  sleepQuality: z.number().min(1).max(10),
  deviceTimezone: z.string().min(1),
  notes: z.string().max(500).optional(),
  hasWhoopData: z.boolean().default(false),
  whoopData: z.object({
    recovery_score: z.number().min(0).max(100).optional(),
    sleep_performance: z.number().min(0).max(100).optional(),
    hrv_now_ms: z.number().positive().optional(),
    hrv_baseline_ms: z.number().positive().optional(),
    rhr_now_bpm: z.number().positive().optional(),
    rhr_baseline_bpm: z.number().positive().optional(),
    yesterday_strain: z.number().min(0).max(21).optional(),
  }).optional(),
});

// Get wellness history schema
export const getWellnessHistorySchema = z.object({
  limit: z.number().min(1).max(100).default(30),
  offset: z.number().min(0).default(0),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// Get wellness stats schema
export const getWellnessStatsSchema = z.object({
  days: z.number().min(1).max(365).default(30),
});

// Enhanced health advice request schema that includes manual wellness
export const enhancedHealthAdviceRequestSchema = z.object({
  session_id: z.string(),
  user_profile: z.object({
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
    min_increment_kg: z.number().positive().optional(),
    preferred_rpe: z.number().min(1).max(10).optional(),
  }),
  whoop: z.object({
    recovery_score: z.number().min(0).max(100).optional(),
    sleep_performance: z.number().min(0).max(100).optional(),
    hrv_now_ms: z.number().positive().optional(),
    hrv_baseline_ms: z.number().positive().optional(),
    rhr_now_bpm: z.number().positive().optional(),
    rhr_baseline_bpm: z.number().positive().optional(),
    yesterday_strain: z.number().min(0).max(21).optional(),
  }).optional(),
  manual_wellness: z.object({
    energy_level: z.number().min(1).max(10).optional(),
    sleep_quality: z.number().min(1).max(10).optional(),
    has_whoop_data: z.boolean(),
    device_timezone: z.string().optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
  workout_plan: z.object({
    exercises: z.array(z.object({
      exercise_id: z.string(),
      name: z.string(),
      tags: z.array(z.enum(['strength', 'hypertrophy', 'endurance'])),
      sets: z.array(z.object({
        set_id: z.string(),
        target_reps: z.number().positive().optional().nullable(),
        target_weight_kg: z.number().positive().optional().nullable(),
        target_rpe: z.number().min(1).max(10).optional().nullable(),
      })),
    })),
  }),
  prior_bests: z.object({
    by_exercise_id: z.record(z.object({
      best_total_volume_kg: z.number().positive().optional().nullable(),
      best_e1rm_kg: z.number().positive().optional().nullable(),
    })),
  }),
});

// TypeScript types inferred from Zod schemas
export type ManualWellnessData = z.infer<typeof manualWellnessDataSchema>;
export type WellnessDataEntry = z.infer<typeof wellnessDataEntrySchema>;
export type SaveWellnessInput = z.infer<typeof saveWellnessSchema>;
export type GetWellnessHistoryInput = z.infer<typeof getWellnessHistorySchema>;
export type GetWellnessStatsInput = z.infer<typeof getWellnessStatsSchema>;
export type EnhancedHealthAdviceRequest = z.infer<typeof enhancedHealthAdviceRequestSchema>;