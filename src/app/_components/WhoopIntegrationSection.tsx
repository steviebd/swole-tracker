"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useDocumentVisibility } from "~/hooks/use-document-visibility";
import {
  HEART_RATE_ZONES,
  buildZoneBreakdown,
  formatMinutes,
  formatPercentage,
  formatWhoopTimestamp,
  getHrvInsight,
  getRecoveryDescriptor,
  getRhrInsight,
  getStrainEmoji,
  getTrainingRecommendation,
  getWorkoutAverageHeartRate,
  getWorkoutDurationMinutes,
  getWorkoutStrain,
  toNumber,
} from "~/lib/whoop-metrics";
import { api } from "~/trpc/react";

const cardClass = "glass-surface transition-all duration-300 rounded-xl";
const titleClass = "text-xl font-bold mb-4 text-theme-primary";
const subtitleClass = "text-sm font-medium mb-2 text-theme-secondary";


export function WhoopIntegrationSection() {
  const isTabVisible = useDocumentVisibility();

  const { data: whoopStatus, isLoading: statusLoading } =
    api.whoop.getIntegrationStatus.useQuery(undefined, {
      refetchInterval: isTabVisible ? 5 * 60 * 1000 : false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });

  const isConnected = whoopStatus?.isConnected ?? false;

  const recoveryQuery = api.whoop.getLatestRecoveryData.useQuery(undefined, {
    enabled: isConnected,
    retry: 0,
    refetchInterval: isConnected && isTabVisible ? 5 * 60 * 1000 : false,
    refetchOnWindowFocus: isConnected,
    refetchOnReconnect: isConnected,
  });
  const workoutsQuery = api.whoop.getWorkouts.useQuery(undefined, {
    enabled: isConnected,
    refetchInterval: isConnected && isTabVisible ? 5 * 60 * 1000 : false,
    refetchOnWindowFocus: isConnected,
    refetchOnReconnect: isConnected,
  });
  const refetchRecovery = recoveryQuery.refetch;
  const refetchWhoopWorkouts = workoutsQuery.refetch;

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    if (!whoopStatus?.lastSyncAt) {
      return;
    }
    void refetchRecovery();
    void refetchWhoopWorkouts();
  }, [
    isConnected,
    refetchRecovery,
    refetchWhoopWorkouts,
    whoopStatus?.lastSyncAt,
  ]);

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
  const lastSyncedLabel = isConnected
    ? formatWhoopTimestamp(whoopStatus?.lastSyncAt ?? null)
    : "—";
  const isRefetching = recoveryQuery.isFetching || workoutsQuery.isFetching;

  const handleManualRefetch = () => {
    void Promise.all([refetchRecovery(), refetchWhoopWorkouts()]);
  };

  return (
    <div className={`${cardClass} p-6`}>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className={titleClass}>WHOOP Integration</h2>
          <p className={subtitleClass}>Recovery and performance insights</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-theme-secondary">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-success" : "bg-muted"
              } ${statusLoading ? "animate-pulse" : ""}`}
            />
            <span>
              {statusLoading
                ? "Checking..."
                : isConnected
                  ? showReauthWarning
                    ? "Re-auth required"
                    : "Connected"
                  : "Not connected"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 text-xs text-theme-secondary md:items-end">
          <span>Last synced • {lastSyncedLabel}</span>
          {isConnected && (
            <button
              type="button"
              onClick={handleManualRefetch}
              disabled={isRefetching}
              className="rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-theme-secondary hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefetching ? "Refreshing..." : "Refetch"}
            </button>
          )}
        </div>
      </div>

      {!isConnected ? (
        <div className="py-12 text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <span className="text-background text-2xl font-bold">W</span>
            </div>
            <h3 className="text-theme-primary mb-2 text-lg font-semibold">
              Connect Your WHOOP Device
            </h3>
            <p className="text-theme-secondary mb-6 text-sm">
              Sync recovery, strain, and sleep data to unlock personalised
              coaching.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="bg-surface rounded-lg p-4">
              <div className="mb-2 text-2xl">💤</div>
              <h4 className="text-theme-primary font-medium">Sleep Tracking</h4>
              <p className="text-theme-secondary text-xs">
                Monitor sleep quality and recovery
              </p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <div className="mb-2 text-2xl">❤️</div>
              <h4 className="text-theme-primary font-medium">
                Heart Rate Zones
              </h4>
              <p className="text-theme-secondary text-xs">
                Optimise training intensity
              </p>
            </div>
            <div className="bg-surface rounded-lg p-4">
              <div className="mb-2 text-2xl">🔋</div>
              <h4 className="text-theme-primary font-medium">
                Recovery Insights
              </h4>
              <p className="text-theme-secondary text-xs">
                Know when to push or recover
              </p>
            </div>
          </div>

          <Link
            href="/connect-whoop"
            className="text-background inline-block rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-medium shadow-lg transition-all hover:scale-105 hover:from-purple-600 hover:to-pink-600"
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
                  Your WHOOP session has expired. Reconnect to resume syncing
                  and keep recovery scores fresh.
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="self-start"
                >
                  <Link href="/connect-whoop">Reconnect WHOOP</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoadingData ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-surface rounded-lg p-4">
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
                    <div className="bg-surface rounded-lg p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">
                          {recoveryDescriptor.emoji}
                        </span>
                        <h4 className="text-theme-secondary text-xs font-medium">
                          Recovery
                        </h4>
                      </div>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: recoveryDescriptor.color }}
                      >
                        {formatPercentage(recoveryScore)}
                      </p>
                      <p className="text-theme-muted text-xs">
                        {recoveryDescriptor.message}
                      </p>
                    </div>

                    <div className="bg-surface rounded-lg p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">
                          {getStrainEmoji(strainScore)}
                        </span>
                        <h4 className="text-theme-secondary text-xs font-medium">
                          Latest Strain
                        </h4>
                      </div>
                      <p className="text-warning text-2xl font-bold">
                        {strainScore !== null ? strainScore.toFixed(1) : "--"}
                      </p>
                      <p className="text-theme-muted text-xs">
                        {averageHeartRate
                          ? `${Math.round(averageHeartRate)} bpm avg HR`
                          : "Awaiting synced workout"}
                      </p>
                    </div>

                    <div className="bg-surface rounded-lg p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">😴</span>
                        <h4 className="text-theme-secondary text-xs font-medium">
                          Sleep Performance
                        </h4>
                      </div>
                      <p className="text-info text-2xl font-bold">
                        {formatPercentage(sleepPerformance)}
                      </p>
                      <p className="text-theme-muted text-xs">
                        {sleepPerformance !== null
                          ? "Relative to WHOOP target"
                          : "Sync sleep data to populate"}
                      </p>
                    </div>

                    <div className="bg-surface rounded-lg p-4">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="text-xl">📊</span>
                        <h4 className="text-theme-secondary text-xs font-medium">
                          HRV (ms)
                        </h4>
                      </div>
                      <p className="text-primary text-2xl font-bold">
                        {hrvNow !== null ? Math.round(hrvNow) : "--"}
                      </p>
                      <p className="text-theme-muted text-xs">
                        Baseline{" "}
                        {hrvBaseline !== null ? Math.round(hrvBaseline) : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {showEmptyState && (
                <div className="bg-surface text-theme-secondary rounded-lg p-6 text-center text-sm">
                  No cached WHOOP data yet. Run a sync from the workouts page to
                  pull your latest recovery metrics.
                </div>
              )}

              {latestWorkout && !showReauthWarning && (
                <div>
                  <h3 className={subtitleClass}>Latest WHOOP Workout</h3>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="bg-surface rounded-lg p-4">
                      <p className="text-theme-secondary text-xs">Sport</p>
                      <p className="text-theme-primary text-lg font-semibold">
                        {latestWorkout.sport_name ?? "Workout"}
                      </p>
                    </div>
                    <div className="bg-surface rounded-lg p-4">
                      <p className="text-theme-secondary text-xs">When</p>
                      <p className="text-theme-primary text-lg font-semibold">
                        {formatWhoopTimestamp(latestWorkout?.start ?? null)}
                      </p>
                    </div>
                    <div className="bg-surface rounded-lg p-4">
                      <p className="text-theme-secondary text-xs">Duration</p>
                      <p className="text-theme-primary text-lg font-semibold">
                        {formatMinutes(workoutDuration)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {workoutZones.length > 0 && !showReauthWarning && (
                <div>
                  <h3 className={subtitleClass}>
                    Heart Rate Zones (last workout)
                  </h3>
                  <div className="bg-surface rounded-lg p-4">
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
                              <p className="text-theme-primary text-sm font-medium">
                                {zone.label}
                              </p>
                              <p className="text-theme-secondary text-xs">
                                {zone.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="bg-muted h-2 w-24 rounded-full">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${zone.percentage}%`,
                                  backgroundColor: zone.color,
                                }}
                              />
                            </div>
                            <span className="text-theme-secondary w-10 text-right text-sm font-medium">
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
                  <div className="border-l-success bg-surface rounded-lg border-l-4 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="text-xl">💡</span>
                      <h4 className="text-theme-primary font-medium">
                        Training Recommendation
                      </h4>
                    </div>
                    <p className="text-theme-secondary text-sm">
                      {trainingRecommendation}
                    </p>
                  </div>

                  <div className="border-l-info bg-surface rounded-lg border-l-4 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <span className="text-xl">📈</span>
                      <h4 className="text-theme-primary font-medium">
                        Recovery Signals
                      </h4>
                    </div>
                    <p className="text-theme-secondary mb-2 text-sm">
                      {hrvInsight}
                    </p>
                    <p className="text-theme-muted text-xs">{rhrInsight}</p>
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
