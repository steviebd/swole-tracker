"use client";

import Link from "next/link";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

const cardClass = "glass-surface transition-all duration-300 rounded-xl";
const titleClass = "text-xl font-bold mb-4 text-theme-primary";
const subtitleClass = "text-sm font-medium mb-2 text-theme-secondary";

const HEART_RATE_ZONES = [
  {
    key: "zone_zero_milli",
    label: "Zone 0",
    description: "Idle / warm-up",
    color: "var(--color-chart-1)",
  },
  {
    key: "zone_one_milli",
    label: "Zone 1",
    description: "50-60% (Recovery)",
    color: "var(--color-chart-2)",
  },
  {
    key: "zone_two_milli",
    label: "Zone 2",
    description: "60-70% (Base)",
    color: "var(--color-chart-3)",
  },
  {
    key: "zone_three_milli",
    label: "Zone 3",
    description: "70-80% (Aerobic)",
    color: "var(--color-chart-4)",
  },
  {
    key: "zone_four_milli",
    label: "Zone 4",
    description: "80-90% (Threshold)",
    color: "var(--color-chart-5)",
  },
  {
    key: "zone_five_milli",
    label: "Zone 5",
    description: "90-100% (Max)",
    color: "var(--color-chart-6, var(--color-chart-1))",
  },
] as const;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const formatPercentage = (value: number | null): string => {
  if (value === null) {
    return "--";
  }
  return `${Math.round(value)}%`;
};

const formatMinutes = (minutes: number | null): string => {
  if (minutes === null) {
    return "--";
  }

  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const remaining = whole % 60;
  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
};

const formatDateTime = (date: Date | null): string => {
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getRecoveryDescriptor = (score: number | null) => {
  if (score === null) {
    return {
      emoji: "⚪️",
      color: "var(--color-muted)",
      message: "No recovery data yet",
    };
  }

  if (score >= 67) {
    return {
      emoji: "🟢",
      color: "var(--color-success)",
      message: "You're primed for a hard session",
    } as const;
  }

  if (score >= 34) {
    return {
      emoji: "🟡",
      color: "var(--color-warning)",
      message: "Dial intensity to a manageable level",
    } as const;
  }

  return {
    emoji: "🔴",
    color: "var(--color-danger)",
    message: "Prioritise recovery work today",
  } as const;
};

const getStrainEmoji = (strain: number | null): string => {
  if (strain === null) {
    return "😌";
  }

  if (strain >= 18) return "🔥";
  if (strain >= 14) return "⚡";
  if (strain >= 10) return "💪";
  return "🙂";
};

const getTrainingRecommendation = (score: number | null): string => {
  if (score === null) {
    return "We need fresh recovery data to tailor training intensity. Run a WHOOP sync to update.";
  }

  if (score >= 67) {
    return "Recovery is in the green. Plan heavy strength or high-intensity work while you’re fresh.";
  }

  if (score >= 34) {
    return "Recovery is moderate. Keep today's work controlled and focus on quality movement.";
  }

  return "Recovery is in the red. Prioritise mobility, zone-2 cardio, or complete rest.";
};

const getHrvInsight = (current: number | null, baseline: number | null): string => {
  if (current === null || baseline === null) {
    return "HRV trend is unavailable. A fresh sync will surface readiness signals.";
  }

  if (baseline === 0) {
    return "Baseline HRV hasn’t been established yet. Keep syncing to calibrate.";
  }

  const delta = ((current - baseline) / baseline) * 100;

  if (delta >= 5) {
    return `HRV is ${delta.toFixed(1)}% above baseline — your nervous system is handling the load well.`;
  }

  if (delta <= -5) {
    return `HRV is ${Math.abs(delta).toFixed(1)}% below baseline — back off volume to recover fully.`;
  }

  return "HRV is tracking near baseline. Stay consistent with sleep and hydration to keep it stable.";
};

const getRhrInsight = (current: number | null, baseline: number | null): string => {
  if (current === null || baseline === null) {
    return "Resting heart rate baseline not available yet.";
  }

  const delta = current - baseline;

  if (delta <= -2) {
    return `Resting HR is ${Math.abs(delta).toFixed(1)} bpm below baseline — excellent recovery trend.`;
  }

  if (delta >= 3) {
    return `Resting HR is ${delta.toFixed(1)} bpm above baseline — watch fatigue and consider an easier day.`;
  }

  return "Resting HR is holding steady, which supports your current training load.";
};

type ZoneBreakdown = {
  label: string;
  description: string;
  color: string;
  percentage: number;
};

const buildZoneBreakdown = (zoneDuration: unknown): ZoneBreakdown[] => {
  if (!zoneDuration || typeof zoneDuration !== "object") {
    return [];
  }

  const entries = HEART_RATE_ZONES.map((zone) => {
    const rawValue = (zoneDuration as Record<string, unknown>)[zone.key];
    const milliseconds = toNumber(rawValue) ?? 0;
    return {
      ...zone,
      milliseconds,
    };
  });

  const total = entries.reduce((sum, entry) => sum + entry.milliseconds, 0);

  if (total === 0) {
    return [];
  }

  return entries.map((entry) => ({
    label: entry.label,
    description: entry.description,
    color: entry.color,
    percentage: Math.round((entry.milliseconds / total) * 100),
  }));
};

const getWorkoutStrain = (workout: unknown): number | null => {
  if (!workout || typeof workout !== "object") {
    return null;
  }

  const score = (workout as { score?: unknown }).score;
  if (!score || typeof score !== "object") {
    return null;
  }

  const strain = (score as Record<string, unknown>).strain;
  return toNumber(strain);
};

const getWorkoutAverageHeartRate = (workout: unknown): number | null => {
  if (!workout || typeof workout !== "object") {
    return null;
  }

  const score = (workout as { score?: unknown }).score;
  if (score && typeof score === "object") {
    const avg = (score as Record<string, unknown>).average_heart_rate;
    const parsed = toNumber(avg);
    if (parsed !== null) {
      return parsed;
    }
  }

  const during = (workout as { during?: unknown }).during;
  if (during && typeof during === "object") {
    const avg = (during as Record<string, unknown>).average_heart_rate;
    return toNumber(avg);
  }

  return null;
};

const getWorkoutDurationMinutes = (workout: { start?: Date; end?: Date } | undefined): number | null => {
  if (!workout?.start || !workout?.end) {
    return null;
  }

  const diffMilliseconds = workout.end.getTime() - workout.start.getTime();
  return diffMilliseconds > 0 ? diffMilliseconds / 60000 : null;
};

export function WhoopIntegrationSection() {
  const { data: whoopStatus, isLoading: statusLoading } =
    api.whoop.getIntegrationStatus.useQuery();

  const isConnected = whoopStatus?.isConnected ?? false;

  const recoveryQuery = api.whoop.getLatestRecoveryData.useQuery(undefined, {
    enabled: isConnected,
    retry: 0,
  });
  const workoutsQuery = api.whoop.getWorkouts.useQuery(undefined, {
    enabled: isConnected,
  });

  const recoveryData = recoveryQuery.data;
  const workouts = workoutsQuery.data ?? [];
  const latestWorkout = workouts[0];

  const recoveryScore = toNumber(recoveryData?.recovery_score);
  const sleepPerformance = toNumber(recoveryData?.sleep_performance);
  const hrvNow = toNumber(recoveryData?.hrv_now_ms);
  const hrvBaseline = toNumber(recoveryData?.hrv_baseline_ms);
  const rhrNow = toNumber(recoveryData?.rhr_now_bpm);
  const rhrBaseline = toNumber(recoveryData?.rhr_baseline_bpm);

  const strainScore = getWorkoutStrain(latestWorkout) ?? null;
  const averageHeartRate = getWorkoutAverageHeartRate(latestWorkout);
  const workoutDuration = getWorkoutDurationMinutes(latestWorkout);
  const workoutZones = buildZoneBreakdown(latestWorkout?.zone_duration ?? null);

  const isLoadingData =
    isConnected && (recoveryQuery.isLoading || workoutsQuery.isLoading);
  const recoveryErrorCode = recoveryQuery.error?.data?.code;
  const workoutsErrorMessage = workoutsQuery.error?.message;
  const showReauthWarning = Boolean(
    whoopStatus?.isExpired || recoveryErrorCode === "UNAUTHORIZED",
  );
  const showEmptyState =
    !isLoadingData &&
    !showReauthWarning &&
    isConnected &&
    !recoveryData &&
    (workouts.length === 0 || recoveryErrorCode === "NOT_FOUND");

  const recoveryDescriptor = getRecoveryDescriptor(recoveryScore);
  const trainingRecommendation = getTrainingRecommendation(recoveryScore);
  const hrvInsight = getHrvInsight(hrvNow, hrvBaseline);
  const rhrInsight = getRhrInsight(rhrNow, rhrBaseline);

  return (
    <div className={`${cardClass} p-6`}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className={titleClass}>WHOOP Integration</h2>
          <p className={subtitleClass}>Recovery and performance insights</p>
        </div>

        <div className="flex items-center space-x-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? "bg-success" : "bg-muted"
            } ${statusLoading ? "animate-pulse" : ""}`}
          />
          <span className="text-sm font-medium text-theme-secondary">
            {statusLoading
              ? "Checking..."
              : isConnected
                ? showReauthWarning
                  ? "Re-auth required"
                  : "Connected"
                : "Not Connected"}
          </span>
        </div>
      </div>

      {!isConnected ? (
        <div className="py-12 text-center">
          <div className="mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-4">
              <span className="text-2xl font-bold text-background">W</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-theme-primary">
              Connect Your WHOOP Device
            </h3>
            <p className="mb-6 text-sm text-theme-secondary">
              Sync recovery, strain, and sleep data to unlock personalised coaching.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-surface p-4">
              <div className="mb-2 text-2xl">💤</div>
              <h4 className="font-medium text-theme-primary">Sleep Tracking</h4>
              <p className="text-xs text-theme-secondary">
                Monitor sleep quality and recovery
              </p>
            </div>
            <div className="rounded-lg bg-surface p-4">
              <div className="mb-2 text-2xl">❤️</div>
              <h4 className="font-medium text-theme-primary">Heart Rate Zones</h4>
              <p className="text-xs text-theme-secondary">
                Optimise training intensity
              </p>
            </div>
            <div className="rounded-lg bg-surface p-4">
              <div className="mb-2 text-2xl">🔋</div>
              <h4 className="font-medium text-theme-primary">Recovery Insights</h4>
              <p className="text-xs text-theme-secondary">
                Know when to push or recover
              </p>
            </div>
          </div>

          <Link
            href="/connect-whoop"
            className="inline-block rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-medium text-background shadow-lg transition-all hover:from-purple-600 hover:to-pink-600 hover:scale-105"
          >
            Connect WHOOP
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {showReauthWarning && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-2 text-sm">
                <span>
                  Your WHOOP session has expired. Reconnect to resume syncing and keep recovery scores fresh.
                </span>
                <Button asChild size="sm" variant="secondary" className="self-start">
                  <Link href="/connect-whoop">Reconnect WHOOP</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoadingData ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-lg bg-surface p-4">
                  <Skeleton className="mb-2 h-4 w-16" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="mt-3 h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {recoveryData && !showReauthWarning && (
                <div>
                  <h3 className={subtitleClass}>Today&apos;s Recovery</h3>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-lg bg-surface p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">{recoveryDescriptor.emoji}</span>
                        <h4 className="text-xs font-medium text-theme-secondary">
                          Recovery
                        </h4>
                      </div>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: recoveryDescriptor.color }}
                      >
                        {formatPercentage(recoveryScore)}
                      </p>
                      <p className="text-xs text-theme-muted">
                        {recoveryDescriptor.message}
                      </p>
                    </div>

                    <div className="rounded-lg bg-surface p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">{getStrainEmoji(strainScore)}</span>
                        <h4 className="text-xs font-medium text-theme-secondary">
                          Latest Strain
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-warning">
                        {strainScore !== null ? strainScore.toFixed(1) : "--"}
                      </p>
                      <p className="text-xs text-theme-muted">
                        {averageHeartRate ? `${Math.round(averageHeartRate)} bpm avg HR` : "Awaiting synced workout"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-surface p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">😴</span>
                        <h4 className="text-xs font-medium text-theme-secondary">
                          Sleep Performance
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-info">
                        {formatPercentage(sleepPerformance)}
                      </p>
                      <p className="text-xs text-theme-muted">
                        {sleepPerformance !== null
                          ? "Relative to WHOOP target"
                          : "Sync sleep data to populate"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-surface p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">📊</span>
                        <h4 className="text-xs font-medium text-theme-secondary">
                          HRV (ms)
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {hrvNow !== null ? Math.round(hrvNow) : "--"}
                      </p>
                      <p className="text-xs text-theme-muted">
                        Baseline {hrvBaseline !== null ? Math.round(hrvBaseline) : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {showEmptyState && (
                <div className="rounded-lg bg-surface p-6 text-center text-sm text-theme-secondary">
                  No cached WHOOP data yet. Run a sync from the workouts page to pull your latest recovery metrics.
                </div>
              )}

              {latestWorkout && !showReauthWarning && (
                <div>
                  <h3 className={subtitleClass}>Latest WHOOP Workout</h3>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg bg-surface p-4">
                      <p className="text-xs text-theme-secondary">Sport</p>
                      <p className="text-lg font-semibold text-theme-primary">
                        {latestWorkout.sport_name ?? "Workout"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface p-4">
                      <p className="text-xs text-theme-secondary">When</p>
                      <p className="text-lg font-semibold text-theme-primary">
                        {formatDateTime(latestWorkout?.start ?? null)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface p-4">
                      <p className="text-xs text-theme-secondary">Duration</p>
                      <p className="text-lg font-semibold text-theme-primary">
                        {formatMinutes(workoutDuration)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {workoutZones.length > 0 && !showReauthWarning && (
                <div>
                  <h3 className={subtitleClass}>Heart Rate Zones (last workout)</h3>
                  <div className="rounded-lg bg-surface p-4">
                    <div className="space-y-3">
                      {workoutZones.map((zone) => (
                        <div
                          key={zone.label}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-1 items-center space-x-3">
                            <div
                              className="h-4 w-4 rounded"
                              style={{ backgroundColor: zone.color }}
                            />
                            <div>
                              <p className="text-sm font-medium text-theme-primary">
                                {zone.label}
                              </p>
                              <p className="text-xs text-theme-secondary">
                                {zone.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="h-2 w-24 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${zone.percentage}%`,
                                  backgroundColor: zone.color,
                                }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm font-medium text-theme-secondary">
                              {zone.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {workoutsErrorMessage && !showReauthWarning && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">
                    Failed to load WHOOP workouts: {workoutsErrorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {!showReauthWarning && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border-l-4 border-l-success bg-surface p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="text-xl">💡</span>
                      <h4 className="font-medium text-theme-primary">
                        Training Recommendation
                      </h4>
                    </div>
                    <p className="text-sm text-theme-secondary">
                      {trainingRecommendation}
                    </p>
                  </div>

                  <div className="rounded-lg border-l-4 border-l-info bg-surface p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="text-xl">📈</span>
                      <h4 className="font-medium text-theme-primary">
                        Recovery Signals
                      </h4>
                    </div>
                    <p className="mb-2 text-sm text-theme-secondary">
                      {hrvInsight}
                    </p>
                    <p className="text-xs text-theme-muted">{rhrInsight}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
