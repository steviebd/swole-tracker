import Link from "next/link";

export const runtime = 'edge';
import { redirect } from "next/navigation";
import { getUserFromHeaders } from "~/lib/workos";

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
  const user = await getUserFromHeaders();
  const { templateId } = await searchParams;

  if (!user) {
    redirect("/sign-in");
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
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Page Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/" className="flex-shrink-0">← Back</Link>
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Start Workout</h1>
                  <p className="text-sm text-muted-foreground">Choose a template or start from scratch</p>
                </div>
              </div>
            </div>
          </div>

          {/* Workout Starter */}
          <WorkoutStarter
            initialTemplateId={templateId ? parseInt(templateId) : undefined}
          />
        </div>
      </main>
    </ClientHydrate>
  );
}
