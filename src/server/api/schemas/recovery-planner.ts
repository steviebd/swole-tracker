import { z } from "zod";

// Recovery data schemas
export const recoveryDataSchema = z.object({
  recoveryScore: z.number().min(0).max(100).nullable(),
  sleepPerformance: z.number().min(0).max(100).nullable(),
  hrvStatus: z.enum(["low", "baseline", "high"]).nullable(),
  rhrStatus: z.enum(["elevated", "baseline", "optimal"]).nullable(),
  readinessScore: z.number().min(0).max(1).nullable(),
});

// Planner recommendation types
export const recommendationTypeSchema = z.enum([
  "train_as_planned",
  "reduce_intensity",
  "reduce_volume",
  "active_recovery",
  "rest_day",
]);

// User action types
export const userActionSchema = z.enum([
  "accepted",
  "modified",
  "ignored",
  "deferred",
]);

// Recovery planner strategy
export const recoveryPlannerStrategySchema = z.enum([
  "conservative",
  "moderate",
  "adaptive",
  "aggressive",
]);

// Input schemas
export const recoveryPlannerPreferencesSchema = z.object({
  enableRecoveryPlanner: z.boolean().default(false),
  recoveryPlannerStrategy: recoveryPlannerStrategySchema.default("adaptive"),
  recoveryPlannerSensitivity: z.number().min(1).max(10).default(5),
  autoAdjustIntensity: z.boolean().default(true),
  recoveryPlannerPreferences: z
    .record(z.string(), z.any())
    .nullable()
    .optional(), // JSON object for custom preferences
});

export const recoveryPlannerRequestSchema = z.object({
  templateId: z.number().optional(),
  workoutDate: z.date(),
  plannedWorkout: z.record(z.string(), z.any()), // JSON representation of planned workout
  recoveryData: recoveryDataSchema,
  userPreferences: recoveryPlannerPreferencesSchema,
});

export const recoveryPlannerResponseSchema = z.object({
  recommendation: recommendationTypeSchema,
  intensityAdjustment: z.number().min(0.5).max(1.2),
  volumeAdjustment: z.number().min(0.5).max(1.2),
  suggestedModifications: z.record(z.string(), z.any()).optional(), // JSON object
  reasoning: z.string(),
  confidence: z.number().min(0).max(1), // Confidence in recommendation
});

export const recoveryPlannerLogSchema = z.object({
  id: z.number().optional(),
  user_id: z.string(),
  sessionId: z.number(),
  templateId: z.number().nullable(),
  recoveryScore: z.number().min(0).max(100).nullable(),
  sleepPerformance: z.number().min(0).max(100).nullable(),
  hrvStatus: z.enum(["low", "baseline", "high"]).nullable(),
  rhrStatus: z.enum(["elevated", "baseline", "optimal"]).nullable(),
  readinessScore: z.number().min(0).max(1).nullable(),
  recommendation: recommendationTypeSchema,
  intensityAdjustment: z.number().nullable(),
  volumeAdjustment: z.number().nullable(),
  suggestedModifications: z.string().nullable(), // JSON string
  reasoning: z.string().nullable(),
  userAction: userActionSchema.nullable(),
  appliedAdjustments: z.string().nullable(), // JSON string
  userFeedback: z.string().nullable(),
  plannedWorkoutJson: z.string().nullable(), // JSON string
  adjustedWorkoutJson: z.string().nullable(), // JSON string
  metadata: z.string().nullable(), // JSON string
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const updateRecoveryPlannerLogSchema = z.object({
  id: z.number(),
  userAction: userActionSchema.optional(),
  appliedAdjustments: z.string().optional(), // JSON string
  userFeedback: z.string().optional(),
  adjustedWorkoutJson: z.string().optional(), // JSON string
  metadata: z.string().optional(), // JSON string
});

// Export types
export type RecoveryData = z.infer<typeof recoveryDataSchema>;
export type RecommendationType = z.infer<typeof recommendationTypeSchema>;
export type UserAction = z.infer<typeof userActionSchema>;
export type RecoveryPlannerStrategy = z.infer<
  typeof recoveryPlannerStrategySchema
>;
export type RecoveryPlannerPreferences = z.infer<
  typeof recoveryPlannerPreferencesSchema
>;
export type RecoveryPlannerRequest = z.infer<
  typeof recoveryPlannerRequestSchema
>;
export type RecoveryPlannerResponse = z.infer<
  typeof recoveryPlannerResponseSchema
>;
export type RecoveryPlannerLog = z.infer<typeof recoveryPlannerLogSchema>;
export type UpdateRecoveryPlannerLog = z.infer<
  typeof updateRecoveryPlannerLogSchema
>;
