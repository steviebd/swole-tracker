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
import { GlassHeader } from "~/app/_components/ui/GlassHeader";
import { Button } from "~/app/_components/ui/Button";

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
      <main className="min-h-screen overflow-x-hidden">
        {/* Glass Header */}
        <GlassHeader
          title="Start Workout"
          subtitle="Choose a template or start from scratch"
          actions={
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
          }
        />

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full min-w-0">
          {/* Workout Starter */}
          <WorkoutStarter
            initialTemplateId={templateId ? parseInt(templateId) : undefined}
          />
        </div>
      </main>
    </ClientHydrate>
  );
}
