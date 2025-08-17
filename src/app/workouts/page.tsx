import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutHistory } from "~/app/_components/workout-history";
import { GlassHeader } from "~/app/_components/ui/GlassHeader";
import { Button } from "~/app/_components/ui/Button";

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
      <main className="min-h-screen overflow-x-hidden">
        {/* Glass Header */}
        <GlassHeader
          title="Workout History"
          subtitle="View and track your workout progression over time"
          actions={
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
          }
        />

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full min-w-0">
          {/* Workout History */}
          <WorkoutHistory />
        </div>
      </main>
    </HydrateClient>
  );
}
