"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { WorkoutSessionWithHealthAdvice } from "~/app/_components/WorkoutSessionWithHealthAdvice";
import { GlassHeader } from "~/components/ui/glass-header";
import { Button } from "~/components/ui/button";
import { useWorkoutSessionState } from "~/hooks/useWorkoutSessionState";
import {
  WorkoutSessionContext,
  useWorkoutSessionContext,
  type AcceptSuggestionPayload,
} from "~/contexts/WorkoutSessionContext";

const KG_TO_LB = 2.2046226218;

const convertKgToUnit = (value: number, unit: "kg" | "lbs") => {
  if (unit === "lbs") {
    return Number.parseFloat((value * KG_TO_LB).toFixed(2));
  }
  return value;
};

interface WorkoutSessionProviderProps {
  sessionId: number;
  children: React.ReactNode;
}

function WorkoutSessionProvider({
  sessionId,
  children,
}: WorkoutSessionProviderProps) {
  const sessionState = useWorkoutSessionState({
    sessionId,
  });
  const { exercises, updateSet, loading } = sessionState;

  const resolveExerciseIndex = (
    exerciseName: string,
    templateExerciseId?: number,
  ) => {
    if (typeof templateExerciseId === "number") {
      const byTemplateId = exercises.findIndex(
        (ex) => ex.templateExerciseId === templateExerciseId,
      );
      if (byTemplateId !== -1) {
        return byTemplateId;
      }
    }

    return exercises.findIndex((ex) => ex.exerciseName === exerciseName);
  };

  const handleAcceptSuggestion = ({
    exerciseName,
    templateExerciseId,
    setIndex,
    suggestion,
  }: AcceptSuggestionPayload) => {
    const exerciseIndex = resolveExerciseIndex(
      exerciseName,
      templateExerciseId,
    );

    if (exerciseIndex === -1) {
      console.warn(
        "Unable to locate exercise when applying AI suggestion",
        exerciseName,
        templateExerciseId,
      );
      return;
    }

    const targetExercise = exercises[exerciseIndex];
    const targetSet = targetExercise?.sets?.[setIndex];

    if (!targetSet) {
      console.warn("Unable to locate set when applying AI suggestion", {
        exerciseName,
        templateExerciseId,
        setIndex,
      });
      return;
    }

    if (suggestion.weight !== undefined) {
      const unit = (targetSet.unit || targetExercise.unit || "kg") as
        | "kg"
        | "lbs";
      updateSet(
        exerciseIndex,
        setIndex,
        "weight",
        convertKgToUnit(suggestion.weight, unit),
      );
    }

    if (suggestion.reps !== undefined) {
      updateSet(exerciseIndex, setIndex, "reps", suggestion.reps);
    }

    if (suggestion.restSeconds !== undefined) {
      updateSet(exerciseIndex, setIndex, "rest", Math.round(suggestion.restSeconds));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading workout session...</div>
      </div>
    );
  }

  return (
    <WorkoutSessionContext.Provider
      value={{
        updateSet,
        exercises,
        handleAcceptSuggestion,
        sessionState,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

function WorkoutSessionWithHealthAdviceContent({
  sessionId,
}: {
  sessionId: number;
}) {
  const { handleAcceptSuggestion } = useWorkoutSessionContext();

  return (
    <WorkoutSessionWithHealthAdvice
      sessionId={sessionId}
      onAcceptSuggestion={handleAcceptSuggestion}
    />
  );
}

interface WorkoutSessionPageProps {
  params: { id: string };
}

export default function WorkoutSessionPage({
  params,
}: WorkoutSessionPageProps) {
  const router = useRouter();
  const { id } = params;
  const sessionId = parseInt(id);

  if (isNaN(sessionId)) {
    router.push("/workouts");
    return null;
  }

  // Prefetch data
  const {
    data: workoutSession,
    error: workoutError,
    isLoading,
  } = api.workouts.getById.useQuery({
    id: sessionId,
  });
  const { data: preferences } = api.preferences.get.useQuery();

  // Handle case where workout session doesn't exist
  if (workoutError || (workoutSession === null && !isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Workout Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The workout session you're looking for doesn't exist or you don't
            have access to it.
          </p>
          <Link href="/workouts" className="btn-primary">
            Back to Workouts
          </Link>
        </div>
      </div>
    );
  }

  const sessionExercises = Array.isArray(workoutSession?.exercises)
    ? workoutSession.exercises
    : [];

  const templateDetails = (() => {
    if (!workoutSession) {
      return { name: "Workout" };
    }

    const template = (workoutSession as { template?: unknown }).template;
    if (
      template &&
      typeof template === "object" &&
      !Array.isArray(template) &&
      typeof (template as { name?: unknown }).name === "string"
    ) {
      return template as { name: string };
    }

    return { name: "Workout" };
  })();

  const headerTitle = `${
    sessionExercises.length > 0 ? "View Workout: " : ""
  }${templateDetails.name}`;

  const headerSubtitle = (() => {
    if (!workoutSession) {
      return new Date().toLocaleString();
    }

    const rawDate = (workoutSession as { workoutDate?: unknown }).workoutDate;
    if (rawDate instanceof Date) {
      return rawDate.toLocaleString();
    }

    if (typeof rawDate === "string" || typeof rawDate === "number") {
      return new Date(rawDate).toLocaleString();
    }

    return new Date().toLocaleString();
  })();

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Glass Header */}
      <GlassHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        actions={
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back
            </Button>
          </Link>
        }
      />

      <div className="container mx-auto w-full min-w-0 px-3 py-4 sm:px-4 sm:py-6">
        {/* Workout Session with Health Advice */}
        <WorkoutSessionProvider sessionId={sessionId}>
          <WorkoutSessionWithHealthAdviceContent sessionId={sessionId} />
        </WorkoutSessionProvider>
      </div>
    </main>
  );
}
