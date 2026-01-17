import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { recoverySessionPlanner, userPreferences } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { withAuth } from "./middleware";

function generateRecommendation(
  recoveryData: {
    recoveryScore: number | null;
    sleepPerformance: number | null;
    hrvStatus: string | null;
    rhrStatus: string | null;
    readinessScore: number | null;
  },
  strategy: string,
): {
  recommendation: string;
  intensityAdjustment: number;
  volumeAdjustment: number;
  reasoning: string;
} {
  const { readinessScore } = recoveryData;

  if (readinessScore !== null && readinessScore < 0.3) {
    return {
      recommendation: "rest_day",
      intensityAdjustment: 0.5,
      volumeAdjustment: 0.5,
      reasoning:
        "Low readiness detected. Consider a rest day or active recovery.",
    };
  }

  if (readinessScore !== null && readinessScore < 0.5) {
    return {
      recommendation: "reduce_intensity",
      intensityAdjustment: 0.7,
      volumeAdjustment: 0.8,
      reasoning: "Below average readiness. Reduce intensity and volume.",
    };
  }

  if (readinessScore !== null && readinessScore > 0.7) {
    return {
      recommendation: "train_as_planned",
      intensityAdjustment: 1.0,
      volumeAdjustment: 1.0,
      reasoning: "High readiness. Train as planned with full intensity.",
    };
  }

  return {
    recommendation: "train_as_planned",
    intensityAdjustment: 1.0,
    volumeAdjustment: 1.0,
    reasoning: "No recovery data available. Train as planned.",
  };
}

// === GET RECOVERY RECOMMENDATIONS ===
export const getRecommendations = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      templateId: z.number().optional(),
      workoutDate: z.date().default(() => new Date()),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { templateId, workoutDate } = data ?? { workoutDate: new Date() };

    const prefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, user.id))
      .limit(1);

    const strategy = prefs[0]?.recoveryPlannerStrategy ?? "adaptive";
    const sensitivity = prefs[0]?.recoveryPlannerSensitivity ?? 5;

    const defaultRecoveryData = {
      recoveryScore: null,
      sleepPerformance: null,
      hrvStatus: null,
      rhrStatus: null,
      readinessScore: null,
    };

    const rec = generateRecommendation(defaultRecoveryData, strategy);

    return {
      ...rec,
      strategy,
      sensitivity,
      generatedAt: new Date().toISOString(),
    };
  });

// === GET RECOVERY PLAN ===
export const getPlan = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { limit, offset } = data ?? { limit: 20, offset: 0 };

    const history = await db
      .select()
      .from(recoverySessionPlanner)
      .where(eq(recoverySessionPlanner.user_id, user.id))
      .orderBy(recoverySessionPlanner.createdAt)
      .limit(limit)
      .offset(offset);

    return history.map((h) => ({
      ...h,
      plannedWorkout: h.plannedWorkoutJson
        ? JSON.parse(h.plannedWorkoutJson)
        : null,
      metadata: h.metadata ? JSON.parse(h.metadata) : null,
    }));
  });

// === UPDATE RECOVERY PLAN ===
export const updatePlan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number(),
      recommendation: z
        .enum([
          "rest_day",
          "active_recovery",
          "reduce_intensity",
          "reduce_volume",
          "train_as_planned",
        ])
        .optional(),
      intensityAdjustment: z.number().min(0).max(2).optional(),
      volumeAdjustment: z.number().min(0).max(2).optional(),
      reasoning: z.string().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { id, ...updates } = data!;

    const plan = await db.query.recoverySessionPlanner.findFirst({
      where: and(
        eq(recoverySessionPlanner.id, id),
        eq(recoverySessionPlanner.user_id, user.id),
      ),
    });

    if (!plan) {
      throw new Error("Recovery plan not found");
    }

    await db
      .update(recoverySessionPlanner)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(recoverySessionPlanner.id, id));

    return { success: true };
  });

// === GET RECOVERY HISTORY ===
export const getRecoveryHistory = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { limit, offset } = data ?? { limit: 20, offset: 0 };

    const history = await db
      .select()
      .from(recoverySessionPlanner)
      .where(eq(recoverySessionPlanner.user_id, user.id))
      .orderBy(recoverySessionPlanner.createdAt)
      .limit(limit)
      .offset(offset);

    return history;
  });

// === LOG RECOVERY ACTIVITY ===
export const logActivity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      activityType: z.string(),
      duration: z.number().int().positive(),
      intensity: z.enum(["low", "medium", "high"]),
      notes: z.string().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    await db.insert(recoverySessionPlanner).values({
      user_id: user.id,
      sessionId: 0,
      recommendation: "active_recovery",
      intensityAdjustment: 1.0,
      volumeAdjustment: 1.0,
      reasoning: `Logged ${data.activityType} activity`,
      plannedWorkoutJson: JSON.stringify({
        type: data.activityType,
        duration: data.duration,
        intensity: data.intensity,
        notes: data.notes,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  });
