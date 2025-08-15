import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutSessionWithHealthAdvice } from "~/app/_components/WorkoutSessionWithHealthAdvice";

interface WorkoutSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutSessionPage({
  params,
}: WorkoutSessionPageProps) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  const sessionId = parseInt(id);
  if (isNaN(sessionId)) {
    notFound();
  }

  let workoutSession;
  try {
    workoutSession = await api.workouts.getById({ id: sessionId });
  } catch {
    notFound();
  }

  // Prefetch user preferences for weight unit
  void api.preferences.get.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen overflow-x-hidden">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full min-w-0">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex items-start gap-3 sm:gap-4">
            <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm sm:text-base flex-shrink-0 mt-1">
              ← Back
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">
                {workoutSession.exercises.length > 0 ? "View Workout: " : ""}
                {workoutSession.template.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {new Date(workoutSession.workoutDate).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Workout Session with Health Advice */}
          <WorkoutSessionWithHealthAdvice sessionId={sessionId} />
        </div>
      </main>
    </HydrateClient>
  );
}
