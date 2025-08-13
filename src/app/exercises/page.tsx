import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api, HydrateClient } from "~/trpc/server";
import { ExerciseManager } from "~/app/_components/exercise-manager";

export default async function ExercisesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Prefetch exercises data
  void api.exercises.getAllMaster.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen overflow-x-hidden">
        <div className="container-default py-6 w-full min-w-0">
          {/* Header */}
          <div className="mb-6 flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 gap-4">
            <Link
              href="/templates"
              className="text-purple-400 hover:text-purple-300"
            >
              ← Back to Templates
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold">Exercise Management</h1>
          </div>

          {/* Exercise Manager */}
          <ExerciseManager />
        </div>
      </main>
    </HydrateClient>
  );
}
