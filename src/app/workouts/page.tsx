import Link from "next/link";

// Runtime configuration handled by OpenNext
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getUserFromHeaders } from "~/lib/auth/user";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutHistory } from "~/app/_components/workout-history";
import { Button } from "~/components/ui/button";


export default async function WorkoutsPage() {
  const user = await getUserFromHeaders();

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
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/" className="flex-shrink-0">← Back</Link>
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Workout History</h1>
                  <p className="text-sm text-muted-foreground">View and track your workout progression over time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Workout History */}
          <WorkoutHistory />
        </div>
      </main>
    </HydrateClient>
  );
}
