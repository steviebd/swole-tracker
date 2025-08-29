import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ensureUser } from "./users";

/**
 * Insights and Analytics Functions
 * 
 * Provides deep workout insights including exercise-level analytics,
 * session summaries, progression recommendations, and data export capabilities.
 * 
 * Key Features:
 * - Exercise-level insights with progression recommendations
 * - Session summaries and analysis
 * - Volume and strength trend analysis
 * - Performance suggestions based on RPE and rest patterns
 * - CSV export functionality for data analysis
 */

type Unit = "kg" | "lbs";

type ExerciseBestSet = {
  weight?: number;
  reps?: number;
  unit?: Unit;
  sets?: number;
  rpe?: number;
};

type VolumePoint = { 
  date: number; 
  volume: number; 
};

type Recommendation =
  | { type: "weight"; nextWeight: number; rationale: string; unit: Unit }
  | { type: "reps"; nextReps: number; rationale: string; unit: Unit };

type ExerciseInsightsResponse = {
  unit: Unit;
  bestSet?: ExerciseBestSet;
  best1RM?: number;
  volumeSparkline: VolumePoint[];
  recommendation?: Recommendation;
  suggestions: Array<{ kind: "rest" | "rpe" | "volume"; message: string }>;
};

type SessionInsightsResponse = {
  unit: Unit;
  totalVolume: number;
  bestSets: Array<{
    exerciseName: string;
    volume: number;
    bestSet?: { weight?: number; reps?: number | null; unit: Unit };
  }>;
};

type FlatSet = {
  sessionId: string;
  workoutDate: number;
  weight?: number;
  reps?: number | null;
  sets?: number | null;
  unit: Unit;
  rpe?: number | null;
  restSeconds?: number | null;
};

// Helper functions
function toNumber(n: string | number | null | undefined): number | undefined {
  if (n === null || n === undefined) return undefined;
  const v = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(v) ? v : undefined;
}

// Epley 1RM: weight * (1 + reps/30)
function estimate1RM(
  weight: number | undefined,
  reps: number | undefined,
): number | undefined {
  if (!weight || !reps) return undefined;
  return weight * (1 + reps / 30);
}

function compareUnits(
  weight: number | undefined,
  unit: "kg" | "lbs",
  targetUnit: "kg" | "lbs",
): number | undefined {
  if (weight === undefined) return undefined;
  if (unit === targetUnit) return weight;
  return targetUnit === "kg" ? weight / 2.2046226218 : weight * 2.2046226218;
}

// Get linked exercise names for a template exercise
async function getLinkedExerciseNames(
  ctx: any,
  user: any,
  templateExerciseId: string
): Promise<{ exerciseNames: string[]; templateExerciseIds: string[] }> {
  const exerciseLink = await ctx.db
    .query("exerciseLinks")
    .withIndex("by_templateExerciseId", (q: any) => q.eq("templateExerciseId", templateExerciseId))
    .filter((q: Doc<"exerciseLinks">) => q.userId === user._id)
    .unique();

  if (exerciseLink) {
    // Find all template exercises linked to the same master exercise
    const linkedExercises = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_masterExerciseId", (q: any) => q.eq("masterExerciseId", exerciseLink.masterExerciseId))
      .filter((q: any) => q.eq(q.field("userId"), user._id))
      .collect();

    const exerciseData = await Promise.all(
      linkedExercises.map(async (link: any) => {
        const templateExercise = await ctx.db.get(link.templateExerciseId);
        return {
          exerciseName: templateExercise?.exerciseName,
          templateExerciseId: link.templateExerciseId,
        };
      })
    );

    const exerciseNames = exerciseData
      .map(data => data.exerciseName)
      .filter(name => name !== undefined);
    
    const templateExerciseIds = exerciseData.map(data => data.templateExerciseId);

    return { exerciseNames, templateExerciseIds };
  } else {
    // Fallback to getting exercise name from templateExerciseId
    const templateExercise = await ctx.db.get(templateExerciseId);
    return templateExercise 
      ? { exerciseNames: [templateExercise.exerciseName], templateExerciseIds: [templateExerciseId] }
      : { exerciseNames: [], templateExerciseIds: [] };
  }
}

/**
 * Exercise-level insights aggregated from historical sessions
 */
export const getExerciseInsights = query({
  args: {
    exerciseName: v.string(),
    templateExerciseId: v.optional(v.id("templateExercises")),
    unit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
    limitSessions: v.optional(v.number()),
    excludeSessionId: v.optional(v.id("workoutSessions")),
  },
  handler: async (ctx, args): Promise<ExerciseInsightsResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const unit = (args.unit ?? "kg") as Unit;
    const limitSessions = args.limitSessions ?? 10;

    // Resolve linked exercise names/ids via master linking if templateExerciseId provided
    let exerciseNamesToSearch: string[] = [args.exerciseName];
    let templateExerciseIds: string[] | undefined;

    if (args.templateExerciseId) {
      const { exerciseNames, templateExerciseIds: templateIds } = 
        await getLinkedExerciseNames(ctx, user, args.templateExerciseId);
      
      exerciseNamesToSearch = exerciseNames.length > 0 ? exerciseNames : [args.exerciseName];
      templateExerciseIds = templateIds;
    }

    // Fetch recent sessions for the user
    const allSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(limitSessions * 2); // Get more to account for filtering

    // Filter sessions that have the exercises we're looking for
    const recentSessions = [];
    
    for (const session of allSessions) {
      if (args.excludeSessionId && session._id === args.excludeSessionId) {
        continue;
      }

      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .filter((q: any) => {
          if (templateExerciseIds && templateExerciseIds.length > 0) {
            return templateExerciseIds.some(id => q.eq(q.field("templateExerciseId"), id));
          } else {
            return exerciseNamesToSearch.some(name => q.eq(q.field("exerciseName"), name));
          }
        })
        .collect();

      if (sessionExercises.length > 0) {
        recentSessions.push({
          ...session,
          exercises: sessionExercises.sort((a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0)),
        });
      }

      if (recentSessions.length >= limitSessions) {
        break;
      }
    }

    // Flatten sets chronologically and compute metrics
    const flat: FlatSet[] = [];
    for (const s of recentSessions) {
      for (const ex of s.exercises) {
        flat.push({
          sessionId: s._id,
          workoutDate: s.workoutDate,
          weight: toNumber(ex.weight),
          reps: ex.reps,
          sets: ex.sets,
          unit: (ex.unit as Unit) ?? "kg",
          rpe: ex.rpe ?? null,
          restSeconds: ex.restSeconds ?? null,
        });
      }
    }

    // Aggregate per session: total volume, best set by absolute target unit weight, est 1RM best
    const bySession = new Map<
      string,
      {
        date: number;
        volume: number;
        bestWeight?: number;
        bestSet?: ExerciseBestSet;
        est1RM?: number;
      }
    >();

    for (const fs of flat) {
      const weightTarget = compareUnits(fs.weight, fs.unit, unit);
      const vol = (weightTarget ?? 0) * (fs.reps ?? 0);
      const prev = bySession.get(fs.sessionId);
      const est = estimate1RM(weightTarget, fs.reps ?? undefined);
      
      if (!prev) {
        bySession.set(fs.sessionId, {
          date: fs.workoutDate,
          volume: vol,
          bestWeight: weightTarget,
          bestSet: {
            weight: weightTarget,
            reps: fs.reps ?? undefined,
            unit: unit,
            sets: fs.sets ?? undefined,
            rpe: fs.rpe ?? undefined,
          },
          est1RM: est,
        });
      } else {
        prev.volume += vol;
        if ((weightTarget ?? -Infinity) > (prev.bestWeight ?? -Infinity)) {
          prev.bestWeight = weightTarget;
          prev.bestSet = {
            weight: weightTarget,
            reps: fs.reps ?? undefined,
            unit: unit,
            sets: fs.sets ?? undefined,
            rpe: fs.rpe ?? undefined,
          };
        }
        if ((est ?? -Infinity) > (prev.est1RM ?? -Infinity)) {
          prev.est1RM = est;
        }
      }
    }

    // Build sparkline points sorted by date asc
    const sessionsSorted = Array.from(bySession.entries())
      .map(([sessionId, v]) => ({ sessionId, ...v }))
      .sort((a, b) => a.date - b.date);

    const sparkline: VolumePoint[] = sessionsSorted.map((s) => ({
      date: s.date,
      volume: Math.round(s.volume * 100) / 100,
    }));

    // Best overall
    const bestSetOverall = sessionsSorted.reduce<ExerciseBestSet | undefined>(
      (acc, s) => {
        if (!s.bestSet) return acc;
        if (
          !acc ||
          (s.bestSet.weight ?? -Infinity) > (acc.weight ?? -Infinity)
        )
          return s.bestSet;
        return acc;
      },
      undefined,
    );

    const best1RM = sessionsSorted.reduce<number | undefined>((acc, s) => {
      if (s.est1RM === undefined) return acc;
      if (acc === undefined || s.est1RM > acc) return s.est1RM;
      return acc;
    }, undefined);

    // Auto-progression recommendation
    const recentForProgression = sessionsSorted.slice(-3);
    const recentWeights = recentForProgression
      .map((s) => s.bestSet?.weight ?? undefined)
      .filter((w): w is number => typeof w === "number");

    let recommendation: Recommendation | undefined;

    if (recentWeights.length >= 2) {
      const last = recentWeights[recentWeights.length - 1]!;
      const prev = recentWeights[recentWeights.length - 2]!;
      const trendUp = last >= prev;
      
      if (trendUp) {
        if (unit === "kg") {
          const inc = Math.max(0.5, Math.round(last * 0.025 * 2) / 2); // ~2.5% rounded to 0.5
          recommendation = {
            type: "weight",
            nextWeight: Math.round((last + inc) * 2) / 2,
            rationale: "Upward trend; suggest ~2.5% increase",
            unit: unit,
          };
        } else {
          const inc = 5; // lbs plate jump
          recommendation = {
            type: "weight",
            nextWeight: last + inc,
            rationale: "Upward trend; suggest +5 lb",
            unit: unit,
          };
        }
      } else {
        // If not trending up, suggest reps progression
        recommendation = {
          type: "reps",
          nextReps: 1,
          rationale: "Plateau detected; try adding a rep",
          unit: unit,
        };
      }
    }

    // Template tuning suggestions from recent flat sets
    const rpeValues = flat
      .map((f) => (typeof f.rpe === "number" ? f.rpe : undefined))
      .filter((n): n is number => Number.isFinite(n));
    const restValues = flat
      .map((f) =>
        typeof f.restSeconds === "number" ? f.restSeconds : undefined,
      )
      .filter((n): n is number => Number.isFinite(n));

    const suggestions: ExerciseInsightsResponse["suggestions"] = [];
    if (rpeValues.length >= 3) {
      const avgRpe = rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length;
      if (avgRpe >= 9)
        suggestions.push({
          kind: "rpe",
          message:
            "Average RPE is high (≥9). Consider reducing weight or total sets.",
        });
      if (avgRpe <= 6)
        suggestions.push({
          kind: "rpe",
          message:
            "Average RPE is low (≤6). Consider increasing weight or reps to target RPE 7–9.",
        });
    }
    if (restValues.length >= 3) {
      const avgRest =
        restValues.reduce((a, b) => a + b, 0) / restValues.length;
      if (avgRest < 60)
        suggestions.push({
          kind: "rest",
          message:
            "Average rest is short (<60s). Consider increasing rest between sets.",
        });
      if (avgRest > 180)
        suggestions.push({
          kind: "rest",
          message:
            "Average rest is long (>180s). Consider reducing rest to maintain intensity.",
        });
    }
    if (sparkline.length >= 3) {
      const volTrendUp =
        sparkline[sparkline.length - 1]!.volume >= sparkline[0]!.volume;
      if (!volTrendUp)
        suggestions.push({
          kind: "volume",
          message:
            "Training volume trending flat/down. Consider progressive overload plan.",
        });
    }

    return {
      unit: unit,
      bestSet: bestSetOverall,
      best1RM: best1RM ? Math.round(best1RM * 100) / 100 : undefined,
      volumeSparkline: sparkline,
      recommendation,
      suggestions,
    };
  },
});

/**
 * Session insights summary: totals and bests for the given session
 */
export const getSessionInsights = query({
  args: {
    sessionId: v.id("workoutSessions"),
    unit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
  },
  handler: async (ctx, args): Promise<SessionInsightsResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const unit = (args.unit ?? "kg") as Unit;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new ConvexError("Session not found");
    }

    const exercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
      .collect();

    const byExercise = new Map<
      string,
      {
        volume: number;
        bestSet?: { weight?: number; reps?: number | null; unit: Unit };
      }
    >();

    for (const ex of exercises) {
      const key = ex.exerciseName;
      const weight = compareUnits(
        toNumber(ex.weight),
        (ex.unit as "kg" | "lbs") ?? "kg",
        unit,
      );
      const reps = ex.reps ?? 0;
      const vol = (weight ?? 0) * reps;

      const entry = byExercise.get(key) ?? { volume: 0 };
      entry.volume += vol;
      if (
        !entry.bestSet ||
        (weight ?? -Infinity) > (entry.bestSet.weight ?? -Infinity)
      ) {
        entry.bestSet = { weight, reps, unit: unit };
      }
      byExercise.set(key, entry);
    }

    const totalVolume =
      Math.round(
        Array.from(byExercise.values()).reduce((a, b) => a + b.volume, 0) *
          100,
      ) / 100;
    const bestSets = Array.from(byExercise.entries()).map(
      ([exerciseName, v]) => ({ exerciseName, ...v }),
    );

    return { unit: unit, totalVolume, bestSets };
  },
});

/**
 * Export recent workout summaries to CSV
 */
export const exportWorkoutsCSV = query({
  args: {
    since: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const limit = args.limit ?? 50;

    // Get recent sessions
    let sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    if (args.since) {
      sessions = sessions.filter(session => session.workoutDate >= args.since!);
    }

    // Build CSV data
    const rows: string[] = [];
    rows.push(
      [
        "date",
        "sessionId",
        "templateName",
        "exercise",
        "setOrder",
        "weight",
        "reps",
        "sets",
        "unit",
        "rpe",
        "restSeconds",
      ].join(","),
    );

    for (const session of sessions) {
      const template = await ctx.db.get(session.templateId);
      const exercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .collect();

      for (const ex of exercises) {
        const templateName = template?.name ?? "";
        const rpeVal = ex.rpe ?? "";
        const restVal = ex.restSeconds ?? "";

        rows.push(
          [
            new Date(session.workoutDate).toISOString(),
            session._id,
            templateName,
            ex.exerciseName,
            ex.setOrder ?? 0,
            ex.weight ?? "",
            ex.reps ?? "",
            ex.sets ?? "",
            ex.unit ?? "",
            rpeVal,
            restVal,
          ].join(","),
        );
      }
    }

    return {
      filename: "workouts_export.csv",
      mimeType: "text/csv",
      content: rows.join("\n"),
    };
  },
});

/**
 * Get exercise performance trends over time
 */
export const getExercisePerformanceTrends = query({
  args: {
    exerciseName: v.string(),
    templateExerciseId: v.optional(v.id("templateExercises")),
    unit: v.optional(v.union(v.literal("kg"), v.literal("lbs"))),
    limitSessions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const unit = (args.unit ?? "kg") as Unit;
    const limitSessions = args.limitSessions ?? 20;

    // Resolve linked exercise names if templateExerciseId provided
    let exerciseNamesToSearch: string[] = [args.exerciseName];

    if (args.templateExerciseId) {
      const { exerciseNames } = await getLinkedExerciseNames(ctx, user, args.templateExerciseId);
      exerciseNamesToSearch = exerciseNames.length > 0 ? exerciseNames : [args.exerciseName];
    }

    // Get recent sessions with the target exercises
    const allSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(limitSessions * 2);

    const sessionsWithExercises = [];
    
    for (const session of allSessions) {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .filter((q: any) => 
          exerciseNamesToSearch.some(name => q.eq(q.field("exerciseName"), name))
        )
        .collect();

      if (sessionExercises.length > 0) {
        sessionsWithExercises.push({
          ...session,
          exercises: sessionExercises,
        });
      }

      if (sessionsWithExercises.length >= limitSessions) {
        break;
      }
    }

    // Process trend data
    const trendData = sessionsWithExercises
      .sort((a, b) => a.workoutDate - b.workoutDate)
      .map((session) => {
        // Get best set for this session
        const bestExercise = session.exercises.reduce((best, current) => {
          const currentWeight = compareUnits(
            toNumber(current.weight),
            (current.unit as Unit) ?? "kg",
            unit
          ) ?? 0;
          const bestWeight = compareUnits(
            toNumber(best.weight),
            (best.unit as Unit) ?? "kg", 
            unit
          ) ?? 0;
          
          return currentWeight > bestWeight ? current : best;
        });

        const weight = compareUnits(
          toNumber(bestExercise.weight),
          (bestExercise.unit as Unit) ?? "kg",
          unit
        );
        const reps = bestExercise.reps ?? 0;
        const volume = session.exercises.reduce((total, ex) => {
          const exWeight = compareUnits(
            toNumber(ex.weight),
            (ex.unit as Unit) ?? "kg",
            unit
          ) ?? 0;
          return total + (exWeight * (ex.reps ?? 0) * (ex.sets ?? 1));
        }, 0);

        return {
          date: session.workoutDate,
          weight: weight ?? 0,
          reps,
          volume: Math.round(volume * 100) / 100,
          estimatedOneRM: weight ? estimate1RM(weight, reps) : 0,
        };
      });

    return {
      unit,
      trends: trendData,
      exerciseNames: exerciseNamesToSearch,
    };
  },
});

/**
 * Get workout intensity metrics (RPE distribution, rest patterns)
 */
export const getWorkoutIntensityMetrics = query({
  args: {
    sessionId: v.optional(v.id("workoutSessions")),
    timeRange: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("year"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    let sessionExercises: any[] = [];

    if (args.sessionId) {
      // Get data for specific session
      const session = await ctx.db.get(args.sessionId);
      if (!session || session.userId !== user._id) {
        throw new ConvexError("Session not found");
      }

      sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
        .collect();
    } else {
      // Get data for time range
      const timeRange = args.timeRange ?? "month";
      const now = Date.now();
      let startDate: number;

      switch (timeRange) {
        case "week":
          startDate = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = now - (30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = now - (365 * 24 * 60 * 60 * 1000);
          break;
      }

      const sessions = await ctx.db
        .query("workoutSessions")
        .withIndex("by_user_date", (q: any) => q.eq("userId", user._id))
        .filter((q: any) => q.gte(q.field("workoutDate"), startDate))
        .collect();

      for (const session of sessions) {
        const exercises = await ctx.db
          .query("sessionExercises")
          .withIndex("by_sessionId", (q: any) => q.eq("sessionId", session._id))
          .collect();
        sessionExercises.push(...exercises);
      }
    }

    // Calculate RPE distribution
    const rpeData = sessionExercises
      .map(ex => ex.rpe)
      .filter((rpe): rpe is number => typeof rpe === "number" && rpe > 0);

    const rpeDistribution = rpeData.reduce((acc, rpe) => {
      acc[rpe] = (acc[rpe] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Calculate rest time patterns
    const restData = sessionExercises
      .map(ex => ex.restSeconds)
      .filter((rest): rest is number => typeof rest === "number" && rest > 0);

    const avgRestTime = restData.length > 0 
      ? restData.reduce((sum, rest) => sum + rest, 0) / restData.length 
      : 0;

    const restRanges = restData.reduce((acc, rest) => {
      let range: string;
      if (rest < 60) range = "< 60s";
      else if (rest < 120) range = "60-120s";
      else if (rest < 180) range = "120-180s";
      else range = "> 180s";
      
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      rpe: {
        distribution: Object.entries(rpeDistribution).map(([rpe, count]) => ({
          rpe: parseInt(rpe),
          count,
          percentage: (count / rpeData.length) * 100,
        })),
        average: rpeData.length > 0 
          ? rpeData.reduce((sum, rpe) => sum + rpe, 0) / rpeData.length 
          : 0,
        totalSets: rpeData.length,
      },
      rest: {
        distribution: Object.entries(restRanges).map(([range, count]) => ({
          range,
          count,
          percentage: (count / restData.length) * 100,
        })),
        average: Math.round(avgRestTime),
        totalSets: restData.length,
      },
    };
  },
});