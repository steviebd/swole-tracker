import { z } from "zod";

// Enum schemas
export const goalPresetSchema = z.enum([
  "powerlifting",
  "strength",
  "hypertrophy",
  "peaking",
]);

export const targetTypeSchema = z.enum(["template", "exercise"]);

export const playbookStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "archived",
]);

export const weekTypeSchema = z.enum(["training", "deload", "pr_attempt"]);

export const weekStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

export const regenerationReasonSchema = z.enum([
  "manual",
  "deviation",
  "failed_pr",
  "rpe_feedback",
]);

export const activePlanTypeSchema = z.enum(["ai", "algorithmic"]);

// Playbook metadata schema
export const playbookMetadataSchema = z.object({
  // User inputs for 1RMs (exercise name -> 1RM in kg)
  oneRmInputs: z.record(z.string(), z.number().positive()).optional(),

  // User availability
  trainingDaysPerWeek: z.number().min(1).max(7).optional(),
  availableDays: z
    .array(
      z.enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ]),
    )
    .optional(),

  // Equipment constraints
  availableEquipment: z.array(z.string()).optional(),

  // Other preferences
  sessionDurationMinutes: z.number().positive().optional(),
  restDayPreference: z.string().optional(),
});

// Warm-up set schema
export const warmupSetSchema = z.object({
  weight: z.number().min(0), // Allow 0 for bodyweight exercises
  reps: z.number().positive(),
  percentageOfTop: z.number().min(0).max(100).optional(),
});

// Exercise prescription schema (for AI-generated plans)
export const exercisePrescriptionSchema = z.object({
  exerciseName: z.string(),
  templateExerciseId: z.number().optional(),
  masterExerciseId: z.number().optional(),
  warmupSets: z.array(warmupSetSchema).optional(), // Warm-up sets before working sets
  sets: z.number().positive(), // Working sets count
  reps: z.number().positive(), // Working reps
  weight: z.number().min(0).nullable(), // Working weight (allow 0 for bodyweight)
  restSeconds: z.number().positive().optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

// Session prescription schema
export const sessionPrescriptionSchema = z.object({
  sessionNumber: z.number().min(1).max(7),
  dayOfWeek: z.string().optional(),
  exercises: z.array(exercisePrescriptionSchema),
  totalVolumeTarget: z.number().positive().optional(),
  estimatedDurationMinutes: z.number().positive().optional(),
  notes: z.string().optional(),
});

// Weekly plan schema (AI-generated)
export const weeklyAiPlanSchema = z.object({
  weekNumber: z.number().min(1).max(6),
  weekType: weekTypeSchema,
  sessions: z.array(sessionPrescriptionSchema),
  volumeTarget: z.number().positive().optional(),
  coachingCues: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  prAttemptExercises: z
    .array(
      z.object({
        exerciseName: z.string(),
        targetWeight: z.number().positive(),
        confidence: z.number().min(0).max(1), // 0-1 confidence level
      }),
    )
    .optional(),
});

// Algorithmic plan schema (formula-based baseline)
export const weeklyAlgorithmicPlanSchema = z.object({
  weekNumber: z.number().min(1).max(6),
  weekType: weekTypeSchema,
  sessions: z.array(sessionPrescriptionSchema),
  volumeTarget: z.number().positive().optional(),
  progressionFormula: z.string(), // e.g., "linear_2.5kg", "percentage_2.5%"
});

// Playbook creation input
export const playbookCreateInputSchema = z.object({
  name: z.string().min(1).max(200),
  goalText: z.string().optional(),
  goalPreset: goalPresetSchema.optional(),
  targetType: targetTypeSchema,
  targetIds: z.array(z.number()).min(1), // Template or exercise IDs
  duration: z.number().min(4).max(6).default(6),
  metadata: playbookMetadataSchema.optional(),
  selectedPlans: z
    .object({
      algorithmic: z.boolean(),
      ai: z.boolean(),
    })
    .refine((data) => data.algorithmic || data.ai, {
      message: "At least one plan must be selected",
    }),
});

// RPE submission schema
export const rpeSubmissionSchema = z.object({
  playbookSessionId: z.number(),
  rpe: z.number().min(1).max(10),
  rpeNotes: z.string().max(500).optional(),
  difficulty: z
    .enum(["too_easy", "just_right", "too_hard", "failed_sets"])
    .optional(),
});

// Deviation schema (prescribed vs actual comparison)
export const sessionDeviationSchema = z.object({
  exerciseName: z.string(),
  prescribed: z.object({
    sets: z.number(),
    reps: z.number(),
    weight: z.number().nullable(),
  }),
  actual: z.object({
    sets: z.number(),
    reps: z.number(),
    weight: z.number().nullable(),
  }),
  deviationPercentage: z.number(), // Percentage deviation from prescribed
  deviationType: z.enum([
    "volume_higher",
    "volume_lower",
    "intensity_higher",
    "intensity_lower",
    "on_target",
  ]),
});

// Regeneration request schema
export const regenerationRequestSchema = z.object({
  playbookId: z.number(),
  weekStart: z.number().min(1).max(6),
  weekEnd: z.number().min(1).max(6),
  reason: regenerationReasonSchema,
  context: z.string().optional(), // Additional context for regeneration
});

// Playbook session schema
export const playbookSessionSchema = z.object({
  id: z.number(),
  playbookWeekId: z.number(),
  sessionNumber: z.number(),
  sessionDate: z.date().nullable(),
  prescribedWorkoutJson: z.string(),
  actualWorkoutId: z.number().nullable(),
  adherenceScore: z.number().nullable(),
  rpe: z.number().nullable(),
  rpeNotes: z.string().nullable(),
  deviation: z.string().nullable(),
  activePlanType: activePlanTypeSchema,
  isCompleted: z.boolean(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

// Playbook analytics schema
export const playbookAnalyticsSchema = z.object({
  playbookId: z.number(),
  totalWeeks: z.number(),
  completedWeeks: z.number(),
  totalSessions: z.number(),
  completedSessions: z.number(),
  adherencePercentage: z.number().min(0).max(100),
  averageRpe: z.number().min(1).max(10).optional(),
  volumeProgression: z.array(
    z.object({
      weekNumber: z.number(),
      plannedVolume: z.number(),
      actualVolume: z.number().optional(),
    }),
  ),
  prAttemptsPlanned: z.number(),
  prAttemptsSuccessful: z.number(),
  regenerationCount: z.number(),
});

// TypeScript types inferred from Zod schemas
export type GoalPreset = z.infer<typeof goalPresetSchema>;
export type TargetType = z.infer<typeof targetTypeSchema>;
export type PlaybookStatus = z.infer<typeof playbookStatusSchema>;
export type WeekType = z.infer<typeof weekTypeSchema>;
export type WeekStatus = z.infer<typeof weekStatusSchema>;
export type RegenerationReason = z.infer<typeof regenerationReasonSchema>;
export type ActivePlanType = z.infer<typeof activePlanTypeSchema>;
export type PlaybookMetadata = z.infer<typeof playbookMetadataSchema>;
export type ExercisePrescription = z.infer<typeof exercisePrescriptionSchema>;
export type SessionPrescription = z.infer<typeof sessionPrescriptionSchema>;
export type WeeklyAiPlan = z.infer<typeof weeklyAiPlanSchema>;
export type WeeklyAlgorithmicPlan = z.infer<typeof weeklyAlgorithmicPlanSchema>;
export type PlaybookCreateInput = z.infer<typeof playbookCreateInputSchema>;
export type RpeSubmission = z.infer<typeof rpeSubmissionSchema>;
export type SessionDeviation = z.infer<typeof sessionDeviationSchema>;
export type RegenerationRequest = z.infer<typeof regenerationRequestSchema>;
export type PlaybookSession = z.infer<typeof playbookSessionSchema>;
export type PlaybookAnalytics = z.infer<typeof playbookAnalyticsSchema>;
