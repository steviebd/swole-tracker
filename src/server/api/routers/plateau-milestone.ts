import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  keyLifts,
  plateaus,
  milestones,
  milestoneAchievements,
  prForecasts,
  exerciseLinks,
  templateExercises,
  masterExercises,
} from "~/server/db/schema";
import {
  detectPlateau,
  storePlateau,
  getActivePlateaus,
  resolvePlateau,
} from "~/server/api/utils/plateau-detection";
import {
  generatePRForecast,
  storePRForecast,
  getActivePRForecasts,
} from "~/server/api/utils/pr-forecasting";
import {
  generateDefaultMilestones,
  storeMilestones,
  generateCustomMilestone,
  calculateMilestoneProgress,
} from "~/server/api/utils/milestone-defaults";
import {
  generatePlateauRecommendations,
  getSpecificPlateauRecommendation,
} from "~/server/api/utils/plateau-recommendations";
import {
  keyLiftInputSchema,
  keyLiftUpdateSchema,
  keyLiftToggleSchema,
  milestoneDefinitionSchema,
  milestoneCustomizationSchema,
  milestoneTypeSchema,
} from "~/server/api/schemas/plateau-milestone";
import type {
  KeyLiftListResponse,
  PlateauListResponse,
  MilestoneListResponse,
  ForecastListResponse,
  DashboardCardData,
  KeyLiftToggleResponse,
  PlateauDetectionResponse,
} from "~/server/api/types/plateau-milestone";

/**
 * Plateau & Milestone Router
 *
 * Handles all plateau detection, milestone tracking, and PR forecasting functionality
 * including key lift management, recommendations, and progress tracking.
 */
export const plateauMilestoneRouter = createTRPCRouter({
  // Key Lift Management
  getKeyLifts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        trackingOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, trackingOnly } = input;
      const userId = ctx.user.id;

      const whereConditions = [eq(keyLifts.userId, userId)];
      if (trackingOnly) {
        whereConditions.push(eq(keyLifts.isTracking, true));
      }

      const keyLiftsList = await db
        .select({
          id: keyLifts.id,
          userId: keyLifts.userId,
          masterExerciseId: keyLifts.masterExerciseId,
          isTracking: keyLifts.isTracking,
          maintenanceMode: keyLifts.maintenanceMode,
          createdAt: keyLifts.createdAt,
          updatedAt: keyLifts.updatedAt,
          masterExerciseName: masterExercises.name,
        })
        .from(keyLifts)
        .leftJoin(
          masterExercises,
          eq(keyLifts.masterExerciseId, masterExercises.id),
        )
        .where(and(...whereConditions))
        .orderBy(desc(keyLifts.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(keyLifts)
        .where(eq(keyLifts.userId, userId))
        .then((result) => result[0]?.count || 0);

      const trackingCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(keyLifts)
        .where(and(eq(keyLifts.userId, userId), eq(keyLifts.isTracking, true)))
        .then((result) => result[0]?.count || 0);

      const maintenanceCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(keyLifts)
        .where(
          and(eq(keyLifts.userId, userId), eq(keyLifts.maintenanceMode, true)),
        )
        .then((result) => result[0]?.count || 0);

      return {
        keyLifts: keyLiftsList.map((kl) => ({
          ...kl,
          isTracked: kl.isTracking,
        })),
        totalCount,
        trackingCount,
        maintenanceCount,
      } satisfies KeyLiftListResponse;
    }),

  addKeyLift: protectedProcedure
    .input(keyLiftInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { masterExerciseId, isTracking, maintenanceMode } = input;

      // Check if key lift already exists
      const existing = await db
        .select()
        .from(keyLifts)
        .where(
          and(
            eq(keyLifts.userId, userId),
            eq(keyLifts.masterExerciseId, masterExerciseId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Key lift already exists for this exercise");
      }

      // Create new key lift
      const result = await db
        .insert(keyLifts)
        .values({
          userId,
          masterExerciseId,
          isTracking,
          maintenanceMode,
        })
        .returning();

      const keyLift = result[0]!;

      // Generate default milestones for this exercise
      const context = {
        userId,
        masterExerciseId,
        experienceLevel: "intermediate" as const,
        bodyweight: 150, // Default bodyweight
      };

      const defaultMilestones = await generateDefaultMilestones(db, context);
      await storeMilestones(db, userId, defaultMilestones);

      return {
        success: true,
        keyLift: {
          ...keyLift,
          isTracked: keyLift.isTracking,
        },
        message: "Key lift added successfully",
      } satisfies KeyLiftToggleResponse;
    }),

  toggleKeyLift: protectedProcedure
    .input(keyLiftToggleSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { masterExerciseId, templateExerciseId, action } = input;

      // If templateExerciseId is provided, find or create master exercise link
      let finalMasterExerciseId = masterExerciseId;
      if (!finalMasterExerciseId && templateExerciseId) {
        // Check if exercise link already exists
        const existingLink = await db
          .select()
          .from(exerciseLinks)
          .where(
            and(
              eq(exerciseLinks.templateExerciseId, templateExerciseId),
              eq(exerciseLinks.user_id, userId),
            ),
          )
          .limit(1);

        if (existingLink.length > 0) {
          finalMasterExerciseId = existingLink[0]!.masterExerciseId;
        } else {
          // Create new master exercise and link
          // First, get the exercise name to create master exercise
          const templateExercise = await db
            .select()
            .from(templateExercises)
            .where(eq(templateExercises.id, templateExerciseId))
            .limit(1);

          if (templateExercise.length === 0) {
            throw new Error("Template exercise not found");
          }

          const exerciseName =
            templateExercise[0]!.exerciseName || "Unknown Exercise";

          // Create master exercise
          const newMasterExercise = await db
            .insert(masterExercises)
            .values({
              user_id: userId,
              name: exerciseName,
              normalizedName: exerciseName.toLowerCase().trim(),
            })
            .returning();

          const newMasterId = newMasterExercise[0]!.id;

          // Create exercise link
          await db.insert(exerciseLinks).values({
            user_id: userId,
            templateExerciseId,
            masterExerciseId: newMasterId,
          });

          finalMasterExerciseId = newMasterId;
        }
      }

      if (!finalMasterExerciseId) {
        throw new Error("Could not determine master exercise ID");
      }

      // Find existing key lift
      const existing = await db
        .select()
        .from(keyLifts)
        .where(
          and(
            eq(keyLifts.userId, userId),
            eq(keyLifts.masterExerciseId, finalMasterExerciseId!),
          ),
        )
        .limit(1);

      let keyLift;
      let message: string;

      if (existing.length === 0) {
        // Create new key lift
        const result = await db
          .insert(keyLifts)
          .values({
            userId,
            masterExerciseId: finalMasterExerciseId!,
            isTracking: action === "track",
            maintenanceMode: action === "maintenance",
          })
          .returning();

        keyLift = result[0]!;
        message = "Key lift added and tracking enabled";
      } else {
        // Update existing key lift
        const updateData: { isTracking?: boolean; maintenanceMode?: boolean } =
          {};

        switch (action) {
          case "track":
            updateData.isTracking = true;
            updateData.maintenanceMode = false;
            message = "Key lift tracking enabled";
            break;
          case "untrack":
            updateData.isTracking = false;
            updateData.maintenanceMode = false;
            message = "Key lift tracking disabled";
            break;
          case "maintenance":
            updateData.maintenanceMode = true;
            message = "Key lift set to maintenance mode";
            break;
        }

        const result = await db
          .update(keyLifts)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(
            and(eq(keyLifts.id, existing[0]!.id), eq(keyLifts.userId, userId)),
          )
          .returning();

        keyLift = result[0]!;
      }

      return {
        success: true,
        keyLift: {
          ...keyLift,
          isTracked: keyLift.isTracking,
        },
        message,
      } satisfies KeyLiftToggleResponse;
    }),

  // Plateau Detection & Management
  detectPlateau: protectedProcedure
    .input(z.object({ masterExerciseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { masterExerciseId } = input;

      const detectionResult = await detectPlateau(db, userId, masterExerciseId);

      if (detectionResult.plateauDetected && detectionResult.plateau) {
        // Store detected plateau
        await storePlateau(db, userId, masterExerciseId, {
          isPlateaued: true,
          sessionCount: detectionResult.plateau.sessionCount,
          stalledWeight: detectionResult.plateau.stalledWeight,
          stalledReps: detectionResult.plateau.stalledReps,
          confidenceLevel:
            detectionResult.plateau.severity === "high"
              ? "high"
              : detectionResult.plateau.severity === "medium"
                ? "medium"
                : "low",
          detectedAt: detectionResult.plateau.detectedAt,
        });
      }

      return detectionResult satisfies PlateauDetectionResponse;
    }),

  getPlateaus: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.enum(["active", "resolved", "all"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { limit, offset, status } = input;

      const whereConditions = [eq(plateaus.userId, userId)];
      if (status !== "all") {
        whereConditions.push(eq(plateaus.status, status));
      }

      const plateausList = await db
        .select()
        .from(plateaus)
        .where(and(...whereConditions))
        .orderBy(desc(plateaus.detectedAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(plateaus)
        .where(and(...whereConditions))
        .then((result) => result[0]?.count || 0);

      const activeCount =
        status === "all"
          ? await db
              .select({ count: sql<number>`count(*)` })
              .from(plateaus)
              .where(
                and(eq(plateaus.userId, userId), eq(plateaus.status, "active")),
              )
              .then((result) => result[0]?.count || 0)
          : plateausList.filter((p) => p.status === "active").length;

      const resolvedCount =
        status === "all"
          ? totalCount - activeCount
          : plateausList.filter((p) => p.status === "resolved").length;

      return {
        plateaus: plateausList.map((p) => ({
          id: p.id,
          exerciseName: "", // TODO: Join with masterExercises
          masterExerciseId: p.masterExerciseId,
          stalledWeight: p.stalledWeight,
          stalledReps: p.stalledReps,
          sessionCount: p.sessionCount,
          durationWeeks: 0, // TODO: Calculate from detectedAt
          severity:
            p.sessionCount >= 6
              ? "high"
              : p.sessionCount >= 4
                ? "medium"
                : "low",
          status: p.status as "active" | "resolved" | "maintaining",
          detectedAt: p.detectedAt,
          recommendations: [], // TODO: Generate recommendations
        })),
        totalCount,
        activeCount,
        resolvedCount,
      } satisfies PlateauListResponse;
    }),

  resolvePlateau: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { id } = input;

      await resolvePlateau(db, userId, id);
      return { success: true };
    }),

  getPlateauRecommendations: protectedProcedure
    .input(
      z.object({
        masterExerciseId: z.number(),
        plateauType: z
          .enum(["strength", "hypertrophy", "endurance", "technique"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { masterExerciseId, plateauType } = input;

      if (plateauType) {
        const recommendation = getSpecificPlateauRecommendation(
          plateauType,
          "intermediate",
        );
        return [recommendation];
      }

      // For now, return generic recommendations
      return [
        {
          rule: "volume_overload",
          description: "Increase training volume gradually",
          action: "Add 1-2 sets per exercise or increase weight by 5-10%",
          playbookCTA: true,
          priority: "high" as const,
        },
        {
          rule: "intensity_variation",
          description: "Vary your training intensity",
          action: "Include both heavy (3-5 reps) and moderate (8-12 reps) sets",
          playbookCTA: false,
          priority: "medium" as const,
        },
      ];
    }),

  // Milestone Management
  getMilestones: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        achievedOnly: z.boolean().default(false),
        upcomingOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { limit, offset, achievedOnly, upcomingOnly } = input;

      // Get milestones with achievement status
      const milestonesList = await db
        .select({
          id: milestones.id,
          userId: milestones.userId,
          masterExerciseId: milestones.masterExerciseId,
          type: milestones.type,
          targetValue: milestones.targetValue,
          targetMultiplier: milestones.targetMultiplier,
          isSystemDefault: milestones.isSystemDefault,
          isCustomized: milestones.isCustomized,
          experienceLevel: milestones.experienceLevel,
          createdAt: milestones.createdAt,
          achievedAt: milestoneAchievements.achievedAt,
          achievedValue: milestoneAchievements.achievedValue,
        })
        .from(milestones)
        .leftJoin(
          milestoneAchievements,
          and(
            eq(milestoneAchievements.milestoneId, milestones.id),
            eq(milestoneAchievements.userId, userId),
          ),
        )
        .where(eq(milestones.userId, userId))
        .orderBy(desc(milestones.createdAt))
        .limit(limit)
        .offset(offset);

      // Filter based on achievement status
      let filteredMilestones = milestonesList;
      if (achievedOnly) {
        filteredMilestones = milestonesList.filter(
          (m) => m.achievedAt !== null,
        );
      } else if (upcomingOnly) {
        filteredMilestones = milestonesList.filter(
          (m) => m.achievedAt === null,
        );
      }

      // Calculate progress for each milestone
      const milestoneProgress = filteredMilestones.map((milestone) => {
        const currentValue = 0; // TODO: Calculate from user's actual performance
        const progressPercent = calculateMilestoneProgress(
          currentValue,
          milestone.targetValue,
          milestone.type as
            | "absolute_weight"
            | "bodyweight_multiplier"
            | "volume",
        );

        return {
          milestone: {
            id: milestone.id,
            userId: milestone.userId,
            masterExerciseId: milestone.masterExerciseId,
            type: milestone.type as
              | "absolute_weight"
              | "bodyweight_multiplier"
              | "volume",
            targetValue: milestone.targetValue,
            targetMultiplier: milestone.targetMultiplier,
            isSystemDefault: milestone.isSystemDefault,
            isCustomized: milestone.isCustomized,
            experienceLevel: milestone.experienceLevel as
              | "beginner"
              | "intermediate"
              | "advanced",
            createdAt: milestone.createdAt,
          },
          currentValue,
          progressPercent,
          isAchieved: milestone.achievedAt !== null,
          ...(milestone.achievedAt && { achievedAt: milestone.achievedAt }),
          // estimatedDate: undefined, // TODO: Calculate based on progression rate
        };
      });

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(milestones)
        .where(eq(milestones.userId, userId))
        .then((result) => result[0]?.count || 0);

      const achievedCount = milestoneProgress.filter(
        (m) => m.isAchieved,
      ).length;
      const upcomingCount = milestoneProgress.filter(
        (m) => !m.isAchieved,
      ).length;

      return {
        milestones: milestoneProgress,
        totalCount,
        achievedCount,
        upcomingCount,
      } satisfies MilestoneListResponse;
    }),

  addMilestone: protectedProcedure
    .input(milestoneDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { masterExerciseId, type, targetValue, experienceLevel } = input;

      if (!masterExerciseId) {
        throw new Error("masterExerciseId is required for milestone creation");
      }

      const milestone = await generateCustomMilestone(
        db,
        userId,
        masterExerciseId,
        type,
        targetValue,
        experienceLevel,
      );

      const result = await db
        .insert(milestones)
        .values({
          userId,
          masterExerciseId: milestone.masterExerciseId,
          type: milestone.type,
          targetValue: milestone.targetValue,
          targetMultiplier: milestone.targetMultiplier,
          isSystemDefault: milestone.isSystemDefault,
          isCustomized: milestone.isCustomized,
          experienceLevel: milestone.experienceLevel,
        })
        .returning();

      return result[0]!;
    }),

  // PR Forecasting
  getPRForecast: protectedProcedure
    .input(z.object({ masterExerciseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { masterExerciseId } = input;

      const forecastResponse = await generatePRForecast(
        db,
        userId,
        masterExerciseId,
      );

      if (forecastResponse.forecasts.length > 0) {
        const forecast = forecastResponse.forecasts[0];
        if (forecast) {
          await storePRForecast(db, userId, masterExerciseId, forecast);
        }
      }

      return forecastResponse satisfies ForecastListResponse;
    }),

  getPRForecasts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { limit, offset } = input;

      const forecasts = await getActivePRForecasts(db, userId);

      return {
        forecasts: forecasts.slice(offset, offset + limit).map((f) => ({
          exerciseName: "", // TODO: Join with masterExercises
          masterExerciseId: f.masterExerciseId,
          currentWeight: 0, // TODO: Calculate from user's actual performance
          forecastedWeight: f.forecastedWeight,
          estimatedWeeksLow: f.estimatedWeeksLow,
          estimatedWeeksHigh: f.estimatedWeeksHigh,
          confidencePercent: f.confidencePercent,
          calculatedAt: f.calculatedAt,
          trajectory: "stable" as const, // TODO: Calculate from trend
        })),
        totalCount: forecasts.length,
        averageConfidence:
          forecasts.length > 0
            ? forecasts.reduce((sum, f) => sum + f.confidencePercent, 0) /
              forecasts.length
            : 0,
      } satisfies ForecastListResponse;
    }),

  // Dashboard Summary
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get all data for dashboard
    const [activePlateaus, upcomingMilestones, prForecasts] = await Promise.all(
      [
        getActivePlateaus(db, userId),
        db
          .select()
          .from(milestones)
          .leftJoin(
            milestoneAchievements,
            and(
              eq(milestoneAchievements.milestoneId, milestones.id),
              eq(milestoneAchievements.userId, userId),
            ),
          )
          .where(
            and(
              eq(milestones.userId, userId),
              sql`${milestoneAchievements.achievedAt} IS NULL`,
            ),
          )
          .orderBy(milestones.targetValue)
          .limit(5),
        getActivePRForecasts(db, userId),
      ],
    );

    // Transform data for dashboard
    const plateauAlerts = activePlateaus.map(
      (p) =>
        ({
          id: p.id,
          exerciseName: "", // TODO: Join with masterExercises
          masterExerciseId: p.masterExerciseId,
          stalledWeight: p.stalledWeight,
          stalledReps: p.stalledReps,
          sessionCount: p.sessionCount,
          durationWeeks: 0, // TODO: Calculate
          severity: (p.confidenceLevel === "high"
            ? "high"
            : p.confidenceLevel === "medium"
              ? "medium"
              : "low") as "low" | "medium" | "high",
          status: "active" as const,
          detectedAt: p.detectedAt,
          recommendations: [], // TODO: Generate
        }) satisfies import("~/server/api/types/plateau-milestone").PlateauAlert,
    );

    const milestoneProgress = upcomingMilestones.map((m) => ({
      milestone: {
        id: m.milestones.id,
        userId: m.milestones.userId,
        masterExerciseId: m.milestones.masterExerciseId,
        type: m.milestones.type as
          | "absolute_weight"
          | "bodyweight_multiplier"
          | "volume",
        targetValue: m.milestones.targetValue,
        targetMultiplier: m.milestones.targetMultiplier,
        isSystemDefault: m.milestones.isSystemDefault,
        isCustomized: m.milestones.isCustomized,
        experienceLevel: m.milestones.experienceLevel as
          | "beginner"
          | "intermediate"
          | "advanced",
        createdAt: m.milestones.createdAt,
      },
      currentValue: 0, // TODO: Calculate
      progressPercent: 0, // TODO: Calculate
      isAchieved: false,
    }));

    const forecastData = prForecasts.map((f) => ({
      exerciseName: "", // TODO: Join with masterExercises
      masterExerciseId: f.masterExerciseId,
      currentWeight: 0, // TODO: Calculate
      forecastedWeight: f.forecastedWeight,
      estimatedWeeksLow: f.estimatedWeeksLow,
      estimatedWeeksHigh: f.estimatedWeeksHigh,
      confidencePercent: f.confidencePercent,
      calculatedAt: f.calculatedAt,
      trajectory: "stable" as const, // TODO: Calculate
    }));

    return {
      activePlateaus: plateauAlerts,
      upcomingMilestones: milestoneProgress,
      prForecasts: forecastData,
      summary: {
        totalKeyLifts: 0, // TODO: Count from keyLifts table
        activePlateauCount: plateauAlerts.length,
        upcomingMilestoneCount: milestoneProgress.length,
        averageConfidence:
          forecastData.length > 0
            ? forecastData.reduce((sum, f) => sum + f.confidencePercent, 0) /
              forecastData.length
            : 0,
      },
      lastUpdated: new Date(),
    } satisfies DashboardCardData;
  }),
});
