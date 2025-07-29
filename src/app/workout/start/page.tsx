import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { api, HydrateClient } from "~/trpc/server";
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

  // Prefetch templates
  void api.templates.getAll.prefetch();

  // If templateId is provided, prefetch that template
  if (templateId) {
    const id = parseInt(templateId);
    if (!isNaN(id)) {
      void api.templates.getById.prefetch({ id });
    }
  }

  return (
    <HydrateClient>
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
    </HydrateClient>
  );
}
