"use client";

import { getQueryKey } from "@trpc/react-query";
import { type QueryClient, type QueryKey } from "@tanstack/react-query";

import { api, type RouterInputs, type RouterOutputs } from "~/trpc/react";
import { logger } from "~/lib/logger";

type TrpcUtils = ReturnType<typeof api.useUtils>;

const progressWorkoutDatesRoot = getQueryKey(api.progress.getWorkoutDates);
const progressVolumeRoot = getQueryKey(api.progress.getVolumeProgression);

type VolumeEntry =
  RouterOutputs["progress"]["getVolumeProgression"]["data"][number];
type VolumeSummary = Pick<
  VolumeEntry,
  "totalVolume" | "totalSets" | "totalReps" | "uniqueExercises"
>;

function coerceDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function isWithinRange(
  target: Date,
  start: unknown | undefined,
  end: unknown | undefined,
): boolean {
  const startDate = coerceDate(start);
  const endDate = coerceDate(end);
  if (startDate && target < startDate) {
    return false;
  }
  if (endDate && target > endDate) {
    return false;
  }
  return true;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/**
 * Optimistically add a workout date to cached `progress.getWorkoutDates` queries.
 * Helps dashboard cards reflect the latest completion immediately.
 */
export function applyOptimisticWorkoutDate(
  queryClient: QueryClient,
  workoutDate: Date | string | null | undefined,
): void {
  const normalizedDate = coerceDate(workoutDate);
  if (!normalizedDate) return;

  const isoDate = toIsoDate(normalizedDate);
  const matches = queryClient.getQueriesData<string[]>({
    queryKey: progressWorkoutDatesRoot,
  });

  for (const [key] of matches) {
    const queryKey = key as QueryKey;
    const maybeOpts = queryKey[1] as { input?: unknown } | undefined;
    const input = maybeOpts?.input as
      | {
          startDate?: unknown;
          endDate?: unknown;
        }
      | undefined;

    if (
      input &&
      !isWithinRange(normalizedDate, input.startDate, input.endDate)
    ) {
      continue;
    }

    queryClient.setQueryData<string[] | undefined>(queryKey, (existing) => {
      if (!existing) {
        return [isoDate];
      }
      if (existing.includes(isoDate)) {
        return existing;
      }
      return [isoDate, ...existing];
    });
  }
}

/**
 * Summarise workout volume metrics from a workout save payload.
 * Returns null when there are no meaningful sets to include.
 */
export function calculateVolumeSummaryFromExercises(
  exercises: RouterInputs["workouts"]["save"]["exercises"],
): VolumeSummary | null {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  const uniqueExercises = new Set<string>();

  for (const exercise of exercises ?? []) {
    const name =
      typeof exercise.exerciseName === "string"
        ? exercise.exerciseName.trim()
        : "";
    let exerciseContributed = false;

    for (const set of exercise.sets ?? []) {
      const weight = typeof set.weight === "number" ? set.weight : 0;
      const reps = typeof set.reps === "number" ? set.reps : 0;
      const sets = typeof set.sets === "number" ? set.sets : 1;

      if (reps > 0 || weight > 0) {
        exerciseContributed = true;
      }

      totalVolume += weight * reps * sets;
      totalSets += sets;
      totalReps += reps * sets;
    }

    if (exerciseContributed && name) {
      uniqueExercises.add(name);
    }
  }

  if (totalVolume === 0 && totalSets === 0 && totalReps === 0) {
    return null;
  }

  return {
    totalVolume,
    totalSets,
    totalReps,
    uniqueExercises: uniqueExercises.size,
  };
}

/**
 * Optimistically merge volume metrics into cached `progress.getVolumeProgression` queries.
 * Keeps dashboard volume cards in sync immediately after a workout save.
 */
export function applyOptimisticVolumeMetrics(
  queryClient: QueryClient,
  workoutDate: Date | string | null | undefined,
  summary: VolumeSummary | null | undefined,
): void {
  const normalizedDate = coerceDate(workoutDate);
  if (!normalizedDate || !summary) return;

  const isoDate = toIsoDate(normalizedDate);
  const matches = queryClient.getQueriesData<VolumeEntry[]>({
    queryKey: progressVolumeRoot,
  });

  for (const [key] of matches) {
    const queryKey = key as QueryKey;
    const maybeOpts = queryKey[1] as { input?: unknown } | undefined;
    const input = maybeOpts?.input as
      | {
          startDate?: unknown;
          endDate?: unknown;
        }
      | undefined;

    if (
      input &&
      !isWithinRange(normalizedDate, input.startDate, input.endDate)
    ) {
      continue;
    }

    queryClient.setQueryData<VolumeEntry[] | undefined>(
      queryKey,
      (existing) => {
        const next: VolumeEntry[] = Array.isArray(existing)
          ? existing.map((entry) => ({
              ...entry,
              workoutDate: coerceDate(entry.workoutDate) ?? normalizedDate,
            }))
          : [];

        const normalizedEntry: VolumeEntry = {
          workoutDate: normalizedDate,
          totalVolume: summary.totalVolume,
          totalSets: summary.totalSets,
          totalReps: summary.totalReps,
          uniqueExercises: summary.uniqueExercises,
        };

        const existingIndex = next.findIndex((entry) => {
          const entryDate = coerceDate(entry.workoutDate);
          return entryDate ? toIsoDate(entryDate) === isoDate : false;
        });

        if (existingIndex >= 0) {
          next[existingIndex] = normalizedEntry;
        } else {
          next.unshift(normalizedEntry);
        }

        next.sort((a, b) => {
          const dateA = coerceDate(a.workoutDate) ?? normalizedDate;
          const dateB = coerceDate(b.workoutDate) ?? normalizedDate;
          return dateB.getTime() - dateA.getTime();
        });

        return next;
      },
    );
  }
}

/**
 * Invalidate caches that rely on fresh workout, progress, and wellness data.
 * Centralised helper so both online mutations and offline queue flushes stay in sync.
 */
export async function invalidateWorkoutDependentCaches(
  utils: TrpcUtils,
  sessionIds: Iterable<number> = [],
): Promise<void> {
  const startTime = performance.now();
  const sessionIdsArray = Array.from(sessionIds);
  
  console.info(`[CACHE_INVALIDATION] Starting invalidation for ${sessionIdsArray.length} sessions:`, sessionIdsArray);
  
  const invalidations: Array<Promise<unknown>> = [
    utils.workouts.getRecent.invalidate(),
    utils.templates.getAll.invalidate(),
    utils.progress.getWorkoutDates.invalidate(),
    utils.progress.getVolumeProgression.invalidate(),
    utils.progress.getConsistencyStats.invalidate(),
    utils.progress.getPersonalRecords.invalidate(),
    utils.progress.getProgressHighlights.invalidate(),
    utils.progress.getProgressDashboardData.invalidate(),
    // Invalidate aggregated progress data when workouts change
    utils.progress.getExerciseStrengthProgression.invalidate(),
    utils.progress.getExerciseVolumeProgression.invalidate(),
    utils.insights.getExerciseInsights.invalidate(),
    utils.insights.getSessionInsights.invalidate(),
    utils.sessionDebriefs.listRecent.invalidate(),
    utils.healthAdvice.getHistory.invalidate(),
    utils.wellness.getHistory.invalidate(),
    utils.wellness.getStats.invalidate(),
  ];

  for (const sessionId of sessionIds) {
    invalidations.push(utils.workouts.getById.invalidate({ id: sessionId }));
    invalidations.push(
      utils.sessionDebriefs.listBySession.invalidate({ sessionId }),
    );
    invalidations.push(
      utils.healthAdvice.getBySessionId.invalidate({ sessionId }),
    );
    invalidations.push(utils.wellness.getBySessionId.invalidate({ sessionId }));
  }

  try {
    await Promise.all(invalidations);
    const endTime = performance.now();
    console.info(`[CACHE_INVALIDATION] Completed in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    logger.warn("Failed to invalidate workout dependent caches", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidate WHOOP related queries to force a data refresh after sync actions.
 */
export async function invalidateWhoopCaches(utils: TrpcUtils): Promise<void> {
  try {
    await Promise.all([
      utils.whoop.getIntegrationStatus.invalidate(),
      utils.whoop.getLatestRecoveryData.invalidate(),
      utils.whoop.getWorkouts.invalidate(),
      utils.whoop.getCycles.invalidate(),
      utils.whoop.getSleep.invalidate(),
      utils.whoop.getRecovery.invalidate(),
      utils.whoop.getProfile.invalidate(),
      utils.whoop.getBodyMeasurements.invalidate(),
    ]);
  } catch (error) {
    logger.warn("Failed to invalidate WHOOP caches", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Cache warming service for frequently accessed progress data.
 * Pre-loads user's most common exercises and dashboard data.
 */
export async function warmProgressCaches(
  utils: TrpcUtils,
  userId: string,
): Promise<void> {
  try {
    // Get user's most common exercises for cache warming
    const exerciseList = await utils.progress.getExerciseList.fetch();
    if (exerciseList.length === 0) {
      return; // No exercises to warm
    }

    // Take top 5 most frequently trained exercises
    const topExercises = exerciseList.slice(0, 5);

    // Warm dashboard data
    await utils.progress.getProgressDashboardData.prefetch({
      timeRange: "month",
    });

    // Warm aggregated data for top exercises
    const warmingPromises: Array<Promise<unknown>> = [
      // Warm progress highlights
      utils.progress.getProgressHighlights.prefetch({
        tab: "prs",
        timeRange: "month",
      }),
    ];

    // Warm aggregated data for top exercises
    for (const exercise of topExercises) {
      if (exercise.exerciseName) {
        warmingPromises.push(
          utils.progress.getExerciseStrengthProgression.prefetch({
            exerciseName: exercise.exerciseName,
            templateExerciseId: exercise.masterExerciseId ?? undefined,
            timeRange: "quarter",
          }),
        );
        warmingPromises.push(
          utils.progress.getExerciseVolumeProgression.prefetch({
            exerciseName: exercise.exerciseName,
            templateExerciseId: exercise.masterExerciseId ?? undefined,
            timeRange: "quarter",
          }),
        );
      }
    }

    // Execute warming in background
    void Promise.all(warmingPromises).catch((error) => {
      logger.warn("Cache warming failed for some queries", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
    });

    logger.debug("Progress cache warming initiated", {
      userId,
      exercisesWarmed: topExercises.length,
    });
  } catch (error) {
    logger.warn("Failed to warm progress caches", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
  }
}
