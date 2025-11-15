"use client";

import { useEffect, useMemo, useState, useRef } from "react";

import { formatTimeRangeLabel } from "~/lib/time-range";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useProgressRange } from "~/contexts/progress-range-context";
import { analytics } from "~/lib/analytics";
import { VirtualizedSelect } from "~/components/ui/VirtualizedSelect";

import { StrengthAnalysisModal } from "./StrengthAnalysisModal";
import { StrengthSummaryMetrics } from "./StrengthSummaryMetrics";
import { StrengthChartContainer } from "./StrengthChartContainer";
import { StrengthSessionList } from "./StrengthSessionList";

type TimeRange = "week" | "month" | "year";
type ViewMode = "topSet" | "oneRm" | "intensity";
type SortKey = "date" | "weight" | "oneRm" | "volume";

export const VIEW_CONFIG: Record<
  ViewMode,
  { label: string; description: string; unit: string; color: string }
> = {
  topSet: {
    label: "Top Set",
    description: "Heaviest weight lifted per session",
    unit: "kg",
    color: "var(--chart-1)",
  },
  oneRm: {
    label: "1RM Estimate",
    description: "Estimated e1RM for your heaviest set",
    unit: "kg",
    color: "var(--chart-4)",
  },
  intensity: {
    label: "Session Intensity",
    description: "Tonnage proxy (weight × reps × sets)",
    unit: "kg",
    color: "var(--chart-2)",
  },
};

function ExportButton({
  exerciseName,
  templateExerciseId,
  timeRange,
}: {
  exerciseName: string | null;
  templateExerciseId: number | null;
  timeRange: TimeRange;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!exerciseName && !templateExerciseId) return;

    setIsExporting(true);
    try {
      // This would typically call the export API and trigger a download
      // For now, we'll just show a placeholder
      console.log("Exporting data for", {
        exerciseName,
        templateExerciseId,
        timeRange,
      });
      // In a real implementation, you'd fetch the CSV and create a download link
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting || (!exerciseName && !templateExerciseId)}
      className="btn-outline w-full disabled:opacity-50 sm:w-auto"
    >
      {isExporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}

interface StrengthProgressSectionProps {
  selectedExercise: {
    name: string | null;
    templateExerciseId: number | null;
  };
  onExerciseChange: (selection: {
    name: string;
    templateExerciseId?: number | null;
  }) => void;
}

export function StrengthProgressSection({
  selectedExercise,
  onExerciseChange,
}: StrengthProgressSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("topSet");
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "date", direction: "desc" });
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [startTime] = useState(Date.now());
  const {
    range: timeRange,
    setRange: setStrengthRange,
    reset: resetStrengthRange,
    defaultValue: defaultStrengthRange,
  } = useProgressRange("strength");
  const selectedExerciseName = selectedExercise.name;
  const selectedTemplateExerciseId = selectedExercise.templateExerciseId;
  const hasExerciseSelection =
    Boolean(selectedExerciseName) ||
    typeof selectedTemplateExerciseId === "number";

  const {
    data: exerciseList,
    isLoading: exerciseListLoading,
    isError: exerciseListErrored,
  } = api.progress.getExerciseList.useQuery();

  const deduplicatedExerciseList = useMemo(() => {
    if (!exerciseList) return [];
    const map = new Map<string, (typeof exerciseList)[0]>();
    for (const exercise of exerciseList) {
      const key = exercise.exerciseName.toLowerCase().trim();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...exercise });
      } else {
        // Merge template IDs and aliases
        existing.templateExerciseIds = [
          ...new Set([
            ...(existing.templateExerciseIds ?? []),
            ...(exercise.templateExerciseIds ?? []),
          ]),
        ];
        existing.aliases = [
          ...new Set([
            ...(existing.aliases ?? []),
            ...(exercise.aliases ?? []),
          ]),
        ];
        existing.aliasCount = existing.aliases.length;
        existing.totalSets += exercise.totalSets;
        if (exercise.lastUsed > existing.lastUsed) {
          existing.lastUsed = exercise.lastUsed;
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.lastUsed.getTime() - a.lastUsed.getTime(),
    );
  }, [exerciseList]);

  useEffect(() => {
    if (
      (!selectedExerciseName || selectedExerciseName.length === 0) &&
      !exerciseListLoading &&
      deduplicatedExerciseList?.length
    ) {
      const first = deduplicatedExerciseList[0]!;
      onExerciseChange({
        name: first.exerciseName,
        templateExerciseId: (first.templateExerciseIds ?? [])[0] ?? null,
      });
    }
  }, [
    selectedExerciseName,
    exerciseListLoading,
    deduplicatedExerciseList,
    onExerciseChange,
  ]);

  // Reset pagination when exercise, sorting, or time range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedExerciseName, selectedTemplateExerciseId, sortConfig, timeRange]);

  const {
    data: topSetsResponse,
    isLoading: topSetsLoading,
    isError: topSetsErrored,
  } = api.progress.getStrengthProgression.useQuery(
    {
      exerciseName: selectedExerciseName ?? undefined,
      templateExerciseId: selectedTemplateExerciseId ?? undefined,
      timeRange,
    },
    { enabled: hasExerciseSelection },
  );

  const { data: trendSummary, isLoading: summaryLoading } =
    api.progress.getExerciseStrengthProgression.useQuery(
      {
        exerciseName: selectedExerciseName ?? undefined,
        templateExerciseId: selectedTemplateExerciseId ?? undefined,
        timeRange,
      },
      { enabled: hasExerciseSelection },
    );

  // Weekly data is now computed from normalizedSets instead of a separate query
  // This ensures the chart shows data regardless of aggregation table state
  // The weeklyData query is disabled since we'll compute weekly aggregation client-side

  // Track performance when strength data loads
  useEffect(() => {
    if (topSetsResponse?.data && !topSetsLoading) {
      const loadTime = Date.now() - startTime;
      analytics.progressSectionLoad(
        "strength",
        loadTime,
        topSetsResponse.data.length,
      );
    }
  }, [topSetsResponse?.data, topSetsLoading, startTime]);

  const selectedOptionId = useMemo(() => {
    if (!deduplicatedExerciseList?.length) {
      return "";
    }
    if (typeof selectedTemplateExerciseId === "number") {
      const match = deduplicatedExerciseList.find((exercise) =>
        (exercise.templateExerciseIds ?? []).includes(
          selectedTemplateExerciseId,
        ),
      );
      if (match) {
        return match.id;
      }
    }
    if (selectedExerciseName) {
      const match = deduplicatedExerciseList.find(
        (exercise) => exercise.exerciseName === selectedExerciseName,
      );
      if (match) {
        return match.id;
      }
    }
    return "";
  }, [
    deduplicatedExerciseList,
    selectedExerciseName,
    selectedTemplateExerciseId,
  ]);

  const handleExerciseSelect = (optionId: string) => {
    if (!deduplicatedExerciseList || optionId === selectedOptionId) return;
    const option = deduplicatedExerciseList.find(
      (exercise) => exercise.id === optionId,
    );
    if (!option) return;
    onExerciseChange({
      name: option.exerciseName,
      templateExerciseId: (option.templateExerciseIds ?? [])[0] ?? null,
    });
  };

  const normalizedSets = useMemo(() => {
    if (!topSetsResponse?.data) {
      return [];
    }
    return topSetsResponse.data.map((session) => {
      const weight = Number(session.weight ?? 0);
      const reps = Number(session.reps ?? 0);
      const sets = Number(session.sets ?? 1);
      const volume = weight * reps * sets;
      const date = new Date(session.workoutDate);
      const oneRm = Number(session.oneRMEstimate ?? 0);
      const intensityPct =
        trendSummary?.currentOneRM && trendSummary.currentOneRM > 0
          ? Math.round((oneRm / trendSummary.currentOneRM) * 100)
          : null;
      return {
        ...session,
        weight,
        reps,
        sets,
        volume,
        oneRm,
        date,
        intensityPct,
      };
    });
  }, [topSetsResponse?.data, trendSummary?.currentOneRM]);

  const chartPoints = useMemo(() => {
    console.log("chartPoints calculation", {
      normalizedSetsLength: normalizedSets.length,
      viewMode,
    });

    if (normalizedSets.length === 0) {
      return [];
    }

    // Simple chronological display of all sessions (already filtered by time range)
    // Sort chronologically (oldest to newest for line chart)
    const points = normalizedSets
      .slice()
      .reverse()
      .map((session, index) => {
        // Include time to make X-axis unique when multiple sessions on same day
        const dateLabel = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(session.date);

        let value = session.weight;
        if (viewMode === "oneRm") {
          value = session.oneRm;
        } else if (viewMode === "intensity") {
          value = session.volume;
        }

        // Debug: log session details
        if (index < 10) {
          console.log(`chartPoint ${index}:`, {
            date: dateLabel,
            fullDate: session.date.toISOString(),
            weight: session.weight,
            oneRm: session.oneRm,
            volume: session.volume,
            viewMode,
            selectedValue: value,
            exerciseName: session.exerciseName,
          });
        }

        return {
          date: dateLabel,
          fullDate: session.date.toISOString(),
          value,
          // Store original values for tooltip debugging
          weight: session.weight,
          oneRm: session.oneRm,
          volume: session.volume,
          reps: session.reps,
          sets: session.sets,
          exerciseName: session.exerciseName,
        };
      });

    console.log("chartPoints", {
      count: points.length,
      firstFew: points.slice(0, 3),
    });
    return points;
  }, [normalizedSets, viewMode]);

  const rateOfChange = useMemo(() => {
    const timeline = trendSummary?.timeline ?? [];
    if (timeline.length < 2) return 0;
    const first = timeline[0]!.oneRM || 0;
    const last = timeline[timeline.length - 1]!.oneRM || 0;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  }, [trendSummary?.timeline]);

  const bestWeek = useMemo(
    () => calculateBestWeek(normalizedSets),
    [normalizedSets],
  );

  const sessionQuality = useMemo(() => {
    const values = normalizedSets
      .map((set) => set.intensityPct)
      .filter((value): value is number => value != null);
    if (values.length === 0) {
      return {
        label: "Needs signal",
        helper: "Log recent heavy sets to unlock quality tags.",
      };
    }
    const average =
      values.reduce((sum, value) => sum + value, 0) / values.length;
    if (average >= 90) {
      return {
        label: "Peak load",
        helper: "Very heavy singles anchored this block.",
      };
    }
    if (average >= 75) {
      return {
        label: "High stimulus",
        helper: "Plenty of quality work in the 75–85% zone.",
      };
    }
    return {
      label: "Foundation",
      helper: "Focus on progressive loading to push intensity up.",
    };
  }, [normalizedSets]);

  const summaryCards = [
    {
      id: "current-max",
      label: "Current Max",
      value: trendSummary ? `${Math.round(trendSummary.currentOneRM)} kg` : "—",
      helper: trendSummary
        ? `${trendSummary.oneRMChange >= 0 ? "+" : ""}${Math.round(trendSummary.oneRMChange)} kg vs start`
        : "Awaiting data",
    },
    {
      id: "trend",
      label: "Trend",
      value: `${rateOfChange >= 0 ? "+" : ""}${rateOfChange.toFixed(1)}%`,
      helper: "e1RM change over this range",
    },
    {
      id: "best-week",
      label: "Best week",
      value: bestWeek ? bestWeek.label : "—",
      helper: bestWeek
        ? `${bestWeek.sessions} quality lifts`
        : "Track a full week",
    },
    {
      id: "quality",
      label: "Session quality",
      value: sessionQuality.label,
      helper: sessionQuality.helper,
    },
  ];

  const sortedRows = useMemo(() => {
    const rows = [...normalizedSets];
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortConfig.key) {
        case "weight":
          return (a.weight - b.weight) * direction;
        case "oneRm":
          return (a.oneRm - b.oneRm) * direction;
        case "volume":
          return (a.volume - b.volume) * direction;
        default:
          return (a.date.getTime() - b.date.getTime()) * direction;
      }
    });
    return rows;
  }, [normalizedSets, sortConfig]);

  const toggleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  const chartIsEmpty = chartPoints.length === 0;
  const loading =
    topSetsLoading ||
    summaryLoading ||
    exerciseListLoading ||
    !hasExerciseSelection;
  const hasError = topSetsErrored || exerciseListErrored;

  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const hasMultiplePages = totalPages > 1;

  return (
    <section className="glass-surface border-border/70 space-y-6 rounded-2xl border p-6 shadow-sm">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
            Strength • {formatTimeRangeLabel(timeRange)}
          </p>
          <h2 className="text-foreground text-2xl font-semibold">
            Strength Progression
          </h2>
          <p className="text-muted-foreground text-sm">
            Focused on{" "}
            <span className="text-foreground font-medium">
              {selectedExerciseName ?? "choose an exercise"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeRangeSelector current={timeRange} onChange={setStrengthRange} />
          <button
            type="button"
            onClick={() => resetStrengthRange()}
            disabled={timeRange === defaultStrengthRange}
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.3em] uppercase",
              timeRange === defaultStrengthRange
                ? "text-muted-foreground/60 border-transparent"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Reset
          </button>
        </div>
      </header>

      <div>
        <label
          htmlFor="strength-exercise-select"
          className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
        >
          Select exercise
        </label>
        {exerciseListLoading ? (
          <div className="bg-muted/40 mt-2 h-11 animate-pulse rounded-xl" />
        ) : deduplicatedExerciseList && deduplicatedExerciseList.length > 0 ? (
          deduplicatedExerciseList.length > 20 ? (
            <VirtualizedSelect
              items={deduplicatedExerciseList}
              selectedId={selectedOptionId}
              onSelect={handleExerciseSelect}
              getItemId={(exercise) => exercise.id}
              getItemLabel={(exercise) => exercise.exerciseName}
              getItemSubtitle={(exercise) =>
                exercise.aliasCount > 1
                  ? ` (${exercise.aliasCount} linked)`
                  : ""
              }
              placeholder="Choose an exercise…"
              searchPlaceholder="Search exercises..."
            />
          ) : (
            <select
              id="strength-exercise-select"
              value={selectedOptionId}
              onChange={(event) => handleExerciseSelect(event.target.value)}
              className="border-border/60 bg-background/80 text-foreground focus:border-primary mt-2 w-full rounded-xl border px-3 py-2 text-sm font-medium outline-none"
            >
              <option value="">Choose an exercise…</option>
              {deduplicatedExerciseList.map((exercise) => (
                <option
                  key={exercise.id}
                  value={exercise.id}
                  title={
                    (exercise.aliases ?? []).length > 0
                      ? (exercise.aliases ?? []).join(", ")
                      : undefined
                  }
                >
                  {exercise.exerciseName}
                  {exercise.aliasCount > 1
                    ? ` (${exercise.aliasCount} linked)`
                    : ""}
                </option>
              ))}
            </select>
          )
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">
            Log a workout to populate your exercise list.
          </p>
        )}
      </div>

      {!hasExerciseSelection ? (
        <EmptyState />
      ) : hasError ? (
        <div className="border-border/60 text-muted-foreground rounded-2xl border border-dashed p-6 text-sm">
          We couldn’t load your strength data. Refresh or try another exercise.
        </div>
      ) : loading ? (
        <StrengthSkeleton />
      ) : (
        <>
          <StrengthChartContainer
            viewMode={viewMode}
            setViewMode={setViewMode}
            chartIsEmpty={chartIsEmpty}
            chartPoints={chartPoints}
          />

          <StrengthSummaryMetrics summaryCards={summaryCards} />

          <StrengthSessionList
            sortedRows={sortedRows}
            currentPage={currentPage}
            pageSize={pageSize}
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            trendSummary={trendSummary ?? null}
            hasMultiplePages={hasMultiplePages}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            selectedExerciseName={selectedExerciseName}
            selectedTemplateExerciseId={selectedTemplateExerciseId}
            timeRange={timeRange}
            onViewAnalysis={() => setShowModal(true)}
          />

          <StrengthAnalysisModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            exerciseName={selectedExerciseName ?? ""}
            templateExerciseId={selectedTemplateExerciseId}
            timeRange={timeRange}
          />
        </>
      )}
    </section>
  );
}

function TimeRangeSelector({
  current,
  onChange,
}: {
  current: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className="border-border/70 bg-muted/30 flex gap-1 rounded-full border p-1">
      {(["week", "month", "year"] as TimeRange[]).map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase transition",
            current === range
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
}

function SessionTags({
  intensityPct,
  oneRm,
  currentMax,
}: {
  intensityPct: number | null;
  oneRm: number;
  currentMax: number;
}) {
  const tags: Array<{ label: string; tone: "success" | "warning" | "info" }> =
    [];
  if (intensityPct != null && intensityPct >= 90) {
    tags.push({ label: "Goal hit", tone: "success" });
  } else if (intensityPct != null && intensityPct >= 80) {
    tags.push({ label: "Heavy", tone: "info" });
  }
  if (currentMax > 0 && oneRm >= currentMax * 0.95) {
    tags.push({ label: "Near max", tone: "warning" });
  }
  if (tags.length === 0) {
    tags.push({ label: "Builder", tone: "info" });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
            tag.tone === "success"
              ? "bg-emerald-500/15 text-emerald-600"
              : tag.tone === "warning"
                ? "bg-amber-500/15 text-amber-600"
                : "bg-sky-500/15 text-sky-600",
          )}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 text-xs font-semibold tracking-wide uppercase",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active && (direction === "asc" ? "↑" : "↓")}
      </button>
    </th>
  );
}

function EmptyState() {
  return (
    <div className="border-border/60 rounded-2xl border border-dashed p-6 text-center">
      <p className="text-foreground text-lg font-semibold">
        Select an exercise
      </p>
      <p className="text-muted-foreground text-sm">
        Pick any lift to unlock personalized strength analytics.
      </p>
    </div>
  );
}

function StrengthSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-muted/40 h-80 animate-pulse rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted/40 h-32 animate-pulse rounded-2xl"
          />
        ))}
      </div>
      <div className="bg-muted/40 h-64 animate-pulse rounded-2xl" />
    </div>
  );
}

function calculateBestWeek(
  sessions: Array<{ date: Date; weight: number }>,
): { label: string; sessions: number } | null {
  if (sessions.length === 0) return null;
  const bucket = new Map<string, number>();
  for (const session of sessions) {
    const weekStart = new Date(session.date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString();
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }
  const best = [...bucket.entries()].sort((a, b) => b[1]! - a[1]!)[0];
  if (!best) return null;
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(best[0]!));
  return { label, sessions: best[1]! };
}
