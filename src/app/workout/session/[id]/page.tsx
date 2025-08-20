import Link from "next/link";

export const runtime = 'edge';
import { redirect, notFound } from "next/navigation";
import { getUserFromHeaders } from "~/lib/workos";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutSessionWithHealthAdvice } from "~/app/_components/WorkoutSessionWithHealthAdvice";
import { GlassHeader } from "~/app/_components/ui/GlassHeader";
import { Button } from "~/components/ui/button";


interface WorkoutSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutSessionPage({
  params,
}: WorkoutSessionPageProps) {
  const user = await getUserFromHeaders();
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

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full min-w-0">
          {/* Workout Session with Health Advice */}
          <WorkoutSessionWithHealthAdvice sessionId={sessionId} />
        </div>
      </main>
    </HydrateClient>
  );
}
