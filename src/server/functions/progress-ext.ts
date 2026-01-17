import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { workoutSessions, sessionExercises } from "~/server/db/schema";
import { eq, and, gte, sql, desc, asc } from "drizzle-orm";
import { withAuth } from "./middleware";

function getDateRange(timeRange: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (timeRange) {
    case "week":
      start.setDate(end.getDate() - 7);
      break;
    case "month":
      start.setMonth(end.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(end.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setMonth(end.getMonth() - 1);
  }

  return { startDate: start, endDate: end };
}

// === GET VOLUME PROGRESSION ===
export const getVolumeProgression = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      exerciseName: z.string().optional(),
      timeRange: z.enum(["week", "month", "quarter", "year"]).default("month"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { exerciseName, timeRange } = data ?? { timeRange: "month" };

    const { startDate, endDate } = getDateRange(timeRange);

    const baseWhere = and(
      eq(sessionExercises.user_id, user.id),
      gte(workoutSessions.workoutDate, startDate),
      sql`${sessionExercises.volume_load} IS NOT NULL`,
    );

    let results;
    if (exerciseName) {
      results = await db
        .select({
          date: workoutSessions.workoutDate,
          exerciseName: sessionExercises.exerciseName,
          totalVolume: sql<number>`SUM(${sessionExercises.volume_load})`,
          sessionCount: sql<number>`COUNT(*)`,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(and(baseWhere, eq(sessionExercises.exerciseName, exerciseName)))
        .groupBy(sessionExercises.exerciseName, workoutSessions.workoutDate)
        .orderBy(asc(workoutSessions.workoutDate));
    } else {
      results = await db
        .select({
          date: workoutSessions.workoutDate,
          exerciseName: sessionExercises.exerciseName,
          totalVolume: sql<number>`SUM(${sessionExercises.volume_load})`,
          sessionCount: sql<number>`COUNT(*)`,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(baseWhere)
        .groupBy(sessionExercises.exerciseName, workoutSessions.workoutDate)
        .orderBy(asc(workoutSessions.workoutDate));
    }

    return results.map((r) => ({
      date: r.date,
      exerciseName: r.exerciseName,
      totalVolume: Number(r.totalVolume ?? 0),
      sessionCount: Number(r.sessionCount ?? 0),
    }));
  });

// === GET TOP EXERCISES ===
export const getTopExercises = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      timeRange: z.enum(["week", "month", "quarter", "year"]).default("month"),
      limit: z.number().int().positive().default(10),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { timeRange, limit } = data ?? { timeRange: "month", limit: 10 };

    const { startDate } = getDateRange(timeRange);

    const results = await db
      .select({
        exerciseName: sql<string>`COALESCE(NULLIF(${sessionExercises.resolvedExerciseName}, ''), ${sessionExercises.exerciseName})`,
        sessionCount: sql<number>`COUNT(DISTINCT ${workoutSessions.workoutDate})`,
        totalVolume: sql<number>`COALESCE(SUM(${sessionExercises.volume_load}), 0)`,
        lastWorkoutDate: sql<Date | null>`MAX(${workoutSessions.workoutDate})`,
      })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(sessionExercises.sessionId, workoutSessions.id),
      )
      .where(
        and(
          eq(sessionExercises.user_id, user.id),
          gte(workoutSessions.workoutDate, startDate),
        ),
      )
      .groupBy(
        sql`COALESCE(NULLIF(${sessionExercises.resolvedExerciseName}, ''), ${sessionExercises.exerciseName})`,
      )
      .orderBy(desc(sql`COUNT(DISTINCT ${workoutSessions.workoutDate})`))
      .limit(limit);

    return results.map((r) => ({
      exerciseName: r.exerciseName,
      sessionCount: Number(r.sessionCount ?? 0),
      totalVolume: Number(r.totalVolume ?? 0),
      lastWorkoutDate: r.lastWorkoutDate,
    }));
  });

// === GET PERSONAL RECORDS ===
export const getPersonalRecords = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      exerciseName: z.string().optional(),
      timeRange: z
        .enum(["week", "month", "quarter", "year", "all"])
        .default("all"),
      recordType: z.enum(["weight", "volume", "1rm", "both"]).default("both"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { exerciseName, timeRange, recordType } = data ?? {
      timeRange: "all",
      recordType: "both",
    };

    let startDate: Date | undefined;
    if (timeRange !== "all") {
      const range = getDateRange(timeRange);
      startDate = range.startDate;
    }

    const baseWhere = and(
      eq(sessionExercises.user_id, user.id),
      sql`${sessionExercises.weight} IS NOT NULL`,
    );

    let whereClause = startDate
      ? and(baseWhere, gte(workoutSessions.workoutDate, startDate))
      : baseWhere;

    let whereWithExercise = exerciseName
      ? and(whereClause, eq(sessionExercises.exerciseName, exerciseName))
      : whereClause;

    const results = await db
      .select({
        exerciseName: sessionExercises.exerciseName,
        maxWeight: sql<number>`MAX(${sessionExercises.weight})`,
        maxReps: sql<number>`MAX(${sessionExercises.reps})`,
        max1RM: sql<number>`MAX(${sessionExercises.one_rm_estimate})`,
        maxVolume: sql<number>`MAX(${sessionExercises.volume_load})`,
        workoutDate: sql<Date>`MAX(${workoutSessions.workoutDate})`,
      })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(sessionExercises.sessionId, workoutSessions.id),
      )
      .where(whereWithExercise)
      .groupBy(sessionExercises.exerciseName);

    return results
      .filter((r) => r.maxWeight !== null)
      .map((r) => ({
        exerciseName: r.exerciseName,
        maxWeight: Number(r.maxWeight ?? 0),
        maxReps: Number(r.maxReps ?? 0),
        max1RM: Number(r.max1RM ?? 0),
        maxVolume: Number(r.maxVolume ?? 0),
        lastAchieved: r.workoutDate,
      }));
  });

// === GET PROGRESS HIGHLIGHTS ===
export const getProgressHighlights = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      timeRange: z.enum(["week", "month", "year"]).default("month"),
      tab: z.enum(["prs", "milestones", "streaks"]).default("prs"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { timeRange, tab } = data ?? { timeRange: "month", tab: "prs" };

    const { startDate } = getDateRange(timeRange);

    if (tab === "prs") {
      const prs = await db
        .select({
          exerciseName: sessionExercises.exerciseName,
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          one_rm_estimate: sessionExercises.one_rm_estimate,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(
          and(
            eq(sessionExercises.user_id, user.id),
            gte(workoutSessions.workoutDate, startDate),
            sql`${sessionExercises.one_rm_estimate} IS NOT NULL`,
          ),
        )
        .orderBy(desc(workoutSessions.workoutDate))
        .limit(50);

      const exercisePRs = new Map<
        string,
        { weight: number; reps: number; date: Date }
      >();

      for (const pr of prs) {
        const key = pr.exerciseName;
        const existing = exercisePRs.get(key);
        const oneRM = pr.one_rm_estimate ?? pr.weight ?? 0;

        if (!existing || (oneRM && oneRM > existing.weight)) {
          exercisePRs.set(key, {
            weight: oneRM,
            reps: pr.reps ?? 0,
            date: pr.workoutDate,
          });
        }
      }

      return {
        tab: "prs" as const,
        records: Array.from(exercisePRs.entries()).map(([name, data]) => ({
          exerciseName: name,
          ...data,
        })),
      };
    }

    if (tab === "streaks") {
      const workouts = await db
        .select({ workoutDate: workoutSessions.workoutDate })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.user_id, user.id),
            gte(workoutSessions.workoutDate, startDate),
          ),
        )
        .orderBy(desc(workoutSessions.workoutDate));

      const workoutDates = workouts.map((w) => w.workoutDate);
      const uniqueDates = [
        ...new Set(workoutDates.map((d) => d.toDateString())),
      ];
      const sortedDates = uniqueDates
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

      let currentStreak = 0;
      let longestStreak = 0;
      let lastDate: Date | null = null;

      for (const date of sortedDates) {
        if (!lastDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const workoutDay = new Date(date);
          workoutDay.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor(
            (today.getTime() - workoutDay.getTime()) / (24 * 60 * 60 * 1000),
          );

          if (daysDiff <= 1) {
            currentStreak = 1;
            lastDate = date;
          }
        } else {
          const diffDays = Math.floor(
            (lastDate.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
          );

          if (diffDays === 1) {
            currentStreak++;
            lastDate = date;
          } else if (diffDays > 1) {
            break;
          }
        }
      }

      longestStreak = currentStreak;

      return {
        tab: "streaks" as const,
        currentStreak,
        longestStreak,
        totalWorkouts: workoutDates.length,
      };
    }

    return {
      tab: "milestones" as const,
      milestones: [],
      totalCount: 0,
      achievedCount: 0,
      upcomingCount: 0,
    };
  });

// === GET CONSISTENCY ===
export const getConsistency = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      timeRange: z.enum(["week", "month", "quarter", "year"]).default("month"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { timeRange } = data ?? { timeRange: "month" };

    const { startDate, endDate } = getDateRange(timeRange);

    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const weeks = Math.max(1, totalDays / 7);

    const workouts = await db
      .select({
        workoutDate: workoutSessions.workoutDate,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.user_id, user.id),
          gte(workoutSessions.workoutDate, startDate),
        ),
      );

    const uniqueWorkoutDates = new Set(
      workouts.map((w) => w.workoutDate.toDateString()),
    );
    const workoutCount = uniqueWorkoutDates.size;

    const frequency = Math.round((workoutCount / weeks) * 10) / 10;

    const consistencyScore = Math.min(
      100,
      Math.round((workoutCount / 7) * 100),
    );

    return {
      workoutCount,
      frequency,
      consistencyScore,
      timeRange,
      totalDays,
    };
  });
