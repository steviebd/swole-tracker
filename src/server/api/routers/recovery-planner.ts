import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { z } from "zod";
import {
  generateSessionPlannerRecommendation,
  validateRecoveryData,
} from "~/server/api/utils/recovery-planner";
import {
  recoveryPlannerRequestSchema,
  userActionSchema,
} from "~/server/api/schemas/recovery-planner";
import { db } from "~/server/db";
import { recoverySessionPlanner, userPreferences } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export const recoveryPlannerRouter = createTRPCRouter({
  /**
   * Generate a recovery-guided session recommendation
   */
  generateRecommendation: protectedProcedure
    .input(
      z.object({
        templateId: z.number().optional(),
        workoutDate: z.date(),
        plannedWorkout: z.record(z.string(), z.any()),
        recoveryData: z.object({
          recoveryScore: z.number().min(0).max(100).nullable(),
          sleepPerformance: z.number().min(0).max(100).nullable(),
          hrvStatus: z.enum(["low", "baseline", "high"]).nullable(),
          rhrStatus: z.enum(["elevated", "baseline", "optimal"]).nullable(),
          readinessScore: z.number().min(0).max(1).nullable(),
        }),
        userPreferences: z.object({
          enableRecoveryPlanner: z.boolean().default(false),
          recoveryPlannerStrategy: z
            .enum(["conservative", "moderate", "adaptive", "aggressive"])
            .default("adaptive"),
          recoveryPlannerSensitivity: z.number().min(1).max(10).default(5),
          autoAdjustIntensity: z.boolean().default(true),
          recoveryPlannerPreferences: z
            .record(z.string(), z.any())
            .nullable()
            .optional(),
        }),
      }),
    )
    .query(async ({ input }) => {
      // Generate the recommendation
      const recommendation = generateSessionPlannerRecommendation({
        templateId: input.templateId ?? 0,
        workoutDate: input.workoutDate,
        plannedWorkout: input.plannedWorkout,
        recoveryData: input.recoveryData,
        userPreferences: {
          enableRecoveryPlanner: input.userPreferences.enableRecoveryPlanner,
          recoveryPlannerStrategy:
            input.userPreferences.recoveryPlannerStrategy,
          recoveryPlannerSensitivity:
            input.userPreferences.recoveryPlannerSensitivity,
          autoAdjustIntensity: input.userPreferences.autoAdjustIntensity,
          recoveryPlannerPreferences:
            input.userPreferences.recoveryPlannerPreferences ?? {},
        },
      });

      // Validate recovery data quality
      const dataValidation = validateRecoveryData(input.recoveryData);

      return {
        ...recommendation,
        dataValidation,
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get user's recovery planner history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const history = await db
        .select()
        .from(recoverySessionPlanner)
        .where(eq(recoverySessionPlanner.user_id, ctx.user.id))
        .orderBy(recoverySessionPlanner.createdAt)
        .limit(input.limit)
        .offset(input.offset);

      return history;
    }),

  /**
   * Record user's action on a recovery planner recommendation
   */
  recordUserAction: protectedProcedure
    .input(
      z.object({
        plannerId: z.string().uuid().optional(),
        userAction: userActionSchema,
        userActionReason: z.string().optional(),
        recommendation: z
          .enum([
            "rest_day",
            "active_recovery",
            "reduce_intensity",
            "reduce_volume",
            "train_as_planned",
          ])
          .optional(),
        intensityAdjustment: z.number().optional(),
        volumeAdjustment: z.number().optional(),
        reasoning: z.string().optional(),
        confidence: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // If there's a plannerId, update the existing record
      if (input.plannerId) {
        const updated = await db
          .update(recoverySessionPlanner)
          .set({
            userAction: input.userAction,
            userFeedback: input.userActionReason,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(recoverySessionPlanner.id, parseInt(input.plannerId)),
              eq(recoverySessionPlanner.user_id, ctx.user.id),
            ),
          )
          .returning();

        return updated[0];
      } else {
        // Create a new record with the user action
        const newRecord = await db
          .insert(recoverySessionPlanner)
          .values({
            user_id: ctx.user.id,
            sessionId: 0, // Placeholder - should be provided in real usage
            recommendation: input.recommendation || "train_as_planned",
            intensityAdjustment: input.intensityAdjustment || 1.0,
            volumeAdjustment: input.volumeAdjustment || 1.0,
            reasoning: input.reasoning || "",
            userAction: input.userAction,
            userFeedback: input.userActionReason,
            plannedWorkoutJson: "{}", // Placeholder
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return newRecord[0];
      }
    }),

  /**
   * Save a recovery planner recommendation to history
   */
  saveRecommendation: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        templateId: z.number().optional(),
        recommendation: z.enum([
          "rest_day",
          "active_recovery",
          "reduce_intensity",
          "reduce_volume",
          "train_as_planned",
        ]),
        intensityAdjustment: z.number().min(0).max(2),
        volumeAdjustment: z.number().min(0).max(2),
        reasoning: z.string(),
        recoveryData: z.object({
          recoveryScore: z.number().nullable(),
          sleepPerformance: z.number().nullable(),
          hrvStatus: z.enum(["high", "baseline", "low"]).nullable(),
          rhrStatus: z.enum(["optimal", "baseline", "elevated"]).nullable(),
        }),
        strategy: z.enum([
          "conservative",
          "moderate",
          "adaptive",
          "aggressive",
        ]),
        sensitivity: z.number().min(1).max(10),
        plannedWorkoutJson: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const saved = await db
        .insert(recoverySessionPlanner)
        .values({
          user_id: ctx.user.id,
          sessionId: input.sessionId,
          templateId: input.templateId,
          recoveryScore: input.recoveryData.recoveryScore,
          sleepPerformance: input.recoveryData.sleepPerformance,
          hrvStatus: input.recoveryData.hrvStatus,
          rhrStatus: input.recoveryData.rhrStatus,
          recommendation: input.recommendation,
          intensityAdjustment: input.intensityAdjustment,
          volumeAdjustment: input.volumeAdjustment,
          reasoning: input.reasoning,
          plannedWorkoutJson: input.plannedWorkoutJson || "{}",
          metadata: JSON.stringify({
            strategy: input.strategy,
            sensitivity: input.sensitivity,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return saved[0];
    }),

  /**
   * Get recovery planner preferences for the user
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userPrefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, ctx.user.id))
      .limit(1);

    const prefs = userPrefs[0];

    return {
      enableRecoveryPlanner: Boolean(prefs?.enableRecoveryPlanner),
      recoveryPlannerStrategy: prefs?.recoveryPlannerStrategy ?? "moderate",
      recoveryPlannerSensitivity: prefs?.recoveryPlannerSensitivity ?? 5,
      autoAdjustIntensity: Boolean(prefs?.autoAdjustIntensity),
      recoveryPlannerPreferences: prefs?.recoveryPlannerPreferences
        ? JSON.parse(prefs.recoveryPlannerPreferences)
        : {},
    };
  }),

  /**
   * Update recovery planner preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        enableRecoveryPlanner: z.boolean().optional(),
        recoveryPlannerStrategy: z
          .enum(["conservative", "moderate", "adaptive", "aggressive"])
          .optional(),
        recoveryPlannerSensitivity: z.number().min(1).max(10).optional(),
        autoAdjustIntensity: z.boolean().optional(),
        recoveryPlannerPreferences: z
          .record(z.string(), z.unknown())
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Get existing preferences
      const existingPrefs = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, ctx.user.id))
        .limit(1);

      const prefs = existingPrefs[0];

      if (!prefs) {
        throw new Error("User preferences not found");
      }

      // Update preferences
      const updated = await db
        .update(userPreferences)
        .set({
          ...input,
          recoveryPlannerPreferences: input.recoveryPlannerPreferences
            ? JSON.stringify(input.recoveryPlannerPreferences)
            : undefined,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.id, prefs.id))
        .returning();

      return updated[0];
    }),
});
