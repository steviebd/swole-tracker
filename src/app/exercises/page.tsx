import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { api, HydrateClient } from "~/trpc/server";
import { ExerciseManager } from "~/app/_components/exercise-manager";

export default async function ExercisesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Prefetch exercises data
  void api.exercises.getAllMaster.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <Link
              href="/templates"
              className="text-purple-400 hover:text-purple-300"
            >
              ← Back to Templates
            </Link>
            <h1 className="text-2xl font-bold">Exercise Management</h1>
          </div>

          {/* Exercise Manager */}
          <ExerciseManager />
        </div>
      </main>
    </HydrateClient>
  );
}
