"use client";

import { VirtualizedSessionTable } from "~/components/tables/VirtualizedSessionTable";

type SortKey = "date" | "weight" | "oneRm" | "volume";

interface StrengthSessionListProps {
  sortedRows: Array<{
    workoutDate: Date;
    date: Date;
    weight: number;
    sets: number;
    reps: number;
    oneRm: number;
    volume: number;
    intensityPct: number | null;
  }>;
  currentPage: number;
  pageSize: number;
  sortConfig: {
    key: SortKey;
    direction: "asc" | "desc";
  };
  setSortConfig: (config: { key: SortKey; direction: "asc" | "desc" }) => void;
  trendSummary?: {
    currentOneRM: number;
  } | null;
  hasMultiplePages: boolean;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  selectedExerciseName: string | null;
  selectedTemplateExerciseId: number | null;
  timeRange: "week" | "month" | "year";
  onViewAnalysis: () => void;
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
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
          style={{
            backgroundColor:
              tag.tone === "success"
                ? "rgb(16 185 129 / 0.15)"
                : tag.tone === "warning"
                  ? "rgb(245 158 11 / 0.15)"
                  : "rgb(14 165 233 / 0.15)",
            color:
              tag.tone === "success"
                ? "#059669"
                : tag.tone === "warning"
                  ? "#d97706"
                  : "#0284c7",
          }}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
}

export function StrengthSessionList({
  sortedRows,
  currentPage,
  pageSize,
  sortConfig,
  setSortConfig,
  trendSummary,
  hasMultiplePages,
  totalPages,
  setCurrentPage,
  selectedExerciseName,
  selectedTemplateExerciseId,
  timeRange,
  onViewAnalysis,
}: StrengthSessionListProps) {
  return (
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
            onClick={onViewAnalysis}
          >
            View detailed analysis
          </button>
          <button
            type="button"
            className="btn-outline w-full disabled:opacity-50 sm:w-auto"
            disabled={!selectedExerciseName && !selectedTemplateExerciseId}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="hidden w-full md:block lg:hidden">
        <VirtualizedSessionTable
          key="tablet-view"
          items={sortedRows.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize,
          )}
          containerHeight={350}
          trendSummary={trendSummary ?? null}
          sorting={[
            { id: sortConfig.key, desc: sortConfig.direction === "desc" },
          ]}
          onSortingChange={(updaterOrValue) => {
            const newSorting =
              typeof updaterOrValue === "function"
                ? updaterOrValue([
                    {
                      id: sortConfig.key,
                      desc: sortConfig.direction === "desc",
                    },
                  ])
                : updaterOrValue;
            const sort = newSorting[0];
            if (sort) {
              setSortConfig({
                key: sort.id as SortKey,
                direction: sort.desc ? "desc" : "asc",
              });
            }
          }}
        />
      </div>

      <div className="hidden w-full lg:block">
        <VirtualizedSessionTable
          key="desktop-view"
          items={sortedRows.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize,
          )}
          containerHeight={400}
          trendSummary={trendSummary ?? null}
          sorting={[
            { id: sortConfig.key, desc: sortConfig.direction === "desc" },
          ]}
          onSortingChange={(updaterOrValue) => {
            const newSorting =
              typeof updaterOrValue === "function"
                ? updaterOrValue([
                    {
                      id: sortConfig.key,
                      desc: sortConfig.direction === "desc",
                    },
                  ])
                : updaterOrValue;
            const sort = newSorting[0];
            if (sort) {
              setSortConfig({
                key: sort.id as SortKey,
                direction: sort.desc ? "desc" : "asc",
              });
            }
          }}
        />
      </div>

      <div className="w-full space-y-3 md:hidden">
        {sortedRows
          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
          .map((row, index) => (
            <div
              key={`${row.workoutDate.toISOString()}-mobile-${index}`}
              className="border-border/60 bg-background/40 w-full rounded-2xl border p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground mb-3 text-sm font-semibold">
                    {row.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <div className="text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    <div className="text-center">
                      <dt className="mb-1 font-medium">Weight</dt>
                      <dd className="text-foreground text-sm font-semibold">
                        {row.weight} kg
                      </dd>
                    </div>
                    <div className="text-center">
                      <dt className="mb-1 font-medium">Sets × Reps</dt>
                      <dd className="text-foreground text-sm font-semibold">
                        {row.sets} × {row.reps}
                      </dd>
                    </div>
                    <div className="text-center">
                      <dt className="mb-1 font-medium">e1RM</dt>
                      <dd className="text-foreground text-sm font-semibold">
                        {Math.round(row.oneRm)} kg
                      </dd>
                    </div>
                    <div className="text-center">
                      <dt className="mb-1 font-medium">Volume</dt>
                      <dd className="text-foreground text-sm font-semibold">
                        {Math.round(row.volume).toLocaleString()} kg
                      </dd>
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-start">
                  <SessionTags
                    intensityPct={row.intensityPct}
                    oneRm={row.oneRm}
                    currentMax={trendSummary?.currentOneRM ?? 0}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>

      {hasMultiplePages && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-muted-foreground text-xs">
            Showing{" "}
            {Math.min((currentPage - 1) * pageSize + 1, sortedRows.length)} to{" "}
            {Math.min(currentPage * pageSize, sortedRows.length)} of{" "}
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
  );
}
