import Link from "next/link";
import { redirect } from "next/navigation";
// TODO: Fix WorkOS authkit import
// import { getUser } from "@workos-inc/authkit-nextjs";

interface LocalWorkoutSessionPageProps {
  params: Promise<{ localId: string }>;
}

export default async function LocalWorkoutSessionPage({
  params,
}: LocalWorkoutSessionPageProps) {
  // TODO: Fix WorkOS authkit usage
  // const { user } = await getUser();
  const user = null;
  if (!user) redirect('/sign-in');

  const { localId } = await params;

  // Local sessions are no longer supported
  // Provide a helpful message and redirect to workout history
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-destructive mb-4 text-2xl font-bold">
          Local Session Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          Local workout sessions are no longer supported. <br />
          Your workout may have been moved to your workout history.
        </p>
        <div className="space-x-4">
          <Link href="/workouts" className="btn-primary">
            View Workout History
          </Link>
          <Link href="/workout/start" className="btn-secondary px-4 py-2">
            Start New Workout
          </Link>
        </div>
        <p className="text-muted-foreground mt-4 text-xs">
          Session ID: {localId}
        </p>
      </div>
    </div>
  );
}
