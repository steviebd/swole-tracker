import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  plateaus,
  milestones,
  milestoneAchievements,
  masterExercises,
} from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { withAuth } from "./middleware";

// === DETECT PLATEAU ===
export const detectPlateau = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      masterExerciseId: z.number(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { masterExerciseId } = data!;

    return {
      isPlateaued: false,
      sessionCount: 0,
      stalledWeight: null,
      stalledReps: null,
      severity: "low" as const,
    };
  });

// === GET MILESTONES ===
export const getMilestones = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      achievedOnly: z.boolean().default(false),
      upcomingOnly: z.boolean().default(false),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { limit, offset, achievedOnly, upcomingOnly } = data ?? {
      limit: 20,
      offset: 0,
    };

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
        exerciseName: masterExercises.name,
      })
      .from(milestones)
      .leftJoin(
        masterExercises,
        eq(milestones.masterExerciseId, masterExercises.id),
      )
      .leftJoin(
        milestoneAchievements,
        and(
          eq(milestoneAchievements.milestoneId, milestones.id),
          eq(milestoneAchievements.userId, user.id),
        ),
      )
      .where(eq(milestones.userId, user.id))
      .orderBy(desc(milestones.createdAt))
      .limit(limit)
      .offset(offset);

    let filteredMilestones = milestonesList;
    if (achievedOnly) {
      filteredMilestones = milestonesList.filter((m) => m.achievedAt !== null);
    } else if (upcomingOnly) {
      filteredMilestones = milestonesList.filter((m) => m.achievedAt === null);
    }

    return {
      milestones: filteredMilestones.map((m) => ({
        id: m.id,
        exerciseName: m.exerciseName || "Unknown",
        type: m.type,
        targetValue: m.targetValue,
        currentValue: m.achievedValue ?? 0,
        progressPercent: 0,
        isAchieved: m.achievedAt !== null,
        achievedAt: m.achievedAt,
      })),
      totalCount: filteredMilestones.length,
      achievedCount: filteredMilestones.filter((m) => m.achievedAt !== null)
        .length,
      upcomingCount: filteredMilestones.filter((m) => m.achievedAt === null)
        .length,
    };
  });

// === CREATE MILESTONE ===
export const createMilestone = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      masterExerciseId: z.number(),
      type: z.enum(["absolute_weight", "bodyweight_multiplier", "volume"]),
      targetValue: z.number().positive(),
      experienceLevel: z
        .enum(["beginner", "intermediate", "advanced"])
        .default("intermediate"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { masterExerciseId, type, targetValue, experienceLevel } = data!;

    const [milestone] = await db
      .insert(milestones)
      .values({
        userId: user.id,
        masterExerciseId,
        type,
        targetValue,
        isSystemDefault: false,
        isCustomized: true,
        experienceLevel,
        createdAt: new Date(),
      })
      .returning();

    return milestone;
  });

// === DISMISS PLATEAU ===
export const dismissPlateau = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      plateauId: z.number(),
      reason: z.string().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { plateauId, reason } = data!;

    const plateau = await db.query.plateaus.findFirst({
      where: and(eq(plateaus.id, plateauId), eq(plateaus.userId, user.id)),
    });

    if (!plateau) {
      throw new Error("Plateau not found");
    }

    await db
      .update(plateaus)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(eq(plateaus.id, plateauId));

    return { success: true, plateauId };
  });
