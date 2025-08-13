import { z } from "zod";

// Input schema for health advice requests
export const healthAdviceRequestSchema = z.object({
  session_id: z.string(),
  user_profile: z.object({
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
    min_increment_kg: z.number().positive().optional(),
    preferred_rpe: z.number().min(1).max(10).optional(),
  }),
  whoop: z.object({
    recovery_score: z.number().min(0).max(100).optional(),      // 0-100
    sleep_performance: z.number().min(0).max(100).optional(),   // 0-100
    hrv_now_ms: z.number().positive().optional(),
    hrv_baseline_ms: z.number().positive().optional(),
    rhr_now_bpm: z.number().positive().optional(),
    rhr_baseline_bpm: z.number().positive().optional(),
    yesterday_strain: z.number().min(0).max(21).optional(),    // 0-21
  }),
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

// Output schema for health advice responses
export const healthAdviceResponseSchema = z.object({
  session_id: z.string(),
  readiness: z.object({
    rho: z.number().min(0).max(1),                    // 0-1
    overload_multiplier: z.number().min(0.9).max(1.1),    // 0.9-1.1
    flags: z.array(z.string()),               // ['low_recovery', 'good_sleep']
  }),
  per_exercise: z.array(z.object({
    exercise_id: z.string(),
    predicted_chance_to_beat_best: z.number().min(0).max(1),  // 0-1
    planned_volume_kg: z.number().positive().optional().nullable(),
    best_volume_kg: z.number().positive().optional().nullable(),
    sets: z.array(z.object({
      set_id: z.string(),
      suggested_weight_kg: z.number().positive().optional().nullable(),
      suggested_reps: z.number().positive().optional().nullable(),
      suggested_rest_seconds: z.number().positive().optional().nullable(),
      rationale: z.string(),
    })),
  })),
  session_predicted_chance: z.number().min(0).max(1),  // 0-1
  summary: z.string(),
  warnings: z.array(z.string()),
  recovery_recommendations: z.object({
    recommended_rest_between_sets: z.string(),
    recommended_rest_between_sessions: z.string(),
    session_duration_estimate: z.string().optional().nullable(),
    additional_recovery_notes: z.array(z.string()),
  }).optional().nullable(),
});

// Subjective wellness data schema (for users without WHOOP)
export const subjectiveWellnessSchema = z.object({
  energyLevel: z.number().min(1).max(10),        // 1-10 subjective energy
  sleepQuality: z.number().min(1).max(10),       // 1-10 subjective sleep quality
  recoveryFeeling: z.number().min(1).max(10),    // 1-10 subjective recovery feeling
  stressLevel: z.number().min(1).max(10),        // 1-10 subjective stress level
});

// WHOOP metrics schema for utility functions
export const whoopMetricsSchema = z.object({
  recovery_score: z.number().min(0).max(100).optional(),
  sleep_performance: z.number().min(0).max(100).optional(),
  hrv_now_ms: z.number().positive().optional(),
  hrv_baseline_ms: z.number().positive().optional(),
  rhr_now_bpm: z.number().positive().optional(),
  rhr_baseline_bpm: z.number().positive().optional(),
  yesterday_strain: z.number().min(0).max(21).optional(),
});

// TypeScript types inferred from Zod schemas
export type HealthAdviceRequest = z.infer<typeof healthAdviceRequestSchema>;
export type HealthAdviceResponse = z.infer<typeof healthAdviceResponseSchema>;
export type SubjectiveWellnessData = z.infer<typeof subjectiveWellnessSchema>;
export type WhoopMetrics = z.infer<typeof whoopMetricsSchema>;