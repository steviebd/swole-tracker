import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createServerSupabaseClient } from "~/lib/supabase-server";
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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    redirect("/sign-in");
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

        <div className="container mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
          <SessionDebriefPanel
            sessionId={sessionId}
            templateName={templateName}
            sessionDate={sessionDate}
          />
        </div>
      </main>
    </HydrateClient>
  );
}
