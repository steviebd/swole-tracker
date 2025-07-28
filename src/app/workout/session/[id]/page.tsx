import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { WorkoutSession } from "~/app/_components/workout-session";

interface WorkoutSessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutSessionPage({ params }: WorkoutSessionPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user) {
    redirect("/");
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
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link 
              href="/"
              className="text-purple-400 hover:text-purple-300"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{workoutSession.template.name}</h1>
              <p className="text-gray-400 text-sm">
                {new Date(workoutSession.workoutDate).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Workout Session */}
          <WorkoutSession sessionId={sessionId} />
        </div>
      </main>
    </HydrateClient>
  );
}
