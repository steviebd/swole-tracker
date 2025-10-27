"use client";

import { useEffect, useMemo, useState } from "react";

import { formatTimeRangeLabel, getWeeksForRange } from "~/lib/time-range";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useProgressRange } from "~/contexts/progress-range-context";

import { ConsistencyAnalysisModal } from "./ConsistencyAnalysisModal";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ConsistencySection() {
  const [showModal, setShowModal] = useState(false);
  const {
    range: timeRange,
    setRange: setConsistencyRange,
    reset: resetConsistencyRange,
    defaultValue: defaultConsistencyRange,
  } = useProgressRange("consistency");
  const { range: overviewRange } = useProgressRange("overview");

  const utils = api.useUtils();

  const { data: preferences } = api.preferences.get.useQuery();
  const targetPerWeek = preferences?.targetWorkoutsPerWeek ?? 3;
  const [targetDraft, setTargetDraft] = useState(String(targetPerWeek));

  useEffect(() => {
    setTargetDraft(String(targetPerWeek));
  }, [targetPerWeek]);

  const updateTarget = api.preferences.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.preferences.get.invalidate(),
        utils.progress.getConsistencyStats.invalidate(),
        utils.progress.getProgressHighlights.invalidate(),
      ]);
    },
  });

  const { data: consistencyData, isLoading: consistencyLoading } =
    api.progress.getConsistencyStats.useQuery({ timeRange });

  const { data: workoutDatesData = [], isLoading: workoutDatesLoading } =
    api.progress.getWorkoutDates.useQuery({ timeRange });

  const { data: intensityVolumeData, isLoading: intensityLoading } =
    api.progress.getVolumeProgression.useQuery({ timeRange: overviewRange });

  const normalizedWorkoutDates = useMemo(
    () => (workoutDatesData || []).map((entry) => new Date(entry)),
    [workoutDatesData],
  );

  const workoutDateSet = useMemo(() => {
    return new Set(
      (normalizedWorkoutDates || []).map((date) => date.toDateString()),
    );
  }, [normalizedWorkoutDates]);

  const bestWeek = useMemo(
    () => calculateBestWeek(normalizedWorkoutDates),
    [normalizedWorkoutDates],
  );

  const intensityAverage = useMemo(() => {
    if (
      !intensityVolumeData ||
      !Array.isArray(intensityVolumeData) ||
      intensityVolumeData.length === 0
    )
      return 0;
    const total = intensityVolumeData.reduce(
      (sum, entry) => sum + (entry.totalVolume ?? 0),
      0,
    );
    return total / intensityVolumeData.length;
  }, [intensityVolumeData]);

  const weeksInPeriod = getWeeksForRange(timeRange);
  const targetWorkouts = targetPerWeek * weeksInPeriod;
  const actualWorkouts = consistencyData?.totalWorkouts ?? 0;
  const targetProgress =
    targetWorkouts > 0
      ? Math.min(130, (actualWorkouts / targetWorkouts) * 100)
      : 0;

  const goalCompletionChip = {
    id: "goal-completion",
    label: "Goal completion",
    value: `${Math.round(targetProgress)}%`,
    helper: `${actualWorkouts}/${Math.round(targetWorkouts)} workouts`,
  };

  const summaryChips = [
    {
      id: "best-week",
      label: "Best week",
      value: bestWeek ? `${bestWeek.count} sessions` : "—",
      helper: bestWeek ? `Week of ${bestWeek.label}` : "Log workouts to unlock",
      loading: consistencyLoading && !bestWeek,
    },
    {
      id: "avg-intensity",
      label: "Avg intensity",
      value:
        intensityAverage > 0
          ? `${Math.round(intensityAverage).toLocaleString()} kg`
          : "—",
      helper: `Hero range • ${formatTimeRangeLabel(overviewRange, { variant: "short" })}`,
      loading: intensityLoading,
    },
    goalCompletionChip,
  ];

  const isLoading = consistencyLoading || workoutDatesLoading;

  const parsedTarget = Number(targetDraft);
  const clampedTarget = Math.max(
    1,
    Math.min(14, Number.isFinite(parsedTarget) ? parsedTarget : targetPerWeek),
  );
  const targetChanged = Math.round(clampedTarget) !== targetPerWeek;

  const handleTargetSave = () => {
    if (!targetChanged || updateTarget.isPending) return;
    updateTarget.mutate({
      targetWorkoutsPerWeek: Math.round(clampedTarget),
    });
  };

  const calendarTitle =
    timeRange === "week"
      ? "This week"
      : timeRange === "month"
        ? new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        : "Last 52 weeks";

  return (
    <div className="glass-surface border-border/70 space-y-6 rounded-2xl border p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
            Consistency • {formatTimeRangeLabel(timeRange)}
          </p>
          <h2 className="text-foreground text-2xl font-semibold">
            Consistency Tracker
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="border-border/60 bg-muted/30 flex space-x-1 rounded-full border p-1">
            {(["week", "month", "year"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setConsistencyRange(range)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase transition",
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
            onClick={() => resetConsistencyRange()}
            disabled={timeRange === defaultConsistencyRange}
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.3em] uppercase",
              timeRange === defaultConsistencyRange
                ? "text-muted-foreground/60 border-transparent"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Reset
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={`chip-skeleton-${index}`}
                className="bg-muted/40 h-20 animate-pulse rounded-xl"
              />
            ))}
          </div>
          <div className="bg-muted/40 h-64 animate-pulse rounded-2xl" />
          <div className="bg-muted/40 h-56 animate-pulse rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {summaryChips.map((chip) => (
                <SummaryChip key={chip.id} chip={chip} />
              ))}
            </div>

            <div className="border-border/60 bg-card/70 rounded-2xl border p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
                    Calendar • {calendarTitle}
                  </p>
                  <h3 className="text-foreground text-lg font-semibold">
                    Training rhythm
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs">
                  {normalizedWorkoutDates.length} sessions logged
                </p>
              </div>

              <div className="mt-4">
                {timeRange === "week" && (
                  <WeeklyStrip workoutDateSet={workoutDateSet} />
                )}
                {timeRange === "month" && (
                  <MonthlyCalendar workoutDateSet={workoutDateSet} />
                )}
                {timeRange === "year" && (
                  <YearlyHeatmap dates={normalizedWorkoutDates} />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-border/60 bg-card/70 space-y-4 rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
                    Weekly target
                  </p>
                  <h3 className="text-foreground text-lg font-semibold">
                    Adaptive goal
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="border-border/60 text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.3em] uppercase"
                >
                  Details
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={14}
                    value={targetDraft}
                    onChange={(event) => setTargetDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleTargetSave();
                      }
                    }}
                    className="border-border/60 bg-background/80 text-foreground focus:border-primary w-20 rounded-xl border px-3 py-2 text-sm font-semibold outline-none"
                    aria-label="Target workouts per week"
                  />
                  <span className="text-muted-foreground text-sm">
                    workouts / week
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Targets sync with hero goals and highlights.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTargetSave}
                    disabled={!targetChanged || updateTarget.isPending}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold tracking-[0.3em] uppercase",
                      !targetChanged || updateTarget.isPending
                        ? "bg-muted text-muted-foreground/70"
                        : "bg-primary text-primary-foreground hover:opacity-90",
                    )}
                  >
                    {updateTarget.isPending ? "Saving…" : "Save"}
                  </button>
                  {!targetChanged && (
                    <span className="text-xs text-emerald-500">Saved</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">
                    {actualWorkouts}/{Math.round(targetWorkouts)} workouts
                  </span>
                </div>
                <div className="bg-border/60 h-3 w-full rounded-full">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${targetProgress}%`,
                      backgroundColor:
                        targetProgress >= 100
                          ? "var(--color-success)"
                          : targetProgress >= 70
                            ? "var(--color-warning)"
                            : "var(--color-danger)",
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {goalCompletionChip.value} of your target complete
                </p>
              </div>
            </div>

            <div className="border-border/60 bg-card/70 rounded-2xl border p-4">
              <h3 className="text-foreground text-lg font-semibold">
                Consistency insights
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <InsightRow
                  icon="🔥"
                  label="Current streak"
                  value={`${consistencyData?.currentStreak ?? 0} days`}
                  tone={
                    (consistencyData?.currentStreak ?? 0) >= 3
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                  }
                />
                <InsightRow
                  icon="📈"
                  label="Frequency"
                  value={`${consistencyData?.frequency ?? 0}× / wk`}
                  tone={
                    (consistencyData?.frequency ?? 0) >= targetPerWeek
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }
                />
                <InsightRow
                  icon="⭐"
                  label="Consistency score"
                  value={`${consistencyData?.consistencyScore ?? 0}/100`}
                  tone={
                    (consistencyData?.consistencyScore ?? 0) >= 80
                      ? "text-emerald-500"
                      : (consistencyData?.consistencyScore ?? 0) >= 60
                        ? "text-amber-500"
                        : "text-rose-500"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <ConsistencyAnalysisModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        timeRange={timeRange}
      />
    </div>
  );
}

function SummaryChip({
  chip,
}: {
  chip: {
    label: string;
    value: string;
    helper: string;
    loading?: boolean;
  };
}) {
  return (
    <div className="border-border/60 bg-card/70 rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">
        {chip.label}
      </p>
      {chip.loading ? (
        <div className="bg-muted/50 mt-3 h-6 w-24 animate-pulse rounded" />
      ) : (
        <p className="text-foreground mt-2 text-xl font-semibold">
          {chip.value}
        </p>
      )}
      <p className="text-muted-foreground text-xs">{chip.helper}</p>
    </div>
  );
}

function WeeklyStrip({ workoutDateSet }: { workoutDateSet: Set<string> }) {
  const today = new Date();
  const start = getStartOfWeek(today);
  const todayString = today.toDateString();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  if (!workoutDateSet) return null;

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((date) => {
        const isWorkout = workoutDateSet.has(date.toDateString());
        const isToday = date.toDateString() === todayString;
        return (
          <div
            key={date.toISOString()}
            className={cn(
              "border-border/60 flex flex-col items-center justify-center rounded-xl border p-2 text-center text-xs",
              isWorkout
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "text-muted-foreground",
              isToday && "border-primary text-primary",
            )}
          >
            <span>
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="text-foreground text-base font-semibold">
              {date.getDate()}
            </span>
            <span className="tracking-wide uppercase">
              {isWorkout ? "✅" : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyCalendar({ workoutDateSet }: { workoutDateSet: Set<string> }) {
  const matrix = buildMonthMatrix(new Date());
  const today = new Date().toDateString();

  if (!workoutDateSet) return null;

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-wide uppercase">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {matrix.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-10" />;
          }
          const isWorkout = workoutDateSet.has(date.toDateString());
          const isToday = date.toDateString() === today;
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "flex h-10 items-center justify-center rounded-md text-sm transition-all",
                isWorkout
                  ? "bg-emerald-500/15 font-semibold text-emerald-600 dark:text-emerald-300"
                  : "text-muted-foreground hover:bg-muted/40",
                isToday && "ring-primary ring-2",
              )}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearlyHeatmap({ dates }: { dates: Date[] }) {
  const weeks = useMemo(() => buildYearHeatmap(dates || []), [dates]);

  if (!dates) return null;

  return (
    <div>
      <div className="grid grid-cols-13 gap-1">
        {weeks.map((week) => (
          <div
            key={week.weekStart.toISOString()}
            className="h-6 rounded-sm"
            style={{
              backgroundColor: getHeatColor(week.count),
              opacity: week.count === 0 ? 0.3 : 1,
            }}
            title={`${week.count} sessions • ${week.weekStart.toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
              },
            )}`}
          />
        ))}
      </div>
      <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 3, 5].map((value) => (
            <span
              key={value}
              className="h-3 w-6 rounded-sm"
              style={{
                backgroundColor: getHeatColor(value),
                opacity: value === 0 ? 0.3 : 1,
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function InsightRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="border-border/60 bg-background/60 flex items-center justify-between rounded-xl border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {icon}
        </span>
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <span className={cn("text-foreground text-sm font-semibold", tone)}>
        {value}
      </span>
    </div>
  );
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function buildMonthMatrix(referenceDate: Date) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingEmpty = firstDay.getDay();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < leadingEmpty; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= lastDay.getDate(); day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function buildYearHeatmap(dates: Date[]) {
  const buckets = new Map<string, number>();
  dates.forEach((date) => {
    const start = getStartOfWeek(date);
    const key = start.toISOString();
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  const anchor = getStartOfWeek(new Date());
  const weeks: Array<{ weekStart: Date; count: number }> = [];

  for (let offset = 51; offset >= 0; offset -= 1) {
    const weekStart = new Date(anchor);
    weekStart.setDate(anchor.getDate() - offset * 7);
    const key = weekStart.toISOString();
    weeks.push({
      weekStart,
      count: buckets.get(key) ?? 0,
    });
  }

  return weeks;
}

function calculateBestWeek(dates: Date[]) {
  if (!dates?.length) return null;
  const weekMap = new Map<
    string,
    { count: number; start: Date; latest: Date }
  >();

  dates.forEach((date) => {
    const start = getStartOfWeek(date);
    const key = start.toISOString();
    const entry = weekMap.get(key) ?? {
      count: 0,
      start,
      latest: date,
    };
    entry.count += 1;
    entry.latest =
      entry.latest.getTime() < date.getTime() ? date : entry.latest;
    weekMap.set(key, entry);
  });

  const ordered = Array.from(weekMap.values()).sort((a, b) => {
    if (b.count === a.count) {
      return b.latest.getTime() - a.latest.getTime();
    }
    return b.count - a.count;
  });

  const best = ordered[0];
  if (!best) return null;

  return {
    count: best.count,
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(best.start),
  };
}

function getHeatColor(count: number) {
  if (count >= 5) return "var(--color-success)";
  if (count >= 3) return "var(--color-warning)";
  if (count >= 1) return "var(--color-primary)";
  return "var(--color-border)";
}
