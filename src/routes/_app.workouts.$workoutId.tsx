"use client";

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useWorkout } from "~/lib/queries/workouts";
import { GlassHeader } from "~/components/ui/glass-header";
import {
  WorkoutSessionProvider,
  type AcceptSuggestionPayload,
} from "~/components/workout/WorkoutSessionContext";
import { WorkoutSessionWithHealthAdvice } from "~/components/workout/WorkoutSessionWithHealthAdvice";
import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useMemo, useCallback } from "react";

export const Route = createFileRoute("/_app/workouts/$workoutId")({
  component: WorkoutDetailsPage,
});

function WorkoutDetailsPage() {
  const { workoutId } = Route.useParams();
  const router = useRouter();
  const numericId = useMemo(() => {
    const parsed = parseInt(workoutId, 10);
    return Number.isNaN(parsed) ? NaN : parsed;
  }, [workoutId]);

  const { data: workout, isLoading, error } = useWorkout(numericId);
  const sessionState = useWorkoutSessionState({ sessionId: numericId });

  const handleAcceptSuggestion = useCallback(
    (params: AcceptSuggestionPayload) => {
      console.log("Accept suggestion:", params);
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      updateSet: sessionState.updateSet,
      exercises: sessionState.exercises,
      handleAcceptSuggestion,
      sessionState,
    }),
    [sessionState, handleAcceptSuggestion],
  );

  if (Number.isNaN(numericId)) {
    router.navigate({ to: "/workouts" });
    return null;
  }

  const workoutDate = workout?.workoutDate
    ? new Date(workout.workoutDate)
    : new Date();
  const formattedDate = workoutDate.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  const workoutName =
    workout?.template && typeof workout.template === "object"
      ? ((workout.template as { name?: string }).name ?? "Workout")
      : "Workout";

  const headerTitle =
    workout?.exercises && workout.exercises.length > 0
      ? `View Workout: ${workoutName}`
      : workoutName;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <GlassHeader title="Loading..." />
        <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading workout session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen">
        <GlassHeader title="Workout Not Found" />
        <div className="container mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-6">
                The workout session you're looking for doesn't exist or has been
                deleted.
              </p>
              <Link to="/workouts">
                <Button>Back to Workouts</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <GlassHeader
        title={headerTitle}
        subtitle={formattedDate}
        actions={
          <Link to="/workouts">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
        }
      />
      <main className="min-h-screen overflow-x-hidden">
        <div className="container mx-auto w-full min-w-0 px-3 py-4 sm:px-4 sm:py-6">
          <WorkoutSessionProvider sessionState={sessionState}>
            <WorkoutSessionWithHealthAdvice
              sessionId={numericId}
              onAcceptSuggestion={handleAcceptSuggestion}
            />
          </WorkoutSessionProvider>
        </div>
      </main>
    </div>
  );
}
