import { z } from "zod";

// Enums
export const experienceLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);
export const plateauStatusSchema = z.enum([
  "active",
  "resolved",
  "maintaining",
]);
export const milestoneTypeSchema = z.enum([
  "absolute_weight",
  "bodyweight_multiplier",
  "volume",
]);
export const bodyweightSourceSchema = z.enum(["manual", "whoop"]);

// Key Lift Management
export const keyLiftInputSchema = z.object({
  masterExerciseId: z.number(),
  isTracking: z.boolean().default(true),
  maintenanceMode: z.boolean().default(false),
});

export const keyLiftUpdateSchema = z.object({
  isTracking: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
});

export const keyLiftToggleSchema = z
  .object({
    masterExerciseId: z.number().optional(),
    templateExerciseId: z.number().optional(),
    action: z.enum(["track", "untrack", "maintenance"]),
  })
  .refine((data) => data.masterExerciseId || data.templateExerciseId, {
    message: "Either masterExerciseId or templateExerciseId must be provided",
  });

// Plateau Detection
export const plateauDetectionResultSchema = z.object({
  isPlateaued: z.boolean(),
  sessionCount: z.number(),
  stalledWeight: z.number(),
  stalledReps: z.number(),
  confidenceLevel: z.enum(["low", "medium", "high"]),
  detectedAt: z.date(),
});

export const plateauInputSchema = z.object({
  masterExerciseId: z.number(),
  stalledWeight: z.number(),
  stalledReps: z.number(),
  sessionCount: z.number().default(3),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Milestone Management
export const milestoneDefinitionSchema = z.object({
  masterExerciseId: z.number().optional(),
  type: milestoneTypeSchema,
  targetValue: z.number(),
  targetMultiplier: z.number().optional(),
  experienceLevel: experienceLevelSchema,
  isCustomized: z.boolean().default(false),
});

export const milestoneCustomizationSchema = z.object({
  milestoneId: z.number(),
  targetValue: z.number(),
  targetMultiplier: z.number().optional(),
});

// PR Forecasting
export const pRForecastSchema = z.object({
  masterExerciseId: z.number(),
  forecastedWeight: z.number(),
  estimatedWeeksLow: z.number(),
  estimatedWeeksHigh: z.number(),
  confidencePercent: z.number().min(0).max(100),
  whoopRecoveryFactor: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const pRForecastInputSchema = z.object({
  masterExerciseId: z.number(),
  whoopRecoveryScore: z.number().min(0).max(100).optional(),
});

// Plateau Recommendations
export const plateauRecommendationSchema = z.object({
  rule: z.string(),
  description: z.string(),
  action: z.string(),
  playbookCTA: z.boolean().default(false),
  priority: z.enum(["low", "medium", "high"]),
});

// Dashboard Card Data
export const dashboardCardRequestSchema = z.object({
  includeForecasts: z.boolean().default(true),
  includePlateaus: z.boolean().default(true),
  includeMilestones: z.boolean().default(true),
});

// User Preferences Updates
export const plateauMilestonePreferencesSchema = z.object({
  experienceLevel: experienceLevelSchema,
  bodyweight: z.number().optional(),
  bodyweightSource: bodyweightSourceSchema.optional(),
});

// Query schemas
export const getKeyLiftsSchema = z.object({
  includeTrackingStatus: z.boolean().default(true),
});

export const getPlateausSchema = z.object({
  status: plateauStatusSchema.optional(),
  masterExerciseId: z.number().optional(),
});

export const getMilestonesSchema = z.object({
  masterExerciseId: z.number().optional(),
  type: milestoneTypeSchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  includeAchieved: z.boolean().default(true),
});

export const getForecastsSchema = z.object({
  masterExerciseId: z.number().optional(),
  minConfidence: z.number().min(0).max(100).optional(),
});

// Export types
export type KeyLiftInput = z.infer<typeof keyLiftInputSchema>;
export type KeyLiftUpdate = z.infer<typeof keyLiftUpdateSchema>;
export type KeyLiftToggle = z.infer<typeof keyLiftToggleSchema>;
export type PlateauDetectionResult = z.infer<
  typeof plateauDetectionResultSchema
>;
export type PlateauInput = z.infer<typeof plateauInputSchema>;
export type MilestoneDefinition = z.infer<typeof milestoneDefinitionSchema>;
export type MilestoneCustomization = z.infer<
  typeof milestoneCustomizationSchema
>;
export type PRForecast = z.infer<typeof pRForecastSchema>;
export type PRForecastInput = z.infer<typeof pRForecastInputSchema>;
export type PlateauRecommendation = z.infer<typeof plateauRecommendationSchema>;
export type DashboardCardRequest = z.infer<typeof dashboardCardRequestSchema>;
export type PlateauMilestonePreferences = z.infer<
  typeof plateauMilestonePreferencesSchema
>;
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;
export type PlateauStatus = z.infer<typeof plateauStatusSchema>;
export type MilestoneType = z.infer<typeof milestoneTypeSchema>;
export type BodyweightSource = z.infer<typeof bodyweightSourceSchema>;
