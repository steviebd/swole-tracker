import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useRecentWorkouts } from "~/lib/queries/workouts";
import { Button } from "~/components/ui/button";
import { WorkoutCard } from "~/components/ui/workout-card";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { GlassSurface } from "~/components/ui/glass-surface";
import {
  buildWorkoutSummary,
  isWorkoutWithinHours,
  type RecentWorkout,
} from "~/lib/workout-metrics";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const router = useRouter();
  const { data: workouts, isLoading, error } = useRecentWorkouts();
  const [filter, setFilter] = useState<"all" | "week" | "month">("all");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");

  const handleRepeatWorkout = useCallback(
    (workout: RecentWorkout) => {
      if (!workout?.templateId) {
        console.error("Cannot repeat workout without templateId", workout);
        return;
      }
      router.navigate({
        to: "/workout/start",
        search: { templateId: workout.templateId },
      });
    },
    [router],
  );

  const handleViewDetails = useCallback(
    (workoutId: number) => {
      router.navigate({
        to: "/workouts/$workoutId",
        params: { workoutId: String(workoutId) },
      });
    },
    [router],
  );

  const handleDebrief = useCallback(
    (workoutId: number) => {
      router.navigate({
        to: "/workouts/$workoutId",
        params: { workoutId: String(workoutId) },
      });
    },
    [router],
  );

  const filteredWorkouts = workouts
    ?.filter((workout) => {
      if (filter === "all") return true;
      const workoutDate = new Date(workout.workoutDate ?? workout.createdAt);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (filter === "week") return diffDays <= 7;
      if (filter === "month") return diffDays <= 30;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.workoutDate ?? a.createdAt).getTime();
      const dateB = new Date(b.workoutDate ?? b.createdAt).getTime();
      return sort === "recent" ? dateB - dateA : dateA - dateB;
    });

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return new Date().toISOString();
    if (dateString instanceof Date) return dateString.toISOString();
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  };

  const resolveTemplateName = (workout: RecentWorkout, fallback: string) => {
    const playbook = (workout as { playbook?: unknown }).playbook;
    if (playbook && typeof playbook === "object" && !Array.isArray(playbook)) {
      const pb = playbook as {
        name?: unknown;
        weekNumber?: unknown;
        sessionNumber?: unknown;
      };
      if (
        typeof pb.name === "string" &&
        typeof pb.weekNumber === "number" &&
        typeof pb.sessionNumber === "number"
      ) {
        const name = pb.name.trim();
        if (name.length > 0) {
          return `${name} - Week ${pb.weekNumber} - Session ${pb.sessionNumber}`;
        }
      }
    }
    const template = (workout as { template?: unknown }).template;
    if (
      template &&
      typeof template === "object" &&
      !Array.isArray(template) &&
      typeof (template as { name?: unknown }).name === "string"
    ) {
      const name = (template as { name: string }).name.trim();
      if (name.length > 0) {
        return name;
      }
    }
    return fallback;
  };

  const resolveWorkoutSource = (workout: RecentWorkout) => {
    const playbook = workout as { playbook?: { name?: string } };
    if (playbook?.playbook?.name) {
      return { type: "playbook" as const, name: playbook.playbook.name };
    }
    const template = workout as { template?: { name?: string } };
    if (template?.template?.name) {
      return { type: "template" as const, name: template.template.name };
    }
    return null;
  };

  return (
    <div className="container mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">Workouts</h1>
        <Link to="/workout/start">
          <Button className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Start Workout
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="bg-background min-w-[120px] flex-1 rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All Time</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="bg-background min-w-[120px] flex-1 rounded-lg border px-3 py-2 text-sm"
        >
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-6 w-32" />
                <Skeleton className="mb-4 h-4 w-48" />
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Unable to load workouts. Please try again later.
            </p>
          </CardContent>
        </Card>
      ) : filteredWorkouts?.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No workouts found.</p>
            <Link to="/workout/start">
              <Button variant="outline">Start Your First Workout</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorkouts?.map((workout) => {
            const summary = buildWorkoutSummary(workout);
            const isoDate = formatDate(
              workout.workoutDate ?? workout.createdAt,
            );
            const isRecent = isWorkoutWithinHours(
              workout.createdAt ?? workout.workoutDate,
            );

            return (
              <WorkoutCard
                key={workout.id}
                workoutName={resolveTemplateName(workout, "Unnamed Workout")}
                date={isoDate}
                metrics={summary.metrics}
                isRecent={isRecent}
                source={resolveWorkoutSource(workout)}
                onRepeat={() => handleRepeatWorkout(workout)}
                onDebrief={() => handleDebrief(workout.id)}
                onViewDetails={() => handleViewDetails(workout.id)}
              />
            );
          })}
        </div>
      )}

      <Link
        to="/workout/start"
        className="fixed right-6 bottom-6 sm:right-8 sm:bottom-8"
      >
        <Button size="lg" className="rounded-full shadow-lg">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Start Workout</span>
        </Button>
      </Link>
    </div>
  );
}
