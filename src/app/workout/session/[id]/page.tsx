import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutSessionWithHealthAdvice } from "~/app/_components/WorkoutSessionWithHealthAdvice";
import { GlassHeader } from "~/components/ui/glass-header";
import { Button } from "~/components/ui/button";

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

  const sessionExercises = Array.isArray(workoutSession.exercises)
    ? workoutSession.exercises
    : [];

  const templateDetails = (() => {
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
    <HydrateClient>
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

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full min-w-0">
          {/* Workout Session with Health Advice */}
          <WorkoutSessionWithHealthAdvice sessionId={sessionId} />
        </div>
      </main>
    </HydrateClient>
  );
}
