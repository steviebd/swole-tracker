"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { ExerciseInput } from "./exercise-input";
import { analytics } from "~/lib/analytics";
import { useCacheInvalidation } from "~/hooks/use-cache-invalidation";

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
  const { onWorkoutSave, invalidateWorkouts } = useCacheInvalidation();
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
          user_id: session.user_id,
          templateId: session.templateId,
          workoutDate: session.workoutDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          template: session.template,
          exercises: newWorkout.exercises.map((exercise, index) => ({
            id: -index, // Temporary negative ID
            user_id: session.user_id,
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
          old
            ? [optimisticWorkout, ...old.slice(0, 4)]
            : [optimisticWorkout],
        );
      }

      return { previousWorkouts };
    },
    onError: (err, newWorkout, context) => {
      // Rollback on error
      if (context?.previousWorkouts) {
        utils.workouts.getRecent.setData(
          { limit: 5 },
          context.previousWorkouts,
        );
      }
    },
    onSuccess: () => {
      // Track workout completion
      const duration = session?.workoutDate
        ? Math.round(
            (Date.now() - new Date(session.workoutDate).getTime()) / 1000 / 60,
          )
        : 0;
      analytics.workoutCompleted(
        sessionId.toString(),
        duration,
        exercises.length,
      );

      // Comprehensive cache invalidation for workout save
      onWorkoutSave();

      // Navigate immediately since we've already updated the cache optimistically
      router.push("/");
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      void utils.workouts.getRecent.invalidate();
    },
  });

  const deleteWorkout = api.workouts.delete.useMutation({
    onMutate: async () => {
      // Cancel any outgoing refetches
      await utils.workouts.getRecent.cancel();

      // Snapshot the previous value
      const previousWorkouts = utils.workouts.getRecent.getData({ limit: 5 });

      // Optimistically remove from cache
      utils.workouts.getRecent.setData({ limit: 5 }, (old) =>
        old ? old.filter((workout) => workout.id !== sessionId) : [],
      );

      return { previousWorkouts };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousWorkouts) {
        utils.workouts.getRecent.setData(
          { limit: 5 },
          context.previousWorkouts,
        );
      }
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for workout deletion
      invalidateWorkouts();
      
      // Navigate back to home
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
      const existingExercises: ExerciseData[] = session.exercises.map(
        (sessionExercise) => ({
          templateExerciseId: sessionExercise.templateExerciseId ?? undefined,
          exerciseName: sessionExercise.exerciseName,
          weight: sessionExercise.weight
            ? parseFloat(sessionExercise.weight)
            : undefined,
          reps: sessionExercise.reps ?? undefined,
          sets: sessionExercise.sets ?? undefined,
          unit: (sessionExercise.unit as "kg" | "lbs") ?? "kg",
        }),
      );
      setExercises(existingExercises);
      setIsReadOnly(true);
    } else {
      // This is a new session, initialize from template
      const initialExercises: ExerciseData[] = session.template.exercises.map(
        (templateExercise: { id: number; exerciseName: string }) => ({
          templateExerciseId: templateExercise.id,
          exerciseName: templateExercise.exerciseName,
          unit: (preferences?.defaultWeightUnit ?? "kg") as "kg" | "lbs",
        }),
      );
      setExercises(initialExercises);
      setIsReadOnly(false);
    }

    setLoading(false);
  }, [session?.template, session?.exercises, preferences?.defaultWeightUnit]);

  const updateExercise = (
    index: number,
    field: keyof ExerciseData,
    value: string | number | undefined,
  ) => {
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
      analytics.error(error as Error, {
        context: "workout_save",
        sessionId: sessionId.toString(),
      });
      alert("Error saving workout. Please try again.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkout.mutateAsync({ id: sessionId });
    } catch (error) {
      console.error("Error deleting workout:", error);
      analytics.error(error as Error, {
        context: "workout_delete",
        sessionId: sessionId.toString(),
      });
      alert("Error deleting workout. Please try again.");
    }
  };

  if (loading || !session) {
    return (
      <div className="space-y-4">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
            <div className="mb-4 h-4 w-1/2 rounded bg-gray-700"></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-10 rounded bg-gray-700"></div>
              <div className="h-10 rounded bg-gray-700"></div>
              <div className="h-10 rounded bg-gray-700"></div>
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
        <div className="py-8 text-center">
          <p className="text-gray-400">No exercises in this template</p>
        </div>
      )}

      {/* Save Button - only show for new workouts */}
      {!isReadOnly && (
        <div className="sticky bottom-4 space-y-3 pt-6">
          <button
            onClick={handleSave}
            disabled={saveWorkout.isPending}
            className="w-full rounded-lg bg-purple-600 py-3 text-lg font-medium transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {saveWorkout.isPending ? "Saving..." : "Save Workout"}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteWorkout.isPending}
            className="w-full rounded-lg bg-red-600 py-3 text-lg font-medium transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleteWorkout.isPending ? "Deleting..." : "Delete Workout"}
          </button>
        </div>
      )}

      {/* Read-only Actions */}
      {isReadOnly && (
        <div className="sticky bottom-4 space-y-3 pt-6">
          <Link
            href={`/workout/start?templateId=${session?.templateId}`}
            className="block w-full rounded-lg bg-purple-600 py-3 text-center text-lg font-medium transition-colors hover:bg-purple-700"
          >
            Repeat This Workout
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteWorkout.isPending}
            className="w-full rounded-lg bg-red-600 py-3 text-lg font-medium transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleteWorkout.isPending ? "Deleting..." : "Delete Workout"}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full rounded-lg bg-gray-700 py-3 text-lg font-medium transition-colors hover:bg-gray-600"
          >
            Back to History
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="bg-opacity-75 fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-red-400">
              ⚠️ Delete Workout
            </h3>
            <p className="mb-6 leading-relaxed text-gray-300">
              Are you sure you want to delete this workout?
              <br />
              <strong className="text-red-400">
                This action cannot be undone.
              </strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg bg-gray-600 py-3 font-medium text-white transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  void handleDelete();
                }}
                disabled={deleteWorkout.isPending}
                className="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteWorkout.isPending ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
