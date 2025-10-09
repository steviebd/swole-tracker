import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import { api, HydrateClient } from "~/trpc/server";
import { ExerciseManager } from "~/app/_components/exercise-manager";
import { Button } from "~/components/ui/button";

export default async function ExercisesPage() {
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

  // Prefetch exercises data
  void api.exercises.getAllMaster.prefetch();

  return (
    <HydrateClient>
      <main className="min-h-screen overflow-x-hidden">
        <div className="container-default w-full min-w-0 py-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/templates" className="flex-shrink-0">
                    ← Back to Templates
                  </Link>
                </Button>
                <h1 className="text-lg font-bold sm:text-xl md:text-2xl">
                  Exercise Management
                </h1>
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
