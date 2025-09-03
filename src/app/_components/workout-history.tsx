"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useExportWorkoutsCSV } from "~/hooks/use-insights";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
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

export function WorkoutHistory() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const { data: workouts, isLoading } = api.workouts.getRecent.useQuery({
    limit: 50,
  });

  const { isFetching: isExporting, refetch: refetchExport } =
    useExportWorkoutsCSV();

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
          No workouts yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Start your first workout to see your history here
        </p>
        <Link href="/workout/start">
          <Button size="lg" className="gap-2">
            🚀 Start First Workout
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
            >
              Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => setViewMode("table")}
              className="h-8 px-3 text-xs"
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
          {isExporting ? "Preparing..." : "📁 Export CSV"}
        </Button>
      </div>

      {/* Workout Data Views */}
      {viewMode === "cards" ? (
        <WorkoutCardsView workouts={workouts} />
      ) : (
        <WorkoutTableView workouts={workouts} />
      )}
    </div>
  );
}

// Helper function to calculate workout metrics
function calculateWorkoutMetrics(workout: any): {
  workoutTime: string;
  duration: string;
  bestMetric: string;
} {
  const workoutTime = new Date(workout.workoutDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  let duration = "Quick workout";
  let bestMetric = "No exercises";

  if (workout.exercises.length > 0) {
    // Group exercises by name and find best performance
    const exerciseGroups = new Map<string, typeof workout.exercises>();
    workout.exercises.forEach((exercise: any) => {
      if (!exerciseGroups.has(exercise.exerciseName)) {
        exerciseGroups.set(exercise.exerciseName, []);
      }
      exerciseGroups.get(exercise.exerciseName)!.push(exercise);
    });

    // Find best set across all exercises
    let bestWeight = 0;
    for (const [_exerciseName, sets] of exerciseGroups.entries()) {
      const bestSetInExercise = sets.reduce(
        (
          best: { weight?: string | number },
          current: { weight?: string | number },
        ) => {
          const currentWeight = current.weight
            ? parseFloat(current.weight.toString())
            : 0;
          const bestWeight = best.weight
            ? parseFloat(best.weight.toString())
            : 0;
          return currentWeight > bestWeight ? current : best;
        },
      );

      const weight = bestSetInExercise.weight
        ? parseFloat(bestSetInExercise.weight.toString())
        : 0;
      if (weight > bestWeight) {
        bestWeight = weight;
      }
    }

    const totalExercises = exerciseGroups.size;
    duration = `${totalExercises} exercise${totalExercises !== 1 ? "s" : ""}`;

    if (bestWeight > 0) {
      const bestSet = Array.from(exerciseGroups.values())
        .flat()
        .find(
          (set) =>
            set.weight && parseFloat(set.weight.toString()) === bestWeight,
        );
      bestMetric = `Best: ${bestWeight}${bestSet?.unit ?? "lbs"}`;
    } else {
      bestMetric = `${totalExercises} exercise${totalExercises !== 1 ? "s" : ""} logged`;
    }
  }

  return { workoutTime, duration, bestMetric };
}

// Cards View Component
function WorkoutCardsView({ workouts }: { workouts: any[] }) {
  return (
    <div className="space-y-4">
      {workouts.map((workout) => {
        const { workoutTime, duration, bestMetric } =
          calculateWorkoutMetrics(workout);

        return (
          <Card key={workout.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <h3 className="text-foreground line-clamp-1 font-semibold">
                  {workout.template.name}
                </h3>
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
                <Link href={`/workout/start?templateId=${workout.templateId}`}>
                  <Button size="sm">Repeat</Button>
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
function WorkoutTableView({ workouts }: { workouts: any[] }) {
  return (
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
          {workouts.map((workout) => {
            const { workoutTime, duration, bestMetric } =
              calculateWorkoutMetrics(workout);

            return (
              <TableRow key={workout.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {workout.template.name}
                </TableCell>
                <TableCell>
                  <time dateTime={new Date(workout.workoutDate).toISOString()}>
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
                    <Link
                      href={`/workout/start?templateId=${workout.templateId}`}
                    >
                      <Button size="sm">Repeat</Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
