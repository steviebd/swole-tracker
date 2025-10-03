import { type RouterOutputs } from "~/trpc/react";
import { type WorkoutMetric } from "~/components/ui/workout-card";

const KG_TO_LB = 2.2046226218;

export type RecentWorkout = RouterOutputs["workouts"]["getRecent"][number];

export interface WorkoutSummary {
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  volumeUnit: "kg" | "lbs";
  durationMinutes: number | null;
  estimatedDurationMinutes: number | null;
  metrics: WorkoutMetric[];
}

const parseNumeric = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const convertWeight = (
  value: number,
  fromUnit: string | null | undefined,
  toUnit: "kg" | "lbs",
): number => {
  if (!Number.isFinite(value)) return 0;
  if (fromUnit === toUnit) return value;

  if (fromUnit === "lbs" && toUnit === "kg") {
    return value / KG_TO_LB;
  }

  if (fromUnit === "kg" && toUnit === "lbs") {
    return value * KG_TO_LB;
  }

  // Default fall-back when unit is unknown
  return value;
};

const determineVolumeUnit = (workout: RecentWorkout): "kg" | "lbs" => {
  if (!workout.exercises?.length) {
    return "kg";
  }

  let kgCount = 0;
  let lbsCount = 0;

  for (const exercise of workout.exercises) {
    if (exercise?.unit === "lbs") {
      lbsCount += 1;
    } else if (exercise?.unit === "kg") {
      kgCount += 1;
    }
  }

  if (lbsCount > kgCount) {
    return "lbs";
  }

  return "kg";
};

const formatVolume = (volume: number, unit: "kg" | "lbs"): string => {
  if (volume <= 0) {
    return `0 ${unit}`;
  }

  if (volume >= 10_000) {
    return `${Math.round(volume / 1000)}k ${unit}`;
  }

  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k ${unit}`;
  }

  return `${Math.round(volume).toLocaleString()} ${unit}`;
};

const safeDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const extractDuration = (workout: RecentWorkout): number | null => {
  const workoutObj = workout as Record<string, unknown>;

  if (typeof workoutObj.duration === "number") {
    const value = workoutObj.duration;
    return Number.isFinite(value) ? value : null;
  }

  if (typeof workoutObj.durationMinutes === "number") {
    const value = workoutObj.durationMinutes;
    return Number.isFinite(value) ? value : null;
  }

  const perfMetrics = (workout as any).perf_metrics;
  if (perfMetrics && typeof perfMetrics === "object") {
    const durationValue = (perfMetrics as Record<string, unknown>)
      .durationMinutes;
    if (typeof durationValue === "number" && Number.isFinite(durationValue)) {
      return durationValue;
    }
  }

  return null;
};

const uniqueExerciseCount = (workout: RecentWorkout): number => {
  if (typeof (workout as any).exerciseCount === "number") {
    return Math.max(0, (workout as any).exerciseCount);
  }

  if (!workout.exercises?.length) {
    return 0;
  }

  const uniqueNames = new Set<string>();
  for (const exercise of workout.exercises) {
    if (exercise?.exerciseName) {
      uniqueNames.add(exercise.exerciseName);
    }
  }

  return uniqueNames.size;
};

export const buildWorkoutSummary = (workout: RecentWorkout): WorkoutSummary => {
  const volumeUnit = determineVolumeUnit(workout);

  let totalSets = 0;
  let totalVolume = 0;

  for (const exercise of workout.exercises ?? []) {
    const sets = exercise?.sets ?? 1;
    const reps = exercise?.reps ?? 0;
    const weight = convertWeight(
      parseNumeric(exercise?.weight ?? exercise?.one_rm_estimate),
      exercise?.unit,
      volumeUnit,
    );

    const volumeLoad = exercise?.volume_load
      ? convertWeight(
          parseNumeric(exercise.volume_load),
          exercise?.unit,
          volumeUnit,
        )
      : null;

    if (
      Number.isFinite(sets) &&
      Number.isFinite(reps) &&
      sets > 0 &&
      reps > 0
    ) {
      if (Number.isFinite(weight) && weight > 0) {
        totalVolume += volumeLoad ?? weight * reps * sets;
      }
      totalSets += sets;
    } else if (Number.isFinite(sets) && sets > 0) {
      totalSets += sets;
    }
  }

  const durationMinutes = extractDuration(workout);
  const estimatedDurationMinutes =
    durationMinutes ?? (totalSets > 0 ? totalSets * 3.5 : null);
  const exerciseCount = uniqueExerciseCount(workout);

  const metrics: WorkoutMetric[] = [];

  if (durationMinutes !== null) {
    metrics.push({
      label: "Duration",
      value: `${Math.max(1, Math.round(durationMinutes))} min`,
    });
  } else if (estimatedDurationMinutes !== null) {
    metrics.push({
      label: "Duration",
      value: `~${Math.max(1, Math.round(estimatedDurationMinutes))} min`,
    });
  }

  if (totalVolume > 0) {
    metrics.push({
      label: "Volume",
      value: formatVolume(totalVolume, volumeUnit),
    });
  } else if (totalSets > 0) {
    metrics.push({
      label: "Sets",
      value: totalSets.toString(),
    });
  }

  if (exerciseCount > 0) {
    metrics.push({
      label: "Exercises",
      value: exerciseCount.toString(),
    });
  }

  while (metrics.length < 3) {
    metrics.push({ label: "—", value: "—" });
  }

  return {
    exerciseCount,
    totalSets,
    totalVolume,
    volumeUnit,
    durationMinutes,
    estimatedDurationMinutes,
    metrics: metrics.slice(0, 3),
  };
};

export const isWorkoutWithinHours = (
  dateValue: Date | string | null | undefined,
  hours = 24,
): boolean => {
  const date = safeDate(dateValue);
  if (!date) return false;

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  return diffInHours <= hours;
};

export const formatRelativeWorkoutDate = (
  dateValue: Date | string | null | undefined,
  now: Date = new Date(),
): string => {
  const date = safeDate(dateValue);
  if (!date) {
    return "Unknown";
  }

  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

export const formatDurationLabel = (
  durationMinutes: number | null,
  estimatedMinutes: number | null,
): string => {
  if (durationMinutes !== null) {
    return `${Math.max(1, Math.round(durationMinutes))} min`;
  }

  if (estimatedMinutes !== null) {
    return `~${Math.max(1, Math.round(estimatedMinutes))} min`;
  }

  return "-- min";
};
