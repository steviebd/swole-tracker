import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-400">
          Local Session Not Found
        </h1>
        <p className="mb-6 text-muted-foreground">
          Local workout sessions are no longer supported. <br />
          Your workout may have been moved to your workout history.
        </p>
        <div className="space-x-4">
          <Link
            href="/workouts"
            className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
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
        <p className="mt-4 text-xs text-muted-foreground">
          Session ID: {localId}
        </p>
      </div>
    </div>
  );
}
