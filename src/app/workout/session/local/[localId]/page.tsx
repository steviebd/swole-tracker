import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

interface LocalWorkoutSessionPageProps {
  params: Promise<{ localId: string }>;
}

export default async function LocalWorkoutSessionPage({
  params,
}: LocalWorkoutSessionPageProps) {
  const user = await currentUser();
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
        <p className="mb-6 text-gray-400">
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
            className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Start New Workout
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Session ID: {localId}
        </p>
      </div>
    </div>
  );
}
