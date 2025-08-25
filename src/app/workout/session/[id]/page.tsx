import Link from "next/link";

// Runtime configuration handled by OpenNext
export const dynamic = "force-dynamic";
import { redirect, notFound } from "next/navigation";
import { getUserFromHeaders } from "~/lib/auth/user";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutSession } from "~/app/_components/workout-session";
import { GlassHeader } from "~/app/_components/ui/GlassHeader";
import { Button } from "~/components/ui/button";

interface WorkoutSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutSessionPage({
  params,
}: WorkoutSessionPageProps) {
  console.log(`[WorkoutSession] Route accessed with params:`, { params });

  const user = await getUserFromHeaders();
  console.log(`[WorkoutSession] User authentication result:`, {
    hasUser: !!user,
    userId: user?.id,
  });

  const { id } = await params;
  console.log(`[WorkoutSession] Extracted session ID:`, { id });

  if (!user) {
    console.log(`[WorkoutSession] No user found, redirecting to sign-in`);
    redirect("/sign-in");
  }

  const sessionId = parseInt(id);
  if (isNaN(sessionId)) {
    console.error(`[WorkoutSession] Invalid session ID format:`, {
      id,
      sessionId,
    });
    notFound();
  }

  console.log(`[WorkoutSession] Attempting to fetch workout session:`, {
    sessionId,
  });

  let workoutSession;
  try {
    workoutSession = await api.workouts.getById({ id: sessionId });
    console.log(`[WorkoutSession] Successfully fetched workout:`, {
      workoutId: workoutSession.id,
      templateName: workoutSession.template.name,
      exerciseCount: workoutSession.exercises.length,
    });
  } catch (error) {
    console.error(`[WorkoutSession] Failed to fetch workout session:`, {
      sessionId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    notFound();
  }

  // Prefetch user preferences for weight unit
  void api.preferences.get.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen overflow-x-hidden">
        {/* Glass Header */}
        <GlassHeader
          title={`${workoutSession.exercises.length > 0 ? "View Workout: " : ""}${workoutSession.template.name}`}
          subtitle={new Date(workoutSession.workoutDate).toLocaleString()}
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
          <WorkoutSession sessionId={sessionId} />
        </div>
      </main>
    </HydrateClient>
  );
}
