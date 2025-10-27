"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useProgressRange } from "~/contexts/progress-range-context";
import { getReadinessSummary } from "~/lib/readiness";
import { formatTimeRangeLabel, getDaysForRange } from "~/lib/time-range";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  formatPercentage,
  getRecoveryDescriptor,
  getStrainEmoji,
  getTrainingRecommendation,
  getWorkoutAverageHeartRate,
  getWorkoutStrain,
  toNumber,
} from "~/lib/whoop-metrics";

type ManualEntry = {
  date: Date;
  energy_level: number | null;
  sleep_quality: number | null;
  notes?: string | null;
};

export function WellnessHistorySection() {
  const {
    range: timeRange,
    setRange: setWellnessRange,
    reset: resetWellnessRange,
    defaultValue: defaultWellnessRange,
  } = useProgressRange("wellness");
  const utils = api.useUtils();

  const { data: preferences } = api.preferences.get.useQuery();
  const manualEnabled = preferences?.enable_manual_wellness ?? false;

  const daysInRange = getDaysForRange(timeRange);

  const { data: whoopStatus, refetch: refetchStatus } =
    api.whoop.getIntegrationStatus.useQuery();
  const whoopConnected = whoopStatus?.isConnected ?? false;

  const whoopRecoveryQuery = api.whoop.getLatestRecoveryData.useQuery(
    undefined,
    { enabled: whoopConnected },
  );
  const whoopWorkoutsQuery = api.whoop.getWorkouts.useQuery(undefined, {
    enabled: whoopConnected,
  });

  const { data: wellnessHistoryRaw = [] } = api.wellness.getHistory.useQuery(
    {
      limit: 20,
      offset: 0,
      startDate: new Date(Date.now() - daysInRange * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    },
    { enabled: manualEnabled },
  );
  const wellnessHistory = wellnessHistoryRaw as ManualEntry[];

  const { data: wellnessStats } = api.wellness.getStats.useQuery(
    { days: daysInRange },
    { enabled: manualEnabled },
  );

  const enableManualMutation = api.preferences.update.useMutation({
    onSuccess: () => utils.preferences.get.invalidate(),
  });

  const lastSyncedLabel = whoopConnected
    ? new Date(whoopStatus?.lastSyncAt ?? Date.now()).toLocaleString()
    : "Never";

  const readinessCard = buildReadinessCard({
    whoopConnected,
    recoveryData: whoopRecoveryQuery.data,
    workouts: whoopWorkoutsQuery.data ?? [],
    manualEnabled,
    manualStats: wellnessStats,
  });

  const manualTrends = useManualTrends(wellnessHistory);
  const latestManualEntry = wellnessHistory[0];

  const handleRefetch = () => {
    if (!whoopConnected) return;
    void Promise.all([
      whoopRecoveryQuery.refetch(),
      whoopWorkoutsQuery.refetch(),
      refetchStatus(),
    ]);
  };

  const showDualCta = !whoopConnected && !manualEnabled;

  return (
    <div className="glass-surface space-y-6 rounded-2xl border border-border/70 p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Wellness • {formatTimeRangeLabel(timeRange)}
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            Readiness & Wellness
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex space-x-1 rounded-full border border-border/60 bg-muted/30 p-1">
            {(["week", "month", "year"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setWellnessRange(range)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
                  timeRange === range
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => resetWellnessRange()}
            disabled={timeRange === defaultWellnessRange}
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]",
              timeRange === defaultWellnessRange
                ? "border-transparent text-muted-foreground/60"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Reset
          </button>
          {whoopConnected && (
            <div className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
              <span>Last synced • {lastSyncedLabel}</span>
              <button
                type="button"
                onClick={handleRefetch}
                disabled={
                  whoopRecoveryQuery.isFetching || whoopWorkoutsQuery.isFetching
                }
                className="rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {whoopRecoveryQuery.isFetching || whoopWorkoutsQuery.isFetching
                  ? "Refreshing..."
                  : "Refetch"}
              </button>
            </div>
          )}
        </div>
      </header>

      {showDualCta ? (
        <DualCta
          onEnableManual={() =>
            enableManualMutation.mutate({ enable_manual_wellness: true })
          }
          enablePending={enableManualMutation.isPending}
        />
      ) : (
        <div className="space-y-6">
          {readinessCard}

          {manualEnabled && (
            <ManualLogCard
              stats={wellnessStats}
              latestEntry={latestManualEntry}
              trends={manualTrends}
              history={wellnessHistory.slice(0, 4)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function buildReadinessCard({
  whoopConnected,
  recoveryData,
  workouts,
  manualEnabled,
  manualStats,
}: {
  whoopConnected: boolean;
  recoveryData: Record<string, unknown> | undefined;
  workouts: unknown[];
  manualEnabled: boolean;
  manualStats:
    | {
        period: { avgEnergyLevel?: number | null; avgSleepQuality?: number | null };
      }
    | undefined;
}) {
  if (whoopConnected && recoveryData) {
    const recoveryScore = toNumber(recoveryData.recovery_score);
    const readinessSummary = getReadinessSummary(
      recoveryScore != null ? recoveryScore / 100 : null,
    );
    const trainingRecommendation = getTrainingRecommendation(recoveryScore);
    const latestWorkout = workouts[0];
    const strainScore = getWorkoutStrain(latestWorkout);
    const averageHeartRate = getWorkoutAverageHeartRate(latestWorkout);

    const descriptor = getRecoveryDescriptor(recoveryScore);

    return (
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              WHOOP Readiness
            </p>
            <h3 className="text-2xl font-semibold text-foreground">
              {formatPercentage(recoveryScore)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {readinessSummary.message}
            </p>
          </div>
          <div className="flex gap-6">
            <ReadinessMetric
              label="Recovery state"
              value={descriptor.message}
              accent={descriptor.color}
              icon={descriptor.emoji}
            />
            <ReadinessMetric
              label="Strain"
              value={
                strainScore != null ? strainScore.toFixed(1) : "Awaiting sync"
              }
              icon={getStrainEmoji(strainScore)}
              helper={
                averageHeartRate
                  ? `${Math.round(averageHeartRate)} bpm avg HR`
                  : undefined
              }
            />
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {trainingRecommendation}
        </p>
      </div>
    );
  }

  if (manualEnabled && manualStats) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Manual Wellness
        </p>
        <h3 className="text-lg font-semibold text-foreground">
          Energy & Sleep snapshot
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ManualSummaryTile
            label="Avg energy"
            value={`${manualStats.period.avgEnergyLevel?.toFixed(1) ?? "0.0"}/10`}
          />
          <ManualSummaryTile
            label="Avg sleep"
            value={`${manualStats.period.avgSleepQuality?.toFixed(1) ?? "0.0"}/10`}
          />
        </div>
      </div>
    );
  }

  return null;
}

function ManualLogCard({
  stats,
  latestEntry,
  trends,
  history,
}: {
  stats:
    | {
        period: { avgEnergyLevel?: number | null; avgSleepQuality?: number | null };
        recent: { avgEnergyLevel?: number | null; avgSleepQuality?: number | null };
      }
    | undefined;
  latestEntry: ManualEntry | undefined;
  trends: { energy: Trend; sleep: Trend };
  history: ManualEntry[];
}) {
  if (!stats && !latestEntry) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Manual log
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            Recent check-ins
          </h3>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <TrendBadge label="Energy" trend={trends.energy} />
          <TrendBadge label="Sleep" trend={trends.sleep} />
        </div>
      </div>

      {latestEntry ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-foreground">
              {new Date(latestEntry.date).toLocaleDateString()}
            </span>
            <span className="text-muted-foreground">
              Energy {latestEntry.energy_level ?? "—"}/10
            </span>
            <span className="text-muted-foreground">
              Sleep {latestEntry.sleep_quality ?? "—"}/10
            </span>
          </div>
          {latestEntry.notes && (
            <p className="mt-2 text-sm text-muted-foreground">
              “{latestEntry.notes}”
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Log a manual entry to start tracking how you feel.
        </p>
      )}

      {history.length > 1 && (
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {history.slice(1).map((entry) => (
            <li
              key={entry?.date?.toString()}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <span>
                {entry?.date
                  ? new Date(entry.date).toLocaleDateString()
                  : "Recent"}
              </span>
              <span>
                {entry?.energy_level ?? "—"}/10 energy ·{" "}
                {entry?.sleep_quality ?? "—"}/10 sleep
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DualCta({
  onEnableManual,
  enablePending,
}: {
  onEnableManual: () => void;
  enablePending: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-6 text-center">
      <h3 className="text-xl font-semibold text-foreground">
        Unlock readiness signals
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Connect WHOOP for automated recovery or enable manual wellness check-ins
        to capture energy and sleep.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/connect-whoop"
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground shadow-sm"
        >
          Connect WHOOP
        </Link>
        <button
          type="button"
          onClick={onEnableManual}
          disabled={enablePending}
          className="rounded-full border border-border/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enablePending ? "Enabling…" : "Enable manual wellness"}
        </button>
      </div>
    </div>
  );
}

function ReadinessMetric({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon && <span aria-hidden>{icon}</span>}
        <span style={{ color: accent }}>{value}</span>
      </div>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

type Trend = "improving" | "declining" | "stable";

function TrendBadge({ label, trend }: { label: string; trend: Trend }) {
  const tone =
    trend === "improving"
      ? "text-emerald-500"
      : trend === "declining"
        ? "text-rose-500"
        : "text-muted-foreground";
  const icon = trend === "improving" ? "📈" : trend === "declining" ? "📉" : "➡️";

  return (
    <span className={cn("flex items-center gap-1", tone)}>
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

function ManualSummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
      <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
        {label}
      </p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function useManualTrends(history: ManualEntry[]) {
  const trendData = useMemo(
    () =>
      history.map((entry) => ({
        energyLevel: entry.energy_level ?? 0,
        sleepQuality: entry.sleep_quality ?? 0,
      })),
    [history],
  );

  const energyTrend = useMemo(
    () => calculateTrend(trendData.map((d) => d.energyLevel)),
    [trendData],
  );
  const sleepTrend = useMemo(
    () => calculateTrend(trendData.map((d) => d.sleepQuality)),
    [trendData],
  );

  return { energy: energyTrend, sleep: sleepTrend };
}

function calculateTrend(values: number[]): Trend {
  if (values.length < 2) return "stable";
  const recent =
    values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
  const earlier =
    values.slice(0, -3).reduce((a, b) => a + b, 0) /
    Math.max(1, values.length - 3);
  const diff = recent - earlier;
  if (diff > 0.5) return "improving";
  if (diff < -0.5) return "declining";
  return "stable";
}
