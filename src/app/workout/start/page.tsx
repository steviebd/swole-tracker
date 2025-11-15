import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import { api } from "~/trpc/server";
import ClientHydrate from "~/trpc/HydrateClient";
import {
  getQueryClient,
  getDehydratedState,
  prefetchWorkoutStart,
} from "~/trpc/prefetch";
import { WorkoutStarter } from "~/app/_components/workout-starter";
import { Button } from "~/components/ui/button";

interface StartWorkoutPageProps {
  searchParams: Promise<{ templateId?: string }>;
}

export default async function StartWorkoutPage({
  searchParams,
}: StartWorkoutPageProps) {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);
  const { templateId } = await searchParams;

  if (!session || SessionCookie.isExpired(session)) {
    redirect("/auth/login");
  }

  // SSR prefetch + hydrate to speed up template loading and recent list
  const qc = getQueryClient();
  await prefetchWorkoutStart(qc);

  // If templateId is provided, prefetch that template as well
  if (templateId) {
    const id = parseInt(templateId);
    if (!isNaN(id)) {
      void api.templates.getById.prefetch({ id });
    }
  }

  const state = getDehydratedState(qc);

  return (
    <ClientHydrate state={state}>
      <main className="min-h-screen">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          {/* Page Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/" className="flex-shrink-0">
                    ← Back
                  </Link>
                </Button>
                <div>
                  <h1 className="text-lg font-bold sm:text-xl md:text-2xl">
                    Start Workout
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Choose a template or start from scratch
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Workout Starter */}
          <WorkoutStarter
            {...(templateId && { initialTemplateId: parseInt(templateId) })}
          />
        </div>
      </main>
    </ClientHydrate>
  );
}
