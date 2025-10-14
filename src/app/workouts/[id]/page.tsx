import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import { api, HydrateClient } from "~/trpc/server";
import { GlassHeader } from "~/components/ui/glass-header";
import { Button } from "~/components/ui/button";
import { SessionDebriefPanel } from "~/app/_components/session-debrief-panel";

interface WorkoutDebriefPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutDebriefPage({
  params,
}: WorkoutDebriefPageProps) {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const authSession = await SessionCookie.get(mockRequest);
  const { id } = await params;

  if (!authSession || SessionCookie.isExpired(authSession)) {
    redirect("/auth/login");
  }

  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    notFound();
  }

  let session;
  try {
    session = await api.workouts.getById({ id: sessionId });
  } catch {
    notFound();
  }

  void api.sessionDebriefs.listBySession.prefetch({
    sessionId,
    includeInactive: false,
    limit: 10,
  });

  const templateName = (() => {
    const template = (session as { template?: unknown }).template;
    if (
      template &&
      typeof template === "object" &&
      !Array.isArray(template) &&
      typeof (template as { name?: unknown }).name === "string"
    ) {
      return (template as { name: string }).name;
    }

    return "Workout";
  })();

  const sessionDate = (() => {
    const raw = (session as { workoutDate?: unknown }).workoutDate;
    if (raw instanceof Date) {
      return raw.toISOString();
    }

    if (typeof raw === "string" || typeof raw === "number") {
      return new Date(raw).toISOString();
    }

    return new Date().toISOString();
  })();

  // Calculate quick stats
  const exercises = Array.isArray(
    (session as { exercises?: unknown }).exercises,
  )
    ? (
        session as {
          exercises: Array<{
            exerciseName: string;
            weight?: number | null;
            reps?: number | null;
            sets?: number | null;
            unit?: string;
          }>;
        }
      ).exercises
    : [];

  const uniqueExercises = new Set(exercises.map((ex) => ex.exerciseName)).size;

  const totalVolume = exercises.reduce((sum, ex) => {
    const weight = ex.weight || 0;
    const reps = ex.reps || 0;
    const sets = ex.sets || 1;
    return sum + weight * reps * sets;
  }, 0);

  // Estimate duration based on exercises (rough estimate: 5-10 min per exercise + rest time)
  const estimatedDuration = uniqueExercises * 8; // 8 minutes per exercise average

  return (
    <HydrateClient>
      <main className="min-h-screen overflow-x-hidden">
        <GlassHeader
          title={`Session Debrief`}
          subtitle={`${templateName} · ${new Date(sessionDate).toLocaleString()}`}
          actions={
            <Link href="/workouts">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
          }
        />

        {/* Quick Stats Bar */}
        <div className="mx-auto w-full max-w-5xl px-3 py-2 sm:px-6">
          <div className="bg-muted/50 flex flex-wrap items-center justify-center gap-4 rounded-lg p-3 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold">{uniqueExercises}</div>
              <div className="text-muted-foreground">Exercises</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {totalVolume.toFixed(1)}
              </div>
              <div className="text-muted-foreground">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{estimatedDuration}m</div>
              <div className="text-muted-foreground">Est. Duration</div>
            </div>
          </div>
        </div>

        <div className="container mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
          <SessionDebriefPanel
            sessionId={sessionId}
            templateName={templateName}
            sessionDate={sessionDate}
            session={session}
          />
        </div>
      </main>
    </HydrateClient>
  );
}
