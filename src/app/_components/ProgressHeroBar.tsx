"use client";

import Link from "next/link";
import { useMemo } from "react";

import { TinySparkline } from "~/components/charts/tiny-sparkline";
import { buttonVariants } from "~/components/ui/button";
import { getReadinessSummary } from "~/lib/readiness";
import { formatTimeRangeLabel, getWeeksForRange } from "~/lib/time-range";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useProgressRange } from "~/contexts/progress-range-context";

interface SelectedExerciseState {
  name: string | null;
  templateExerciseId: number | null;
}

interface ProgressHeroBarProps {
  selectedExercise: SelectedExerciseState;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const kgFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ProgressHeroBar({ selectedExercise }: ProgressHeroBarProps) {
  const { range: overviewRange } = useProgressRange("overview");
  const { range: strengthRange } = useProgressRange("strength");
  const { range: consistencyRange } = useProgressRange("consistency");
  const { range: readinessRange } = useProgressRange("readiness");
  const { data: preferences } = api.preferences.get.useQuery();
  const targetPerWeek = preferences?.targetWorkoutsPerWeek ?? 3;
  const manualWellnessEnabled = preferences?.enable_manual_wellness ?? false;
  const selectedExerciseName = selectedExercise.name ?? undefined;
  const selectedTemplateExerciseId =
    selectedExercise.templateExerciseId ?? undefined;
  const hasExerciseSelection =
    Boolean(selectedExerciseName) ||
    typeof selectedTemplateExerciseId === "number";

  const { data: strengthMetrics, isLoading: strengthLoading } =
    api.progress.getExerciseStrengthProgression.useQuery(
      {
        exerciseName: selectedExerciseName,
        templateExerciseId: selectedTemplateExerciseId,
        timeRange: strengthRange,
      },
      {
        enabled: hasExerciseSelection,
      },
    );

  const { data: volumeData } = api.progress.getVolumeProgression.useQuery({
    timeRange: overviewRange,
  });

  const { data: comparativeData } =
    api.progress.getComparativeAnalysis.useQuery({
      timeRange: overviewRange,
    });

  const { data: consistencyData } = api.progress.getConsistencyStats.useQuery({
    timeRange: consistencyRange,
  });

  const {
    data: whoopRecovery,
    error: whoopError,
    isFetching: whoopLoading,
  } = api.whoop.getLatestRecoveryData.useQuery(undefined, {
    retry: false,
  });

  const { data: wellnessHistory } = api.wellness.getHistory.useQuery(
    {
      limit: 1,
      offset: 0,
      startDate: undefined,
      endDate: undefined,
    },
    {
      enabled: manualWellnessEnabled,
      staleTime: 1000 * 60 * 5,
    },
  );

  const strengthSparkline = useMemo(() => {
    if (!strengthMetrics?.timeline?.length) return [];
    return strengthMetrics.timeline.slice(-20).map((point) => ({
      value: point.oneRM,
      label: dateFormatter.format(new Date(point.date)),
    }));
  }, [strengthMetrics?.timeline]);

  const intensityMetrics = useMemo(() => {
    if (!volumeData || volumeData.length === 0) {
      return {
        average: 0,
        delta: 0,
        sparkline: [] as Array<{ value: number; label: string }>,
      };
    }
    const ordered = [...volumeData].sort(
      (a, b) =>
        new Date(a.workoutDate).getTime() - new Date(b.workoutDate).getTime(),
    );
    const total = ordered.reduce(
      (sum, entry) => sum + (entry.totalVolume ?? 0),
      0,
    );
    const sessions = ordered.length;
    const average = sessions > 0 ? total / sessions : 0;
    const previousVolume = comparativeData?.previous?.totalVolume ?? 0;
    const previousSessions = comparativeData?.previous?.workoutCount ?? 0;
    const previousAverage =
      previousSessions > 0 ? previousVolume / previousSessions : 0;
    return {
      average,
      delta: average - previousAverage,
      sparkline: ordered.slice(-20).map((entry) => ({
        value: entry.totalVolume ?? 0,
        label: dateFormatter.format(new Date(entry.workoutDate)),
      })),
    };
  }, [comparativeData?.previous, volumeData]);

  const strainProxy = useMemo(() => {
    if (intensityMetrics.average === 0) return 0;
    const frequencyBonus = (consistencyData?.frequency ?? 0) * 0.35;
    const loadScore = intensityMetrics.average / 1500;
    return Math.min(10, Math.max(1, loadScore + frequencyBonus));
  }, [consistencyData?.frequency, intensityMetrics.average]);

  const goalMetrics = useMemo(() => {
    const actual = consistencyData?.totalWorkouts ?? 0;
    const targetRangeWeeks = getWeeksForRange(consistencyRange);
    const targetTotal = targetPerWeek * targetRangeWeeks;
    const completion = targetTotal > 0 ? (actual / targetTotal) * 100 : 0;
    return {
      actual,
      targetTotal,
      completion,
    };
  }, [consistencyData?.totalWorkouts, consistencyRange, targetPerWeek]);

  const readinessState = useMemo(() => {
    if (whoopRecovery) {
      const recoveryScore = whoopRecovery.recovery_score ?? null;
      const normalized = recoveryScore != null ? recoveryScore / 100 : null;
      const summary = getReadinessSummary(normalized);
      return {
        source: "whoop" as const,
        summary,
        headline: recoveryScore != null ? `${Math.round(recoveryScore)}%` : "—",
        detail:
          whoopRecovery.sleep_performance != null
            ? `Sleep ${Math.round(
                whoopRecovery.sleep_performance,
              )}% • HRV ${Math.round(whoopRecovery.hrv_now_ms ?? 0)}ms`
            : "WHOOP sync complete",
        timestamp: whoopRecovery.raw_data?.recovery ?? null,
      };
    }

    if (manualWellnessEnabled && wellnessHistory?.length) {
      const entry = wellnessHistory[0]!;
      const normalized =
        entry.energy_level != null ? entry.energy_level / 10 : null;
      const summary = getReadinessSummary(normalized);
      return {
        source: "manual" as const,
        summary,
        headline:
          entry.energy_level != null
            ? `${entry.energy_level}/10 energy`
            : "Manual log",
        detail:
          entry.sleep_quality != null
            ? `Sleep ${entry.sleep_quality}/10`
            : (entry.notes ?? "Latest journal entry"),
        timestamp: entry.date,
      };
    }

    return null;
  }, [manualWellnessEnabled, wellnessHistory, whoopRecovery]);

  const cardClass =
    "rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur";

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className={cn(cardClass, "p-5")}>
        <header className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              {formatTimeRangeLabel(strengthRange, { variant: "short" })}
            </p>
            <h3 className="text-foreground text-sm font-semibold">
              Estimated 1RM delta
            </h3>
          </div>
          <span className="text-muted-foreground text-xs font-medium">
            {selectedExerciseName ?? "Select exercise"}
          </span>
        </header>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-serif text-3xl font-black tracking-tight">
              {strengthLoading || !hasExerciseSelection
                ? "—"
                : `${kgFormatter.format(strengthMetrics?.currentOneRM ?? 0)} kg`}
            </p>
            <p
              className={cn(
                "text-xs font-medium",
                (strengthMetrics?.oneRMChange ?? 0) >= 0
                  ? "text-emerald-500"
                  : "text-rose-500",
              )}
            >
              {strengthLoading || !hasExerciseSelection
                ? "Awaiting data"
                : `${(strengthMetrics?.oneRMChange ?? 0) >= 0 ? "+" : ""}${numberFormatter.format(strengthMetrics?.oneRMChange ?? 0)} kg vs start`}
            </p>
          </div>
          <TinySparkline
            data={strengthSparkline}
            ariaLabel="1RM trend"
            className="text-primary"
          />
        </div>
      </article>

      <article className={cn(cardClass, "p-5")}>
        <header className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              {formatTimeRangeLabel(overviewRange, { variant: "short" })}
            </p>
            <h3 className="text-foreground text-sm font-semibold">
              Session intensity
            </h3>
          </div>
          <span className="text-muted-foreground text-xs font-medium">
            RPE proxy
          </span>
        </header>
        <div className="mt-6 grid gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-serif text-3xl font-black tracking-tight">
                {kgFormatter.format(intensityMetrics.average)} kg
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  intensityMetrics.delta >= 0
                    ? "text-emerald-500"
                    : "text-rose-500",
                )}
              >
                {`${intensityMetrics.delta >= 0 ? "+" : ""}${kgFormatter.format(intensityMetrics.delta)} kg vs prior span`}
              </p>
            </div>
            <TinySparkline
              data={intensityMetrics.sparkline}
              ariaLabel="Intensity trend"
              className="text-amber-500"
              color="var(--md-sys-color-secondary)"
            />
          </div>
          <div className="bg-muted/30 flex items-center justify-between rounded-xl px-3 py-2 text-xs">
            <span className="text-muted-foreground font-medium">
              Strain estimate
            </span>
            <span className="text-foreground font-semibold">
              RPE {numberFormatter.format(strainProxy)}
            </span>
          </div>
        </div>
      </article>

      <article className={cn(cardClass, "p-5")}>
        <header className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              {formatTimeRangeLabel(consistencyRange, { variant: "short" })}
            </p>
            <h3 className="text-foreground text-sm font-semibold">
              Goal completion
            </h3>
          </div>
          <span className="text-muted-foreground text-xs font-medium">
            Target {targetPerWeek}/wk
          </span>
        </header>
        <div className="mt-2 flex items-center gap-4">
          <svg
            width="110"
            height="110"
            viewBox="0 0 120 120"
            className="shrink-0"
          >
            <circle
              cx="60"
              cy="60"
              r="48"
              stroke="var(--border)"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              stroke="var(--md-sys-color-primary)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={
                2 *
                Math.PI *
                48 *
                (1 - Math.min(goalMetrics.completion, 125) / 100)
              }
              transform="rotate(-90 60 60)"
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-2xl font-semibold"
            >
              {Math.round(goalMetrics.completion)}%
            </text>
          </svg>
          <div>
            <p className="text-foreground text-lg font-semibold">
              {goalMetrics.actual} /{" "}
              {Math.max(Math.round(goalMetrics.targetTotal), 1)} sessions
            </p>
            <p className="text-muted-foreground text-xs">
              Based on {formatTimeRangeLabel(consistencyRange).toLowerCase()}{" "}
              cadence
            </p>
          </div>
        </div>
      </article>

      <article className={cn(cardClass, "p-5")}>
        <header className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-widest uppercase">
              {formatTimeRangeLabel(readinessRange, { variant: "short" })}
            </p>
            <h3 className="text-foreground text-sm font-semibold">
              Readiness signal
            </h3>
          </div>
          {readinessState?.source === "whoop" && (
            <span className="text-[10px] font-semibold text-emerald-500">
              WHOOP
            </span>
          )}
          {readinessState?.source === "manual" && (
            <span className="text-[10px] font-semibold text-sky-500">
              Manual
            </span>
          )}
        </header>
        {readinessState ? (
          <div className="mt-4 space-y-3">
            <div>
              <p className="font-serif text-3xl font-black tracking-tight">
                {readinessState.headline}
              </p>
              <p className="text-muted-foreground text-xs">
                Last synced {formatRelative(readinessState.timestamp)}
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl px-3 py-2 text-sm",
                readinessState.summary.tone === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : readinessState.summary.tone === "info"
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-300"
                    : readinessState.summary.tone === "warning"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-300",
              )}
            >
              <p className="text-xs font-semibold tracking-wide uppercase">
                {readinessState.summary.label}
              </p>
              <p>{readinessState.summary.message}</p>
            </div>
            <p className="text-muted-foreground text-xs">
              {readinessState.detail}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-muted-foreground text-sm">
              Surface readiness from WHOOP or manual wellness logs.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/connect-whoop"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                )}
              >
                Connect WHOOP
              </Link>
              <Link
                href="/preferences-trigger"
                className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
              >
                Enable manual
              </Link>
            </div>
          </div>
        )}
        {whoopError && whoopError.data?.code !== "NOT_FOUND" && (
          <p className="mt-3 text-xs text-rose-500">
            {whoopLoading ? "Syncing..." : whoopError.message}
          </p>
        )}
      </article>
    </section>
  );
}
