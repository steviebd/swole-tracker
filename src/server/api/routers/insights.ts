import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  workoutSessions,
  sessionExercises,
  templateExercises,
  exerciseLinks,
} from "~/server/db/schema";
import { and, desc, eq, gte, inArray, ne, or } from "drizzle-orm";
import { whereInChunks, chunkArray } from "~/server/db/chunk-utils";

type SessionExercise = typeof sessionExercises.$inferSelect;

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
  volumeLoad?: number;
  oneRMEstimate?: number;
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
        offsetSessions: z.number().int().min(0).default(0),
        excludeSessionId: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }): Promise<ExerciseInsightsResponse> => {
      try {
        // Resolve linked exercise names/ids via master linking if templateExerciseId provided
        let exerciseNamesToSearch: string[] = [input.exerciseName];
        let templateExerciseIds: number[] | undefined;

        if (input.templateExerciseId) {
          // Single query to get all linked exercises with the same masterExerciseId
          // Use subquery to find master ID, then get all related links in one query
          const linked = await ctx.db
            .select({
              templateExerciseId: exerciseLinks.templateExerciseId,
              masterExerciseId: exerciseLinks.masterExerciseId,
              templateExerciseName: templateExercises.exerciseName,
            })
            .from(exerciseLinks)
            .innerJoin(
              templateExercises,
              eq(exerciseLinks.templateExerciseId, templateExercises.id),
            )
            .where(
              and(
                eq(exerciseLinks.user_id, ctx.user.id),
                inArray(
                  exerciseLinks.masterExerciseId,
                  ctx.db
                    .select({ id: exerciseLinks.masterExerciseId })
                    .from(exerciseLinks)
                    .where(
                      and(
                        eq(
                          exerciseLinks.templateExerciseId,
                          input.templateExerciseId,
                        ),
                        eq(exerciseLinks.user_id, ctx.user.id),
                      ),
                    ),
                ),
              ),
            );

          if (linked.length > 0) {
            const extractedNames = linked
              .map((l) => l.templateExerciseName)
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
        const sessionsById = new Map<number, any>();

        // Only proceed if we have exercises to search for
        if (
          exerciseNamesToSearch.length > 0 ||
          (templateExerciseIds && templateExerciseIds.length > 0)
        ) {
          // Build exercise filter conditions
          const exerciseConditions = [];
          if (exerciseNamesToSearch.length > 0) {
            exerciseConditions.push(
              inArray(sessionExercises.exerciseName, exerciseNamesToSearch),
            );
          }
          if (templateExerciseIds && templateExerciseIds.length > 0) {
            exerciseConditions.push(
              inArray(sessionExercises.templateExerciseId, templateExerciseIds),
            );
          }

          // Single query to get all relevant sessions and exercises
          const allSessions = await ctx.db.query.workoutSessions.findMany({
            where: and(...sessionWhere),
            orderBy: [desc(workoutSessions.workoutDate)],
            limit: input.limitSessions,
            offset: input.offsetSessions,
            with: {
              exercises: {
                where:
                  exerciseConditions.length > 0
                    ? or(...exerciseConditions)
                    : undefined,
              },
            },
          });

          // Group sessions by ID to handle potential duplicates
          for (const session of allSessions) {
            const existing = sessionsById.get(session.id);
            if (!existing) {
              sessionsById.set(session.id, {
                ...session,
                exercises: [...(session.exercises ?? [])],
              });
              continue;
            }

            const seenExerciseIds = new Set<number>(
              (existing.exercises ?? []).map(
                (exercise: SessionExercise) => exercise.id,
              ),
            );
            for (const exercise of session.exercises ?? []) {
              if (!seenExerciseIds.has(exercise.id)) {
                existing.exercises.push(exercise);
                seenExerciseIds.add(exercise.id);
              }
            }
          }

          recentSessions = Array.from(sessionsById.values()).sort(
            (a, b) =>
              new Date(b.workoutDate ?? 0).getTime() -
              new Date(a.workoutDate ?? 0).getTime(),
          );

          if (recentSessions.length > input.limitSessions) {
            recentSessions = recentSessions.slice(0, input.limitSessions);
          }
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
            const weight = toNumber(ex.weight);
            const rpeValue = (ex as { rpe?: unknown }).rpe;
            const rpe = typeof rpeValue === "number" ? rpeValue : null;
            const restSecondsValue = (ex as { rest_seconds?: unknown })
              .rest_seconds;
            const restSeconds =
              typeof restSecondsValue === "number" ? restSecondsValue : null;
            const volumeLoad = toNumber(
              (ex as { volume_load?: string | number | null | undefined })
                .volume_load,
            );
            const oneRMEstimate = toNumber(
              (ex as { one_rm_estimate?: string | number | null | undefined })
                .one_rm_estimate,
            );

            const flatSet: FlatSet = {
              sessionId: s.id,
              workoutDate: s.workoutDate,
              reps: ex.reps,
              sets: ex.sets,
              unit: (ex.unit as Unit) ?? "kg",
              rpe,
              rest_seconds: restSeconds,
            };

            if (weight !== undefined) {
              flatSet.weight = weight;
            }
            if (volumeLoad !== undefined) {
              flatSet.volumeLoad = volumeLoad;
            }
            if (oneRMEstimate !== undefined) {
              flatSet.oneRMEstimate = oneRMEstimate;
            }
            flat.push(flatSet);
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
          // Use computed volume_load if available, otherwise calculate
          const vol = fs.volumeLoad ?? (weightTarget ?? 0) * (fs.reps ?? 0);
          const prev = bySession.get(fs.sessionId);
          // Use computed one_rm_estimate if available, otherwise calculate
          const est =
            fs.oneRMEstimate ?? estimate1RM(weightTarget, fs.reps ?? undefined);
          if (!prev) {
            const sessionData: any = {
              date: fs.workoutDate,
              volume: vol,
              est1RM: est,
            };
            if (weightTarget !== undefined) {
              sessionData.bestWeight = weightTarget;
            }
            if (input.unit) {
              const bestSet: ExerciseBestSet = { unit: input.unit };
              if (weightTarget !== undefined) {
                bestSet.weight = weightTarget;
              }
              if (fs.reps !== undefined && fs.reps !== null) {
                bestSet.reps = fs.reps;
              }
              if (fs.sets !== undefined && fs.sets !== null) {
                bestSet.sets = fs.sets;
              }
              if (fs.rpe !== undefined && fs.rpe !== null) {
                bestSet.rpe = fs.rpe;
              }
              sessionData.bestSet = bestSet;
            }
            bySession.set(fs.sessionId, sessionData);
          } else {
            prev.volume += vol;
            if (
              weightTarget !== undefined &&
              weightTarget > (prev.bestWeight ?? -Infinity)
            ) {
              prev.bestWeight = weightTarget;
              const bestSet: ExerciseBestSet = { unit: input.unit };
              if (weightTarget !== undefined) {
                bestSet.weight = weightTarget;
              }
              if (fs.reps !== undefined && fs.reps !== null) {
                bestSet.reps = fs.reps;
              }
              if (fs.sets !== undefined && fs.sets !== null) {
                bestSet.sets = fs.sets;
              }
              if (fs.rpe !== undefined && fs.rpe !== null) {
                bestSet.rpe = fs.rpe;
              }
              prev.bestSet = bestSet;
            }
            if (est !== undefined && est > (prev.est1RM ?? -Infinity)) {
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

        const result: ExerciseInsightsResponse = {
          unit: input.unit,
          volumeSparkline: sparkline,
          suggestions,
        };

        if (recommendation !== undefined) {
          result.recommendation = recommendation;
        }

        if (bestSetOverall !== undefined) {
          result.bestSet = bestSetOverall;
        }
        if (best1RM !== undefined) {
          result.best1RM = Math.round(best1RM * 100) / 100;
        }

        return result;
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
            bestSet?: ExerciseBestSet;
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
            const bestSet: ExerciseBestSet = { unit: input.unit };
            if (weight !== undefined) {
              bestSet.weight = weight;
            }
            if (reps !== null && reps !== undefined) {
              bestSet.reps = reps;
            }
            entry.bestSet = bestSet;
          }
          byExercise.set(key, entry);
        }

        const totalVolume =
          Math.round(
            Array.from(byExercise.values()).reduce((a, b) => a + b.volume, 0) *
              100,
          ) / 100;
        const bestSets = Array.from(byExercise.entries()).map(
          ([exerciseName, v]): SessionInsightsResponse["bestSets"][number] => {
            const result: SessionInsightsResponse["bestSets"][number] = {
              exerciseName,
              volume: v.volume,
            };
            if (v.bestSet?.unit !== undefined) {
              const bestSet: {
                weight?: number;
                reps?: number | null;
                unit: Unit;
              } = {
                unit: v.bestSet.unit,
              };
              if (v.bestSet.weight !== undefined) {
                bestSet.weight = v.bestSet.weight;
              }
              if (v.bestSet.reps !== undefined) {
                bestSet.reps = v.bestSet.reps;
              }
              result.bestSet = bestSet;
            }
            return result;
          },
        );

        return { unit: input.unit, totalVolume, bestSets };
      } catch (error) {
        console.error("Error in getSessionInsights:", error);
        throw new Error(
          `Failed to get session insights: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  // Export recent workout summaries to CSV with chunked processing for large datasets
  exportWorkoutsCSV: protectedProcedure
    .input(
      z.object({
        since: z.date().optional(),
        limit: z.number().int().positive().max(500).default(50),
        chunkSize: z.number().int().positive().max(100).default(25),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where = [eq(workoutSessions.user_id, ctx.user.id)] as Parameters<
        typeof and
      >[number][];
      if (input.since)
        where.push(gte(workoutSessions.workoutDate, input.since));

      // For large datasets, use chunked processing to avoid memory issues
      const useChunking = input.limit > 100;

      if (useChunking) {
        console.log(
          `Using chunked CSV export for ${input.limit} sessions with chunk size ${input.chunkSize}`,
        );

        // Get total count first for progress tracking
        const totalCountResult = await ctx.db
          .select({ count: workoutSessions.id })
          .from(workoutSessions)
          .where(and(...where));

        const totalCount = totalCountResult.length;

        // Process in chunks
        const allRows: string[] = [];

        // Add header
        allRows.push(
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

        let processedCount = 0;
        const sessionChunks = chunkArray(
          Array.from({ length: totalCount }, (_, i) => i),
          input.chunkSize,
        );

        for (const chunkIndices of sessionChunks) {
          const sessions = await ctx.db.query.workoutSessions.findMany({
            where: and(...where),
            orderBy: [desc(workoutSessions.workoutDate)],
            limit: input.chunkSize,
            offset: processedCount,
            with: { exercises: true, template: true },
          });

          // Process this chunk
          const chunkRows: string[] = [];
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
                typeof (ex as { rest_seconds?: unknown }).rest_seconds ===
                "number"
                  ? (ex as { rest_seconds?: number }).rest_seconds
                  : "";

              chunkRows.push(
                [
                  s.workoutDate.toISOString(),
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

          allRows.push(...chunkRows);
          processedCount += sessions.length;

          // Stop if we've reached the limit
          if (processedCount >= input.limit) {
            break;
          }
        }

        return {
          filename: "workouts_export.csv",
          mimeType: "text/csv",
          content: allRows.join("\n"),
          metadata: {
            totalSessions: Math.min(processedCount, input.limit),
            chunkedProcessing: true,
            chunkSize: input.chunkSize,
          },
        };
      } else {
        // Regular processing for smaller datasets
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
              typeof (ex as { rest_seconds?: unknown }).rest_seconds ===
              "number"
                ? (ex as { rest_seconds?: number }).rest_seconds
                : "";

            rows.push(
              [
                s.workoutDate.toISOString(),
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
          metadata: {
            totalSessions: sessions.length,
            chunkedProcessing: false,
          },
        };
      }
    }),
});
