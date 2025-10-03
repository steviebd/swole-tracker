import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutHistory } from "~/app/_components/workout-history";
import { PageShell } from "~/components/layout/page-shell";

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
      <PageShell
        title="Workout History"
        description="View and track your workout progression over time"
        backHref="/"
        backLabel="Dashboard"
      >
        <WorkoutHistory />
      </PageShell>
    </HydrateClient>
  );
}
