import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutHistory } from "~/app/_components/workout-history";

export default async function WorkoutsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Prefetch workouts with a higher limit for full history
  void api.workouts.getRecent.prefetch({ limit: 50 });

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
            <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm sm:text-base">
              ← Back
            </Link>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Workout History</h1>
          </div>

          {/* Workout History */}
          <WorkoutHistory />
        </div>
      </main>
    </HydrateClient>
  );
}
