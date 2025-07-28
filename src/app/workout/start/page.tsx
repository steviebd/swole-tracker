import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { WorkoutStarter } from "~/app/_components/workout-starter";

interface StartWorkoutPageProps {
  searchParams: Promise<{ templateId?: string }>;
}

export default async function StartWorkoutPage({ searchParams }: StartWorkoutPageProps) {
  const session = await auth();
  const { templateId } = await searchParams;

  if (!session?.user) {
    redirect("/");
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
          <div className="flex items-center gap-4 mb-6">
            <Link 
              href="/"
              className="text-purple-400 hover:text-purple-300"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold">Start Workout</h1>
          </div>

          {/* Workout Starter */}
          <WorkoutStarter initialTemplateId={templateId ? parseInt(templateId) : undefined} />
        </div>
      </main>
    </HydrateClient>
  );
}
