import { redirect } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import { api, HydrateClient } from "~/trpc/server";
import { WorkoutHistory } from "~/app/_components/workout-history";
import { PageShell } from "~/components/layout/page-shell";

export default async function WorkoutsPage() {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);

  if (!session || SessionCookie.isExpired(session)) {
    redirect("/auth/login");
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
