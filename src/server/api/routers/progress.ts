import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  sessionExercises,
  workoutSessions,
  exerciseLinks,
  templateExercises,
  userPreferences,
  masterExercises,
} from "~/server/db/schema";
import { sessionExerciseMetricsView } from "~/server/db/views";
import { eq, desc, and, gte, lte, sql, inArray, or } from "drizzle-orm";
import { type db } from "~/server/db";
import {
  exerciseProgressInputSchema,
  topExercisesInputSchema,
} from "~/server/api/schemas/common";
import {
  calculateVolumeLoad,
  calculateProgressionTrend,
  calculateConsistencyScore,
  calculatePercentageChange,
  getDateRange as getDateRangeFromUtils,
  calculateFrequency,
} from "~/server/api/utils/exercise-calculations";
import { SQLITE_VARIABLE_LIMIT, whereInChunks } from "~/server/db/chunk-utils";
import type {
  ExerciseStrengthProgression,
  ExerciseVolumeProgression,
  ExerciseRecentPRs,
  ExerciseTopSets,
  TopExercise,
  PersonalRecord,
  TopSet,
} from "~/server/api/types/exercise-progression";
import type {
  HighlightCard,
  HighlightMotivator,
  ProgressHighlightsPayload,
} from "~/server/api/types/progress-highlights";

import { logger } from "~/lib/logger";
import { formatTimeRangeLabel, getWeeksForRange } from "~/lib/time-range";

// Legacy input schema for backward compatibility
const timeRangeInputSchema = z.object({
  timeRange: z.enum(["week", "month", "quarter", "year"]).default("quarter"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// Legacy exercise progress input schema
const legacyExerciseProgressInputSchema = z.object({
  exerciseName: z.string().optional(),
  templateExerciseId: z.number().optional(),
  timeRange: z.enum(["week", "month", "quarter", "year"]).default("quarter"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// Personal records input schema
const personalRecordsInputSchema = legacyExerciseProgressInputSchema.extend({
  recordType: z.enum(["weight", "volume", "both"]).default("both"),
});

const highlightTabSchema = z.enum(["prs", "milestones", "streaks"]);

const progressHighlightsInputSchema = z.object({
  tab: highlightTabSchema.default("prs"),
  timeRange: z.enum(["week", "month", "year"]).default("month"),
  limit: z.number().min(1).max(100).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
});

export const progressRouter = createTRPCRouter({
  // ===== UNIFIED PROGRESS DASHBOARD DATA =====

  // Get unified progress dashboard data for all sections
  getProgressDashboardData: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["week", "month", "year"]).default("month"),
      }),
    )
    .query(async ({ input, ctx }) => {
      const startTime = Date.now();

      const { startDate, endDate } = getDateRangeFromUtils(
        input.timeRange,
        undefined,
        undefined,
      );

      // Get all exercise names for PR calculation
      const exerciseNames = await getAllExerciseNames(ctx.db, ctx.user.id);

      // Get workout dates for consistency
      const workoutDatesResult = await ctx.db
        .select({ workoutDate: workoutSessions.workoutDate })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.user_id, ctx.user.id),
            gte(workoutSessions.workoutDate, startDate),
            lte(workoutSessions.workoutDate, endDate),
          ),
        )
        .orderBy(desc(workoutSessions.workoutDate));

      const workoutDates = workoutDatesResult.map((row) => row.workoutDate);

      // Parallel fetch of all dashboard data
      const [personalRecords, volumeData, comparativeData] = await Promise.all([
        calculatePersonalRecords(
          ctx,
          exerciseNames,
          startDate,
          endDate,
          "both",
        ),
        getVolumeAndStrengthData(ctx, startDate, endDate),
        // Calculate comparative data inline
        (async () => {
          const { startDate: prevStartDate, endDate: prevEndDate } =
            getPreviousPeriod(startDate, endDate);
          const [currentData, previousData] = await Promise.all([
            getVolumeAndStrengthData(ctx, startDate, endDate),
            getVolumeAndStrengthData(ctx, prevStartDate, prevEndDate),
          ]);
          return {
            current: currentData,
            previous: previousData,
            changes: calculateChanges(currentData, previousData),
          };
        })(),
      ]);

      const consistencyData = calculateConsistencyMetrics(
        workoutDates,
        startDate,
        endDate,
      );

      // Calculate performance metrics
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      const dataPoints = personalRecords.length + workoutDates.length;

      // Log performance metrics
      logger.info("Progress dashboard data loaded", {
        userId: ctx.user.id,
        loadTime,
        dataPoints,
        timeRange: input.timeRange,
      });

      return {
        personalRecords,
        volumeData,
        consistencyData,
        workoutDates: workoutDates.map((w) => w.toISOString().split("T")[0]!),
        comparativeData,
        timeRange: input.timeRange,
        timeRangeLabel: formatTimeRangeLabel(input.timeRange),
      };
    }),

  // ===== NEW PHASE 3 PROCEDURES: Exercise-specific strength progression tracking =====

  // Get exercise strength progression with 1RM estimates over time
  getExerciseStrengthProgression: protectedProcedure
    .input(exerciseProgressInputSchema)
    .query(async ({ input, ctx }): Promise<ExerciseStrengthProgression> => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        // Calculate previous period dates
        const periodLength = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

        const selection = await resolveExerciseSelection(ctx.db, ctx.user.id, {
          exerciseName: input.exerciseName,
          templateExerciseId: input.templateExerciseId,
        });

        const [sessionData, prevSessionData] = await Promise.all([
          fetchSessionMetricRows(
            ctx.db,
            ctx.user.id,
            selection,
            startDate,
            endDate,
          ),
          fetchSessionMetricRows(
            ctx.db,
            ctx.user.id,
            selection,
            prevStartDate,
            prevEndDate,
          ),
        ]);

        if (sessionData.length === 0) {
          return {
            currentOneRM: 0,
            oneRMChange: 0,
            volumeTrend: 0,
            sessionCount: 0,
            frequency: 0,
            recentPRs: [],
            topSets: [],
            progressionTrend: 0,
            consistencyScore: 0,
            timeline: [],
          };
        }

        // Calculate metrics using computed columns for performance
        const oneRMValues = sessionData.map((session) =>
          session.oneRMEstimate
            ? parseFloat(String(session.oneRMEstimate))
            : calculateLocalOneRM(
                parseFloat(String(session.weight || "0")),
                session.reps || 1,
              ),
        );

        const currentOneRM = Math.max(...oneRMValues);
        const sessionCount = new Set(
          sessionData.map((s) => s.workoutDate.toDateString()),
        ).size;
        const frequency = calculateFrequency(
          sessionData.map((s) => s.workoutDate),
          startDate,
          endDate,
        );

        const prevOneRMValues = prevSessionData.map((session) =>
          session.oneRMEstimate
            ? parseFloat(String(session.oneRMEstimate))
            : calculateLocalOneRM(
                parseFloat(String(session.weight || "0")),
                session.reps || 1,
              ),
        );
        const prevOneRM =
          prevOneRMValues.length > 0 ? Math.max(...prevOneRMValues) : 0;
        const oneRMChange = currentOneRM - prevOneRM;

        // Calculate volume trend using computed columns for performance
        const currentVolume = sessionData.reduce(
          (sum, s) =>
            sum +
            (s.volumeLoad
              ? parseFloat(String(s.volumeLoad))
              : calculateVolumeLoad(
                  s.sets || 1,
                  s.reps || 1,
                  parseFloat(String(s.weight || "0")),
                )),
          0,
        );
        const prevVolume = prevSessionData.reduce(
          (sum, s) =>
            sum +
            (s.volumeLoad
              ? parseFloat(String(s.volumeLoad))
              : calculateVolumeLoad(
                  s.sets || 1,
                  s.reps || 1,
                  parseFloat(String(s.weight || "0")),
                )),
          0,
        );
        const volumeTrend = calculatePercentageChange(
          currentVolume,
          prevVolume,
        );

        // Calculate progression trend (linear regression on 1RM over time)
        const dataPoints: Array<[number, number]> = sessionData.map(
          (session, index) => [
            index,
            calculateLocalOneRM(
              parseFloat(String(session.weight || "0")),
              session.reps || 1,
            ),
          ],
        );
        const progressionTrend = calculateProgressionTrend(dataPoints);

        // Calculate consistency score
        const consistencyScore = calculateConsistencyScore(oneRMValues);

        // Find recent PRs (last 30 days)
        const thirtyDaysAgo = new Date(endDate);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentPRs: PersonalRecord[] = [];
        let maxOneRM = 0;
        let maxWeight = 0;
        let maxVolume = 0;

        for (const session of sessionData.reverse()) {
          // Process chronologically
          const weight = parseFloat(String(session.weight || "0"));
          const oneRM = calculateLocalOneRM(weight, session.reps || 1);
          const volume = calculateVolumeLoad(
            session.sets || 1,
            session.reps || 1,
            weight,
          );

          if (session.workoutDate >= thirtyDaysAgo) {
            if (oneRM > maxOneRM) {
              maxOneRM = oneRM;
              recentPRs.push({
                date: session.workoutDate.toISOString().split("T")[0]!,
                weight,
                reps: session.reps || 1,
                type: "1RM",
                oneRMPercentage: 100,
              });
            }
            if (weight > maxWeight) {
              maxWeight = weight;
              recentPRs.push({
                date: session.workoutDate.toISOString().split("T")[0]!,
                weight,
                reps: session.reps || 1,
                type: "Weight",
                oneRMPercentage: maxOneRM > 0 ? (oneRM / maxOneRM) * 100 : 100,
              });
            }
            if (volume > maxVolume) {
              maxVolume = volume;
              recentPRs.push({
                date: session.workoutDate.toISOString().split("T")[0]!,
                weight,
                reps: session.reps || 1,
                type: "Volume",
                oneRMPercentage: maxOneRM > 0 ? (oneRM / maxOneRM) * 100 : 100,
              });
            }
          } else {
            // Update historical bests for comparison
            if (oneRM > maxOneRM) maxOneRM = oneRM;
            if (weight > maxWeight) maxWeight = weight;
            if (volume > maxVolume) maxVolume = volume;
          }
        }

        // Get top sets (best performances in the period)
        const topSets: TopSet[] = sessionData
          .slice(0, 10) // Top 10 performances
          .map((session) => {
            const weight = parseFloat(String(session.weight || "0"));
            const oneRM = calculateLocalOneRM(weight, session.reps || 1);
            return {
              date: session.workoutDate.toISOString().split("T")[0]!,
              weight,
              reps: session.reps || 1,
              oneRMPercentage:
                currentOneRM > 0 ? (oneRM / currentOneRM) * 100 : 100,
            };
          })
          .sort((a, b) => b.oneRMPercentage - a.oneRMPercentage)
          .slice(0, 5); // Top 5 sets

        const timeline = sessionData
          .map((session) => {
            const weight = parseFloat(String(session.weight || "0"));
            return {
              date: session.workoutDate.toISOString(),
              oneRM: calculateLocalOneRM(weight, session.reps || 1),
            };
          })
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
          .slice(-30);

        return {
          currentOneRM,
          oneRMChange,
          volumeTrend,
          sessionCount,
          frequency,
          recentPRs: recentPRs.slice(-5), // Last 5 PRs
          topSets,
          progressionTrend,
          consistencyScore,
          timeline,
        };
      } catch (error) {
        console.error("Error in getExerciseStrengthProgression:", error);
        return {
          currentOneRM: 0,
          oneRMChange: 0,
          volumeTrend: 0,
          sessionCount: 0,
          frequency: 0,
          recentPRs: [],
          topSets: [],
          progressionTrend: 0,
          consistencyScore: 0,
          timeline: [],
        };
      }
    }),

  // Get exercise volume progression trends
  getExerciseVolumeProgression: protectedProcedure
    .input(exerciseProgressInputSchema)
    .query(async ({ input, ctx }): Promise<ExerciseVolumeProgression> => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        // Calculate previous period dates
        const periodLength = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

        const selection = await resolveExerciseSelection(ctx.db, ctx.user.id, {
          exerciseName: input.exerciseName,
          templateExerciseId: input.templateExerciseId,
        });

        const [sessionData, prevSessionData] = await Promise.all([
          fetchSessionMetricRows(
            ctx.db,
            ctx.user.id,
            selection,
            startDate,
            endDate,
          ),
          fetchSessionMetricRows(
            ctx.db,
            ctx.user.id,
            selection,
            prevStartDate,
            prevEndDate,
          ),
        ]);

        if (sessionData.length === 0) {
          return {
            currentVolume: 0,
            volumeChange: 0,
            volumeChangePercent: 0,
            averageVolumePerSession: 0,
            sessionCount: 0,
            frequency: 0,
            volumeByWeek: [],
          };
        }

        const currentVolume = sessionData.reduce(
          (sum, session) =>
            sum +
            (session.volumeLoad
              ? parseFloat(String(session.volumeLoad))
              : calculateVolumeLoad(
                  session.sets || 1,
                  session.reps || 1,
                  parseFloat(String(session.weight || "0")),
                )),
          0,
        );

        const sessionCount = new Set(
          sessionData.map((s) => s.workoutDate.toDateString()),
        ).size;
        const averageVolumePerSession =
          sessionCount > 0 ? currentVolume / sessionCount : 0;
        const frequency = calculateFrequency(
          sessionData.map((s) => s.workoutDate),
          startDate,
          endDate,
        );

        const prevVolume = prevSessionData.reduce(
          (sum, session) =>
            sum +
            (session.volumeLoad
              ? parseFloat(String(session.volumeLoad))
              : calculateVolumeLoad(
                  session.sets || 1,
                  session.reps || 1,
                  parseFloat(String(session.weight || "0")),
                )),
          0,
        );

        const volumeChange = currentVolume - prevVolume;
        const volumeChangePercent = calculatePercentageChange(
          currentVolume,
          prevVolume,
        );

        // Calculate volume by week
        const volumeByWeek = [];
        const weeklyData = new Map<
          string,
          { volume: number; sessions: number }
        >();

        for (const session of sessionData) {
          const weekStart = new Date(session.workoutDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
          const weekKey = weekStart.toISOString().split("T")[0]!;

          if (!weeklyData.has(weekKey)) {
            weeklyData.set(weekKey, { volume: 0, sessions: 0 });
          }

          const data = weeklyData.get(weekKey)!;
          data.volume += calculateVolumeLoad(
            session.sets || 1,
            session.reps || 1,
            parseFloat(String(session.weight || "0")),
          );
          data.sessions++;
        }

        for (const [weekStart, data] of weeklyData) {
          volumeByWeek.push({
            weekStart,
            totalVolume: data.volume,
            sessionCount: data.sessions,
          });
        }

        volumeByWeek.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

        return {
          currentVolume,
          volumeChange,
          volumeChangePercent,
          averageVolumePerSession,
          sessionCount,
          frequency,
          volumeByWeek,
        };
      } catch (error) {
        console.error("Error in getExerciseVolumeProgression:", error);
        return {
          currentVolume: 0,
          volumeChange: 0,
          volumeChangePercent: 0,
          averageVolumePerSession: 0,
          sessionCount: 0,
          frequency: 0,
          volumeByWeek: [],
        };
      }
    }),

  // Get recent personal records for an exercise
  getExerciseRecentPRs: protectedProcedure
    .input(exerciseProgressInputSchema)
    .query(async ({ input, ctx }): Promise<ExerciseRecentPRs> => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const selection = await resolveExerciseSelection(ctx.db, ctx.user.id, {
          exerciseName: input.exerciseName,
          templateExerciseId: input.templateExerciseId,
        });

        const sessionData = await fetchSessionMetricRows(
          ctx.db,
          ctx.user.id,
          selection,
          startDate,
          endDate,
        );

        if (sessionData.length === 0) {
          return {
            exerciseName: selection.displayName,
            recentPRs: [],
            currentBest: { oneRM: 0, maxWeight: 0, maxVolume: 0 },
            prFrequency: 0,
          };
        }

        const recentPRs: PersonalRecord[] = [];
        let maxOneRM = 0;
        let maxWeight = 0;
        let maxVolume = 0;

        const chronologicalSessions = [...sessionData].reverse();

        for (const session of chronologicalSessions) {
          const weight = parseFloat(String(session.weight ?? "0"));
          const reps = session.reps ?? 1;
          const sets = session.sets ?? 1;
          const oneRM =
            session.oneRMEstimate != null
              ? Number(session.oneRMEstimate)
              : calculateLocalOneRM(weight, reps || 1);
          const volume = calculateVolumeLoad(sets || 1, reps || 1, weight);

          if (oneRM > maxOneRM) {
            maxOneRM = oneRM;
            recentPRs.push({
              date: session.workoutDate.toISOString().split("T")[0]!,
              weight,
              reps,
              type: "1RM",
              oneRMPercentage: 100,
            });
          }

          if (weight > maxWeight) {
            maxWeight = weight;
            recentPRs.push({
              date: session.workoutDate.toISOString().split("T")[0]!,
              weight,
              reps,
              type: "Weight",
              oneRMPercentage: maxOneRM > 0 ? (oneRM / maxOneRM) * 100 : 100,
            });
          }

          if (volume > maxVolume) {
            maxVolume = volume;
            recentPRs.push({
              date: session.workoutDate.toISOString().split("T")[0]!,
              weight,
              reps,
              type: "Volume",
              oneRMPercentage: maxOneRM > 0 ? (oneRM / maxOneRM) * 100 : 100,
            });
          }
        }

        // Calculate PR frequency (PRs per month)
        const totalDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const months = Math.max(1, totalDays / 30);
        const prFrequency = recentPRs.length / months;

        return {
          exerciseName: selection.displayName,
          recentPRs: recentPRs.slice(-10), // Last 10 PRs
          currentBest: {
            oneRM: maxOneRM,
            maxWeight,
            maxVolume,
          },
          prFrequency: Math.round(prFrequency * 10) / 10,
        };
      } catch (error) {
        console.error("Error in getExerciseRecentPRs:", error);
        return {
          exerciseName: input.exerciseName ?? "Selected exercise",
          recentPRs: [],
          currentBest: { oneRM: 0, maxWeight: 0, maxVolume: 0 },
          prFrequency: 0,
        };
      }
    }),

  // Get top sets for an exercise (best recent performances)
  getExerciseTopSets: protectedProcedure
    .input(exerciseProgressInputSchema)
    .query(async ({ input, ctx }): Promise<ExerciseTopSets> => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const selection = await resolveExerciseSelection(ctx.db, ctx.user.id, {
          exerciseName: input.exerciseName,
          templateExerciseId: input.templateExerciseId,
        });

        if (
          selection.names.length === 0 &&
          selection.templateExerciseIds.length === 0
        ) {
          const emptySet: TopSet = {
            date: "",
            weight: 0,
            reps: 0,
            oneRMPercentage: 0,
          };
          return {
            exerciseName: selection.displayName,
            topSets: [],
            averageIntensity: 0,
            heaviestSet: emptySet,
            mostRecentHeavy: emptySet,
          };
        }

        const matchClauses = [];
        if (selection.templateExerciseIds.length > 0) {
          matchClauses.push(
            selection.templateExerciseIds.length === 1
              ? eq(
                  sessionExercises.templateExerciseId,
                  selection.templateExerciseIds[0]!,
                )
              : inArray(
                  sessionExercises.templateExerciseId,
                  selection.templateExerciseIds,
                ),
          );
        }
        if (selection.names.length > 0) {
          const nameClause =
            selection.names.length === 1
              ? or(
                  eq(
                    sessionExercises.resolvedExerciseName,
                    selection.names[0]!,
                  ),
                  eq(sessionExercises.exerciseName, selection.names[0]!),
                )
              : or(
                  inArray(
                    sessionExercises.resolvedExerciseName,
                    selection.names,
                  ),
                  inArray(sessionExercises.exerciseName, selection.names),
                );
          matchClauses.push(nameClause);
        }

        const matchCondition =
          matchClauses.length === 1 ? matchClauses[0]! : or(...matchClauses);

        const sessionData = await ctx.db
          .select({
            workoutDate: workoutSessions.workoutDate,
            weight: sessionExercises.weight,
            reps: sessionExercises.reps,
            sets: sessionExercises.sets,
          })
          .from(sessionExercises)
          .innerJoin(
            workoutSessions,
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .where(
            and(
              eq(sessionExercises.user_id, ctx.user.id),
              matchCondition,
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          )
          .orderBy(desc(workoutSessions.workoutDate));

        if (sessionData.length === 0) {
          const emptySet: TopSet = {
            date: "",
            weight: 0,
            reps: 0,
            oneRMPercentage: 0,
          };
          return {
            exerciseName: selection.displayName,
            topSets: [],
            averageIntensity: 0,
            heaviestSet: emptySet,
            mostRecentHeavy: emptySet,
          };
        }

        // Calculate estimated 1RM for this exercise
        const allOneRMs = sessionData.map((session) =>
          calculateLocalOneRM(
            parseFloat(String(session.weight || "0")),
            session.reps || 1,
          ),
        );
        const maxOneRM = Math.max(...allOneRMs);

        // Create top sets with 1RM percentages
        const topSets: TopSet[] = sessionData
          .map((session) => {
            const weight = parseFloat(String(session.weight || "0"));
            const oneRM = calculateLocalOneRM(weight, session.reps || 1);
            return {
              date: session.workoutDate.toISOString().split("T")[0]!,
              weight,
              reps: session.reps || 1,
              oneRMPercentage:
                maxOneRM > 0 ? Math.round((oneRM / maxOneRM) * 100) : 0,
            };
          })
          .sort((a, b) => b.oneRMPercentage - a.oneRMPercentage)
          .slice(0, 10); // Top 10 sets

        // Calculate average intensity
        const averageIntensity =
          topSets.length > 0
            ? topSets.reduce((sum, set) => sum + set.oneRMPercentage, 0) /
              topSets.length
            : 0;

        // Find heaviest set
        const heaviestSet =
          topSets.length > 0
            ? topSets[0]!
            : { date: "", weight: 0, reps: 0, oneRMPercentage: 0 };

        // Find most recent heavy set (above 85% 1RM)
        const heavySets = topSets.filter((set) => set.oneRMPercentage >= 85);
        const mostRecentHeavy =
          heavySets.length > 0
            ? heavySets.sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )[0]!
            : { date: "", weight: 0, reps: 0, oneRMPercentage: 0 };

        return {
          exerciseName: selection.displayName,
          topSets: topSets.slice(0, 5), // Top 5 sets for display
          averageIntensity: Math.round(averageIntensity),
          heaviestSet,
          mostRecentHeavy,
        };
      } catch (error) {
        console.error("Error in getExerciseTopSets:", error);
        const emptySet: TopSet = {
          date: "",
          weight: 0,
          reps: 0,
          oneRMPercentage: 0,
        };
        return {
          exerciseName: input.exerciseName!,
          topSets: [],
          averageIntensity: 0,
          heaviestSet: emptySet,
          mostRecentHeavy: emptySet,
        };
      }
    }),

  // Get most trained exercises by frequency
  getTopExercises: protectedProcedure
    .input(topExercisesInputSchema)
    .query(async ({ input, ctx }): Promise<TopExercise[]> => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();

        const resolvedNameColumn =
          sessionExerciseMetricsView.resolvedExerciseName;
        const userIdColumn = sessionExerciseMetricsView.userId;
        const workoutDateColumn = sessionExerciseMetricsView.workoutDate;
        const volumeLoadColumn = sessionExerciseMetricsView.volumeLoad;
        const oneRmColumn = sessionExerciseMetricsView.oneRmEstimate;
        const weightColumn = sessionExerciseMetricsView.weight;
        const repsColumn = sessionExerciseMetricsView.reps;
        const setsColumn = sessionExerciseMetricsView.sets;

        if (
          !resolvedNameColumn ||
          !userIdColumn ||
          !workoutDateColumn ||
          !volumeLoadColumn ||
          !oneRmColumn ||
          !weightColumn ||
          !repsColumn ||
          !setsColumn
        ) {
          throw new Error("sessionExerciseMetricsView columns are not defined");
        }

        const resolvedColumn = resolvedNameColumn!;
        const userIdCol = userIdColumn!;
        const workoutDateCol = workoutDateColumn!;
        const volumeLoadCol = volumeLoadColumn!;
        const oneRmCol = oneRmColumn!;
        const weightCol = weightColumn!;
        const repsCol = repsColumn!;
        const setsCol = setsColumn!;

        const aggregates = await ctx.db
          .select({
            exerciseName: resolvedColumn,
            sessionCount: sql<number>`COUNT(DISTINCT ${workoutDateCol})`,
            totalVolume: sql<number>`COALESCE(SUM(${volumeLoadCol}), 0)`,
            lastWorkoutDate: sql<Date | string | null>`MAX(${workoutDateCol})`,
          })
          .from(sessionExerciseMetricsView)
          .where(
            and(
              eq(userIdCol, ctx.user.id),
              gte(workoutDateCol, startIso),
              lte(workoutDateCol, endIso),
            ),
          )
          .groupBy(resolvedColumn);

        const aggregateStats = aggregates
          .map((row) => {
            const exerciseName =
              typeof row.exerciseName === "string" &&
              row.exerciseName.length > 0
                ? row.exerciseName
                : null;

            const rawLastWorkoutDate = row.lastWorkoutDate as unknown;
            const lastWorkoutDateValue = (() => {
              if (rawLastWorkoutDate instanceof Date) {
                return rawLastWorkoutDate;
              }
              if (typeof rawLastWorkoutDate === "string") {
                const parsed = new Date(rawLastWorkoutDate);
                return Number.isNaN(parsed.getTime()) ? null : parsed;
              }
              if (typeof rawLastWorkoutDate === "number") {
                const parsed = new Date(rawLastWorkoutDate);
                return Number.isNaN(parsed.getTime()) ? null : parsed;
              }
              return null;
            })();

            return {
              exerciseName,
              sessionCount: Number(row.sessionCount ?? 0),
              totalVolume: Number(row.totalVolume ?? 0),
              lastWorkoutDate: lastWorkoutDateValue,
            };
          })
          .filter(
            (
              row,
            ): row is {
              exerciseName: string;
              sessionCount: number;
              totalVolume: number;
              lastWorkoutDate: Date | null;
            } => row.exerciseName !== null,
          );

        if (aggregateStats.length === 0) {
          return [];
        }

        const exerciseNames = aggregateStats.map((row) => row.exerciseName);

        type SeriesRow = {
          exerciseName: string;
          workoutDate: Date;
          weight: number | null;
          reps: number | null;
          sets: number | null;
          oneRMEstimate: number | null;
        };

        let normalizedSeries: SeriesRow[] = [];

        await whereInChunks(exerciseNames, async (nameChunk) => {
          const chunkSeries = await ctx.db
            .select({
              exerciseName: resolvedColumn,
              workoutDate: workoutDateCol,
              weight: weightCol,
              reps: repsCol,
              sets: setsCol,
              oneRMEstimate: oneRmCol,
            })
            .from(sessionExerciseMetricsView)
            .where(
              and(
                eq(userIdCol, ctx.user.id),
                gte(workoutDateCol, startIso),
                lte(workoutDateCol, endIso),
                inArray(resolvedColumn, nameChunk),
              ),
            )
            .orderBy(desc(workoutDateCol));

          const chunkNormalized = chunkSeries
            .map((row) => {
              const rawExerciseName = row.exerciseName as unknown;
              const exerciseName =
                typeof rawExerciseName === "string" ? rawExerciseName : null;

              let workoutDate: Date | null = null;
              const rawWorkoutDate = row.workoutDate as unknown;
              if (rawWorkoutDate instanceof Date) {
                workoutDate = rawWorkoutDate;
              } else if (
                typeof rawWorkoutDate === "string" ||
                typeof rawWorkoutDate === "number"
              ) {
                const parsedDate = new Date(rawWorkoutDate);
                workoutDate = Number.isNaN(parsedDate.getTime())
                  ? null
                  : parsedDate;
              }

              if (!exerciseName || !workoutDate) {
                return null;
              }

              return {
                exerciseName,
                workoutDate,
                weight: row.weight == null ? null : Number(row.weight),
                reps: row.reps == null ? null : Number(row.reps),
                sets: row.sets == null ? null : Number(row.sets),
                oneRMEstimate:
                  row.oneRMEstimate == null ? null : Number(row.oneRMEstimate),
              } satisfies SeriesRow;
            })
            .filter((row): row is SeriesRow => row !== null);

          normalizedSeries = normalizedSeries.concat(chunkNormalized);
        });

        normalizedSeries.sort(
          (a, b) => b.workoutDate.getTime() - a.workoutDate.getTime(),
        );

        const exerciseMap = new Map<
          string,
          {
            sessionCount: number;
            totalVolume: number;
            lastWorkoutDate: Date | null;
            workoutDates: Date[];
            oneRMValues: number[];
          }
        >();

        for (const stat of aggregateStats) {
          exerciseMap.set(stat.exerciseName, {
            sessionCount: stat.sessionCount,
            totalVolume: stat.totalVolume,
            lastWorkoutDate: stat.lastWorkoutDate,
            workoutDates: [],
            oneRMValues: [],
          });
        }

        for (const row of normalizedSeries) {
          const data = exerciseMap.get(row.exerciseName);
          if (!data) continue;
          data.workoutDates.push(row.workoutDate);

          const weight = Number(row.weight ?? 0);
          const reps = row.reps ?? 1;
          const oneRm =
            row.oneRMEstimate != null
              ? Number(row.oneRMEstimate)
              : calculateLocalOneRM(weight, Math.max(reps, 1));
          data.oneRMValues.push(oneRm);

          if (
            data.lastWorkoutDate === null ||
            row.workoutDate > data.lastWorkoutDate
          ) {
            data.lastWorkoutDate = row.workoutDate;
          }
        }

        const topExercises: TopExercise[] = [];

        for (const [exerciseName, data] of exerciseMap) {
          if (data.sessionCount === 0) continue;

          const frequency = calculateFrequency(
            data.workoutDates,
            startDate,
            endDate,
          );

          const averageOneRM =
            data.oneRMValues.length > 0
              ? data.oneRMValues.reduce((sum, value) => sum + value, 0) /
                data.oneRMValues.length
              : 0;

          const midpoint = Math.ceil(data.oneRMValues.length / 2);
          const recentOneRMs = data.oneRMValues.slice(0, midpoint);
          const olderOneRMs = data.oneRMValues.slice(midpoint);

          let trend: "improving" | "stable" | "declining" = "stable";
          if (recentOneRMs.length > 0 && olderOneRMs.length > 0) {
            const recentAvg =
              recentOneRMs.reduce((sum, value) => sum + value, 0) /
              recentOneRMs.length;
            const olderAvg =
              olderOneRMs.reduce((sum, value) => sum + value, 0) /
              olderOneRMs.length;
            const change =
              olderAvg === 0 ? 0 : ((recentAvg - olderAvg) / olderAvg) * 100;
            if (change > 5) trend = "improving";
            else if (change < -5) trend = "declining";
          }

          topExercises.push({
            exerciseName,
            sessionCount: data.sessionCount,
            frequency,
            totalVolume: data.totalVolume,
            averageOneRM,
            lastTrained: data.lastWorkoutDate
              ? data.lastWorkoutDate.toISOString().split("T")[0]!
              : "",
            trend,
            templateExerciseIds: [],
            masterExerciseId: null,
            aliasCount: 0,
            aliases: [],
          });
        }

        // Sort by frequency (most trained first) and limit results
        return topExercises
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, input.limit);
      } catch (error) {
        logger.error("Error in getTopExercises", error);
        return [];
      }
    }),

  // ===== LEGACY PROCEDURES: Maintain backward compatibility =====

  // Get strength progression data for top sets by exercise over time
  getStrengthProgression: protectedProcedure
    .input(legacyExerciseProgressInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        let exerciseNamesToSearch: string[] = [];

        // If templateExerciseId is provided, get linked exercises
        if (input.templateExerciseId) {
          const linkedExercises = await getLinkedExerciseNames(
            ctx.db,
            input.templateExerciseId,
            ctx.user.id,
          );
          exerciseNamesToSearch = linkedExercises;
        } else if (input.exerciseName) {
          exerciseNamesToSearch = [input.exerciseName];
        }

        if (exerciseNamesToSearch.length === 0) {
          return [];
        }

        // Get all session exercises for the specified time range and exercises
        const baseConditions = [
          eq(sessionExercises.user_id, ctx.user.id),
          gte(workoutSessions.workoutDate, startDate),
          lte(workoutSessions.workoutDate, endDate),
        ];

        let progressRows: ProgressDataRow[] = [];

        await whereInChunks(
          exerciseNamesToSearch,
          async (nameChunk) => {
            const exerciseCondition =
              nameChunk.length === 1
                ? eq(sessionExercises.exerciseName, nameChunk[0]!)
                : inArray(sessionExercises.exerciseName, nameChunk);

            const whereConditions = [...baseConditions, exerciseCondition];

            const chunkProgressData = await ctx.db
              .select({
                workoutDate: workoutSessions.workoutDate,
                exerciseName: sessionExercises.exerciseName,
                weight: sessionExercises.weight,
                reps: sessionExercises.reps,
                sets: sessionExercises.sets,
                unit: sessionExercises.unit,
              })
              .from(sessionExercises)
              .innerJoin(
                workoutSessions,
                eq(workoutSessions.id, sessionExercises.sessionId),
              )
              .where(and(...whereConditions))
              .orderBy(
                desc(workoutSessions.workoutDate),
                desc(sessionExercises.weight),
              );

            const normalizedChunk = chunkProgressData
              .map((item) => {
                const workoutDate =
                  item.workoutDate instanceof Date
                    ? item.workoutDate
                    : new Date(item.workoutDate ?? 0);

                if (
                  !(workoutDate instanceof Date) ||
                  Number.isNaN(+workoutDate)
                ) {
                  return null;
                }

                const exerciseName =
                  typeof item.exerciseName === "string"
                    ? item.exerciseName
                    : String(item.exerciseName ?? "").trim();

                if (!exerciseName) {
                  return null;
                }

                const weightValue =
                  item.weight == null ? null : Number(item.weight);

                const unitValue =
                  item.unit === "lbs" || item.unit === "kg" ? item.unit : "kg";

                return {
                  workoutDate,
                  exerciseName,
                  weight: weightValue == null ? null : String(weightValue),
                  reps: item.reps ?? null,
                  sets: item.sets ?? null,
                  unit: unitValue,
                  oneRMEstimate: calculateLocalOneRM(
                    weightValue ?? 0,
                    item.reps ?? 1,
                  ),
                } satisfies ProgressDataRow;
              })
              .filter((row): row is ProgressDataRow => row !== null);

            progressRows = progressRows.concat(normalizedChunk);
          },
          SQLITE_VARIABLE_LIMIT,
        );

        progressRows = progressRows.sort((a, b) => {
          const dateA = a.workoutDate.getTime();
          const dateB = b.workoutDate.getTime();
          if (dateA === dateB) {
            const weightA = a.weight ? Number(a.weight) : -Infinity;
            const weightB = b.weight ? Number(b.weight) : -Infinity;
            return weightB - weightA;
          }
          return dateB - dateA;
        });

        // Process data to get top set per workout per exercise
        const topSets = processTopSets(progressRows);

        return topSets;
      } catch (error) {
        console.error("Error in getStrengthProgression:", error);
        return [];
      }
    }),

  getStrengthPulse: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const windowLength = Math.max(
          1,
          endDate.getTime() - startDate.getTime(),
        );
        const previousEndDate = new Date(startDate.getTime() - 1);
        const previousStartDate = new Date(
          previousEndDate.getTime() - windowLength,
        );

        const fetchStrengthSets = async (rangeStart: Date, rangeEnd: Date) => {
          if (rangeStart.getTime() > rangeEnd.getTime()) {
            return [];
          }

          const rows = await ctx.db
            .select({
              workoutDate: workoutSessions.workoutDate,
              exerciseName: sessionExercises.exerciseName,
              weight: sessionExercises.weight,
              reps: sessionExercises.reps,
              oneRMEstimate: sessionExercises.one_rm_estimate,
            })
            .from(sessionExercises)
            .innerJoin(
              workoutSessions,
              eq(workoutSessions.id, sessionExercises.sessionId),
            )
            .where(
              and(
                eq(sessionExercises.user_id, ctx.user.id),
                gte(workoutSessions.workoutDate, rangeStart),
                lte(workoutSessions.workoutDate, rangeEnd),
              ),
            )
            .orderBy(desc(workoutSessions.workoutDate));

          return rows;
        };

        const [currentRows, previousRows] = await Promise.all([
          fetchStrengthSets(startDate, endDate),
          fetchStrengthSets(previousStartDate, previousEndDate),
        ]);

        const currentSummary = summarizeStrengthSets(currentRows);
        const previousSummary = summarizeStrengthSets(previousRows);

        const delta = currentSummary.maxOneRm - previousSummary.maxOneRm;
        const trend: StrengthTrend =
          delta > 0 ? "up" : delta < 0 ? "down" : "flat";

        return {
          currentOneRm: currentSummary.maxOneRm,
          previousOneRm: previousSummary.maxOneRm,
          delta,
          trend,
          heavySetCount: currentSummary.heavySetCount,
          sessionCount: currentSummary.sessionCount,
          topLift: currentSummary.bestLift
            ? {
                exerciseName: currentSummary.bestLift.exerciseName,
                reps: currentSummary.bestLift.reps,
                weight: currentSummary.bestLift.weight,
                oneRm: currentSummary.bestLift.oneRm,
              }
            : null,
          lastLiftedAt: currentSummary.lastWorkoutDate ?? null,
        };
      } catch (error) {
        logger.error("Error in getStrengthPulse", error, {
          userId: ctx.user?.id,
        });
        return {
          currentOneRm: 0,
          previousOneRm: 0,
          delta: 0,
          trend: "flat" as const,
          heavySetCount: 0,
          sessionCount: 0,
          topLift: null,
          lastLiftedAt: null,
        };
      }
    }),

  // Get volume tracking data (total weight moved, sets, reps)
  getVolumeProgression: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        logger.debug("Getting volume progression", {
          timeRange: input.timeRange,
          userId: ctx.user.id,
        });
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );
        logger.debug("Volume progression date range", { startDate, endDate });

        const volumeData = await ctx.db
          .select({
            workoutDate: workoutSessions.workoutDate,
            exerciseName: sessionExercises.exerciseName,
            weight: sessionExercises.weight,
            reps: sessionExercises.reps,
            sets: sessionExercises.sets,
            unit: sessionExercises.unit,
          })
          .from(sessionExercises)
          .innerJoin(
            workoutSessions,
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .where(
            and(
              eq(sessionExercises.user_id, ctx.user.id),
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          )
          .orderBy(desc(workoutSessions.workoutDate));

        // Transform data to match expected types
        const transformedData = volumeData.map((row) => ({
          workoutDate: row.workoutDate,
          exerciseName: row.exerciseName,
          weight: row.weight || 0,
          reps: row.reps || 0,
          sets: row.sets || 0,
        }));

        // Calculate volume metrics by workout date
        const volumeByDate = calculateVolumeMetrics(transformedData);
        logger.debug("Volume progression result", {
          count: volumeByDate.length,
        });

        return volumeByDate;
      } catch (error) {
        console.error("Error in getVolumeProgression:", error);
        return [];
      }
    }),

  // Get consistency statistics (workout frequency, streaks)
  getConsistencyStats: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        logger.debug("Getting consistency stats", {
          timeRange: input.timeRange,
          userId: ctx.user.id,
        });
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const workoutDates = await ctx.db
          .select({
            workoutDate: workoutSessions.workoutDate,
          })
          .from(workoutSessions)
          .where(
            and(
              eq(workoutSessions.user_id, ctx.user.id),
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          )
          .orderBy(desc(workoutSessions.workoutDate));

        const consistency = calculateConsistencyMetrics(
          workoutDates.map((row) => row.workoutDate),
          startDate,
          endDate,
        );
        logger.debug("Consistency stats result", consistency);

        return consistency;
      } catch (error) {
        console.error("Error in getConsistencyStats:", error);
        return {
          totalWorkouts: 0,
          frequency: 0,
          currentStreak: 0,
          longestStreak: 0,
          consistencyScore: 0,
        };
      }
    }),

  // Get workout dates for calendar display
  getWorkoutDates: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const workoutDates = await ctx.db
          .select({
            workoutDate: workoutSessions.workoutDate,
          })
          .from(workoutSessions)
          .where(
            and(
              eq(workoutSessions.user_id, ctx.user.id),
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          )
          .orderBy(desc(workoutSessions.workoutDate));

        return workoutDates.map(
          (w) => w.workoutDate.toISOString().split("T")[0]!,
        );
      } catch (error) {
        console.error("Error in getWorkoutDates:", error);
        return [];
      }
    }),

  // Get personal records (weight and volume PRs)
  getPersonalRecords: protectedProcedure
    .input(personalRecordsInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        let exerciseNamesToSearch: string[] = [];

        if (input.templateExerciseId) {
          const linkedExercises = await getLinkedExerciseNames(
            ctx.db,
            input.templateExerciseId,
            ctx.user.id,
          );
          exerciseNamesToSearch = linkedExercises;
        } else if (input.exerciseName) {
          exerciseNamesToSearch = [input.exerciseName];
        }

        if (exerciseNamesToSearch.length === 0) {
          exerciseNamesToSearch = await getAllExerciseNames(
            ctx.db,
            ctx.user.id,
          );
        }

        const personalRecords = await calculatePersonalRecords(
          ctx,
          exerciseNamesToSearch,
          startDate,
          endDate,
          input.recordType,
        );

        return personalRecords;
      } catch (error) {
        console.error("Error in getPersonalRecords:", error);
        return [];
      }
    }),

  getProgressHighlights: protectedProcedure
    .input(progressHighlightsInputSchema)
    .query(async ({ input, ctx }): Promise<ProgressHighlightsPayload> => {
      const { startDate, endDate } = getDateRangeFromUtils(
        input.timeRange,
        undefined,
        undefined,
      );
      const timeRangeLabel = formatTimeRangeLabel(input.timeRange);

      const tab = input.tab;

      if (tab === "prs") {
        const exerciseNames = await getAllExerciseNames(ctx.db, ctx.user.id);
        const personalRecords = await calculatePersonalRecords(
          ctx,
          exerciseNames,
          startDate,
          endDate,
          "both",
        );

        const workoutDatesPromise = ctx.db
          .select({ workoutDate: workoutSessions.workoutDate })
          .from(workoutSessions)
          .where(
            and(
              eq(workoutSessions.user_id, ctx.user.id),
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          )
          .orderBy(desc(workoutSessions.workoutDate));

        const volumeSummaryPromise = getVolumeAndStrengthData(
          ctx,
          startDate,
          endDate,
        );

        const [workoutDates, volumeSummary] = await Promise.all([
          workoutDatesPromise,
          volumeSummaryPromise,
        ]);

        const consistencyMetrics = calculateConsistencyMetrics(
          workoutDates.map((row) => row.workoutDate),
          startDate,
          endDate,
        );

        const motivator = buildHighlightMotivator({
          prsCount: personalRecords.length,
          streak: consistencyMetrics.currentStreak,
          totalVolume: Math.round(volumeSummary.totalVolume),
        });

        const badges = [
          {
            id: "total-prs",
            label: "Total PRs",
            value: String(personalRecords.length),
            tone: "gold" as const,
            helper: `${timeRangeLabel}`,
          },
          {
            id: "weight-prs",
            label: "Weight PRs",
            value: String(
              personalRecords.filter((pr) => pr.recordType === "weight").length,
            ),
            tone: "silver" as const,
            helper: "Max load",
          },
          {
            id: "volume-prs",
            label: "Volume PRs",
            value: String(
              personalRecords.filter((pr) => pr.recordType === "volume").length,
            ),
            tone: "bronze" as const,
            helper: "Total tonnage",
          },
        ];

        const limit = input.limit ?? 20;
        const offset = input.offset ?? 0;

        // Sort PRs by recency (most recent first) for better pagination UX
        const sortedRecords = personalRecords.sort(
          (a, b) => b.workoutDate.getTime() - a.workoutDate.getTime(),
        );

        const paginatedRecords = sortedRecords.slice(offset, offset + limit);

        const cards = paginatedRecords.map((record, index) => ({
          id: `${record.exerciseName}-${record.workoutDate.getTime()}-${index}`,
          title: record.exerciseName,
          subtitle: `${record.weight} kg × ${record.reps}`,
          detail:
            record.recordType === "weight"
              ? "Weight PR"
              : record.recordType === "volume"
                ? "Volume PR"
                : "PR",
          meta: record.oneRMEstimate
            ? `~${Math.round(record.oneRMEstimate)} kg 1RM`
            : undefined,
          icon:
            record.recordType === "weight"
              ? "🏋️"
              : record.recordType === "volume"
                ? "📊"
                : "🏆",
          date: record.workoutDate.toISOString(),
          tone:
            record.recordType === "weight"
              ? ("success" as const)
              : record.recordType === "volume"
                ? ("info" as const)
                : ("warning" as const),
        }));

        return {
          tab,
          summary: { total: personalRecords.length, timeRangeLabel },
          motivator,
          badges,
          cards,
        };
      }

      if (tab === "milestones") {
        const volumeRows = await ctx.db
          .select({
            workoutDate: workoutSessions.workoutDate,
            exerciseName: sessionExercises.exerciseName,
            weight: sessionExercises.weight,
            reps: sessionExercises.reps,
            sets: sessionExercises.sets,
          })
          .from(sessionExercises)
          .innerJoin(
            workoutSessions,
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .where(
            and(
              eq(sessionExercises.user_id, ctx.user.id),
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          );

        const volumeByDay = calculateVolumeMetrics(
          volumeRows.map((row) => ({
            workoutDate: row.workoutDate,
            exerciseName: row.exerciseName,
            weight: row.weight || 0,
            reps: row.reps || 0,
            sets: row.sets || 0,
          })),
        );
        const volumeByExercise = calculateVolumeByExercise(
          volumeRows.map((row) => ({
            exerciseName: row.exerciseName,
            weight: row.weight || 0,
            reps: row.reps || 0,
            sets: row.sets || 0,
            workoutDate: row.workoutDate,
          })),
        );

        const totalVolume = volumeByDay.reduce(
          (sum, day) => sum + day.totalVolume,
          0,
        );
        const averageSession =
          volumeByDay.length > 0 ? totalVolume / volumeByDay.length : 0;

        const heaviestDay = volumeByDay.reduce(
          (best, day) =>
            !best || day.totalVolume > best.totalVolume ? day : best,
          volumeByDay[0] ?? null,
        );

        const topExercise = volumeByExercise.reduce(
          (best, exercise) =>
            !best || exercise.totalVolume > best.totalVolume ? exercise : best,
          volumeByExercise[0] ?? null,
        );

        const motivator = buildHighlightMotivator({
          totalVolume,
          goalCompletion: undefined,
        });

        const badges = [
          {
            id: "total-volume",
            label: "Total Volume",
            value: `${Math.round(totalVolume).toLocaleString()} kg`,
            tone: "gold" as const,
            helper: timeRangeLabel,
          },
          {
            id: "avg-session",
            label: "Avg Session",
            value: `${Math.round(averageSession).toLocaleString()} kg`,
            tone: "silver" as const,
            helper: "Per workout",
          },
          {
            id: "unique-exercises",
            label: "Unique Lifts",
            value: String(volumeByExercise.length),
            tone: "info" as const,
            helper: "Variety",
          },
        ];

        const cards = [
          heaviestDay
            ? {
                id: "heaviest-session",
                title: "Heaviest session",
                subtitle: `${Math.round(heaviestDay.totalVolume).toLocaleString()} kg moved`,
                detail: `${heaviestDay.totalSets} sets • ${heaviestDay.totalReps} reps`,
                meta: heaviestDay.workoutDate.toISOString(),
                icon: "🚀",
                tone: "success" as const,
              }
            : null,
          topExercise
            ? {
                id: "top-exercise",
                title: topExercise.exerciseName,
                subtitle: `${Math.round(topExercise.totalVolume).toLocaleString()} kg this ${timeRangeLabel.toLowerCase()}`,
                detail: `${topExercise.totalSets} sets • ${topExercise.totalReps} reps`,
                icon: "🏅",
                tone: "info" as const,
              }
            : null,
          {
            id: "volume-pace",
            title: "Volume pace",
            subtitle: `${Math.round(
              totalVolume /
                Math.max(
                  1,
                  (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                ),
            ).toLocaleString()} kg / day`,
            detail: "Rolling average load",
            icon: "⏱️",
            tone: "warning" as const,
          },
        ].filter((card) => card !== null) as HighlightCard[];

        return {
          tab,
          summary: { total: cards.length, timeRangeLabel },
          motivator,
          badges,
          cards,
        };
      }

      // Streaks tab
      const workoutDates = await ctx.db
        .select({
          workoutDate: workoutSessions.workoutDate,
        })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.user_id, ctx.user.id),
            gte(workoutSessions.workoutDate, startDate),
            lte(workoutSessions.workoutDate, endDate),
          ),
        )
        .orderBy(desc(workoutSessions.workoutDate));

      const consistencyMetrics = calculateConsistencyMetrics(
        workoutDates.map((row) => row.workoutDate),
        startDate,
        endDate,
      );

      const preferencesRow = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.user_id, ctx.user.id),
      });
      const targetPerWeek = preferencesRow?.targetWorkoutsPerWeek ?? 3;
      const targetTotal = targetPerWeek * getWeeksForRange(input.timeRange);
      const completion =
        targetTotal > 0
          ? Math.min(
              125,
              (consistencyMetrics.totalWorkouts / targetTotal) * 100,
            )
          : 0;

      const bestWeek = calculateBestWeek(
        workoutDates.map((row) => row.workoutDate),
      );
      const lastWorkout = workoutDates[0]?.workoutDate ?? null;

      const motivator = buildHighlightMotivator({
        streak: consistencyMetrics.currentStreak,
        goalCompletion: completion,
      });

      const badges = [
        {
          id: "current-streak",
          label: "Current streak",
          value: `${consistencyMetrics.currentStreak} days`,
          tone: "gold" as const,
          helper: "Keep it up",
        },
        {
          id: "frequency",
          label: "Avg frequency",
          value: `${consistencyMetrics.frequency}× / wk`,
          tone: "silver" as const,
          helper: timeRangeLabel,
        },
        {
          id: "goal-completion",
          label: "Goal completion",
          value: `${completion.toFixed(0)}%`,
          tone: "info" as const,
          helper: `${targetPerWeek}/week target`,
        },
      ];

      const cards: HighlightCard[] = [
        {
          id: "streak",
          title: "Current streak",
          subtitle: `${consistencyMetrics.currentStreak} days`,
          detail: `Longest ${consistencyMetrics.longestStreak} days`,
          icon: "🔥",
          tone: "success",
        },
        {
          id: "best-week",
          title: "Best week",
          subtitle:
            bestWeek != null ? `${bestWeek.count} sessions` : "No data yet",
          detail: bestWeek != null ? `Week of ${bestWeek.label}` : undefined,
          icon: "📆",
          tone: "info",
        },
        {
          id: "last-session",
          title: "Last session",
          subtitle: lastWorkout
            ? new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
              }).format(lastWorkout)
            : "No workouts logged",
          detail: lastWorkout ? "Tap to review workout log" : undefined,
          icon: "💪",
          tone: "warning",
          meta: lastWorkout ? lastWorkout.toISOString() : undefined,
        },
      ];

      return {
        tab,
        summary: { total: cards.length, timeRangeLabel },
        motivator,
        badges,
        cards,
      };
    }),
  // Get comparative analysis (current vs previous period)
  getComparativeAnalysis: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );
        const { startDate: prevStartDate, endDate: prevEndDate } =
          getPreviousPeriod(startDate, endDate);

        // Get current period data
        const currentData = await getVolumeAndStrengthData(
          ctx,
          startDate,
          endDate,
        );

        // Get previous period data
        const previousData = await getVolumeAndStrengthData(
          ctx,
          prevStartDate,
          prevEndDate,
        );

        const comparison = {
          current: currentData,
          previous: previousData,
          changes: calculateChanges(currentData, previousData),
        };

        return comparison;
      } catch (error) {
        console.error("Error in getComparativeAnalysis:", error);
        return {
          current: {
            totalVolume: 0,
            totalSets: 0,
            totalReps: 0,
            uniqueExercises: 0,
            workoutCount: 0,
          },
          previous: {
            totalVolume: 0,
            totalSets: 0,
            totalReps: 0,
            uniqueExercises: 0,
            workoutCount: 0,
          },
          changes: {
            volumeChange: 0,
            setsChange: 0,
            repsChange: 0,
          },
        };
      }
    }),

  // Get volume breakdown by exercise
  getVolumeByExercise: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const volumeData = await ctx.db
          .select({
            exerciseName: sessionExercises.exerciseName,
            weight: sessionExercises.weight,
            reps: sessionExercises.reps,
            sets: sessionExercises.sets,
            unit: sessionExercises.unit,
            workoutDate: workoutSessions.workoutDate,
          })
          .from(sessionExercises)
          .innerJoin(
            workoutSessions,
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .where(
            and(
              eq(sessionExercises.user_id, ctx.user.id),
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          )
          .orderBy(desc(workoutSessions.workoutDate));

        // Transform data to match expected types
        const transformedData = volumeData.map((row) => ({
          exerciseName: row.exerciseName,
          weight: row.weight || 0,
          reps: row.reps || 0,
          sets: row.sets || 0,
          workoutDate: row.workoutDate,
        }));

        // Calculate volume metrics by exercise
        const volumeByExercise = calculateVolumeByExercise(transformedData);

        return volumeByExercise;
      } catch (error) {
        console.error("Error in getVolumeByExercise:", error);
        return [];
      }
    }),

  // Get set/rep distribution analytics
  getSetRepDistribution: protectedProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const { startDate, endDate } = getDateRangeFromUtils(
          input.timeRange,
          input.startDate,
          input.endDate,
        );

        const rawData = await ctx.db
          .select({
            sets: sessionExercises.sets,
            reps: sessionExercises.reps,
            weight: sessionExercises.weight,
            exerciseName: sessionExercises.exerciseName,
          })
          .from(sessionExercises)
          .innerJoin(
            workoutSessions,
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .where(
            and(
              eq(sessionExercises.user_id, ctx.user.id),
              gte(workoutSessions.workoutDate, startDate),
              lte(workoutSessions.workoutDate, endDate),
            ),
          );

        // Transform data to match expected types
        const transformedData = rawData.map((row) => ({
          sets: row.sets || 0,
          reps: row.reps || 0,
        }));

        // Calculate set/rep distribution
        const distribution = calculateSetRepDistribution(transformedData);

        return distribution;
      } catch (error) {
        console.error("Error in getSetRepDistribution:", error);
        return {
          setDistribution: [],
          repDistribution: [],
          repRangeDistribution: [],
          mostCommonSetRep: [],
        };
      }
    }),

  // Get exercise list for dropdown/selection
  getExerciseList: protectedProcedure.query(async ({ ctx }) => {
    try {
      logger.debug("Getting exercise list", { userId: ctx.user.id });
      const viewColumns = {
        templateExerciseId: sessionExerciseMetricsView.templateExerciseId,
        resolvedExerciseName: sessionExerciseMetricsView.resolvedExerciseName,
        fallbackExerciseName: sessionExerciseMetricsView.exerciseName,
        userId: sessionExerciseMetricsView.userId,
        workoutDate: sessionExerciseMetricsView.workoutDate,
      };

      if (
        !viewColumns.templateExerciseId ||
        !viewColumns.resolvedExerciseName ||
        !viewColumns.fallbackExerciseName ||
        !viewColumns.userId ||
        !viewColumns.workoutDate
      ) {
        throw new Error("sessionExerciseMetricsView columns are not defined");
      }

      const selectFields = {
        templateExerciseId: viewColumns.templateExerciseId!,
        resolvedExerciseName: viewColumns.resolvedExerciseName!,
        fallbackExerciseName: viewColumns.fallbackExerciseName!,
        lastUsed: sql<Date>`MAX(${viewColumns.workoutDate!})`,
        totalSets: sql<number>`COUNT(*)`,
        masterExerciseId: exerciseLinks.masterExerciseId,
        masterExerciseName: masterExercises.name,
      };

      let exercises: Array<{
        templateExerciseId: number | null;
        resolvedExerciseName: string | null;
        fallbackExerciseName: string | null;
        lastUsed: Date | string | number | null;
        totalSets: number | null;
        masterExerciseId: number | null;
        masterExerciseName: string | null;
      }> = [];
      let viewQueryFailed = false;

      try {
        exercises = await ctx.db
          .select(selectFields)
          .from(sessionExerciseMetricsView)
          .leftJoin(
            exerciseLinks,
            and(
              eq(
                exerciseLinks.templateExerciseId,
                viewColumns.templateExerciseId!,
              ),
              eq(exerciseLinks.user_id, ctx.user.id),
            ),
          )
          .leftJoin(
            masterExercises,
            eq(masterExercises.id, exerciseLinks.masterExerciseId),
          )
          .where(eq(viewColumns.userId!, ctx.user.id))
          .groupBy(
            viewColumns.templateExerciseId!,
            viewColumns.resolvedExerciseName!,
            viewColumns.fallbackExerciseName!,
            exerciseLinks.masterExerciseId,
            masterExercises.name,
          )
          .orderBy(desc(sql`MAX(${viewColumns.workoutDate!})`));
      } catch (error) {
        viewQueryFailed = true;
        logger.warn("sessionExerciseMetricsView not available, falling back", {
          error,
        });
      }

      if (viewQueryFailed || exercises.length === 0) {
        exercises = await ctx.db
          .select({
            templateExerciseId: sessionExercises.templateExerciseId,
            resolvedExerciseName: sessionExercises.resolvedExerciseName,
            fallbackExerciseName: sessionExercises.exerciseName,
            lastUsed: sql<Date>`MAX(${workoutSessions.workoutDate})`,
            totalSets: sql<number>`COUNT(*)`,
            masterExerciseId: exerciseLinks.masterExerciseId,
            masterExerciseName: masterExercises.name,
          })
          .from(sessionExercises)
          .innerJoin(
            workoutSessions,
            eq(workoutSessions.id, sessionExercises.sessionId),
          )
          .leftJoin(
            exerciseLinks,
            and(
              eq(
                exerciseLinks.templateExerciseId,
                sessionExercises.templateExerciseId,
              ),
              eq(exerciseLinks.user_id, ctx.user.id),
            ),
          )
          .leftJoin(
            masterExercises,
            eq(masterExercises.id, exerciseLinks.masterExerciseId),
          )
          .where(eq(sessionExercises.user_id, ctx.user.id))
          .groupBy(
            sessionExercises.templateExerciseId,
            sessionExercises.resolvedExerciseName,
            sessionExercises.exerciseName,
            exerciseLinks.masterExerciseId,
            masterExercises.name,
          )
          .orderBy(desc(sql`MAX(${workoutSessions.workoutDate})`));
      }

      const grouped = new Map<
        string,
        {
          id: string;
          exerciseName: string;
          lastUsed: Date;
          totalSets: number;
          aliasSet: Set<string>;
          templateIds: Set<number>;
          masterExerciseId: number | null;
        }
      >();

      const parseDate = (value: Date | string | number | null | undefined) => {
        if (value instanceof Date) return value;
        if (typeof value === "string" || typeof value === "number") {
          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
        }
        return new Date(0);
      };

      for (const exercise of exercises) {
        const resolvedName =
          typeof exercise.resolvedExerciseName === "string"
            ? exercise.resolvedExerciseName.trim()
            : "";
        const fallbackName =
          typeof exercise.fallbackExerciseName === "string"
            ? exercise.fallbackExerciseName.trim()
            : "";
        const masterName =
          typeof exercise.masterExerciseName === "string"
            ? exercise.masterExerciseName.trim()
            : "";
        const canonicalName =
          masterName || resolvedName || fallbackName || "Unknown Exercise";

        const key =
          typeof exercise.masterExerciseId === "number"
            ? `master:${exercise.masterExerciseId}`
            : `name:${canonicalName.toLowerCase()}`;

        let group = grouped.get(key);
        if (!group) {
          group = {
            id: key,
            exerciseName: canonicalName,
            lastUsed: new Date(0),
            totalSets: 0,
            aliasSet: new Set<string>(),
            templateIds: new Set<number>(),
            masterExerciseId: exercise.masterExerciseId ?? null,
          };
          grouped.set(key, group);
        }

        const lastUsedDate = parseDate(exercise.lastUsed);
        if (lastUsedDate.getTime() > group.lastUsed.getTime()) {
          group.lastUsed = lastUsedDate;
        }

        group.totalSets += Number(exercise.totalSets ?? 0);

        const alias =
          masterName || resolvedName || fallbackName || canonicalName;
        if (alias) {
          group.aliasSet.add(alias);
        }

        if (
          typeof exercise.templateExerciseId === "number" &&
          Number.isFinite(exercise.templateExerciseId)
        ) {
          group.templateIds.add(exercise.templateExerciseId);
        }
      }

      const normalizedExercises = Array.from(grouped.values())
        .map((group) => ({
          id: group.id,
          exerciseName: group.exerciseName,
          lastUsed: group.lastUsed,
          totalSets: group.totalSets,
          aliasCount: group.aliasSet.size,
          aliases: Array.from(group.aliasSet).sort((a, b) =>
            a.localeCompare(b),
          ),
          templateExerciseIds: Array.from(group.templateIds ?? []),
          masterExerciseId: group.masterExerciseId,
        }))
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

      logger.debug("Exercise list result", {
        count: normalizedExercises.length,
      });

      return normalizedExercises;
    } catch (error) {
      logger.error("Error in getExerciseList", error);
      return [];
    }
  }),
});

// Helper functions (legacy support)
export function getDateRange(
  timeRange: "week" | "month" | "quarter" | "year",
  startDate?: Date,
  endDate?: Date,
) {
  if (startDate && endDate) {
    return { startDate, endDate };
  }

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
  }

  return { startDate: start, endDate: end };
}

export function getPreviousPeriod(
  startDate: Date,
  endDate: Date,
): { startDate: Date; endDate: Date } {
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1); // 1ms before current period starts
  const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

  return { startDate: prevStartDate, endDate: prevEndDate };
}

type SessionMetricRow = {
  workoutDate: Date;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  unit: string | null;
  oneRMEstimate: number | null;
  volumeLoad: number | null;
};

type ExerciseSelection = {
  displayName: string;
  names: string[];
  templateExerciseIds: number[];
};

type LinkedExerciseSet = {
  templateExerciseIds: number[];
  exerciseNames: string[];
  masterExerciseName: string | null;
};

async function resolveExerciseSelection(
  database: typeof db,
  userId: string,
  params: { exerciseName?: string | null; templateExerciseId?: number | null },
): Promise<ExerciseSelection> {
  const nameSet = new Set<string>();
  const rawName = params.exerciseName?.trim();
  if (rawName) {
    nameSet.add(rawName);
  }

  let templateExerciseIds: number[] = [];
  if (typeof params.templateExerciseId === "number") {
    const linkedSet = await getLinkedExerciseSet(
      database,
      params.templateExerciseId,
      userId,
    );
    if (linkedSet) {
      templateExerciseIds = linkedSet.templateExerciseIds;
      linkedSet.exerciseNames.forEach((name) => {
        if (typeof name === "string" && name.trim().length > 0) {
          nameSet.add(name.trim());
        }
      });
      if (
        linkedSet.masterExerciseName &&
        linkedSet.masterExerciseName.trim().length > 0
      ) {
        nameSet.add(linkedSet.masterExerciseName.trim());
      }
    } else {
      templateExerciseIds = [params.templateExerciseId];
    }
  }

  const names = Array.from(nameSet);
  const displayName = rawName ?? names[0] ?? "Selected exercise";

  return {
    displayName,
    names,
    templateExerciseIds,
  };
}
async function fetchSessionMetricRows(
  database: typeof db,
  userId: string,
  selection: ExerciseSelection,
  startDate: Date,
  endDate: Date,
): Promise<SessionMetricRow[]> {
  if (
    selection.names.length === 0 &&
    selection.templateExerciseIds.length === 0
  ) {
    return [];
  }

  const resolvedNameColumn = sessionExerciseMetricsView.resolvedExerciseName;
  const userIdColumn = sessionExerciseMetricsView.userId;
  const workoutDateColumn = sessionExerciseMetricsView.workoutDate;
  const weightColumn = sessionExerciseMetricsView.weight;
  const repsColumn = sessionExerciseMetricsView.reps;
  const setsColumn = sessionExerciseMetricsView.sets;
  const unitColumn = sessionExerciseMetricsView.unit;
  const oneRmColumn = sessionExerciseMetricsView.oneRmEstimate;
  const volumeLoadColumn = sessionExerciseMetricsView.volumeLoad;
  const templateExerciseIdColumn =
    sessionExerciseMetricsView.templateExerciseId;
  const exerciseNameColumn = sessionExerciseMetricsView.exerciseName;

  if (
    !resolvedNameColumn ||
    !userIdColumn ||
    !workoutDateColumn ||
    !weightColumn ||
    !repsColumn ||
    !setsColumn ||
    !unitColumn ||
    !oneRmColumn ||
    !volumeLoadColumn ||
    !templateExerciseIdColumn ||
    !exerciseNameColumn
  ) {
    throw new Error("sessionExerciseMetricsView columns are not defined");
  }

  let rows: Array<{
    workoutDate: Date | string | number | null;
    weight: number | string | null;
    reps: number | string | null;
    sets: number | string | null;
    unit: string | null;
    oneRMEstimate: number | string | null;
    volumeLoad: number | string | null;
  }> = [];
  let viewQueryFailed = false;
  try {
    const matchClauses = [];

    if (selection.templateExerciseIds.length > 0) {
      matchClauses.push(
        selection.templateExerciseIds.length === 1
          ? eq(templateExerciseIdColumn!, selection.templateExerciseIds[0]!)
          : inArray(templateExerciseIdColumn!, selection.templateExerciseIds),
      );
    }

    if (selection.names.length > 0) {
      const nameClause =
        selection.names.length === 1
          ? or(
              eq(resolvedNameColumn!, selection.names[0]!),
              eq(exerciseNameColumn!, selection.names[0]!),
            )
          : or(
              inArray(resolvedNameColumn!, selection.names),
              inArray(exerciseNameColumn!, selection.names),
            );
      matchClauses.push(nameClause);
    }

    if (matchClauses.length === 0) {
      return [];
    }

    const combinedMatch =
      matchClauses.length === 1 ? matchClauses[0]! : or(...matchClauses);

    rows = await database
      .select({
        workoutDate: workoutDateColumn!,
        weight: weightColumn!,
        reps: repsColumn!,
        sets: setsColumn!,
        unit: unitColumn!,
        oneRMEstimate: oneRmColumn!,
        volumeLoad: volumeLoadColumn!,
      })
      .from(sessionExerciseMetricsView)
      .where(
        and(
          eq(userIdColumn!, userId),
          combinedMatch,
          gte(workoutDateColumn!, startDate.toISOString()),
          lte(workoutDateColumn!, endDate.toISOString()),
        ),
      )
      .orderBy(desc(workoutDateColumn!));
  } catch (error) {
    viewQueryFailed = true;
    logger.warn("sessionExerciseMetricsView unavailable for metrics fetch", {
      selection: selection.displayName,
      error,
    });
  }

  if (viewQueryFailed || rows.length === 0) {
    return fetchSessionMetricRowsFromBaseTable(
      database,
      userId,
      selection,
      startDate,
      endDate,
    );
  }

  return rows.map((row) => {
    const rawWorkoutDate = row.workoutDate as unknown;
    let workoutDate: Date;
    if (rawWorkoutDate instanceof Date) {
      workoutDate = rawWorkoutDate;
    } else if (
      typeof rawWorkoutDate === "string" ||
      typeof rawWorkoutDate === "number"
    ) {
      const parsed = new Date(rawWorkoutDate);
      workoutDate = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    } else {
      workoutDate = new Date(0);
    }

    return {
      workoutDate,
      weight:
        row.weight == null
          ? null
          : Number(row.weight as unknown as number | string),
      reps:
        row.reps == null
          ? null
          : Number(row.reps as unknown as number | string),
      sets:
        row.sets == null
          ? null
          : Number(row.sets as unknown as number | string),
      unit:
        typeof row.unit === "string" && row.unit.length > 0 ? row.unit : null,
      oneRMEstimate:
        row.oneRMEstimate == null
          ? null
          : Number(row.oneRMEstimate as unknown as number | string),
      volumeLoad:
        row.volumeLoad == null
          ? null
          : Number(row.volumeLoad as unknown as number | string),
    } satisfies SessionMetricRow;
  });
}

async function fetchSessionMetricRowsFromBaseTable(
  database: typeof db,
  userId: string,
  selection: ExerciseSelection,
  startDate: Date,
  endDate: Date,
): Promise<SessionMetricRow[]> {
  if (
    selection.names.length === 0 &&
    selection.templateExerciseIds.length === 0
  ) {
    return [];
  }

  const matchClauses = [];

  if (selection.templateExerciseIds.length > 0) {
    matchClauses.push(
      selection.templateExerciseIds.length === 1
        ? eq(
            sessionExercises.templateExerciseId,
            selection.templateExerciseIds[0]!,
          )
        : inArray(
            sessionExercises.templateExerciseId,
            selection.templateExerciseIds,
          ),
    );
  }

  if (selection.names.length > 0) {
    const nameClause =
      selection.names.length === 1
        ? or(
            eq(sessionExercises.resolvedExerciseName, selection.names[0]!),
            eq(sessionExercises.exerciseName, selection.names[0]!),
          )
        : or(
            inArray(sessionExercises.resolvedExerciseName, selection.names),
            inArray(sessionExercises.exerciseName, selection.names),
          );
    matchClauses.push(nameClause);
  }

  if (matchClauses.length === 0) {
    return [];
  }

  const combinedMatch =
    matchClauses.length === 1 ? matchClauses[0]! : or(...matchClauses);

  const baseRows = await database
    .select({
      workoutDate: workoutSessions.workoutDate,
      weight: sessionExercises.weight,
      reps: sessionExercises.reps,
      sets: sessionExercises.sets,
      unit: sessionExercises.unit,
      oneRMEstimate: sessionExercises.one_rm_estimate,
      volumeLoad: sessionExercises.volume_load,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, sessionExercises.sessionId),
    )
    .where(
      and(
        eq(sessionExercises.user_id, userId),
        combinedMatch,
        gte(workoutSessions.workoutDate, startDate),
        lte(workoutSessions.workoutDate, endDate),
      ),
    )
    .orderBy(desc(workoutSessions.workoutDate));

  return baseRows.map((row) => {
    const rawWorkoutDate = row.workoutDate as unknown;
    let workoutDate: Date;
    if (rawWorkoutDate instanceof Date) {
      workoutDate = rawWorkoutDate;
    } else if (
      typeof rawWorkoutDate === "string" ||
      typeof rawWorkoutDate === "number"
    ) {
      const parsed = new Date(rawWorkoutDate);
      workoutDate = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
    } else {
      workoutDate = new Date(0);
    }

    return {
      workoutDate,
      weight:
        row.weight == null
          ? null
          : Number(row.weight as unknown as number | string),
      reps:
        row.reps == null
          ? null
          : Number(row.reps as unknown as number | string),
      sets:
        row.sets == null
          ? null
          : Number(row.sets as unknown as number | string),
      unit:
        typeof row.unit === "string" && row.unit.length > 0 ? row.unit : null,
      oneRMEstimate:
        row.oneRMEstimate == null
          ? null
          : Number(row.oneRMEstimate as unknown as number | string),
      volumeLoad:
        row.volumeLoad == null
          ? null
          : Number(row.volumeLoad as unknown as number | string),
    } satisfies SessionMetricRow;
  });
}

async function getAllExerciseNames(database: typeof db, userId: string) {
  const resolvedNameColumn = sessionExerciseMetricsView.resolvedExerciseName;
  const userIdColumn = sessionExerciseMetricsView.userId;

  if (resolvedNameColumn && userIdColumn) {
    try {
      const rows = await database
        .select({
          exerciseName: resolvedNameColumn!,
        })
        .from(sessionExerciseMetricsView)
        .where(eq(userIdColumn!, userId))
        .groupBy(resolvedNameColumn!);

      const names = rows
        .map((row) =>
          typeof row.exerciseName === "string" ? row.exerciseName.trim() : "",
        )
        .filter((name): name is string => Boolean(name));

      if (names.length > 0) {
        return names;
      }
    } catch (error) {
      logger.warn("sessionExerciseMetricsView unavailable for name lookup", {
        error,
      });
    }
  }

  const fallbackRows = await database
    .select({
      resolvedExerciseName: sessionExercises.resolvedExerciseName,
      exerciseName: sessionExercises.exerciseName,
    })
    .from(sessionExercises)
    .where(eq(sessionExercises.user_id, userId))
    .groupBy(
      sessionExercises.resolvedExerciseName,
      sessionExercises.exerciseName,
    );

  return fallbackRows
    .map((row) => {
      const resolvedName =
        typeof row.resolvedExerciseName === "string"
          ? row.resolvedExerciseName.trim()
          : "";
      const fallbackName =
        typeof row.exerciseName === "string" ? row.exerciseName.trim() : "";
      return resolvedName || fallbackName;
    })
    .filter((name): name is string => Boolean(name));
}

export async function getLinkedExerciseNames(
  database: typeof db,
  templateExerciseId: number,
  userId: string,
): Promise<string[]> {
  const linkedSet = await getLinkedExerciseSet(
    database,
    templateExerciseId,
    userId,
  );
  return linkedSet ? linkedSet.exerciseNames : [];
}

async function getLinkedExerciseSet(
  database: typeof db,
  templateExerciseId: number,
  userId: string,
): Promise<LinkedExerciseSet | null> {
  try {
    const [templateRow] = await database
      .select({
        templateExerciseId: templateExercises.id,
        templateName: templateExercises.exerciseName,
        masterExerciseId: exerciseLinks.masterExerciseId,
        masterExerciseName: masterExercises.name,
      })
      .from(templateExercises)
      .leftJoin(
        exerciseLinks,
        and(
          eq(exerciseLinks.templateExerciseId, templateExercises.id),
          eq(exerciseLinks.user_id, userId),
        ),
      )
      .leftJoin(
        masterExercises,
        eq(masterExercises.id, exerciseLinks.masterExerciseId),
      )
      .where(
        and(
          eq(templateExercises.id, templateExerciseId),
          eq(templateExercises.user_id, userId),
        ),
      )
      .limit(1);

    if (!templateRow) {
      return null;
    }

    const names = new Set<string>();
    const templateIds = new Set<number>();

    templateIds.add(templateRow.templateExerciseId);

    if (templateRow.templateName) {
      names.add(templateRow.templateName);
    }

    if (templateRow.masterExerciseName) {
      names.add(templateRow.masterExerciseName);
    }

    if (templateRow.masterExerciseId) {
      const linkedRows = await database
        .select({
          templateExerciseId: exerciseLinks.templateExerciseId,
          exerciseName: templateExercises.exerciseName,
        })
        .from(exerciseLinks)
        .innerJoin(
          templateExercises,
          eq(templateExercises.id, exerciseLinks.templateExerciseId),
        )
        .where(
          and(
            eq(exerciseLinks.masterExerciseId, templateRow.masterExerciseId),
            eq(exerciseLinks.user_id, userId),
          ),
        );

      for (const row of linkedRows) {
        if (typeof row.templateExerciseId === "number") {
          templateIds.add(row.templateExerciseId);
        }
        if (row.exerciseName) {
          names.add(row.exerciseName);
        }
      }
    }

    return {
      templateExerciseIds: Array.from(templateIds),
      exerciseNames: Array.from(names),
      masterExerciseName: templateRow.masterExerciseName ?? null,
    };
  } catch (error) {
    logger.error("Error resolving linked exercise set", error, {
      templateExerciseId,
      userId,
    });
    return null;
  }
}

type ProgressDataRow = {
  workoutDate: Date;
  exerciseName: string;
  weight: string | null;
  reps: number | null;
  sets: number | null;
  unit: string;
  oneRMEstimate: number;
};

export function processTopSets(progressData: ProgressDataRow[]): Array<{
  workoutDate: Date;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  unit: string;
  oneRMEstimate: number;
}> {
  // Group by workout date and exercise name, then get top set for each
  const grouped = progressData.reduce(
    (acc, row) => {
      const key = `${row.workoutDate.toISOString()}-${row.exerciseName}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    },
    {} as Record<string, ProgressDataRow[]>,
  );

  const topSets = Object.values(grouped).map((group) => {
    // Sort by weight descending and get the top set
    const sortedByWeight = group.sort((a, b) => {
      const weightA = parseFloat(String(a.weight || "0"));
      const weightB = parseFloat(String(b.weight || "0"));
      return weightB - weightA;
    });

    return sortedByWeight[0]!;
  });

  return topSets.map((set) => ({
    workoutDate: set.workoutDate,
    exerciseName: set.exerciseName,
    weight: parseFloat(String(set.weight || "0")),
    reps: set.reps || 0,
    sets: set.sets || 1,
    unit: set.unit,
    oneRMEstimate: calculateLocalOneRM(
      parseFloat(String(set.weight || "0")),
      set.reps || 1,
    ),
  }));
}

type StrengthTrend = "up" | "down" | "flat";

type StrengthSetRow = {
  workoutDate: Date;
  exerciseName: string;
  weight: unknown;
  reps: number | null;
  oneRMEstimate: unknown;
};

type StrengthSetSummary = {
  maxOneRm: number;
  bestLift: {
    exerciseName: string;
    weight: number;
    reps: number;
    oneRm: number;
    workoutDate: Date;
  } | null;
  heavySetCount: number;
  sessionCount: number;
  lastWorkoutDate: Date | null;
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return 0;
}

function summarizeStrengthSets(rows: StrengthSetRow[]): StrengthSetSummary {
  if (!rows.length) {
    return {
      maxOneRm: 0,
      bestLift: null,
      heavySetCount: 0,
      sessionCount: 0,
      lastWorkoutDate: null,
    };
  }

  const normalized = rows.map((row) => {
    const weight = toNumber(row.weight);
    const reps = row.reps ?? 0;
    const estimated = toNumber(row.oneRMEstimate);
    const oneRmCandidate =
      estimated > 0
        ? estimated
        : calculateLocalOneRM(weight, Math.max(reps, 1));

    return {
      workoutDate: row.workoutDate,
      exerciseName: row.exerciseName,
      weight,
      reps,
      oneRm: Number.isFinite(oneRmCandidate) ? oneRmCandidate : 0,
    };
  });

  const bestLift = normalized.reduce<StrengthSetSummary["bestLift"]>(
    (best, entry) => {
      if (!best || entry.oneRm > best.oneRm) {
        return {
          exerciseName: entry.exerciseName,
          weight: entry.weight,
          reps: entry.reps,
          oneRm: entry.oneRm,
          workoutDate: entry.workoutDate,
        };
      }
      return best;
    },
    null,
  );

  const maxOneRm = bestLift?.oneRm ?? 0;
  const heavyThreshold = maxOneRm > 0 ? maxOneRm * 0.85 : 0;
  const heavySetCount =
    heavyThreshold > 0
      ? normalized.filter((entry) => entry.oneRm >= heavyThreshold).length
      : 0;

  const sessionCount = new Set(
    normalized.map((entry) => entry.workoutDate.toDateString()),
  ).size;

  const lastWorkoutDate = normalized.reduce<Date | null>((latest, entry) => {
    if (!latest) return entry.workoutDate;
    return entry.workoutDate > latest ? entry.workoutDate : latest;
  }, null);

  return {
    maxOneRm: maxOneRm > 0 ? Math.round(maxOneRm * 10) / 10 : 0,
    bestLift,
    heavySetCount,
    sessionCount,
    lastWorkoutDate,
  };
}

export function calculateVolumeMetrics(
  volumeData: {
    workoutDate: Date;
    exerciseName: string;
    weight: number;
    reps: number;
    sets: number;
  }[],
): Array<{
  workoutDate: Date;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
}> {
  // Group by workout date
  const grouped = volumeData.reduce(
    (acc, row) => {
      const dateKey = row.workoutDate.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = {
          workoutDate: row.workoutDate,
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          exerciseCount: new Set(),
        };
      }

      const weight = parseFloat(String(row.weight || "0"));
      const reps = row.reps || 0;
      const sets = row.sets || 0; // Changed from || 1 to || 0 to preserve zero values

      acc[dateKey].totalVolume += weight * reps * sets;
      acc[dateKey].totalSets += sets;
      acc[dateKey].totalReps += reps * sets;
      acc[dateKey].exerciseCount.add(row.exerciseName);

      return acc;
    },
    {} as Record<
      string,
      {
        workoutDate: Date;
        totalVolume: number;
        totalSets: number;
        totalReps: number;
        exerciseCount: Set<string>;
      }
    >,
  );

  return Object.values(grouped).map((day) => ({
    workoutDate: day.workoutDate,
    totalVolume: day.totalVolume,
    totalSets: day.totalSets,
    totalReps: day.totalReps,
    uniqueExercises: day.exerciseCount.size,
  }));
}

function buildHighlightMotivator(input: {
  prsCount?: number;
  streak?: number;
  totalVolume?: number;
  goalCompletion?: number;
}): HighlightMotivator | undefined {
  if ((input.prsCount ?? 0) >= 3) {
    return {
      emoji: "🚀",
      title: "On fire",
      message: `${input.prsCount} new PRs logged. Momentum is real.`,
      tone: "success",
    };
  }

  if ((input.streak ?? 0) >= 7) {
    return {
      emoji: "🔥",
      title: "Streak master",
      message: `${input.streak} days in a row. Keep rolling.`,
      tone: "warning",
    };
  }

  if ((input.goalCompletion ?? 0) >= 90) {
    return {
      emoji: "🎯",
      title: "Goal crusher",
      message: `You've completed ${Math.round(
        input.goalCompletion ?? 0,
      )}% of your target.`,
      tone: "info",
    };
  }

  if ((input.totalVolume ?? 0) > 10000) {
    return {
      emoji: "💪",
      title: "Volume beast",
      message: `${Math.round(
        input.totalVolume ?? 0,
      ).toLocaleString()} kg moved this block.`,
      tone: "success",
    };
  }

  return {
    emoji: "🌱",
    title: "Keep going",
    message: "Each session compounds. Stay consistent.",
    tone: "info",
  };
}

function calculateBestWeek(dates: Date[]) {
  if (dates.length === 0) return null;

  const weekMap = new Map<
    string,
    { count: number; weekStart: Date; lastWorkout: Date }
  >();

  for (const date of dates) {
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString();

    const entry = weekMap.get(key) ?? {
      count: 0,
      weekStart,
      lastWorkout: date,
    };
    entry.count += 1;
    entry.lastWorkout =
      entry.lastWorkout.getTime() < date.getTime() ? date : entry.lastWorkout;
    weekMap.set(key, entry);
  }

  const best = Array.from(weekMap.values()).sort((a, b) => {
    if (b.count === a.count) {
      return b.lastWorkout.getTime() - a.lastWorkout.getTime();
    }
    return b.count - a.count;
  })[0];

  if (!best) return null;
  return {
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(best.weekStart),
    count: best.count,
  };
}

export function calculateConsistencyMetrics(
  workoutDates: Date[],
  startDate: Date,
  endDate: Date,
): {
  totalWorkouts: number;
  frequency: number;
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
} {
  const dates = workoutDates.map((w) => new Date(w.toDateString()));
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const workoutDays = dates.length;

  // Calculate frequency (workouts per week)
  const weeks = Math.max(1, totalDays / 7);
  const frequency = workoutDays / weeks;

  // Calculate current streak
  const currentStreak = calculateCurrentStreak(dates);

  // Calculate longest streak in period
  const longestStreak = calculateLongestStreak(dates);

  return {
    totalWorkouts: workoutDays,
    frequency: Math.round(frequency * 10) / 10, // Round to 1 decimal
    currentStreak,
    longestStreak,
    consistencyScore: Math.min(100, Math.round((frequency / 3) * 100)), // Target 3x per week
  };
}

export function calculateCurrentStreak(dates: Date[]) {
  if (dates.length === 0) return 0;

  const today = new Date();
  let streak = 0;
  let currentDate = new Date(today);

  // Sort dates descending
  const sortedDates = dates.sort((a, b) => b.getTime() - a.getTime());

  for (const workoutDate of sortedDates) {
    const daysDiff = Math.floor(
      (currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff <= 1) {
      streak++;
      currentDate = new Date(workoutDate);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateLongestStreak(dates: Date[]) {
  if (dates.length === 0) return 0;

  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currentDate = sortedDates[i];
    const daysDiff = Math.floor(
      (currentDate!.getTime() - prevDate!.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff <= 7) {
      // Within a week counts as continuing streak
      currentStreak++;
    } else {
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 1;
    }
  }

  return Math.max(maxStreak, currentStreak);
}

export async function calculatePersonalRecords(
  ctx: { db: typeof db; user: { id: string } },
  exerciseNames: string[],
  startDate: Date,
  endDate: Date,
  recordType: "weight" | "volume" | "both",
): Promise<
  Array<{
    exerciseName: string;
    recordType: "weight" | "volume";
    weight: number;
    reps: number;
    sets: number;
    unit: string;
    workoutDate: Date;
    oneRMEstimate?: number;
    totalVolume?: number;
  }>
> {
  if (exerciseNames.length === 0) {
    return [];
  }

  // Create a single batched query to fetch all exercise data at once
  type ExerciseDataRow = {
    workoutDate: Date;
    weight: number | null;
    reps: number | null;
    sets: number | null;
    unit: string | null;
    oneRMEstimate: number | null;
    volumeLoad: number | null;
    exerciseName: string;
  };

  const resolvedNameColumn = sessionExerciseMetricsView.resolvedExerciseName;
  const userIdColumn = sessionExerciseMetricsView.userId;
  const workoutDateColumn = sessionExerciseMetricsView.workoutDate;
  const weightColumn = sessionExerciseMetricsView.weight;
  const repsColumn = sessionExerciseMetricsView.reps;
  const setsColumn = sessionExerciseMetricsView.sets;
  const unitColumn = sessionExerciseMetricsView.unit;
  const oneRmColumn = sessionExerciseMetricsView.oneRmEstimate;
  const volumeLoadColumn = sessionExerciseMetricsView.volumeLoad;
  const exerciseNameColumn = sessionExerciseMetricsView.exerciseName;

  if (
    !resolvedNameColumn ||
    !userIdColumn ||
    !workoutDateColumn ||
    !weightColumn ||
    !repsColumn ||
    !setsColumn ||
    !unitColumn ||
    !oneRmColumn ||
    !volumeLoadColumn ||
    !exerciseNameColumn
  ) {
    throw new Error("sessionExerciseMetricsView columns are not defined");
  }

  let allExerciseData: ExerciseDataRow[] = [];

  try {
    // Use whereInChunks to handle large exercise lists within D1 limits
    await whereInChunks(exerciseNames, async (nameChunk) => {
      const nameClause =
        nameChunk.length === 1
          ? or(
              eq(resolvedNameColumn!, nameChunk[0]!),
              eq(exerciseNameColumn!, nameChunk[0]!),
            )
          : or(
              inArray(resolvedNameColumn!, nameChunk),
              inArray(exerciseNameColumn!, nameChunk),
            );

      const chunkData = await ctx.db
        .select({
          workoutDate: workoutDateColumn!,
          weight: weightColumn!,
          reps: repsColumn!,
          sets: setsColumn!,
          unit: unitColumn!,
          oneRMEstimate: oneRmColumn!,
          volumeLoad: volumeLoadColumn!,
          exerciseName: resolvedNameColumn!,
        })
        .from(sessionExerciseMetricsView)
        .where(
          and(
            eq(userIdColumn!, ctx.user.id),
            nameClause,
            gte(workoutDateColumn!, startDate.toISOString()),
            lte(workoutDateColumn!, endDate.toISOString()),
          ),
        )
        .orderBy(desc(workoutDateColumn!));

      // Normalize chunk data
      const normalizedChunk: ExerciseDataRow[] = chunkData
        .map((row) => {
          const rawWorkoutDate = row.workoutDate as unknown;
          let workoutDate: Date;
          if (rawWorkoutDate instanceof Date) {
            workoutDate = rawWorkoutDate;
          } else if (
            typeof rawWorkoutDate === "string" ||
            typeof rawWorkoutDate === "number"
          ) {
            const parsed = new Date(rawWorkoutDate);
            workoutDate = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
          } else {
            workoutDate = new Date(0);
          }

          const exerciseName = row.exerciseName! || "Unknown Exercise";

          return {
            workoutDate,
            weight:
              row.weight == null
                ? null
                : Number(row.weight as unknown as number | string),
            reps:
              row.reps == null
                ? null
                : Number(row.reps as unknown as number | string),
            sets:
              row.sets == null
                ? null
                : Number(row.sets as unknown as number | string),
            unit: row.unit ?? "kg",
            oneRMEstimate:
              row.oneRMEstimate == null
                ? null
                : Number(row.oneRMEstimate as unknown as number | string),
            volumeLoad:
              row.volumeLoad == null
                ? null
                : Number(row.volumeLoad as unknown as number | string),
            exerciseName,
          };
        })
        .filter((row) => row.exerciseName !== "Unknown Exercise");

      allExerciseData = allExerciseData.concat(normalizedChunk);
    });
  } catch (error) {
    logger.warn("sessionExerciseMetricsView unavailable for PR calculation", {
      error,
    });
    // Fall back to base table query
    await whereInChunks(exerciseNames, async (nameChunk) => {
      const nameClause =
        nameChunk.length === 1
          ? or(
              eq(sessionExercises.resolvedExerciseName, nameChunk[0]!),
              eq(sessionExercises.exerciseName, nameChunk[0]!),
            )
          : or(
              inArray(sessionExercises.resolvedExerciseName, nameChunk),
              inArray(sessionExercises.exerciseName, nameChunk),
            );

      const chunkData = await ctx.db
        .select({
          workoutDate: workoutSessions.workoutDate,
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          unit: sessionExercises.unit,
          oneRMEstimate: sessionExercises.one_rm_estimate,
          volumeLoad: sql<number>`${sessionExercises.weight} * ${sessionExercises.reps} * ${sessionExercises.sets}`,
          exerciseName: sessionExercises.resolvedExerciseName,
        })
        .from(sessionExercises)
        .innerJoin(
          workoutSessions,
          eq(workoutSessions.id, sessionExercises.sessionId),
        )
        .where(
          and(
            eq(sessionExercises.user_id, ctx.user.id),
            nameClause,
            gte(workoutSessions.workoutDate, startDate),
            lte(workoutSessions.workoutDate, endDate),
          ),
        )
        .orderBy(desc(workoutSessions.workoutDate));

      // Normalize chunk data
      const normalizedChunk: ExerciseDataRow[] = chunkData
        .map((row) => {
          const rawWorkoutDate = row.workoutDate as unknown;
          let workoutDate: Date;
          if (rawWorkoutDate instanceof Date) {
            workoutDate = rawWorkoutDate;
          } else if (
            typeof rawWorkoutDate === "string" ||
            typeof rawWorkoutDate === "number"
          ) {
            const parsed = new Date(rawWorkoutDate);
            workoutDate = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
          } else {
            workoutDate = new Date(0);
          }

          const exerciseName = row.exerciseName! || "Unknown Exercise";

          return {
            workoutDate,
            weight: row.weight ? Number(row.weight) : null,
            reps: row.reps ? Number(row.reps) : null,
            sets: row.sets ? Number(row.sets) : null,
            unit: row.unit ?? "kg",
            oneRMEstimate: row.oneRMEstimate ? Number(row.oneRMEstimate) : null,
            volumeLoad: row.volumeLoad ? Number(row.volumeLoad) : null,
            exerciseName,
          };
        })
        .filter((row) => row.exerciseName !== "Unknown Exercise");

      allExerciseData = allExerciseData.concat(normalizedChunk);
    });
  }

  // Group data by exercise name
  const exerciseDataMap = new Map<string, ExerciseDataRow[]>();
  for (const row of allExerciseData) {
    if (!exerciseDataMap.has(row.exerciseName)) {
      exerciseDataMap.set(row.exerciseName, []);
    }
    exerciseDataMap.get(row.exerciseName)!.push(row);
  }

  // Calculate PRs for each exercise
  const records = [];
  for (const exerciseName of exerciseNames) {
    const exerciseData = exerciseDataMap.get(exerciseName) || [];

    // When exerciseData is empty, skip
    if (exerciseData.length === 0) continue;

    // Find weight PR
    const weightPR = exerciseData.reduce((max, current) => {
      const currentWeight = current.weight || 0;
      const maxWeight = max.weight || 0;
      return currentWeight > maxWeight ? current : max;
    });

    // Find volume PR
    const volumePR = exerciseData.reduce((max, current) => {
      const currentVolume =
        (current.weight || 0) * (current.reps || 0) * (current.sets || 1);
      const maxVolume = (max.weight || 0) * (max.reps || 0) * (max.sets || 1);
      return currentVolume > maxVolume ? current : max;
    });

    if (recordType === "weight" || recordType === "both") {
      records.push({
        exerciseName,
        recordType: "weight" as const,
        weight: weightPR.weight || 0,
        reps: weightPR.reps || 0,
        sets: weightPR.sets || 0,
        unit: weightPR.unit ?? "kg",
        workoutDate: weightPR.workoutDate,
        oneRMEstimate: calculateLocalOneRM(
          weightPR.weight || 0,
          weightPR.reps || 1,
        ),
      });
    }

    if (recordType === "volume" || recordType === "both") {
      const volume =
        (volumePR.weight || 0) * (volumePR.reps || 0) * (volumePR.sets || 1);
      records.push({
        exerciseName,
        recordType: "volume" as const,
        weight: volumePR.weight || 0,
        reps: volumePR.reps || 0,
        sets: volumePR.sets || 0,
        unit: volumePR.unit ?? "kg",
        workoutDate: volumePR.workoutDate,
        totalVolume: volume,
      });
    }
  }

  return records;
}

export async function getVolumeAndStrengthData(
  ctx: { db: typeof db; user: { id: string } },
  startDate: Date,
  endDate: Date,
): Promise<{
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  uniqueExercises: number;
  workoutCount: number;
}> {
  try {
    const data = await ctx.db
      .select({
        exerciseName: sessionExercises.exerciseName,
        weight: sessionExercises.weight,
        reps: sessionExercises.reps,
        sets: sessionExercises.sets,
        unit: sessionExercises.unit,
      })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(workoutSessions.id, sessionExercises.sessionId),
      )
      .where(
        and(
          eq(sessionExercises.user_id, ctx.user.id),
          gte(workoutSessions.workoutDate, startDate),
          lte(workoutSessions.workoutDate, endDate),
        ),
      );

    const workoutCountRows = await ctx.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.user_id, ctx.user.id),
          gte(workoutSessions.workoutDate, startDate),
          lte(workoutSessions.workoutDate, endDate),
        ),
      );

    const totalVolume = data.reduce((sum: number, row) => {
      return (
        sum +
        parseFloat(String(row.weight || "0")) *
          (row.reps || 0) *
          (row.sets || 1)
      );
    }, 0);

    const totalSets = data.reduce(
      (sum: number, row) => sum + (row.sets || 1),
      0,
    );
    const totalReps = data.reduce(
      (sum: number, row) => sum + (row.reps || 0) * (row.sets || 1),
      0,
    );
    const uniqueExercises = new Set(data.map((row) => row.exerciseName)).size;

    return {
      totalVolume,
      totalSets,
      totalReps,
      uniqueExercises,
      workoutCount: Number(workoutCountRows[0]?.count ?? 0),
    };
  } catch (error) {
    console.error("Error in getVolumeAndStrengthData:", error);
    return {
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      uniqueExercises: 0,
      workoutCount: 0,
    };
  }
}

export function calculateChanges(
  current: {
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    uniqueExercises: number;
  },
  previous: {
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    uniqueExercises: number;
  },
): {
  volumeChange: number;
  setsChange: number;
  repsChange: number;
} {
  const volumeChange =
    previous.totalVolume > 0
      ? ((current.totalVolume - previous.totalVolume) / previous.totalVolume) *
        100
      : 0;

  const setsChange =
    previous.totalSets > 0
      ? ((current.totalSets - previous.totalSets) / previous.totalSets) * 100
      : 0;

  const repsChange =
    previous.totalReps > 0
      ? ((current.totalReps - previous.totalReps) / previous.totalReps) * 100
      : 0;

  return {
    volumeChange: Math.round(volumeChange * 10) / 10,
    setsChange: Math.round(setsChange * 10) / 10,
    repsChange: Math.round(repsChange * 10) / 10,
  };
}

export function calculateVolumeByExercise(
  volumeData: {
    exerciseName: string;
    weight: number;
    reps: number;
    sets: number;
    workoutDate: Date;
  }[],
): Array<{
  exerciseName: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  sessions: number;
  averageVolume: number;
  percentOfTotal: number;
}> {
  // Group by exercise name
  const grouped = volumeData.reduce(
    (acc, row) => {
      if (!acc[row.exerciseName]) {
        acc[row.exerciseName] = {
          exerciseName: row.exerciseName,
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          sessionDates: new Set(),
        };
      }

      const weight = parseFloat(String(row.weight || "0"));
      const reps = row.reps || 0;
      const sets = row.sets || 1;

      acc[row.exerciseName]!.totalVolume += weight * reps * sets;
      acc[row.exerciseName]!.totalSets += sets;
      acc[row.exerciseName]!.totalReps += reps * sets;
      acc[row.exerciseName]!.sessionDates.add(row.workoutDate.toDateString());

      return acc;
    },
    {} as Record<
      string,
      {
        exerciseName: string;
        totalVolume: number;
        totalSets: number;
        totalReps: number;
        sessionDates: Set<string>;
      }
    >,
  );

  const exercises = Object.values(grouped).map((exercise) => ({
    exerciseName: exercise.exerciseName,
    totalVolume: exercise.totalVolume,
    totalSets: exercise.totalSets,
    totalReps: exercise.totalReps,
    sessions: exercise.sessionDates.size,
    averageVolume: exercise.totalVolume / exercise.sessionDates.size,
  }));

  // Calculate total volume across all exercises for percentage calculation
  const totalVolumeAll = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0);

  return exercises
    .map((exercise) => ({
      ...exercise,
      percentOfTotal:
        totalVolumeAll > 0 ? (exercise.totalVolume / totalVolumeAll) * 100 : 0,
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume); // Sort by total volume descending
}

export function calculateSetRepDistribution(
  rawData: {
    sets: number;
    reps: number;
  }[],
): {
  setDistribution: Array<{ sets: number; count: number; percentage: number }>;
  repDistribution: Array<{ reps: number; count: number; percentage: number }>;
  repRangeDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  mostCommonSetRep: Array<{
    sets: number;
    reps: number;
    count: number;
    percentage: number;
  }>;
} {
  const totalEntries = rawData.length;

  // Sets distribution
  const setsCount = rawData.reduce(
    (acc, row) => {
      const sets = row.sets || 0; // Changed from || 1 to || 0 to match test expectation
      acc[sets] = (acc[sets] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const setDistribution = Object.entries(setsCount)
    .map(([sets, count]) => ({
      sets: parseInt(sets),
      count: count as number,
      percentage: ((count as number) / totalEntries) * 100,
    }))
    .sort((a, b) => a.sets - b.sets);

  // Reps distribution
  const repsCount = rawData.reduce(
    (acc, row) => {
      const reps = row.reps || 0;
      acc[reps] = (acc[reps] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const repDistribution = Object.entries(repsCount)
    .map(([reps, count]) => ({
      reps: parseInt(reps),
      count: count as number,
      percentage: ((count as number) / totalEntries) * 100,
    }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 10); // Top 10 most common rep counts

  // Rep range distribution
  const repRanges = rawData.reduce(
    (acc, row) => {
      const reps = row.reps || 0;
      let range: string;

      if (reps <= 5) range = "1-5 reps (Strength)";
      else if (reps <= 8) range = "6-8 reps (Strength-Hypertrophy)";
      else if (reps <= 12) range = "9-12 reps (Hypertrophy)";
      else if (reps <= 15) range = "13-15 reps (Hypertrophy-Endurance)";
      else range = "16+ reps (Endurance)";

      acc[range] = (acc[range] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const repRangeDistribution = Object.entries(repRanges)
    .map(([range, count]) => ({
      range,
      count: count as number,
      percentage: ((count as number) / totalEntries) * 100,
    }))
    .sort((a, b) => (b.count as number) - (a.count as number));

  // Most common set/rep combinations
  const setRepCombos = rawData.reduce(
    (acc, row) => {
      const key = `${row.sets || 0}x${row.reps || 0}`; // Changed from || 1 to || 0
      const sets = row.sets || 0; // Changed from || 1 to || 0
      const reps = row.reps || 0;

      if (!acc[key]) {
        acc[key] = { sets, reps, count: 0 };
      }
      acc[key].count++;
      return acc;
    },
    {} as Record<string, { sets: number; reps: number; count: number }>,
  );

  const mostCommonSetRep = (
    Object.values(setRepCombos) as {
      sets: number;
      reps: number;
      count: number;
    }[]
  )
    .map((combo) => ({
      sets: combo.sets,
      reps: combo.reps,
      count: combo.count,
      percentage: (combo.count / totalEntries) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 most common combinations

  return {
    setDistribution,
    repDistribution,
    repRangeDistribution,
    mostCommonSetRep,
  };
}

export function calculateLocalOneRM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (weight <= 0 || reps <= 0) return 0;

  // Use Brzycki formula: weight × (36 / (37 - reps))
  if (reps <= 36) {
    const brzycki = weight * (36 / (37 - reps));
    if (brzycki > 0 && isFinite(brzycki)) {
      return Math.round(brzycki * 100) / 100; // Round to 2 decimal places
    }
  }

  // Fallback to Epley formula: weight × (1 + reps/30)
  const epley = weight * (1 + reps / 30);
  return Math.round(epley * 100) / 100;
}
