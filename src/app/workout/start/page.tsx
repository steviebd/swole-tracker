import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

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
  const user = await currentUser();
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
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <Link href="/" className="text-purple-400 hover:text-purple-300">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold">Start Workout</h1>
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
