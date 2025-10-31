"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatTimeRangeLabel } from "~/lib/time-range";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useVirtualizer } from '@tanstack/react-virtual';
import { useProgressRange } from "~/contexts/progress-range-context";
import { analytics } from "~/lib/analytics";

import { StrengthAnalysisModal } from "./StrengthAnalysisModal";

type TimeRange = "week" | "month" | "year";
type ViewMode = "topSet" | "oneRm" | "intensity";
type SortKey = "date" | "weight" | "oneRm" | "volume";

const VIEW_CONFIG: Record<
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
            <VirtualizedExerciseSelect
              exercises={deduplicatedExerciseList}
              selectedId={selectedOptionId}
              onSelect={handleExerciseSelect}
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
          <div className="border-border/70 bg-card/70 rounded-2xl border p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(VIEW_CONFIG) as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition",
                      viewMode === mode
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {VIEW_CONFIG[mode].label}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                {VIEW_CONFIG[viewMode].description}
              </p>
            </div>
            <div className="mt-4 h-72 w-full">
              {chartIsEmpty ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  Not enough sessions yet. Log a few workouts to unlock trend
                  lines.
                </div>
              ) : (
                <StrengthTrendChart
                  data={chartPoints}
                  color={VIEW_CONFIG[viewMode].color}
                  unit={VIEW_CONFIG[viewMode].unit}
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.id}
                className="border-border/70 bg-card/80 rounded-2xl border p-4 shadow-sm"
              >
                <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
                  {card.label}
                </p>
                <p className="text-foreground mt-2 text-2xl font-semibold">
                  {card.value}
                </p>
                <p className="text-muted-foreground text-xs">{card.helper}</p>
              </div>
            ))}
          </div>

          <div className="border-border/70 bg-card/80 rounded-2xl border p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Recent sessions
                </p>
                <p className="text-muted-foreground text-xs">
                  Sort and review your heaviest sets
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary w-full sm:w-auto"
                  onClick={() => setShowModal(true)}
                >
                  View detailed analysis
                </button>
                <ExportButton
                  exerciseName={selectedExerciseName}
                  templateExerciseId={selectedTemplateExerciseId}
                  timeRange={timeRange}
                />
              </div>
            </div>

            <div className="hidden lg:block">
              {sortedRows.length > 50 ? (
                <VirtualizedSessionTable
                  items={sortedRows.slice(
                    (currentPage - 1) * pageSize,
                    currentPage * pageSize,
                  )}
                  containerHeight={400}
                  trendSummary={trendSummary}
                />
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-left text-xs tracking-wide uppercase">
                    <tr>
                      <SortableHeader
                        label="Date"
                        active={sortConfig.key === "date"}
                        direction={sortConfig.direction}
                        onClick={() => toggleSort("date")}
                      />
                      <SortableHeader
                        label="Weight"
                        active={sortConfig.key === "weight"}
                        direction={sortConfig.direction}
                        onClick={() => toggleSort("weight")}
                      />
                      <th className="px-3 py-2 font-normal">Sets × Reps</th>
                      <SortableHeader
                        label="e1RM"
                        active={sortConfig.key === "oneRm"}
                        direction={sortConfig.direction}
                        onClick={() => toggleSort("oneRm")}
                      />
                      <SortableHeader
                        label="Volume"
                        active={sortConfig.key === "volume"}
                        direction={sortConfig.direction}
                        onClick={() => toggleSort("volume")}
                      />
                      <th className="px-3 py-2 font-normal">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    {sortedRows
                      .slice(
                        (currentPage - 1) * pageSize,
                        currentPage * pageSize,
                      )
                      .map((row) => (
                        <tr
                          key={row.workoutDate.toString()}
                          className="text-sm"
                        >
                          <td className="text-foreground px-3 py-3">
                            {row.date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="text-foreground px-3 py-3 font-semibold">
                            {row.weight} kg
                          </td>
                          <td className="text-muted-foreground px-3 py-3">
                            {row.sets} × {row.reps}
                          </td>
                          <td className="text-foreground px-3 py-3">
                            {Math.round(row.oneRm)} kg
                          </td>
                          <td className="text-foreground px-3 py-3">
                            {Math.round(row.volume).toLocaleString()} kg
                          </td>
                          <td className="px-3 py-3">
                            <SessionTags
                              intensityPct={row.intensityPct}
                              oneRm={row.oneRm}
                              currentMax={trendSummary?.currentOneRM ?? 0}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="space-y-3 lg:hidden">
              {sortedRows
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((row) => (
                  <div
                    key={`${row.workoutDate.toISOString()}-mobile`}
                    className="border-border/60 bg-background/40 rounded-2xl border p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-foreground font-semibold">
                        {row.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <SessionTags
                        intensityPct={row.intensityPct}
                        oneRm={row.oneRm}
                        currentMax={trendSummary?.currentOneRM ?? 0}
                      />
                    </div>
                    <dl className="text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt>Weight</dt>
                        <dd className="text-foreground font-semibold">
                          {row.weight} kg
                        </dd>
                      </div>
                      <div>
                        <dt>Sets × Reps</dt>
                        <dd className="text-foreground font-semibold">
                          {row.sets} × {row.reps}
                        </dd>
                      </div>
                      <div>
                        <dt>e1RM</dt>
                        <dd className="text-foreground font-semibold">
                          {Math.round(row.oneRm)} kg
                        </dd>
                      </div>
                      <div>
                        <dt>Volume</dt>
                        <dd className="text-foreground font-semibold">
                          {Math.round(row.volume).toLocaleString()} kg
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
            </div>

            {hasMultiplePages && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-muted-foreground text-xs">
                  Showing{" "}
                  {Math.min(
                    (currentPage - 1) * pageSize + 1,
                    sortedRows.length,
                  )}{" "}
                  to {Math.min(currentPage * pageSize, sortedRows.length)} of{" "}
                  {sortedRows.length} sessions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  <span className="text-muted-foreground text-xs">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

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

export function calculateYAxisDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 100];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Calculate padding based on range to make gradient steeper for smaller ranges
  let padding;
  if (range <= 10) {
    padding = range * 0.5; // For small ranges (e.g., 140-150kg), use 50% padding
  } else if (range <= 50) {
    padding = range * 0.3; // For medium ranges, use 30% padding
  } else {
    padding = range * 0.1; // For large ranges, use 10% padding
  }

  return [Math.max(0, min - padding), max + padding];
}

function StrengthTrendChart({
  data,
  color,
  unit,
}: {
  data: Array<{ date: string; fullDate: string; value: number }>;
  color: string;
  unit: string;
}) {
  // Virtualize large datasets - only show every nth point for performance
  const virtualizedData = useMemo(() => {
    const MAX_POINTS = 100; // Limit to 100 visible points for performance
    if (data.length <= MAX_POINTS) {
      return data;
    }

    const step = Math.ceil(data.length / MAX_POINTS);
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  const values = virtualizedData.map((d) => d.value);
  const domain = calculateYAxisDomain(values);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={virtualizedData}
        margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.3}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={domain}
          tick={{ fontSize: 12, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              const entry = payload[0]!.payload as {
                date: string;
                fullDate: string;
                value: number;
                weight?: number;
                oneRm?: number;
                volume?: number;
                reps?: number;
                sets?: number;
                exerciseName?: string;
              };

              console.log("Tooltip entry:", entry);

              return (
                <div className="border-border/60 bg-background/90 rounded-xl border px-3 py-2 text-xs shadow-md">
                  <p className="text-foreground font-semibold">{entry.date}</p>
                  {entry.exerciseName && (
                    <p className="text-muted-foreground text-[10px]">
                      {entry.exerciseName}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1">
                    {entry.value.toLocaleString()} {unit}
                  </p>
                  <div className="text-muted-foreground/70 mt-1 space-y-0.5 text-[10px]">
                    <div>Weight: {entry.weight} kg</div>
                    <div>1RM: {entry.oneRm?.toFixed(1)} kg</div>
                    <div>Volume: {entry.volume} kg</div>
                    <div>
                      Sets×Reps: {entry.sets}×{entry.reps}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="linear"
          dataKey="value"
          stroke={color}
          strokeWidth={3}
          dot={{
            r: 4,
            fill: "var(--background)",
            stroke: color,
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
            strokeWidth: 2,
            stroke: "var(--background)",
            fill: color,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
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

function VirtualizedExerciseSelect({
  exercises,
  selectedId,
  onSelect,
}: {
  exercises: Array<{
    id: string;
    exerciseName: string;
    aliasCount: number;
    aliases?: string[];
  }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExercises = useMemo(() => {
    if (!searchTerm) return exercises;
    return exercises.filter((exercise) =>
      exercise.exerciseName.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [exercises, searchTerm]);

  const selectedExercise = exercises.find((ex) => ex.id === selectedId);

  return (
    <div className="relative mt-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border-border/60 bg-background/80 text-foreground focus:border-primary w-full rounded-xl border px-3 py-2 text-left text-sm font-medium outline-none"
      >
        {selectedExercise ? (
          <>
            {selectedExercise.exerciseName}
            {selectedExercise.aliasCount > 1
              ? ` (${selectedExercise.aliasCount} linked)`
              : ""}
          </>
        ) : (
          "Choose an exercise…"
        )}
      </button>

      {isOpen && (
        <div className="border-border/60 bg-background/95 absolute top-full z-50 mt-1 max-h-60 w-full overflow-hidden rounded-xl border shadow-lg">
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-border/60 w-full border-b px-3 py-2 text-sm outline-none"
          />
          <VirtualizedExerciseList
            exercises={filteredExercises}
            onSelect={(id) => {
              onSelect(id);
              setIsOpen(false);
              setSearchTerm("");
            }}
          />
        </div>
      )}
    </div>
  );
}

function VirtualizedExerciseList({
  exercises,
  onSelect,
}: {
  exercises: Array<{
    id: string;
    exerciseName: string;
    aliasCount: number;
    aliases?: string[];
  }>;
  onSelect: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: exercises.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: 200 }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const exercise = exercises[virtualItem.index]!;
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(exercise.id)}
                className="hover:bg-muted/50 w-full px-3 py-2 text-left text-sm"
              >
                {exercise.exerciseName}
                {exercise.aliasCount > 1
                  ? ` (${exercise.aliasCount} linked)`
                  : ""}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VirtualizedSessionTable({
  items,
  containerHeight,
  trendSummary,
}: {
  items: Array<{
    workoutDate: Date;
    date: Date;
    weight: number;
    sets: number;
    reps: number;
    oneRm: number;
    volume: number;
    intensityPct: number | null;
  }>;
  containerHeight: number;
  trendSummary?: {
    currentOneRM: number;
  } | null;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="border-border/60 rounded-lg border overflow-auto"
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = items[virtualItem.index]!;
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="border-border/60 border-b px-3 py-3 text-sm">
                <div className="grid grid-cols-6 gap-3">
                  <div className="text-foreground">
                    {row.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-foreground font-semibold">
                    {row.weight} kg
                  </div>
                  <div className="text-muted-foreground">
                    {row.sets} × {row.reps}
                  </div>
                  <div className="text-foreground">
                    {Math.round(row.oneRm)} kg
                  </div>
                  <div className="text-foreground">
                    {Math.round(row.volume).toLocaleString()} kg
                  </div>
                  <div>
                    <SessionTags
                      intensityPct={row.intensityPct}
                      oneRm={row.oneRm}
                      currentMax={trendSummary?.currentOneRM ?? 0}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
