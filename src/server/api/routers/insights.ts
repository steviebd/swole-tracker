import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  workoutSessions,
  sessionExercises,
  templateExercises,
  exerciseLinks,
} from "~/server/db/schema";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";

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

type Unit = "kg" | "lbs";

type ExerciseBestSet = {
  weight?: number;
  reps?: number;
  unit?: Unit;
  sets?: number;
  rpe?: number;
};

type VolumePoint = { date: Date; volume: number };

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
  sessionId: number;
  workoutDate: Date;
  weight?: number;
  reps?: number | null;
  sets?: number | null;
  unit: Unit;
  rpe?: number | null;
  rest_seconds?: number | null;
};

export const insightsRouter = createTRPCRouter({
  // Exercise-level insights aggregated from historical sessions
  getExerciseInsights: protectedProcedure
    .input(
      z.object({
        exerciseName: z.string().min(1),
        templateExerciseId: z.number().optional(),
        unit: z.enum(["kg", "lbs"]).default("kg"),
        limitSessions: z.number().int().positive().max(50).default(10),
        excludeSessionId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }): Promise<ExerciseInsightsResponse> => {
      try {
        // Resolve linked exercise names/ids via master linking if templateExerciseId provided
        let exerciseNamesToSearch: string[] = [input.exerciseName];
        let templateExerciseIds: number[] | undefined;

        if (input.templateExerciseId) {
          const link = await ctx.db.query.exerciseLinks.findFirst({
            where: and(
              eq(exerciseLinks.templateExerciseId, input.templateExerciseId),
              eq(exerciseLinks.user_id, ctx.user.id),
            ),
            with: { masterExercise: true },
          });

          if (link) {
            const linked = await ctx.db.query.exerciseLinks.findMany({
              where: and(
                eq(exerciseLinks.masterExerciseId, link.masterExerciseId),
                eq(exerciseLinks.user_id, ctx.user.id),
              ),
              with: { templateExercise: true },
            });
            const extractedNames = linked
              .map((l) => {
                const template = l.templateExercise;
                if (
                  template &&
                  typeof template === "object" &&
                  !Array.isArray(template) &&
                  typeof (template as { exerciseName?: unknown })
                    .exerciseName === "string"
                ) {
                  return (template as { exerciseName: string }).exerciseName;
                }
                return null;
              })
              .filter((name): name is string => typeof name === "string");

            exerciseNamesToSearch = extractedNames.length
              ? extractedNames
              : [input.exerciseName];
            templateExerciseIds = linked.map((l) => l.templateExerciseId);
          } else {
            // Fallback to name of provided template exercise
            const te = await ctx.db.query.templateExercises.findFirst({
              where: and(
                eq(templateExercises.id, input.templateExerciseId),
                eq(templateExercises.user_id, ctx.user.id),
              ),
            });
            if (te) exerciseNamesToSearch = [te.exerciseName];
          }
        }

        // Build filters
        const sessionWhere = [
          eq(workoutSessions.user_id, ctx.user.id),
        ] as Parameters<typeof and>[number][];
        if (input.excludeSessionId)
          sessionWhere.push(ne(workoutSessions.id, input.excludeSessionId));

        // Fetch recent sessions for the user
        let recentSessions: any[] = [];

        // Only proceed if we have exercises to search for
        if (
          exerciseNamesToSearch.length > 0 ||
          (templateExerciseIds && templateExerciseIds.length > 0)
        ) {
          recentSessions = await ctx.db.query.workoutSessions.findMany({
            where: and(...sessionWhere),
            orderBy: [desc(workoutSessions.workoutDate)],
            limit: input.limitSessions,
            with: {
              exercises: {
                where:
                  templateExerciseIds && templateExerciseIds.length > 0
                    ? inArray(
                        sessionExercises.templateExerciseId,
                        templateExerciseIds,
                      )
                    : exerciseNamesToSearch.length > 0
                      ? inArray(
                          sessionExercises.exerciseName,
                          exerciseNamesToSearch,
                        )
                      : undefined,
              },
            },
          });
        }

        // Flatten sets chronologically (per session order) and compute metrics
        const flat: FlatSet[] = [];
        for (const s of recentSessions) {
          if (!s.exercises || !Array.isArray(s.exercises)) {
            console.warn(
              `Session ${s.id} has no exercises or exercises is not an array`,
            );
            continue;
          }
          for (const ex of s.exercises.sort(
            (a: any, b: any) => (a.setOrder ?? 0) - (b.setOrder ?? 0),
          )) {
            if (!ex) {
              console.warn(`Null exercise found in session ${s.id}`);
              continue;
            }
            flat.push({
              sessionId: s.id,
              workoutDate: s.workoutDate,
              weight: toNumber(ex.weight),
              reps: ex.reps,
              sets: ex.sets,
              unit: (ex.unit as Unit) ?? "kg",
              rpe:
                typeof (ex as { rpe?: unknown }).rpe === "number"
                  ? (ex as { rpe?: number }).rpe
                  : null,
              rest_seconds:
                typeof (ex as { rest_seconds?: unknown }).rest_seconds ===
                "number"
                  ? (ex as { rest_seconds?: number }).rest_seconds
                  : null,
            });
          }
        }

        // Aggregate per session: total volume, best set by absolute target unit weight, est 1RM best
        const bySession = new Map<
          number,
          {
            date: Date;
            volume: number;
            bestWeight?: number;
            bestSet?: ExerciseBestSet;
            est1RM?: number;
          }
        >();
        for (const fs of flat) {
          const weightTarget = compareUnits(fs.weight, fs.unit, input.unit);
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
                unit: input.unit,
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
                unit: input.unit,
                sets: fs.sets ?? undefined,
                rpe: fs.rpe ?? undefined,
              };
            }
            if ((est ?? -Infinity) > (prev.est1RM ?? -Infinity)) {
              prev.est1RM = est;
            }
          }
        }

        // Build sparkline points sorted by date desc->asc
        const sessionsSorted = Array.from(bySession.entries())
          .map(([sessionId, v]) => ({ sessionId, ...v }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        const sparkline: VolumePoint[] = sessionsSorted.map((s) => ({
          date: s.date,
          volume: Math.round(s.volume * 100) / 100,
        }));

        // Best overall
        const bestSetOverall = sessionsSorted.reduce<
          ExerciseBestSet | undefined
        >((acc, s) => {
          if (!s.bestSet) return acc;
          if (
            !acc ||
            (s.bestSet.weight ?? -Infinity) > (acc.weight ?? -Infinity)
          )
            return s.bestSet;
          return acc;
        }, undefined);

        const best1RM = sessionsSorted.reduce<number | undefined>((acc, s) => {
          if (s.est1RM === undefined) return acc;
          if (acc === undefined || s.est1RM > acc) return s.est1RM;
          return acc;
        }, undefined);

        // Auto-progression recommendation: look back up to 3 sessions, average top working weight at target RPE range 7-9. Suggest +2.5% (kg) or +5 lb (lbs) if RPE & volume trend allow.
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
            if (input.unit === "kg") {
              const inc = Math.max(0.5, Math.round(last * 0.025 * 2) / 2); // ~2.5% rounded to 0.5
              recommendation = {
                type: "weight",
                nextWeight: Math.round((last + inc) * 2) / 2,
                rationale: "Upward trend; suggest ~2.5% increase",
                unit: input.unit,
              };
            } else {
              const inc = 5; // lbs plate jump
              recommendation = {
                type: "weight",
                nextWeight: last + inc,
                rationale: "Upward trend; suggest +5 lb",
                unit: input.unit,
              };
            }
          } else {
            // If not trending up, suggest reps progression by +1 if reps exists and <= 10
            recommendation = {
              type: "reps",
              nextReps: 1,
              rationale: "Plateau detected; try adding a rep",
              unit: input.unit,
            };
          }
        }

        // Template tuning suggestions from recent flat sets
        const rpeValues = flat
          .map((f) => (typeof f.rpe === "number" ? f.rpe : undefined))
          .filter((n): n is number => Number.isFinite(n));
        const restValues = flat
          .map((f) =>
            typeof f.rest_seconds === "number" ? f.rest_seconds : undefined,
          )
          .filter((n): n is number => Number.isFinite(n));

        const suggestions: ExerciseInsightsResponse["suggestions"] = [];
        if (rpeValues.length >= 3) {
          const avgRpe =
            rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length;
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
          unit: input.unit,
          bestSet: bestSetOverall,
          best1RM: best1RM ? Math.round(best1RM * 100) / 100 : undefined,
          volumeSparkline: sparkline,
          recommendation,
          suggestions,
        };
      } catch (error) {
        console.error("Error in getExerciseInsights:", error);
        throw new Error(
          `Failed to get exercise insights: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  // Session insights summary: totals and bests for the given session
  getSessionInsights: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        unit: z.enum(["kg", "lbs"]).default("kg"),
      }),
    )
    .query(async ({ input, ctx }): Promise<SessionInsightsResponse> => {
      try {
        const session = await ctx.db.query.workoutSessions.findFirst({
          where: and(
            eq(workoutSessions.id, input.sessionId),
            eq(workoutSessions.user_id, ctx.user.id),
          ),
          with: { exercises: true },
        });
        if (!session) throw new Error("Session not found");

        const byExercise = new Map<
          string,
          {
            volume: number;
            bestSet?: { weight?: number; reps?: number | null; unit: Unit };
          }
        >();

        for (const ex of session.exercises) {
          const key = ex.exerciseName;
          const weight = compareUnits(
            toNumber(ex.weight),
            (ex.unit as "kg" | "lbs") ?? "kg",
            input.unit,
          );
          const reps = ex.reps ?? 0;
          const vol = (weight ?? 0) * reps;

          const entry = byExercise.get(key) ?? { volume: 0 };
          entry.volume += vol;
          if (
            !entry.bestSet ||
            (weight ?? -Infinity) > (entry.bestSet.weight ?? -Infinity)
          ) {
            entry.bestSet = { weight, reps, unit: input.unit };
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

        return { unit: input.unit, totalVolume, bestSets };
      } catch (error) {
        console.error("Error in getSessionInsights:", error);
        throw new Error(
          `Failed to get session insights: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  // Export recent workout summaries to CSV (simple)
  exportWorkoutsCSV: protectedProcedure
    .input(
      z.object({
        since: z.date().optional(),
        limit: z.number().int().positive().max(200).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where = [eq(workoutSessions.user_id, ctx.user.id)] as Parameters<
        typeof and
      >[number][];
      if (input.since)
        where.push(gte(workoutSessions.workoutDate, input.since.toISOString()));

      const sessions = await ctx.db.query.workoutSessions.findMany({
        where: and(...where),
        orderBy: [desc(workoutSessions.workoutDate)],
        limit: input.limit,
        with: { exercises: true, template: true },
      });

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
          "rest_seconds",
        ].join(","),
      );
      for (const s of sessions) {
        for (const ex of s.exercises) {
          // narrow optional fields safely
          const templateName =
            s.template &&
            typeof (s.template as { name?: unknown }).name === "string"
              ? (s.template as { name?: string }).name
              : "";
          const rpeVal =
            typeof (ex as { rpe?: unknown }).rpe === "number"
              ? (ex as { rpe?: number }).rpe
              : "";
          const restVal =
            typeof (ex as { rest_seconds?: unknown }).rest_seconds === "number"
              ? (ex as { rest_seconds?: number }).rest_seconds
              : "";

          rows.push(
            [
              s.workoutDate,
              s.id,
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
    }),
});
