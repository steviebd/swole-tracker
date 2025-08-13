import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import { api } from "~/trpc/server";
import ClientHydrate from "~/trpc/HydrateClient";
import {
  getQueryClient,
  getDehydratedState,
  prefetchWorkoutStart,
} from "~/trpc/prefetch";
import { WorkoutStarter } from "~/app/_components/workout-starter";

interface StartWorkoutPageProps {
  searchParams: Promise<{ templateId?: string }>;
}

export default async function StartWorkoutPage({
  searchParams,
}: StartWorkoutPageProps) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
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
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
            <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm sm:text-base">
              ← Back
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold">Start Workout</h1>
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
