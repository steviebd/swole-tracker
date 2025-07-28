"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  const { data: session } = api.workouts.getById.useQuery({ id: sessionId });
  const { data: preferences } = api.preferences.get.useQuery();
  const { mutate: updatePreferences } = api.preferences.update.useMutation();
  
  const saveWorkout = api.workouts.save.useMutation({
    onSuccess: () => {
      router.push("/");
    },
  });

  // Initialize exercises from template
  useEffect(() => {
    if (!session?.template) return;

    const initialExercises: ExerciseData[] = session.template.exercises.map((templateExercise: { id: number; exerciseName: string }) => ({
      templateExerciseId: templateExercise.id,
      exerciseName: templateExercise.exerciseName,
      unit: (preferences?.defaultWeightUnit ?? "kg") as "kg" | "lbs",
    }));

    setExercises(initialExercises);
    setLoading(false);
  }, [session?.template, preferences?.defaultWeightUnit]);

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
        />
      ))}

      {/* No Exercises State */}
      {exercises.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No exercises in this template</p>
        </div>
      )}

      {/* Save Button */}
      <div className="sticky bottom-4 pt-6">
        <button
          onClick={handleSave}
          disabled={saveWorkout.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors rounded-lg py-3 font-medium text-lg"
        >
          {saveWorkout.isPending ? "Saving..." : "Save Workout"}
        </button>
      </div>
    </div>
  );
}
