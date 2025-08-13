"use client";

import { useEffect, useState } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { createBrowserSupabaseClient } from "~/lib/supabase-browser";

interface WorkoutSession {
  id: number;
  templateId: number;
  workoutDate: string;
  createdAt: string;
  workout_template: {
    name: string;
  };
}

export function ClientWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    async function loadWorkouts() {
      setLoading(true);

      const client = createBrowserSupabaseClient();

      // Query recent workout sessions first
      const { data: workoutData, error } = await client
        .from("swole-tracker_workout_session")
        .select("id, templateId, workoutDate, createdAt")
        .order("workoutDate", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading workouts:", error);
        setWorkouts([]);
      } else {
        // Get template names for each workout
        const workoutsWithTemplates: WorkoutSession[] = await Promise.all(
          (workoutData ?? []).map(
            async (workout: {
              id: number;
              templateId: number;
              workoutDate: string;
              createdAt: string;
            }): Promise<WorkoutSession> => {
              const { data: templateData } = await client
                .from("swole-tracker_workout_template")
                .select("name")
                .eq("id", workout.templateId)
                .single();

              return {
                ...workout,
                workout_template: templateData ?? { name: "Unknown Template" },
              };
            },
          ),
        );

        setWorkouts(workoutsWithTemplates);
      }

      setLoading(false);
    }

    void loadWorkouts();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-gray-800 p-4">
            <div className="mb-2 h-4 w-1/3 rounded bg-gray-700"></div>
            <div className="h-3 w-2/3 rounded bg-gray-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!workouts.length) {
    return (
      <div className="rounded-lg bg-gray-800 p-4">
        <p className="py-4 text-center text-gray-400">
          No recent workouts found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="rounded-lg bg-gray-800 p-4">
          <h3 className="font-medium">
            {workout.workout_template?.name ?? "Unknown Template"}
          </h3>
          <p className="text-sm text-gray-400">
            Workout Date: {new Date(workout.workoutDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500">Session ID: {workout.id}</p>
        </div>
      ))}
    </div>
  );
}
