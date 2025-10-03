import Link from "next/link";
import { redirect } from "next/navigation";

import { RedirectCountdown } from "./redirect-countdown";
import { createServerSupabaseClient } from "~/lib/supabase-server";

interface LocalWorkoutSessionPageProps {
  params: Promise<{ localId: string }>;
}

export default async function LocalWorkoutSessionPage({
  params,
}: LocalWorkoutSessionPageProps) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { localId } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  // Local sessions are no longer supported
  // Provide a helpful message and redirect to workout history
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold text-destructive">
          Local Session Not Found
        </h1>
        <p className="mb-6 text-muted-foreground">
          Local workout sessions are no longer supported. <br />
          Your workout may have been moved to your workout history.
        </p>
        <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 p-4 text-left text-sm text-muted-foreground">
          <p className="mb-2 font-semibold text-foreground">Next steps</p>
          <ul className="space-y-2">
            <li>
              Open the sync tray in the header to review the offline queue and
              confirm the session finished uploading.
            </li>
            <li>
              If the workout still appears as pending, keep the app open on a
              stable connection until the sync indicator turns green.
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/workouts"
            className="btn-primary"
          >
            View Workout History
          </Link>
          <Link
            href="/workout/start"
            className="btn-secondary px-4 py-2"
          >
            Start New Workout
          </Link>
        </div>
        <RedirectCountdown href="/workouts" />
        <p className="mt-4 text-xs text-muted-foreground">
          Session ID: {localId}
        </p>
        <Link
          href="/support"
          className="mt-3 inline-flex items-center justify-center text-sm font-medium text-primary underline"
        >
          Need help? Contact support
        </Link>
      </div>
    </div>
  );
}
