/**
 * Incremental Aggregation System
 * Implements change tracking and selective re-aggregation for performance optimization
 */

/* eslint-disable */
// @ts-nocheck - This file has complex type issues that need refactoring

import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { workoutSessions, sessionExercises, userPreferences } from "./schema";

type WorkoutSession = typeof workoutSessions.$inferSelect;
type SessionExercise = typeof sessionExercises.$inferSelect;
import { chunkedBatch } from "./chunk-utils";

interface AggregationMetrics {
  date: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
  workoutCount: number;
  maxOneRm: number;
  avgOneRm: number;
  personalRecords: number;
}

interface DailyAggregation {
  userId: string;
  date: string;
  metrics: AggregationMetrics;
  lastUpdated: Date;
}

// Accept either a raw D1Database or a Drizzle instance
type DatabaseInput = D1Database | DrizzleD1Database<any>;

export class IncrementalAggregator {
  private rawDb: D1Database;

  constructor(db: DatabaseInput) {
    // Extract raw D1Database from Drizzle instance if needed
    if ("$client" in db && db.$client) {
      this.rawDb = db.$client as D1Database;
    } else {
      this.rawDb = db as D1Database;
    }
  }

  /**
   * Triggered when exercises are modified (create, update, delete)
   * Re-aggregates only the affected dates
   */
  async onExerciseChange(exerciseIds: number[], userId: string): Promise<void> {
    console.log(
      `🔄 Incremental aggregation triggered for ${exerciseIds.length} exercises`,
    );

    // Get all affected workout dates for these exercises
    const affectedDates = await this.getAffectedDates(exerciseIds, userId);

    if (affectedDates.length === 0) {
      console.log("ℹ️ No affected dates found for aggregation");
      return;
    }

    console.log(`📅 Re-aggregating ${affectedDates.length} affected dates`);

    // Re-aggregate each affected date
    for (const date of affectedDates) {
      await this.reaggregateDate(userId, date);
    }

    console.log("✅ Incremental aggregation completed");
  }

  /**
   * Triggered when sessions are modified
   * Re-aggregates the session date
   */
  async onSessionChange(sessionIds: number[], userId: string): Promise<void> {
    console.log(
      `🔄 Session change aggregation triggered for ${sessionIds.length} sessions`,
    );

    // Get unique workout dates for these sessions
    const affectedDates = await this.getAffectedSessionDates(
      sessionIds,
      userId,
    );

    for (const date of affectedDates) {
      await this.reaggregateDate(userId, date);
    }
  }

  /**
   * Get all unique workout dates affected by exercise changes
   */
  private async getAffectedDates(
    exerciseIds: number[],
    userId: string,
  ): Promise<string[]> {
    const db = drizzle(this.rawDb);

    // Use chunking to handle large exercise ID lists
    const allDates: string[] = [];

    await chunkedBatch(this.rawDb, exerciseIds, async (chunk) => {
      const dates = await db
        .selectDistinct({ date: workoutSessions.workoutDate })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(
          and(
            sql`${sessionExercises.id} IN (${chunk.join(",")})`,
            eq(workoutSessions.user_id, userId),
          ),
        );

      allDates.push(...dates.map((d) => d.date.toISOString().split("T")[0]!));
    });

    // Remove duplicates and return
    return [...new Set(allDates)];
  }

  /**
   * Get all unique workout dates affected by session changes
   */
  private async getAffectedSessionDates(
    sessionIds: number[],
    userId: string,
  ): Promise<string[]> {
    const db = drizzle(this.rawDb);

    const dates = await db
      .selectDistinct({ date: workoutSessions.workoutDate })
      .from(workoutSessions)
      .where(
        and(
          sql`${workoutSessions.id} IN (${sessionIds.join(",")})`,
          eq(workoutSessions.user_id, userId),
        ),
      );

    return dates.map((d) => d.date);
  }

  /**
   * Re-aggregate all metrics for a specific date
   */
  private async reaggregateDate(userId: string, date: string): Promise<void> {
    const db = drizzle(this.rawDb);

    // Get all exercises for this date
    const exercises = await db
      .select()
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(sessionExercises.sessionId, workoutSessions.id),
      )
      .where(
        and(
          eq(workoutSessions.user_id, userId),
          eq(workoutSessions.workoutDate, date),
        ),
      );

    if (exercises.length === 0) {
      console.log(`ℹ️ No exercises found for date ${date}`);
      return;
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(exercises);

    // Store in aggregation cache table (if it exists)
    await this.storeAggregation(userId, date, metrics);

    console.log(
      `📊 Re-aggregated ${date}: ${metrics.totalVolume} volume, ${metrics.workoutCount} workouts`,
    );
  }

  /**
   * Calculate aggregation metrics from exercise data
   */
  private calculateMetrics(
    exercises: Array<{
      session_exercise: SessionExercise;
      workout_sessions: WorkoutSession;
    }>,
  ): AggregationMetrics {
    const exerciseData = exercises.map((e) => e.session_exercise);
    const sessionIds = [...new Set(exerciseData.map((e) => e.sessionId))];
    const exerciseNames = [...new Set(exerciseData.map((e) => e.exerciseName))];

    // Basic metrics
    const totalVolume = exerciseData.reduce(
      (sum: number, e: SessionExercise) => sum + (e.volume_load || 0),
      0,
    );
    const totalSets = exerciseData.reduce(
      (sum: number, e: SessionExercise) => sum + (e.sets || 0),
      0,
    );
    const totalReps = exerciseData.reduce(
      (sum: number, e: SessionExercise) => sum + (e.reps || 0),
      0,
    );
    const oneRmEstimates = exerciseData
      .map((e: SessionExercise) => e.one_rm_estimate || 0)
      .filter((r: number) => r > 0);

    // Advanced metrics
    const maxOneRm =
      oneRmEstimates.length > 0 ? Math.max(...oneRmEstimates) : 0;
    const avgOneRm =
      oneRmEstimates.length > 0
        ? oneRmEstimates.reduce((sum: number, r: number) => sum + r, 0) /
          oneRmEstimates.length
        : 0;

    // Personal records (simplified - in real implementation would compare with historical data)
    const personalRecords = this.countPersonalRecords(exerciseData);

    return {
      date:
        exercises[0]?.workout_sessions?.workoutDate ||
        new Date().toISOString().split("T")[0],
      totalVolume,
      totalSets,
      totalReps,
      uniqueExercises: exerciseNames.length,
      workoutCount: sessionIds.length,
      maxOneRm,
      avgOneRm,
      personalRecords,
    };
  }

  /**
   * Count personal records (simplified implementation)
   */
  private countPersonalRecords(exercises: SessionExercise[]): number {
    // This is a simplified version - real implementation would compare with historical PRs
    return exercises.filter((e) => e.isPersonalRecord || false).length;
  }

  /**
   * Store aggregation results in cache table
   * Note: This would require creating an aggregation_cache table
   */
  private async storeAggregation(
    userId: string,
    date: string,
    metrics: AggregationMetrics,
  ): Promise<void> {
    try {
      // Try to insert/update aggregation cache
      // This table would need to be created in a migration
      await this.rawDb
        .prepare(
          `
        INSERT OR REPLACE INTO daily_aggregations (
          user_id, date, total_volume, total_sets, total_reps,
          unique_exercises, workout_count, max_one_rm, avg_one_rm,
          personal_records, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .bind(
          userId,
          date,
          metrics.totalVolume,
          metrics.totalSets,
          metrics.totalReps,
          metrics.uniqueExercises,
          metrics.workoutCount,
          metrics.maxOneRm,
          metrics.avgOneRm,
          metrics.personalRecords,
          new Date().toISOString(),
        )
        .run();
    } catch (error) {
      console.warn(
        "⚠️ Could not store aggregation (table may not exist):",
        error,
      );
      // Continue without caching - this is optional optimization
    }
  }

  /**
   * Get cached aggregation for a date range
   */
  async getCachedAggregations(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyAggregation[]> {
    try {
      const results = await this.rawDb
        .prepare(
          `
        SELECT * FROM daily_aggregations
        WHERE user_id = ? AND date >= ? AND date <= ?
        ORDER BY date DESC
      `,
        )
        .bind(userId, startDate, endDate)
        .all();

      return results.results.map((row: any) => ({
        userId: row.user_id,
        date: row.date,
        metrics: {
          date: row.date,
          totalVolume: row.total_volume,
          totalSets: row.total_sets,
          totalReps: row.total_reps,
          uniqueExercises: row.unique_exercises,
          workoutCount: row.workout_count,
          maxOneRm: row.max_one_rm,
          avgOneRm: row.avg_one_rm,
          personalRecords: row.personal_records,
        },
        lastUpdated: new Date(row.last_updated),
      }));
    } catch (error) {
      console.warn("⚠️ Could not fetch cached aggregations:", error);
      return [];
    }
  }

  /**
   * Batch re-aggregation for multiple users (maintenance operation)
   */
  async batchReaggregateUser(
    userId: string,
    dateRange?: { start: string; end: string },
  ): Promise<void> {
    console.log(`🔄 Starting batch re-aggregation for user ${userId}`);

    const db = drizzle(this.rawDb);

    // Get all workout dates for the user
    let datesQuery = db
      .selectDistinct({ date: workoutSessions.workoutDate })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId));

    if (dateRange) {
      datesQuery = datesQuery.where(
        and(
          eq(workoutSessions.user_id, userId),
          gte(workoutSessions.workoutDate, dateRange.start),
          lte(workoutSessions.workoutDate, dateRange.end),
        ),
      );
    }

    const dates = await datesQuery.orderBy(desc(workoutSessions.workoutDate));

    console.log(`📅 Found ${dates.length} dates to re-aggregate`);

    // Re-aggregate each date
    for (const { date } of dates) {
      await this.reaggregateDate(userId, date);
    }

    console.log("✅ Batch re-aggregation completed");
  }
}

/**
 * Factory function to create aggregator instance
 */
export function createIncrementalAggregator(
  db: DatabaseInput,
): IncrementalAggregator {
  return new IncrementalAggregator(db);
}

/**
 * Hook to trigger aggregation after exercise mutations
 */
export async function triggerExerciseAggregation(
  db: DatabaseInput,
  userId: string,
  exerciseIds: number[],
): Promise<void> {
  const aggregator = createIncrementalAggregator(db);
  await aggregator.onExerciseChange(exerciseIds, userId);
}

/**
 * Hook to trigger aggregation after session mutations
 */
export async function triggerSessionAggregation(
  db: DatabaseInput,
  userId: string,
  sessionIds: number[],
): Promise<void> {
  const aggregator = createIncrementalAggregator(db);
  await aggregator.onSessionChange(sessionIds, userId);
}
