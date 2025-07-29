"use client";

import { useEffect, useState } from "react";
import { useSession, useUser } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "~/lib/supabase-client";
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
  const { user } = useUser();
  const { session } = useSession();

  useEffect(() => {
    if (!user || !session) return;

    async function loadWorkouts() {
      setIsLoading(true);
      setError(null);

      try {
        const client = createClerkSupabaseClient(session ?? null);

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
                template_name: (templateData as { name: string } | null)?.name ?? null,
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
          hasSession: !!session,
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
  }, [user, session]);

  if (isLoading) {
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

  if (error) {
    return (
      <div className="rounded-lg border border-red-500 bg-red-900/20 p-4">
        <p className="text-red-400">Error loading workouts: {error}</p>
      </div>
    );
  }

  if (!workouts?.length) {
    return (
      <div className="rounded-lg bg-gray-800 p-4">
        <p className="py-4 text-center text-gray-400">
          No recent workouts. Start your first workout!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <div key={workout.id} className="relative rounded-lg bg-gray-800 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">
              {workout.template_name ?? "Unknown Template"}
            </h4>
            <div className="text-xs text-gray-400">
              {new Date(workout.workoutDate).toLocaleDateString()}
            </div>
          </div>

          <div className="mb-2 text-sm text-gray-400">
            {workout.exercise_count} exercise
            {workout.exercise_count !== 1 ? "s" : ""} logged
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href={`/workout/session/${workout.id}`}
              className="text-purple-400 hover:text-purple-300"
            >
              View
            </Link>
            <Link
              href={`/workout/start?templateId=${workout.templateId}`}
              className="text-gray-400 hover:text-white"
            >
              Repeat
            </Link>
          </div>
        </div>
      ))}
      <div className="pt-2 text-center text-xs text-gray-500">
        ✨ Powered by Supabase + Clerk
      </div>
    </div>
  );
}
