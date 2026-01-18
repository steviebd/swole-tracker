"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { WorkoutStarter } from "~/components/workout/WorkoutStarter";
import { GlassHeader } from "~/components/ui/glass-header";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/workout/start")({
  component: WorkoutStartPage,
});

function WorkoutStartPage() {
  const searchParams = Route.useSearch();

  const initialTemplateId = useMemo(() => {
    const templateId = (searchParams as { templateId?: string }).templateId;
    if (!templateId) return undefined;
    const parsed = parseInt(templateId, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      <GlassHeader
        title="Start Workout"
        subtitle="Choose a template or start from scratch"
        actions={
          <Link to="/workouts">
            <button className="text-sm font-medium hover:underline">
              ← Back
            </button>
          </Link>
        }
      />
      <main className="min-h-screen">
        <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-lg font-bold sm:text-xl md:text-2xl">
              Start Workout
            </h1>
            <p className="text-muted-foreground text-sm">
              Choose a template or start from scratch
            </p>
          </div>
          <WorkoutStarter initialTemplateId={initialTemplateId} />
        </div>
      </main>
    </div>
  );
}
