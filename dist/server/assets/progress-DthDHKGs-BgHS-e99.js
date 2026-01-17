import { c as createServerRpc } from "./createServerRpc-Bd3B-Ah9-C8t3QJ6i.js";
import { s as sql, b as workoutSessions, a as and, g as gte, e as eq, h as sessionExercises, d as desc, c as asc } from "./session-cookie-y6_dLywe-dJqk9W7A.js";
import { w as withAuth } from "./middleware-C0nuZrz9-3s0fDIfv.js";
import { c as createServerFn } from "./worker-entry-_S0z7k3x.js";
import { o as object, _ as _enum, n as number, s as string } from "./schemas-Dk_VZEFo.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
const getDashboardData_createServerFn_handler = createServerRpc({
  id: "fb9289d5f779a5b4fe996fda782a2a89cf001ef5c7784996bd171189ae6ff197",
  name: "getDashboardData",
  filename: "src/server/functions/progress.ts"
}, (opts, signal) => getDashboardData.__executeServer(opts, signal));
const getDashboardData = createServerFn({
  method: "GET"
}).inputValidator(object({
  timeRange: _enum(["week", "month", "quarter", "year"]).default("week")
})).middleware([withAuth]).handler(getDashboardData_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    timeRange
  } = data;
  const now = /* @__PURE__ */ new Date();
  let startDate;
  switch (timeRange) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
      break;
    case "quarter":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1e3);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
  }
  const workoutCount = await db.select({
    count: sql`count(*)`
  }).from(workoutSessions).where(and(eq(workoutSessions.user_id, user.id), gte(workoutSessions.workoutDate, startDate)));
  const totalVolume = await db.select({
    total: sql`COALESCE(SUM(volume_load), 0)`
  }).from(sessionExercises).innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id)).where(and(eq(sessionExercises.user_id, user.id), gte(workoutSessions.workoutDate, startDate)));
  return {
    workoutCount: workoutCount[0]?.count ?? 0,
    totalVolume: Number(totalVolume[0]?.total ?? 0),
    timeRange
  };
});
const getStreak_createServerFn_handler = createServerRpc({
  id: "1e14bf6fa850eab3da2983181b6c078e78ae6ee93480ffdef1d1ef2db4c8b139",
  name: "getStreak",
  filename: "src/server/functions/progress.ts"
}, (opts, signal) => getStreak.__executeServer(opts, signal));
const getStreak = createServerFn({
  method: "GET"
}).middleware([withAuth]).handler(getStreak_createServerFn_handler, async ({
  context
}) => {
  const {
    db,
    user
  } = context;
  const recentWorkouts = await db.select({
    workoutDate: workoutSessions.workoutDate
  }).from(workoutSessions).where(eq(workoutSessions.user_id, user.id)).orderBy(desc(workoutSessions.workoutDate)).limit(30);
  if (recentWorkouts.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0
    };
  }
  let currentStreak = 0;
  let longestStreak = 0;
  let lastDate = null;
  const sortedDates = recentWorkouts.map((w) => w.workoutDate).sort((a, b) => b.getTime() - a.getTime());
  for (const workoutDate of sortedDates) {
    if (!lastDate) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const workoutDay = new Date(workoutDate);
      workoutDay.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - workoutDay.getTime()) / (24 * 60 * 60 * 1e3));
      if (daysDiff <= 1) {
        currentStreak = 1;
        lastDate = workoutDate;
      }
    } else {
      const diffDays = Math.floor((lastDate.getTime() - workoutDate.getTime()) / (24 * 60 * 60 * 1e3));
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
    longestStreak
  };
});
const getRecentPRs_createServerFn_handler = createServerRpc({
  id: "fba5bbdf75b6c8fe864c747a76a1f856f96ca561b924d5e8cc9038fa840b030e",
  name: "getRecentPRs",
  filename: "src/server/functions/progress.ts"
}, (opts, signal) => getRecentPRs.__executeServer(opts, signal));
const getRecentPRs = createServerFn({
  method: "GET"
}).inputValidator(object({
  limit: number().int().positive().default(10)
})).middleware([withAuth]).handler(getRecentPRs_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    limit
  } = data ?? {
    limit: 10
  };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3);
  const workouts = await db.select({
    sessionId: workoutSessions.id,
    workoutDate: workoutSessions.workoutDate,
    exerciseName: sessionExercises.exerciseName,
    weight: sessionExercises.weight,
    reps: sessionExercises.reps,
    sets: sessionExercises.sets,
    one_rm_estimate: sessionExercises.one_rm_estimate
  }).from(sessionExercises).innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id)).where(and(eq(sessionExercises.user_id, user.id), gte(workoutSessions.workoutDate, thirtyDaysAgo), sql`${sessionExercises.one_rm_estimate} IS NOT NULL`)).orderBy(desc(workoutSessions.workoutDate)).limit(limit * 10);
  const exerciseMaxes = /* @__PURE__ */ new Map();
  for (const workout of workouts) {
    const key = workout.exerciseName;
    const current = exerciseMaxes.get(key);
    if (!current || workout.one_rm_estimate && workout.one_rm_estimate > current.weight) {
      exerciseMaxes.set(key, {
        weight: workout.one_rm_estimate ?? workout.weight ?? 0,
        date: workout.workoutDate
      });
    }
  }
  return Array.from(exerciseMaxes.entries()).map(([name, data2]) => ({
    exerciseName: name,
    weight: data2.weight,
    date: data2.date
  })).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
});
const getHistory_createServerFn_handler = createServerRpc({
  id: "079855d19e1ff5225c05565ca213488718d6f8da115ef1b8e4cc1d49d5489473",
  name: "getHistory",
  filename: "src/server/functions/progress.ts"
}, (opts, signal) => getHistory.__executeServer(opts, signal));
const getHistory = createServerFn({
  method: "GET"
}).inputValidator(object({
  limit: number().int().positive().default(50),
  offset: number().int().nonnegative().default(0)
})).middleware([withAuth]).handler(getHistory_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    limit,
    offset
  } = data ?? {
    limit: 50,
    offset: 0
  };
  const sessions = await db.select({
    id: workoutSessions.id,
    workoutDate: workoutSessions.workoutDate,
    templateId: workoutSessions.templateId,
    createdAt: workoutSessions.createdAt
  }).from(workoutSessions).where(eq(workoutSessions.user_id, user.id)).orderBy(desc(workoutSessions.workoutDate)).limit(limit).offset(offset);
  return sessions;
});
const getStrengthProgression_createServerFn_handler = createServerRpc({
  id: "83888141dfd73b0a1c0f79aa79bd1600706606070498fabb003413f49cea2a8c",
  name: "getStrengthProgression",
  filename: "src/server/functions/progress.ts"
}, (opts, signal) => getStrengthProgression.__executeServer(opts, signal));
const getStrengthProgression = createServerFn({
  method: "GET"
}).inputValidator(object({
  exerciseName: string().min(1).optional(),
  timeRange: _enum(["week", "month", "quarter", "year"]).default("month"),
  limit: number().int().positive().default(100)
})).middleware([withAuth]).handler(getStrengthProgression_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    exerciseName,
    timeRange,
    limit
  } = data ?? {
    timeRange: "month",
    limit: 100
  };
  const now = /* @__PURE__ */ new Date();
  let startDate;
  switch (timeRange) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
      break;
    case "quarter":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1e3);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1e3);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
  }
  const baseWhere = and(eq(sessionExercises.user_id, user.id), gte(workoutSessions.workoutDate, startDate), sql`${sessionExercises.weight} IS NOT NULL`);
  let results;
  if (exerciseName) {
    const whereWithExercise = and(baseWhere, eq(sessionExercises.exerciseName, exerciseName));
    results = await db.select({
      workoutDate: workoutSessions.workoutDate,
      exerciseName: sessionExercises.exerciseName,
      maxWeight: sql`MAX(${sessionExercises.weight})`,
      totalVolume: sql`SUM(${sessionExercises.volume_load})`,
      one_rm_estimate: sql`MAX(${sessionExercises.one_rm_estimate})`
    }).from(sessionExercises).innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id)).where(whereWithExercise).groupBy(sessionExercises.exerciseName, workoutSessions.workoutDate).orderBy(asc(workoutSessions.workoutDate)).limit(limit);
  } else {
    results = await db.select({
      workoutDate: workoutSessions.workoutDate,
      exerciseName: sessionExercises.exerciseName,
      maxWeight: sql`MAX(${sessionExercises.weight})`,
      totalVolume: sql`SUM(${sessionExercises.volume_load})`,
      one_rm_estimate: sql`MAX(${sessionExercises.one_rm_estimate})`
    }).from(sessionExercises).innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id)).where(baseWhere).groupBy(sessionExercises.exerciseName, workoutSessions.workoutDate).orderBy(asc(workoutSessions.workoutDate)).limit(limit);
  }
  return results.map((r) => ({
    date: r.workoutDate,
    exerciseName: r.exerciseName,
    maxWeight: r.maxWeight,
    totalVolume: Number(r.totalVolume ?? 0),
    oneRmEstimate: r.one_rm_estimate
  }));
});
const getTopSets_createServerFn_handler = createServerRpc({
  id: "bda7246fac0ad307a8cf9255a9691c443e17c910bceb81910bfd30657d0675c2",
  name: "getTopSets",
  filename: "src/server/functions/progress.ts"
}, (opts, signal) => getTopSets.__executeServer(opts, signal));
const getTopSets = createServerFn({
  method: "GET"
}).inputValidator(object({
  exerciseName: string().optional(),
  limit: number().int().positive().default(10)
})).middleware([withAuth]).handler(getTopSets_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    exerciseName,
    limit
  } = data ?? {
    limit: 10
  };
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3);
  const baseWhere = and(eq(sessionExercises.user_id, user.id), gte(workoutSessions.workoutDate, oneYearAgo), sql`${sessionExercises.one_rm_estimate} IS NOT NULL`);
  let results;
  if (exerciseName) {
    const whereWithExercise = and(baseWhere, eq(sessionExercises.exerciseName, exerciseName));
    results = await db.select({
      exerciseName: sessionExercises.exerciseName,
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      sets: sessionExercises.sets,
      one_rm_estimate: sessionExercises.one_rm_estimate,
      workoutDate: workoutSessions.workoutDate
    }).from(sessionExercises).innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id)).where(whereWithExercise).orderBy(desc(sessionExercises.one_rm_estimate)).limit(limit * 2);
  } else {
    results = await db.select({
      exerciseName: sessionExercises.exerciseName,
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      sets: sessionExercises.sets,
      one_rm_estimate: sessionExercises.one_rm_estimate,
      workoutDate: workoutSessions.workoutDate
    }).from(sessionExercises).innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id)).where(baseWhere).orderBy(desc(sessionExercises.one_rm_estimate)).limit(limit * 2);
  }
  const seen = /* @__PURE__ */ new Set();
  const topSets = [];
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
export {
  getDashboardData_createServerFn_handler,
  getHistory_createServerFn_handler,
  getRecentPRs_createServerFn_handler,
  getStreak_createServerFn_handler,
  getStrengthProgression_createServerFn_handler,
  getTopSets_createServerFn_handler
};
