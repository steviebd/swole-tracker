"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ExerciseInput } from "./exercise-input";

interface ExerciseData {
  templateExerciseId?: number;
  exerciseName: string;
  weight?: number;
  reps?: number;
  sets?: number;
  unit: "kg" | "lbs";
}

interface WorkoutSessionProps {
  sessionId: number;
}

export function WorkoutSession({ sessionId }: WorkoutSessionProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const { data: session } = api.workouts.getById.useQuery({ id: sessionId });
  const { data: preferences } = api.preferences.get.useQuery();
  const { mutate: updatePreferences } = api.preferences.update.useMutation();
  const utils = api.useUtils();
  
  const saveWorkout = api.workouts.save.useMutation({
    onMutate: async (newWorkout) => {
      // Cancel any outgoing refetches
      await utils.workouts.getRecent.cancel();
      
      // Snapshot the previous value
      const previousWorkouts = utils.workouts.getRecent.getData({ limit: 5 });
      
      // Optimistically update the cache
      if (session?.template) {
        const optimisticWorkout = {
          id: sessionId,
          userId: session.userId,
          templateId: session.templateId,
          workoutDate: session.workoutDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          template: session.template,
          exercises: newWorkout.exercises.map((exercise, index) => ({
            id: -index, // Temporary negative ID
            sessionId: sessionId,
            templateExerciseId: exercise.templateExerciseId ?? null,
            exerciseName: exercise.exerciseName,
            weight: exercise.weight?.toString() ?? null,
            reps: exercise.reps ?? null,
            sets: exercise.sets ?? null,
            unit: exercise.unit as string,
            createdAt: new Date(),
          })),
        };

        // Add to the beginning of recent workouts
        utils.workouts.getRecent.setData({ limit: 5 }, (old) => 
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
          old ? [optimisticWorkout as any, ...old.slice(0, 4)] : [optimisticWorkout as any]
        );
      }
      
      return { previousWorkouts };
    },
    onError: (err, newWorkout, context) => {
      // Rollback on error
      if (context?.previousWorkouts) {
        utils.workouts.getRecent.setData({ limit: 5 }, context.previousWorkouts);
      }
    },
    onSuccess: () => {
      // Navigate immediately since we've already updated the cache optimistically
      router.push("/");
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.workouts.getRecent.invalidate();
    },
  });

  // Initialize exercises from template or existing session data
  useEffect(() => {
    if (!session?.template) return;

    // Check if this session already has exercises (completed workout)
    if (session.exercises && session.exercises.length > 0) {
      // This is a completed workout, show existing data
      const existingExercises: ExerciseData[] = session.exercises.map((sessionExercise) => ({
        templateExerciseId: sessionExercise.templateExerciseId ?? undefined,
        exerciseName: sessionExercise.exerciseName,
        weight: sessionExercise.weight ? parseFloat(sessionExercise.weight) : undefined,
        reps: sessionExercise.reps ?? undefined,
        sets: sessionExercise.sets ?? undefined,
        unit: (sessionExercise.unit as "kg" | "lbs") ?? "kg",
      }));
      setExercises(existingExercises);
      setIsReadOnly(true);
    } else {
      // This is a new session, initialize from template
      const initialExercises: ExerciseData[] = session.template.exercises.map((templateExercise: { id: number; exerciseName: string }) => ({
        templateExerciseId: templateExercise.id,
        exerciseName: templateExercise.exerciseName,
        unit: (preferences?.defaultWeightUnit ?? "kg") as "kg" | "lbs",
      }));
      setExercises(initialExercises);
      setIsReadOnly(false);
    }

    setLoading(false);
  }, [session?.template, session?.exercises, preferences?.defaultWeightUnit]);

  const updateExercise = (index: number, field: keyof ExerciseData, value: string | number | undefined) => {
    const newExercises = [...exercises];
    if (newExercises[index]) {
      // Type assertion is safe here since we're controlling the field and value types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (newExercises[index] as any)[field] = value;
      setExercises(newExercises);
    }
  };

  const toggleUnit = (index: number) => {
    const currentUnit = exercises[index]?.unit ?? "kg";
    const newUnit = currentUnit === "kg" ? "lbs" : "kg";
    updateExercise(index, "unit", newUnit);
    
    // Update user preference
    updatePreferences({ defaultWeightUnit: newUnit });
  };

  const handleSave = async () => {
    try {
      await saveWorkout.mutateAsync({
        sessionId,
        exercises: exercises.filter((ex) => ex.weight ?? ex.reps ?? ex.sets),
      });
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("Error saving workout. Please try again.");
    }
  };

  if (loading || !session) {
    return (
      <div className="space-y-4">
        {[...Array(3) as number[]].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-10 bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Exercise Cards */}
      {exercises.map((exercise, index) => (
        <ExerciseInput
          key={exercise.templateExerciseId ?? index}
          exercise={exercise}
          index={index}
          onUpdate={updateExercise}
          onToggleUnit={toggleUnit}
          readOnly={isReadOnly}
        />
      ))}

      {/* No Exercises State */}
      {exercises.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No exercises in this template</p>
        </div>
      )}

      {/* Save Button - only show for new workouts */}
      {!isReadOnly && (
        <div className="sticky bottom-4 pt-6">
          <button
            onClick={handleSave}
            disabled={saveWorkout.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors rounded-lg py-3 font-medium text-lg"
          >
            {saveWorkout.isPending ? "Saving..." : "Save Workout"}
          </button>
        </div>
      )}

      {/* Read-only Actions */}
      {isReadOnly && (
        <div className="sticky bottom-4 pt-6 space-y-3">
          <Link
            href={`/workout/start?templateId=${session?.templateId}`}
            className="w-full bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg py-3 font-medium text-lg text-center block"
          >
            Repeat This Workout
          </Link>
          <button
            onClick={() => router.back()}
            className="w-full bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg py-3 font-medium text-lg"
          >
            Back to History
          </button>
        </div>
      )}
    </div>
  );
}
