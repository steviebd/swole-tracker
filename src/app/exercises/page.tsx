import Link from "next/link";
import { redirect } from "next/navigation";

// Runtime configuration handled by OpenNext
import { getUserFromHeaders } from "~/lib/workos";

import { api, HydrateClient } from "~/trpc/server";
import { ExerciseManager } from "~/app/_components/exercise-manager";
import { Button } from "~/components/ui/button";


export default async function ExercisesPage() {
  const user = await getUserFromHeaders();

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
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/templates" className="flex-shrink-0">← Back to Templates</Link>
                </Button>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Exercise Management</h1>
              </div>
            </div>
          </div>

          {/* Exercise Manager */}
          <ExerciseManager />
        </div>
      </main>
    </HydrateClient>
  );
}
