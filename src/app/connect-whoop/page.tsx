import { createServerSupabaseClient } from "~/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WhoopWorkouts } from "~/app/_components/whoop-workouts";

export default async function ConnectWhoopPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 py-6 w-full min-w-0">
        <div className="mb-8">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center text-blue-400 transition-colors hover:text-blue-300"
            >
              ← Go Back
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Whoop Workouts</h1>
          <p className="text-gray-400">View and sync your Whoop workout data</p>
        </div>

        <WhoopWorkouts />
      </div>
    </main>
  );
}
