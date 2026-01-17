import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { workoutSessions, sessionExercises } from "~/server/db/schema";
import { eq, and, desc, asc, gte, sql } from "drizzle-orm";
import { withAuth } from "./middleware";

// === GET DASHBOARD DATA ===
export const getDashboardData = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      timeRange: z.enum(["week", "month", "quarter", "year"]).default("week"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { timeRange } = data;

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const workoutCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.user_id, user.id),
          gte(workoutSessions.workoutDate, startDate),
        ),
      );

    const totalVolume = await db
      .select({ total: sql<number>`COALESCE(SUM(volume_load), 0)` })
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
      );

    return {
      workoutCount: workoutCount[0]?.count ?? 0,
      totalVolume: Number(totalVolume[0]?.total ?? 0),
      timeRange,
    };
  });

// === GET STREAK ===
export const getStreak = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const recentWorkouts = await db
      .select({ workoutDate: workoutSessions.workoutDate })
      .from(workoutSessions)
      .where(eq(workoutSessions.user_id, user.id))
      .orderBy(desc(workoutSessions.workoutDate))
      .limit(30);

    if (recentWorkouts.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate: Date | null = null;

    const sortedDates = recentWorkouts
      .map((w) => w.workoutDate)
      .sort((a, b) => b.getTime() - a.getTime());

    for (const workoutDate of sortedDates) {
      if (!lastDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const workoutDay = new Date(workoutDate);
        workoutDay.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor(
          (today.getTime() - workoutDay.getTime()) / (24 * 60 * 60 * 1000),
        );

        if (daysDiff <= 1) {
          currentStreak = 1;
          lastDate = workoutDate;
        }
      } else {
        const diffDays = Math.floor(
          (lastDate.getTime() - workoutDate.getTime()) / (24 * 60 * 60 * 1000),
        );

        if (diffDays === 1) {
          currentStreak++;
          lastDate = workoutDate;
        } else if (diffDays > 1) {
          break;
        }
      }
    }

    longestStreak = currentStreak;

    return {
      currentStreak,
      longestStreak,
    };
  });

// === GET RECENT PERSONAL RECORDS ===
export const getRecentPRs = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().default(10),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { limit } = data ?? { limit: 10 };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const workouts = await db
      .select({
        sessionId: workoutSessions.id,
        workoutDate: workoutSessions.workoutDate,
        exerciseName: sessionExercises.exerciseName,
        weight: sessionExercises.weight,
        reps: sessionExercises.reps,
        sets: sessionExercises.sets,
        one_rm_estimate: sessionExercises.one_rm_estimate,
      })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(sessionExercises.sessionId, workoutSessions.id),
      )
      .where(
        and(
          eq(sessionExercises.user_id, user.id),
          gte(workoutSessions.workoutDate, thirtyDaysAgo),
          sql`${sessionExercises.one_rm_estimate} IS NOT NULL`,
        ),
      )
      .orderBy(desc(workoutSessions.workoutDate))
      .limit(limit * 10);

    const exerciseMaxes = new Map<string, { weight: number; date: Date }>();

    for (const workout of workouts) {
      const key = workout.exerciseName;
      const current = exerciseMaxes.get(key);

      if (
        !current ||
        (workout.one_rm_estimate && workout.one_rm_estimate > current.weight)
      ) {
        exerciseMaxes.set(key, {
          weight: workout.one_rm_estimate ?? workout.weight ?? 0,
          date: workout.workoutDate,
        });
      }
    }

    return Array.from(exerciseMaxes.entries())
      .map(([name, data]) => ({
        exerciseName: name,
        weight: data.weight,
        date: data.date,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  });

// === GET WORKOUT HISTORY ===
export const getHistory = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().default(50),
      offset: z.number().int().nonnegative().default(0),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { limit, offset } = data ?? { limit: 50, offset: 0 };

    const sessions = await db
      .select({
        id: workoutSessions.id,
        workoutDate: workoutSessions.workoutDate,
        templateId: workoutSessions.templateId,
        createdAt: workoutSessions.createdAt,
      })
      .from(workoutSessions)
      .where(eq(workoutSessions.user_id, user.id))
      .orderBy(desc(workoutSessions.workoutDate))
      .limit(limit)
      .offset(offset);

    return sessions;
  });

// === GET STRENGTH PROGRESSION ===
export const getStrengthProgression = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      exerciseName: z.string().min(1).optional(),
      timeRange: z.enum(["week", "month", "quarter", "year"]).default("month"),
      limit: z.number().int().positive().default(100),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { exerciseName, timeRange, limit } = data ?? {
      timeRange: "month",
      limit: 100,
    };

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const baseWhere = and(
      eq(sessionExercises.user_id, user.id),
      gte(workoutSessions.workoutDate, startDate),
      sql`${sessionExercises.weight} IS NOT NULL`,
    );

    let results;
    if (exerciseName) {
      const whereWithExercise = and(
        baseWhere,
        eq(sessionExercises.exerciseName, exerciseName),
      );
      results = await db
        .select({
          workoutDate: workoutSessions.workoutDate,
          exerciseName: sessionExercises.exerciseName,
          maxWeight: sql<number>`MAX(${sessionExercises.weight})`,
          totalVolume: sql<number>`SUM(${sessionExercises.volume_load})`,
          one_rm_estimate: sql<number>`MAX(${sessionExercises.one_rm_estimate})`,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(whereWithExercise)
        .groupBy(sessionExercises.exerciseName, workoutSessions.workoutDate)
        .orderBy(asc(workoutSessions.workoutDate))
        .limit(limit);
    } else {
      results = await db
        .select({
          workoutDate: workoutSessions.workoutDate,
          exerciseName: sessionExercises.exerciseName,
          maxWeight: sql<number>`MAX(${sessionExercises.weight})`,
          totalVolume: sql<number>`SUM(${sessionExercises.volume_load})`,
          one_rm_estimate: sql<number>`MAX(${sessionExercises.one_rm_estimate})`,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(baseWhere)
        .groupBy(sessionExercises.exerciseName, workoutSessions.workoutDate)
        .orderBy(asc(workoutSessions.workoutDate))
        .limit(limit);
    }

    return results.map((r) => ({
      date: r.workoutDate,
      exerciseName: r.exerciseName,
      maxWeight: r.maxWeight,
      totalVolume: Number(r.totalVolume ?? 0),
      oneRmEstimate: r.one_rm_estimate,
    }));
  });

// === GET TOP SETS ===
export const getTopSets = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      exerciseName: z.string().optional(),
      limit: z.number().int().positive().default(10),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { exerciseName, limit } = data ?? { limit: 10 };

    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const baseWhere = and(
      eq(sessionExercises.user_id, user.id),
      gte(workoutSessions.workoutDate, oneYearAgo),
      sql`${sessionExercises.one_rm_estimate} IS NOT NULL`,
    );

    let results;
    if (exerciseName) {
      const whereWithExercise = and(
        baseWhere,
        eq(sessionExercises.exerciseName, exerciseName),
      );
      results = await db
        .select({
          exerciseName: sessionExercises.exerciseName,
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          one_rm_estimate: sessionExercises.one_rm_estimate,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(whereWithExercise)
        .orderBy(desc(sessionExercises.one_rm_estimate))
        .limit(limit * 2);
    } else {
      results = await db
        .select({
          exerciseName: sessionExercises.exerciseName,
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          one_rm_estimate: sessionExercises.one_rm_estimate,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(sessionExercises.sessionId, workoutSessions.id),
        )
        .where(baseWhere)
        .orderBy(desc(sessionExercises.one_rm_estimate))
        .limit(limit * 2);
    }

    const seen = new Set<string>();
    const topSets: typeof results = [];

    for (const set of results) {
      const key = `${set.exerciseName}-${set.weight}-${set.reps}`;
      if (!seen.has(key)) {
        seen.add(key);
        topSets.push(set);
      }
      if (topSets.length >= limit) break;
    }

    return topSets;
  });
