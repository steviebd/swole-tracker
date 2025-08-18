import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutHistory } from "~/app/_components/workout-history";
import { Button } from "~/components/ui/button";

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
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Workout History
              </h1>
              <p className="text-muted-foreground mt-1">
                View and track your workout progression over time
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Workout History */}
          <WorkoutHistory />
        </div>
      </main>
    </HydrateClient>
  );
}
