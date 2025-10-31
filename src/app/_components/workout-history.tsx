"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Filter,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { api } from "~/trpc/react";
import { useExportWorkoutsCSV } from "~/hooks/use-insights";
import { useLocalStorage } from "~/hooks/use-local-storage";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { DataTable } from "~/components/ui/data-table";
import { useOfflineSaveQueue } from "~/hooks/use-offline-save-queue";

type ViewMode = "cards" | "table";

interface WorkoutFilters {
  search: string;
  templateId: string | null;
  dateFrom: string;
  dateTo: string;
  templateType: string | null;
  hasPersonalRecords: boolean | null;
  isOffline: boolean | null;
}

export function WorkoutHistory() {
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(
    "workout-history-view-mode",
    "cards",
  );

  const [filters, setFilters] = useState<WorkoutFilters>({
    search: "",
    templateId: null,
    dateFrom: "",
    dateTo: "",
    templateType: null,
    hasPersonalRecords: null,
    isOffline: null,
  });

  // Removed manual pagination - TanStack Table handles this
  // const [currentPage, setCurrentPage] = useState(1);
  // const [pageSize] = useState(10);

  const { status: queueStatus, queueSize } = useOfflineSaveQueue();
  const previousQueueStatus = useRef(queueStatus);

  const {
    data: workouts,
    isLoading,
    refetch,
  } = api.workouts.getRecent.useQuery({
    limit: 100, // Increase limit for filtering
  });

  useEffect(() => {
    const prev = previousQueueStatus.current;
    if (
      prev === "flushing" &&
      (queueStatus === "done" || (queueStatus === "idle" && queueSize === 0))
    ) {
      void refetch();
    }
    previousQueueStatus.current = queueStatus;
  }, [queueStatus, queueSize, refetch]);

  const { isFetching: isExporting, refetch: refetchExport } =
    useExportWorkoutsCSV();

  // Get unique templates for filter dropdown
  const templates = useMemo(() => {
    if (!workouts) return [];
    const templateMap = new Map<number, any>();
    workouts.forEach((workout: any) => {
      if (workout.template && !templateMap.has(workout.template.id)) {
        templateMap.set(workout.template.id, workout.template);
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Array.from(templateMap.values());
  }, [workouts]);

  // Filter workouts based on current filters
  const filteredWorkouts = useMemo(() => {
    if (!workouts) return [];

    return workouts.filter((workout) => {
      // Only show workouts that have exercises (completed workouts)
      if (workout.exercises?.length === 0) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          (workout.template?.name.toLowerCase().includes(searchLower) ??
            false) ||
          workout.exercises.some((ex) =>
            ex.exerciseName.toLowerCase().includes(searchLower),
          );
        if (!matchesSearch) return false;
      }

      // Template filter
      if (
        filters.templateId &&
        workout.templateId !== parseInt(filters.templateId)
      ) {
        return false;
      }

      // Template type filter
      if (filters.templateType) {
        if (filters.templateType === "custom" && workout.template) return false;
        if (filters.templateType === "template" && !workout.template)
          return false;
      }

      // Personal records filter
      if (filters.hasPersonalRecords !== null) {
        const metrics = calculateWorkoutMetrics(workout);
        if (metrics.hasPersonalRecords !== filters.hasPersonalRecords)
          return false;
      }

      // Offline filter
      if (filters.isOffline !== null) {
        const metrics = calculateWorkoutMetrics(workout);
        if (metrics.isOffline !== filters.isOffline) return false;
      }

      // Date filters
      const workoutDate = new Date(workout.workoutDate);
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (workoutDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (workoutDate > toDate) return false;
      }

      return true;
    });
  }, [workouts, filters]);

  // Reset to first page when filters change - handled by TanStack Table
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [filters]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        {viewMode === "cards" ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
                <CardFooter className="pt-3">
                  <div className="flex gap-3">
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">🏋️</div>
        <h3 className="text-foreground mb-2 text-xl font-semibold">
          No completed workouts yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Start your first workout and log some exercises to see your history
          here
        </p>
        <Link href="/workout/start">
          <Button size="lg" className="gap-2">
            🚀 Start First Workout
          </Button>
        </Link>
      </div>
    );
  }

  // Check if there are any completed workouts (with exercises)
  const hasCompletedWorkouts = workouts.some(
    (workout) => workout.exercises && workout.exercises.length > 0,
  );

  if (!hasCompletedWorkouts) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">📝</div>
        <h3 className="text-foreground mb-2 text-xl font-semibold">
          No completed workouts yet
        </h3>
        <p className="text-muted-foreground mb-6">
          You have started workouts but haven't logged any exercises yet.
          Complete a workout to see your history here.
        </p>
        <Link href="/workout/start">
          <Button size="lg" className="gap-2">
            🚀 Continue Workout
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search workouts or exercises"
              className="pl-9"
            />
          </div>

          {/* Template Filter */}
          <Select
            value={filters.templateId ?? "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                templateId: value === "all" ? null : value,
              }))
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Template Type Filter */}
          <Select
            value={filters.templateType ?? "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                templateType: value === "all" ? null : value,
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Personal Records Filter */}
          <Select
            value={
              filters.hasPersonalRecords === null
                ? "all"
                : filters.hasPersonalRecords
                  ? "pr"
                  : "no-pr"
            }
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                hasPersonalRecords:
                  value === "all" ? null : value === "pr" ? true : false,
              }))
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Records" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All records</SelectItem>
              <SelectItem value="pr">🏆 PRs only</SelectItem>
              <SelectItem value="no-pr">No PRs</SelectItem>
            </SelectContent>
          </Select>

          {/* Offline Filter */}
          <Select
            value={
              filters.isOffline === null
                ? "all"
                : filters.isOffline
                  ? "offline"
                  : "online"
            }
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                isOffline:
                  value === "all" ? null : value === "offline" ? true : false,
              }))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sync" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="offline">📱 Offline</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
              className="w-36"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
              }
              className="w-36"
            />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-medium">
            View:
          </span>
          <div className="border-border bg-muted/30 flex items-center rounded-lg border p-1">
            <Button
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              className="h-8 px-3 text-xs"
              aria-label="Card view"
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => setViewMode("table")}
              className="h-8 px-3 text-xs"
              aria-label="Table view"
            >
              Table
            </Button>
          </div>
        </div>

        {/* Export Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Export:</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await refetchExport();
                const content = res.data?.content;
                const filename = res.data?.filename ?? "workouts_export.csv";
                if (!content) return;

                // Trigger a client-side download
                const blob = new Blob([content], {
                  type: res.data?.mimeType ?? "text/csv",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  CSV...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  CSV
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const jsonData = JSON.stringify(filteredWorkouts, null, 2);
                const blob = new Blob([jsonData], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `workouts_export_${new Date().toISOString().split("T")[0]}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Workout Data Views */}
      {viewMode === "cards" ? (
        <WorkoutCardsView workouts={filteredWorkouts} />
      ) : (
        <WorkoutTableView workouts={filteredWorkouts} />
      )}
    </div>
  );
}

// Helper function to calculate workout metrics
function calculateWorkoutMetrics(workout: any): {
  workoutTime: string;
  duration: string;
  bestMetric: string;
  totalSets: number;
  hasPersonalRecords: boolean;
  isOffline: boolean;
} {
  const workoutTime = new Date(workout.workoutDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  let duration = "Quick workout";
  let bestMetric = "No exercises";
  let totalSets = 0;
  let hasPersonalRecords = false;
  let isOffline = false;

  if (workout.exercises && workout.exercises.length > 0) {
    // Group exercises by name and find best performance
    const exerciseGroups = new Map<string, any[]>();
    workout.exercises.forEach((exercise: any) => {
      if (!exerciseGroups.has(exercise.exerciseName)) {
        exerciseGroups.set(exercise.exerciseName, []);
      }
      exerciseGroups.get(exercise.exerciseName)!.push(exercise);
      // Each exercise represents one set, so count them
      totalSets += 1;
    });

    // Find best weight across all exercises
    let bestWeight = 0;
    let bestExercise = null;
    for (const [exerciseName, exercises] of exerciseGroups.entries()) {
      for (const exercise of exercises) {
        const weight = exercise.weight
          ? parseFloat(exercise.weight.toString())
          : 0;
        if (weight > bestWeight) {
          bestWeight = weight;
          bestExercise = exercise;
        }
      }
    }

    const totalExercises = exerciseGroups.size;
    duration = `${totalExercises} exercise${totalExercises !== 1 ? "s" : ""}`;

    if (bestWeight > 0 && bestExercise) {
      bestMetric = `Best: ${bestWeight}${bestExercise.unit ?? "lbs"}`;
    } else {
      bestMetric = `${totalExercises} exercise${totalExercises !== 1 ? "s" : ""} logged`;
    }

    // Check for personal records (simplified - in real app would compare with historical data)
    // For now, assume any workout with high volume might have PRs
    hasPersonalRecords = totalSets > 20 || bestWeight > 200;

    // Check if offline (simplified - would need actual offline tracking)
    isOffline = workout.id.toString().includes("local") || Math.random() > 0.8; // Mock for demo
  }

  return {
    workoutTime,
    duration,
    bestMetric,
    totalSets,
    hasPersonalRecords,
    isOffline,
  };
}

// Cards View Component
function WorkoutCardsView({ workouts }: { workouts: any[] }) {
  return (
    <div className="space-y-4">
      {workouts.map((workout) => {
        const {
          workoutTime,
          duration,
          bestMetric,
          totalSets,
          hasPersonalRecords,
          isOffline,
        } = calculateWorkoutMetrics(workout);

        return (
          <Card key={workout.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-foreground line-clamp-1 font-semibold">
                    {workout.template?.name || "Custom Workout"}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    {hasPersonalRecords && (
                      <Badge variant="secondary" className="text-xs">
                        🏆 PR
                      </Badge>
                    )}
                    {isOffline && (
                      <Badge variant="outline" className="text-xs">
                        📱 Offline
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {totalSets} sets
                    </Badge>
                  </div>
                </div>
                <time
                  className="text-muted-foreground shrink-0 text-sm"
                  dateTime={new Date(workout.workoutDate).toISOString()}
                >
                  {new Date(workout.workoutDate).toLocaleDateString()}
                </time>
              </div>
            </CardHeader>

            <CardContent className="py-3">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>{workoutTime}</span>
                <span>•</span>
                <span>{duration}</span>
                <span>•</span>
                <span>{bestMetric}</span>
              </div>
            </CardContent>

            <CardFooter className="pt-3">
              <div className="flex items-center gap-3">
                <Link href={`/workout/session/${workout.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
                <Link href={`/workouts/${workout.id}`}>
                  <Button variant="secondary" size="sm">
                    Debrief
                  </Button>
                </Link>
                <Link href={`/workout/start?templateId=${workout.templateId}`}>
                  <Button size="sm" className="gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Repeat
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

// Type for workout data with computed metrics
type WorkoutWithMetrics = any & {
  metrics: ReturnType<typeof calculateWorkoutMetrics>;
};

// Column helper for type-safe column definitions
const columnHelper = createColumnHelper<WorkoutWithMetrics>();

// Table View Component - Now using TanStack Table with advanced features
function WorkoutTableView({ workouts }: { workouts: any[] }) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Enrich workouts with computed metrics for better performance
  const workoutsWithMetrics = useMemo<WorkoutWithMetrics[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return workouts.map((workout) => ({
      ...workout,
      metrics: calculateWorkoutMetrics(workout),
    })) as WorkoutWithMetrics[];
  }, [workouts]);

  // Bulk actions for selected workouts
  const bulkActions = useMemo(
    () => [
      {
        label: "Export Selected",
        action: (selectedWorkouts: any[]) => {
          const jsonData = JSON.stringify(selectedWorkouts, null, 2);
          const blob = new Blob([jsonData], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `selected_workouts_${new Date().toISOString().split("T")[0]}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        },
      },
      {
        label: "Repeat Selected",
        action: (selectedWorkouts: any[]) => {
          // Could implement bulk repeat functionality
          console.log("Repeat workouts:", selectedWorkouts);
        },
        variant: "secondary" as const,
      },
    ],
    [],
  );

  // Define columns with type safety and advanced features
  const columns = useMemo<ColumnDef<WorkoutWithMetrics>[]>(
    () => [
      columnHelper.accessor("template.name" as any, {
        id: "workout",
        header: "Workout",
        cell: (info) => {
          const name = info.getValue() as string | undefined;
          return (
            <div className="flex flex-col gap-1">
              <span className="font-medium">{name ?? "Custom Workout"}</span>
              {/* Show badges in mobile view */}
              <div className="flex items-center gap-1 md:hidden">
                {info.row.original.metrics.hasPersonalRecords && (
                  <Badge variant="secondary" className="text-xs">
                    🏆 PR
                  </Badge>
                )}
                {info.row.original.metrics.isOffline && (
                  <Badge variant="outline" className="text-xs">
                    📱
                  </Badge>
                )}
              </div>
            </div>
          );
        },
        enableSorting: true,
        size: 200,
      }),
      columnHelper.accessor("workoutDate" as any, {
        id: "date",
        header: "Date",
        cell: (info) => {
          const date = new Date(info.getValue() as string);
          return (
            <time dateTime={date.toISOString()} className="whitespace-nowrap">
              {date.toLocaleDateString()}
            </time>
          );
        },
        enableSorting: true,
        sortingFn: "datetime",
        size: 120,
      }),
      columnHelper.accessor("metrics.workoutTime" as any, {
        id: "time",
        header: "Time",
        cell: (info) => (
          <span className="text-muted-foreground">
            {String(info.getValue())}
          </span>
        ),
        enableSorting: false,
        size: 80,
      }),
      columnHelper.accessor("metrics.duration" as any, {
        id: "exercises",
        header: "Exercises",
        cell: (info) => (
          <span className="text-muted-foreground">
            {String(info.getValue())}
          </span>
        ),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.metrics.totalSets;
          const b = rowB.original.metrics.totalSets;
          return a - b;
        },
        size: 100,
      }),
      columnHelper.accessor("metrics.bestMetric" as any, {
        id: "bestLift",
        header: "Best Lift",
        cell: (info) => (
          <span className="text-muted-foreground">
            {String(info.getValue())}
          </span>
        ),
        enableSorting: false,
        size: 150,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: (info) => {
          const workout = info.row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <Link href={`/workout/session/${workout.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
              <Link href={`/workouts/${workout.id}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Debrief
                </Button>
              </Link>
              <Link href={`/workout/start?templateId=${workout.templateId}`}>
                <Button size="sm" className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden sm:inline">Repeat</span>
                </Button>
              </Link>
            </div>
          );
        },
        size: 200,
        enableResizing: false,
      }),
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={workoutsWithMetrics}
      enablePagination={true}
      enableSorting={true}
      enableFiltering={false} // Filtering handled by parent component
      enableRowSelection={true}
      enableColumnResizing={true}
      enableVirtualization={workoutsWithMetrics.length > 50}
      pageSize={10}
      emptyMessage="No workouts found matching your filters"
      ariaLabel="Workout history table"
      responsive={true}
      compact={false}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      bulkActions={bulkActions}
      virtualHeight={600}
      estimatedRowHeight={60}
    />
  );
}
