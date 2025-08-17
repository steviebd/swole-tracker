"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { useExportWorkoutsCSV } from "~/hooks/use-insights";
import { Card, CardHeader, CardContent, CardFooter } from "~/app/_components/ui/Card";
import { Button } from "~/app/_components/ui/Button";

export function WorkoutHistory() {
  const { data: workouts, isLoading } = api.workouts.getRecent.useQuery({
    limit: 50,
  });

  const {
    data: exportData,
    isFetching: isExporting,
    refetch: refetchExport,
  } = useExportWorkoutsCSV();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...(Array(5) as number[])].map((_, i) => (
          <Card key={i} variant="glass" padding="md" className="animate-pulse">
            <div className="mb-2 h-4 w-1/3 rounded" style={{ backgroundColor: "var(--color-border)" }}></div>
            <div className="mb-2 h-3 w-1/2 rounded" style={{ backgroundColor: "var(--color-border)" }}></div>
            <div className="h-3 w-2/3 rounded" style={{ backgroundColor: "var(--color-border)" }}></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-6xl">🏋️</div>
        <h3 className="mb-2 text-xl font-semibold">No workouts yet</h3>
        <p className="mb-6" style={{ color: "var(--color-text-secondary)" }}>
          Start your first workout to see your history here
        </p>
        <Link
          href="/workout/start"
          className="btn-primary px-5 py-3 text-base min-h-[44px] inline-flex items-center justify-center"
        >
          Start First Workout
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export / Share */}
      <div className="flex items-center justify-end">
        <span className="sr-only">
          {exportData ? "Export data ready" : "No export data"}
        </span>
        <Button
          size="md"
          variant="secondary"
          className="min-h-[44px]"
          aria-label="Export recent workouts as CSV"
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
        >
          {isExporting ? "Preparing CSV…" : "Export CSV"}
        </Button>
      </div>

      {workouts.map((workout) => {
        // Calculate workout summary data for the 3-line structure
        const workoutTime = new Date(workout.workoutDate).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        
        // Calculate duration and best metric
        let duration = "Quick workout";
        let bestMetric = "No exercises";
        
        if (workout.exercises.length > 0) {
          // Group exercises by name and find best performance
          const exerciseGroups = new Map<string, typeof workout.exercises>();
          workout.exercises.forEach((exercise) => {
            if (!exerciseGroups.has(exercise.exerciseName)) {
              exerciseGroups.set(exercise.exerciseName, []);
            }
            exerciseGroups.get(exercise.exerciseName)!.push(exercise);
          });
          
          // Find best set across all exercises
          let bestWeight = 0;
          for (const [exerciseName, sets] of exerciseGroups.entries()) {
            const bestSetInExercise = sets.reduce((best, current) => {
              const currentWeight = current.weight ? parseFloat(current.weight) : 0;
              const bestWeight = best.weight ? parseFloat(best.weight) : 0;
              return currentWeight > bestWeight ? current : best;
            });
            
            const weight = bestSetInExercise.weight ? parseFloat(bestSetInExercise.weight) : 0;
            if (weight > bestWeight) {
              bestWeight = weight;
            }
          }
          
          const totalExercises = exerciseGroups.size;
          duration = `${totalExercises} exercise${totalExercises !== 1 ? 's' : ''}`;
          
          if (bestWeight > 0) {
            const bestSet = Array.from(exerciseGroups.values())
              .flat()
              .find(set => set.weight && parseFloat(set.weight) === bestWeight);
            bestMetric = `Best: ${bestWeight}${bestSet?.unit ?? 'lbs'}`;
          } else {
            bestMetric = `${totalExercises} exercise${totalExercises !== 1 ? 's' : ''} logged`;
          }
        }
        
        return (
          <Card
            key={workout.id}
            variant="glass"
            padding="md"
            interactive
            as="article"
            className="mb-3 sm:mb-4"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {workout.template.name}
                </h3>
                <time 
                  className="text-sm" style={{ color: "var(--color-text-secondary)" }}
                  dateTime={new Date(workout.workoutDate).toISOString()}
                >
                  {new Date(workout.workoutDate).toLocaleDateString()}
                </time>
              </div>
            </CardHeader>
            
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                <span>{workoutTime}</span>
                <span>•</span>
                <span>{duration}</span>
                <span>•</span>
                <span>{bestMetric}</span>
              </div>
            </CardContent>
            
            <CardFooter className="pt-2">
              <div className="flex items-center gap-3">
                <Link
                  href={`/workout/session/${workout.id}`}
                  className="btn-ghost px-4 py-2 text-sm min-h-[44px] inline-flex items-center justify-center"
                >
                  View
                </Link>
                <Link
                  href={`/workout/start?templateId=${workout.templateId}`}
                  className="btn-primary px-4 py-2 text-sm min-h-[44px] inline-flex items-center justify-center"
                >
                  Repeat
                </Link>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
