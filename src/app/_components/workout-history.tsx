"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, Calendar, Filter, Download, RotateCcw } from "lucide-react";
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

type ViewMode = "cards" | "table";

interface WorkoutFilters {
  search: string;
  templateId: string | null;
  dateFrom: string;
  dateTo: string;
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
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: workouts, isLoading } = api.workouts.getRecent.useQuery({
    limit: 100, // Increase limit for filtering
  });

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
      if (!workout.exercises || workout.exercises.length === 0) {
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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

        {/* Export Button */}
        <Button
          variant="outline"
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
              Preparing...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      {/* Workout Data Views */}
      {viewMode === "cards" ? (
        <WorkoutCardsView workouts={filteredWorkouts} />
      ) : (
        <WorkoutTableView
          workouts={filteredWorkouts}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
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

// Table View Component
function WorkoutTableView({
  workouts,
  currentPage,
  pageSize,
  onPageChange,
}: {
  workouts: any[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(workouts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedWorkouts = workouts.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workout</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Exercises</TableHead>
              <TableHead>Best Lift</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedWorkouts.map((workout) => {
              const { workoutTime, duration, bestMetric } =
                calculateWorkoutMetrics(workout);

              return (
                <TableRow key={workout.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {workout.template?.name || "Custom Workout"}
                  </TableCell>
                  <TableCell>
                    <time
                      dateTime={new Date(workout.workoutDate).toISOString()}
                    >
                      {new Date(workout.workoutDate).toLocaleDateString()}
                    </time>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {workoutTime}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {duration}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {bestMetric}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
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
                      <Link
                        href={`/workout/start?templateId=${workout.templateId}`}
                      >
                        <Button size="sm" className="gap-1">
                          <RotateCcw className="h-3 w-3" />
                          Repeat
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + pageSize, workouts.length)} of{" "}
            {workouts.length} workouts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
