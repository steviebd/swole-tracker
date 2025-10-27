import { eq, and, sql, asc } from "drizzle-orm";
import { db } from ".";
import {
  sessionExercises,
  workoutSessions,
  exerciseDailySummary,
  exerciseWeeklySummary,
  exerciseMonthlySummary,
} from "./schema";
import { logger } from "~/lib/logger";
import { whereInChunks } from "./chunk-utils";

/**
 * Aggregate exercise data for a specific user and date
 * Processes all sessions for that user/day/exercise combination
 */
export const aggregateExerciseDaily = async (
  userId: string,
  exerciseName: string,
  date: Date,
): Promise<void> => {
  const startTime = Date.now();

  try {
    // Get all session exercises for this user, exercise, and date
    const exercises = await db
      .select({
        weight: sessionExercises.weight,
        reps: sessionExercises.reps,
        sets: sessionExercises.sets,
        one_rm_estimate: sessionExercises.one_rm_estimate,
        volume_load: sessionExercises.volume_load,
        sessionId: sessionExercises.sessionId,
      })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        and(
          eq(sessionExercises.sessionId, workoutSessions.id),
          eq(workoutSessions.user_id, userId),
          sql`date(${workoutSessions.workoutDate}) = date(${date.toISOString()})`,
        ),
      )
      .where(
        and(
          eq(sessionExercises.user_id, userId),
          eq(sessionExercises.resolvedExerciseName, exerciseName),
        ),
      );

    if (exercises.length === 0) {
      logger.debug("No exercises found for daily aggregation", {
        userId,
        exerciseName,
        date: date.toISOString(),
      });
      return;
    }

    // Calculate aggregates
    let totalVolume = 0;
    let maxWeight = 0;
    let maxOneRm = 0;
    const sessionIds = new Set<number>();

    for (const exercise of exercises) {
      if (exercise.volume_load) {
        totalVolume += exercise.volume_load;
      }
      if (exercise.weight && exercise.weight > maxWeight) {
        maxWeight = exercise.weight;
      }
      if (exercise.one_rm_estimate && exercise.one_rm_estimate > maxOneRm) {
        maxOneRm = exercise.one_rm_estimate;
      }
      sessionIds.add(exercise.sessionId);
    }

    const sessionCount = sessionIds.size;

    // Upsert the daily summary
    await db
      .insert(exerciseDailySummary)
      .values({
        user_id: userId,
        exercise_name: exerciseName,
        date,
        total_volume: totalVolume > 0 ? totalVolume : null,
        max_weight: maxWeight > 0 ? maxWeight : null,
        max_one_rm: maxOneRm > 0 ? maxOneRm : null,
        session_count: sessionCount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          exerciseDailySummary.user_id,
          exerciseDailySummary.exercise_name,
          exerciseDailySummary.date,
        ],
        set: {
          total_volume: totalVolume > 0 ? totalVolume : null,
          max_weight: maxWeight > 0 ? maxWeight : null,
          max_one_rm: maxOneRm > 0 ? maxOneRm : null,
          session_count: sessionCount,
          updatedAt: new Date(),
        },
      });

    const duration = Date.now() - startTime;
    logger.debug("Daily exercise aggregation completed", {
      userId,
      exerciseName,
      date: date.toISOString(),
      sessionCount,
      totalVolume,
      durationMs: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Daily exercise aggregation failed", error, {
      userId,
      exerciseName,
      date: date.toISOString(),
      durationMs: duration,
    });
    throw error;
  }
};

/**
 * Aggregate exercise data for a specific user, exercise, and week
 * Rolls up daily data into weekly summaries and calculates trend slopes
 */
export const aggregateExerciseWeekly = async (
  userId: string,
  exerciseName: string,
  weekStart: Date, // Monday of the week
): Promise<void> => {
  const startTime = Date.now();

  try {
    // Get all daily summaries for this user/exercise/week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const dailySummaries = await db
      .select({
        date: exerciseDailySummary.date,
        total_volume: exerciseDailySummary.total_volume,
        max_one_rm: exerciseDailySummary.max_one_rm,
        session_count: exerciseDailySummary.session_count,
      })
      .from(exerciseDailySummary)
      .where(
        and(
          eq(exerciseDailySummary.user_id, userId),
          eq(exerciseDailySummary.exercise_name, exerciseName),
          sql`${exerciseDailySummary.date} >= ${weekStart.toISOString()}`,
          sql`${exerciseDailySummary.date} <= ${weekEnd.toISOString()}`,
        ),
      )
      .orderBy(asc(exerciseDailySummary.date));

    if (dailySummaries.length === 0) {
      logger.debug("No daily summaries found for weekly aggregation", {
        userId,
        exerciseName,
        weekStart: weekStart.toISOString(),
      });
      return;
    }

    // Calculate weekly aggregates
    let totalVolume = 0;
    let maxOneRm = 0;
    let totalSessions = 0;
    const volumePoints: Array<{ day: number; volume: number }> = [];

    for (const summary of dailySummaries) {
      if (summary.total_volume) {
        totalVolume += summary.total_volume;
        // For trend calculation, use day of week (0-6) and volume
        const dayOfWeek = new Date(summary.date).getDay();
        volumePoints.push({ day: dayOfWeek, volume: summary.total_volume });
      }
      if (summary.max_one_rm && summary.max_one_rm > maxOneRm) {
        maxOneRm = summary.max_one_rm;
      }
      totalSessions += summary.session_count;
    }

    const avgVolume =
      volumePoints.length > 0 ? totalVolume / volumePoints.length : 0;

    // Calculate trend slope using simple linear regression
    let trendSlope: number | null = null;
    if (volumePoints.length >= 2) {
      const n = volumePoints.length;
      const sumX = volumePoints.reduce((sum, point) => sum + point.day, 0);
      const sumY = volumePoints.reduce((sum, point) => sum + point.volume, 0);
      const sumXY = volumePoints.reduce(
        (sum, point) => sum + point.day * point.volume,
        0,
      );
      const sumXX = volumePoints.reduce(
        (sum, point) => sum + point.day * point.day,
        0,
      );

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      trendSlope = isFinite(slope) ? slope : null;
    }

    // Upsert the weekly summary
    await db
      .insert(exerciseWeeklySummary)
      .values({
        user_id: userId,
        exercise_name: exerciseName,
        week_start: weekStart,
        avg_volume: avgVolume > 0 ? avgVolume : null,
        max_one_rm: maxOneRm > 0 ? maxOneRm : null,
        session_count: totalSessions,
        trend_slope: trendSlope,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          exerciseWeeklySummary.user_id,
          exerciseWeeklySummary.exercise_name,
          exerciseWeeklySummary.week_start,
        ],
        set: {
          avg_volume: avgVolume > 0 ? avgVolume : null,
          max_one_rm: maxOneRm > 0 ? maxOneRm : null,
          session_count: totalSessions,
          trend_slope: trendSlope,
          updatedAt: new Date(),
        },
      });

    const duration = Date.now() - startTime;
    logger.debug("Weekly exercise aggregation completed", {
      userId,
      exerciseName,
      weekStart: weekStart.toISOString(),
      dailySummariesCount: dailySummaries.length,
      avgVolume,
      trendSlope,
      durationMs: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Weekly exercise aggregation failed", error, {
      userId,
      exerciseName,
      weekStart: weekStart.toISOString(),
      durationMs: duration,
    });
    throw error;
  }
};

/**
 * Aggregate exercise data for a specific user, exercise, and month
 * Rolls up weekly data into monthly summaries and calculates consistency scores
 */
export const aggregateExerciseMonthly = async (
  userId: string,
  exerciseName: string,
  monthStart: Date, // First day of the month
): Promise<void> => {
  const startTime = Date.now();

  try {
    // Get all weekly summaries for this user/exercise/month
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);
    monthEnd.setDate(0); // Last day of month

    const weeklySummaries = await db
      .select({
        week_start: exerciseWeeklySummary.week_start,
        avg_volume: exerciseWeeklySummary.avg_volume,
        max_one_rm: exerciseWeeklySummary.max_one_rm,
        session_count: exerciseWeeklySummary.session_count,
      })
      .from(exerciseWeeklySummary)
      .where(
        and(
          eq(exerciseWeeklySummary.user_id, userId),
          eq(exerciseWeeklySummary.exercise_name, exerciseName),
          sql`${exerciseWeeklySummary.week_start} >= ${monthStart.toISOString()}`,
          sql`${exerciseWeeklySummary.week_start} < ${monthEnd.toISOString()}`,
        ),
      )
      .orderBy(asc(exerciseWeeklySummary.week_start));

    if (weeklySummaries.length === 0) {
      logger.debug("No weekly summaries found for monthly aggregation", {
        userId,
        exerciseName,
        monthStart: monthStart.toISOString(),
      });
      return;
    }

    // Calculate monthly aggregates
    let totalVolume = 0;
    let maxOneRm = 0;
    let totalSessions = 0;
    let weeksWithSessions = 0;

    for (const summary of weeklySummaries) {
      if (summary.avg_volume) {
        totalVolume += summary.avg_volume;
      }
      if (summary.max_one_rm && summary.max_one_rm > maxOneRm) {
        maxOneRm = summary.max_one_rm;
      }
      totalSessions += summary.session_count;
      if (summary.session_count > 0) {
        weeksWithSessions++;
      }
    }

    // Calculate consistency score (0-1) based on workout frequency
    // Assuming 4 weeks in a month, score is fraction of weeks with sessions
    const totalWeeksInMonth = 4; // Approximate
    const consistencyScore = weeksWithSessions / totalWeeksInMonth;

    // Upsert the monthly summary
    await db
      .insert(exerciseMonthlySummary)
      .values({
        user_id: userId,
        exercise_name: exerciseName,
        month_start: monthStart,
        total_volume: totalVolume > 0 ? totalVolume : null,
        max_one_rm: maxOneRm > 0 ? maxOneRm : null,
        session_count: totalSessions,
        consistency_score: consistencyScore,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          exerciseMonthlySummary.user_id,
          exerciseMonthlySummary.exercise_name,
          exerciseMonthlySummary.month_start,
        ],
        set: {
          total_volume: totalVolume > 0 ? totalVolume : null,
          max_one_rm: maxOneRm > 0 ? maxOneRm : null,
          session_count: totalSessions,
          consistency_score: consistencyScore,
          updatedAt: new Date(),
        },
      });

    const duration = Date.now() - startTime;
    logger.debug("Monthly exercise aggregation completed", {
      userId,
      exerciseName,
      monthStart: monthStart.toISOString(),
      weeklySummariesCount: weeklySummaries.length,
      totalVolume,
      consistencyScore,
      durationMs: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Monthly exercise aggregation failed", error, {
      userId,
      exerciseName,
      monthStart: monthStart.toISOString(),
      durationMs: duration,
    });
    throw error;
  }
};

/**
 * Trigger system for real-time aggregation updates
 * Hooks into session creation/update/deletion to maintain data consistency
 */
export class AggregationTrigger {
  private static instance: AggregationTrigger;
  private processing = new Set<string>(); // Track ongoing aggregations to prevent duplicates

  static getInstance(): AggregationTrigger {
    if (!AggregationTrigger.instance) {
      AggregationTrigger.instance = new AggregationTrigger();
    }
    return AggregationTrigger.instance;
  }

  /**
   * Trigger aggregation for a specific session change
   */
  async onSessionChange(sessionId: number, userId: string): Promise<void> {
    try {
      // Get all exercises in this session
      const exercises = await db
        .select({
          resolvedExerciseName: sessionExercises.resolvedExerciseName,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(
          and(
            eq(sessionExercises.sessionId, sessionId),
            eq(sessionExercises.user_id, userId),
          ),
        );

      // Group by exercise and date
      const exerciseDateGroups = new Map<string, Date>();
      for (const exercise of exercises) {
        const key = `${exercise.resolvedExerciseName}|${exercise.workoutDate.toISOString().split("T")[0]}`;
        exerciseDateGroups.set(key, exercise.workoutDate);
      }

      // Trigger daily aggregations in chunks to respect D1 limits
      const exerciseDateEntries = Array.from(exerciseDateGroups.entries());
      await whereInChunks(
        exerciseDateEntries,
        async (chunk) => {
          const aggregationPromises: Promise<void>[] = [];
          for (const [key, workoutDate] of chunk) {
            const [exerciseName] = key.split("|");
            if (!exerciseName) continue;

            const processKey = `daily_${userId}_${exerciseName}_${workoutDate.toISOString().split("T")[0]}`;
            if (this.processing.has(processKey)) continue;

            this.processing.add(processKey);
            aggregationPromises.push(
              this.processDailyAggregation(
                userId,
                exerciseName,
                workoutDate,
                processKey,
              ),
            );
          }

          await Promise.allSettled(aggregationPromises);
        },
        20, // Process 20 exercises at a time to stay well under D1 limits
      );
    } catch (error) {
      logger.error("Session change trigger failed", error, {
        sessionId,
        userId,
      });
    }
  }

  private async processDailyAggregation(
    userId: string,
    exerciseName: string,
    workoutDate: Date,
    processKey: string,
  ): Promise<void> {
    try {
      await aggregateExerciseDaily(userId, exerciseName, workoutDate);

      // Trigger weekly aggregation for the week containing this date
      const weekStart = new Date(workoutDate);
      weekStart.setDate(workoutDate.getDate() - workoutDate.getDay()); // Monday
      weekStart.setHours(0, 0, 0, 0);

      const weeklyKey = `weekly_${userId}_${exerciseName}_${weekStart.toISOString().split("T")[0]}`;
      if (!this.processing.has(weeklyKey)) {
        this.processing.add(weeklyKey);
        await this.processWeeklyAggregation(
          userId,
          exerciseName,
          weekStart,
          weeklyKey,
        );
      }

      // Trigger monthly aggregation for the month containing this date
      const monthStart = new Date(workoutDate);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthlyKey = `monthly_${userId}_${exerciseName}_${monthStart.toISOString().split("T")[0]}`;
      if (!this.processing.has(monthlyKey)) {
        this.processing.add(monthlyKey);
        await this.processMonthlyAggregation(
          userId,
          exerciseName,
          monthStart,
          monthlyKey,
        );
      }
    } finally {
      this.processing.delete(processKey);
    }
  }

  private async processWeeklyAggregation(
    userId: string,
    exerciseName: string,
    weekStart: Date,
    processKey: string,
  ): Promise<void> {
    try {
      await aggregateExerciseWeekly(userId, exerciseName, weekStart);
    } finally {
      this.processing.delete(processKey);
    }
  }

  private async processMonthlyAggregation(
    userId: string,
    exerciseName: string,
    monthStart: Date,
    processKey: string,
  ): Promise<void> {
    try {
      await aggregateExerciseMonthly(userId, exerciseName, monthStart);
    } finally {
      this.processing.delete(processKey);
    }
  }
}

// Export singleton instance
export const aggregationTrigger = AggregationTrigger.getInstance();
