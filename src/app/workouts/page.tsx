import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { WorkoutHistory } from "~/app/_components/workout-history";

export default async function WorkoutsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // Prefetch workouts with a higher limit for full history
  void api.workouts.getRecent.prefetch({ limit: 50 });

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
            <h1 className="text-2xl font-bold">Workout History</h1>
          </div>

          {/* Workout History */}
          <WorkoutHistory />
        </div>
      </main>
    </HydrateClient>
  );
}
