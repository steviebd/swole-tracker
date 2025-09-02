"use client";

import { useEffect, useState } from "react";
import { useAuth } from "~/providers/AuthProvider";
import { createBrowserSupabaseClient } from "~/lib/supabase-browser";
import Link from "next/link";

interface WorkoutWithTemplate {
  id: number;
  templateId: number;
  workoutDate: string;
  createdAt: string;
  template_name: string | null;
  exercise_count: number;
}

export function RecentWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutWithTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    async function loadWorkouts() {
      setIsLoading(true);
      setError(null);

      try {
        const client = createBrowserSupabaseClient();

        // Query recent workout sessions first
        const { data: workoutData, error: workoutError } = await client
          .from("swole-tracker_workout_session")
          .select("id, templateId, workoutDate, createdAt")
          .eq("user_id", user!.id)
          .order("workoutDate", { ascending: false })
          .limit(3);

        if (workoutError) {
          throw workoutError;
        }

        // Get template names and exercise counts for each workout session
        const workoutsWithDetails: WorkoutWithTemplate[] = await Promise.all(
          (workoutData ?? []).map(
            async (workout: {
              id: number;
              templateId: number;
              workoutDate: string;
              createdAt: string;
            }): Promise<WorkoutWithTemplate> => {
              // Get template name
              const { data: templateData } = await client
                .from("swole-tracker_workout_template")
                .select("name")
                .eq("id", workout.templateId)
                .single();

              // Get exercise count
              const { count } = await client
                .from("swole-tracker_session_exercise")
                .select("*", { count: "exact", head: true })
                .eq("sessionId", workout.id)
                .eq("user_id", user!.id);

              return {
                ...workout,
                template_name:
                  (templateData as { name: string } | null)?.name ?? null,
                exercise_count: count ?? 0,
              };
            },
          ),
        );

        setWorkouts(workoutsWithDetails);
      } catch (err: unknown) {
        console.error("Error loading workouts:", err);
        console.error("Environment check:", {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_KEY,
          userId: user?.id,
        });
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null
              ? JSON.stringify(err)
              : "Failed to load workouts";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkouts();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...(Array(3) as number[])].map((_, i) => (
          <div key={i} className="glass-surface card animate-pulse p-4">
            <div className="mb-2 h-4 w-1/3 skeleton"></div>
            <div className="h-3 w-2/3 skeleton"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card glass-surface border-[var(--color-danger)]/50 p-4">
        <p className="text-[var(--color-danger)]">Error loading workouts: {error}</p>
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="card glass-surface p-4">
        <p className="text-secondary py-4 text-center">
          No recent workouts. Start your first workout!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="card glass-surface relative p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">
              {workout.template_name ?? "Unknown Template"}
            </h4>
            <div className="text-muted text-xs">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>

          <div className="text-secondary mb-2 text-sm">
            {workout.exercise_count} exercise
            {workout.exercise_count !== 1 ? "s" : ""} logged
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/workout/session/${workout.id}`}
              className="link-primary no-underline"
            >
              View
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="text-secondary hover:text-primary"
            >
              Repeat
            </Link>
          </div>
        </div>
      ))}
      <div className="text-muted pt-2 text-center text-xs">
        ✨ Powered by Supabase
      </div>
    </div>
  );
}
