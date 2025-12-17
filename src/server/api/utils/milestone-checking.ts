import { eq, and, gte, desc, inArray, sql } from "drizzle-orm";
import { type DrizzleDb } from "~/server/db";
import {
  milestones,
  milestoneAchievements,
  sessionExercises,
  workoutSessions,
} from "~/server/db/schema";
import { logger } from "~/lib/logger";
import type { ResolvedExerciseNameMap } from "~/server/db/utils";

interface MilestoneNotification {
  type: "milestone_achieved";
  exerciseName: string;
  milestoneType: string;
  achievedValue: number;
  targetValue: number | null;
  achievedDate: string;
}

interface MilestoneCheckingContext {
  db: DrizzleDb;
  userId: string;
  workoutId: number;
  masterExerciseIds: number[];
  resolvedNameLookup: ResolvedExerciseNameMap;
}

/**
 * Optimized milestone achievement checking that batches all queries
 * to avoid N+1 query problems.
 */
export async function checkAndRecordMilestoneAchievements(
  ctx: MilestoneCheckingContext,
): Promise<MilestoneNotification[]> {
  const { db, userId, workoutId, masterExerciseIds, resolvedNameLookup } = ctx;

  if (masterExerciseIds.length === 0) {
    return [];
  }

  logger.debug("milestone.checking.start", {
    userId,
    masterExerciseIds: masterExerciseIds.length,
  });

  // 1. Batch fetch all active milestones for these exercises
  const allMilestones = await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.userId, userId),
        inArray(milestones.masterExerciseId, masterExerciseIds),
      ),
    );

  // Group milestones by masterExerciseId for efficient lookup
  const milestonesByExercise = allMilestones.reduce(
    (acc: Record<number, typeof allMilestones>, milestone) => {
      const exerciseId = milestone.masterExerciseId;
      if (exerciseId && !acc[exerciseId]) {
        acc[exerciseId] = [];
      }
      if (exerciseId) {
        acc[exerciseId]!.push(milestone);
      }
      return acc;
    },
    {} as Record<number, typeof allMilestones>,
  );

  // 2. Batch fetch all recent exercise performances (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const allPerformances = await db
    .select({
      masterExerciseId: sql<number>`el.master_exercise_id`.as(
        "masterExerciseId",
      ),
      oneRMEstimate: sessionExercises.one_rm_estimate,
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      sets: sessionExercises.sets,
      workoutDate: workoutSessions.workoutDate,
      sessionId: sessionExercises.sessionId,
    })
    .from(sessionExercises)
    .innerJoin(
      sql`exercise_links el ON el.template_exercise_id = ${sessionExercises.templateExerciseId} AND el.user_id = ${userId}`,
      sql`true`,
    )
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, sessionExercises.sessionId),
    )
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        inArray(sql`el.master_exercise_id`, masterExerciseIds),
        gte(workoutSessions.workoutDate, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(workoutSessions.workoutDate));

  // Group performances by masterExerciseId
  const performancesByExercise = allPerformances.reduce(
    (acc: Record<number, typeof allPerformances>, perf) => {
      const exerciseId = perf.masterExerciseId;
      if (!acc[exerciseId]) {
        acc[exerciseId] = [];
      }
      acc[exerciseId].push(perf);
      return acc;
    },
    {} as Record<number, typeof allPerformances>,
  );

  // 3. Batch fetch all recent achievements (last 24 hours) to avoid duplicates
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const allMilestoneIds = allMilestones.map(
    (m: typeof milestones.$inferSelect) => m.id,
  );

  let recentAchievements: (typeof milestoneAchievements.$inferSelect)[] = [];
  if (allMilestoneIds.length > 0) {
    recentAchievements = await db
      .select()
      .from(milestoneAchievements)
      .where(
        and(
          eq(milestoneAchievements.userId, userId),
          inArray(milestoneAchievements.milestoneId, allMilestoneIds),
          gte(milestoneAchievements.achievedAt, oneDayAgo),
        ),
      );

    // Group achievements by milestoneId for quick lookup
    recentAchievements = recentAchievements.reduce(
      (acc, achievement) => {
        const milestoneId = achievement.milestoneId;
        if (!acc.find((a) => a.milestoneId === milestoneId)) {
          acc.push(achievement);
        }
        return acc;
      },
      [] as (typeof milestoneAchievements.$inferSelect)[],
    );
  }

  const achievementsByMilestone = recentAchievements.reduce(
    (acc, achievement) => {
      acc[achievement.milestoneId] = achievement;
      return acc;
    },
    {} as Record<number, typeof milestoneAchievements.$inferSelect>,
  );

  // 4. Process milestones in memory using pre-fetched data
  const milestoneNotifications: MilestoneNotification[] = [];

  for (const masterExerciseId of masterExerciseIds) {
    const exerciseMilestones = milestonesByExercise[masterExerciseId] || [];
    const performances = performancesByExercise[masterExerciseId] || [];

    if (exerciseMilestones.length === 0 || performances.length === 0) {
      continue;
    }

    const exerciseName = getExerciseName(masterExerciseId, resolvedNameLookup);

    for (const milestone of exerciseMilestones) {
      // Skip if already achieved recently
      if (achievementsByMilestone[milestone.id]) {
        continue;
      }

      const isAchieved = await checkMilestoneAchievement(
        milestone,
        performances,
        db,
        userId,
        masterExerciseId,
      );

      if (isAchieved.achieved) {
        // Record the achievement
        await db.insert(milestoneAchievements).values({
          userId,
          milestoneId: milestone.id,
          workoutId,
          achievedAt: new Date(),
          achievedValue: isAchieved.value,
          metadata: JSON.stringify({
            trigger: "workout_completion",
            masterExerciseId,
          }),
        });

        milestoneNotifications.push({
          type: "milestone_achieved" as const,
          exerciseName,
          milestoneType: milestone.type,
          achievedValue: isAchieved.value,
          targetValue: milestone.targetValue,
          achievedDate: new Date().toISOString(),
        });

        logger.info("milestone.achieved", {
          userId,
          milestoneId: milestone.id,
          masterExerciseId,
          milestoneType: milestone.type,
          achievedValue: isAchieved.value,
          targetValue: milestone.targetValue,
        });
      }
    }
  }

  logger.debug("milestone.checking.complete", {
    userId,
    achievementsFound: milestoneNotifications.length,
  });

  return milestoneNotifications;
}

/**
 * Check if a milestone is achieved based on performance data
 */
async function checkMilestoneAchievement(
  milestone: typeof milestones.$inferSelect,
  performances: any[],
  db: DrizzleDb,
  userId: string,
  masterExerciseId: number,
): Promise<{ achieved: boolean; value: number }> {
  switch (milestone.type) {
    case "absolute_weight":
    case "bodyweight_multiplier": {
      // Get best 1RM from performances
      const bestPerformance = performances
        .filter((p) => p.oneRMEstimate != null)
        .sort((a, b) => (b.oneRMEstimate || 0) - (a.oneRMEstimate || 0))[0];

      const currentOneRM = bestPerformance?.oneRMEstimate || 0;
      return {
        achieved: currentOneRM >= (milestone.targetValue || 0),
        value: currentOneRM,
      };
    }

    case "volume": {
      // Check volume milestone (sum of all sets in recent session - last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentPerformances = performances.filter(
        (p) => new Date(p.workoutDate) >= sevenDaysAgo,
      );

      if (recentPerformances.length === 0) {
        return { achieved: false, value: 0 };
      }

      // Calculate total volume from the most recent session
      const mostRecentSession = recentPerformances.sort(
        (a, b) =>
          new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime(),
      )[0];

      const totalVolume =
        (mostRecentSession?.weight || 0) *
        (mostRecentSession?.reps || 0) *
        (mostRecentSession?.sets || 0);

      return {
        achieved: totalVolume >= (milestone.targetValue || 0),
        value: totalVolume,
      };
    }

    case "reps": {
      // Check rep milestone (max reps at target weight)
      const targetWeight = milestone.targetValue || 0;
      const weightRange = targetWeight * 0.9; // Within 10% of target weight

      const maxRepPerformance = performances
        .filter((p) => (p.weight || 0) >= weightRange)
        .sort((a, b) => (b.reps || 0) - (a.reps || 0))[0];

      const maxReps = maxRepPerformance?.reps || 0;

      return {
        achieved: maxReps >= (milestone.targetValue || 0),
        value: maxReps,
      };
    }

    default:
      logger.warn("milestone.unknown_type", {
        userId,
        milestoneType: milestone.type,
        milestoneId: milestone.id,
      });
      return { achieved: false, value: 0 };
  }
}

/**
 * Helper to get exercise name from resolved lookup
 */
function getExerciseName(
  masterExerciseId: number,
  resolvedNameLookup: ResolvedExerciseNameMap,
): string {
  for (const [_, exerciseData] of resolvedNameLookup) {
    if (exerciseData.masterExerciseId === masterExerciseId) {
      return exerciseData.name;
    }
  }
  return "Unknown exercise";
}
