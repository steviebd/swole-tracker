import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "~/lib/supabase-server";

import ClientHydrate from "~/trpc/HydrateClient";
import {
  getQueryClient,
  getDehydratedState,
  prefetchTemplatesIndex,
} from "~/trpc/prefetch";
import { TemplatesList } from "~/app/_components/templates-list";
import { Button } from "~/components/ui/button";

export default async function TemplatesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // SSR prefetch + hydrate using TanStack Query to avoid client refetch
  const qc = getQueryClient();
  await prefetchTemplatesIndex(qc);
  const state = getDehydratedState(qc);

  return (
    <ClientHydrate state={state}>
      <main className="container-default min-h-screen py-4 sm:py-6 overflow-x-hidden w-full min-w-0">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex-shrink-0 flex items-center">
                  ← Back
                </Link>
              </Button>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Your Workout Arsenal 💪</h1>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:gap-3 flex-shrink-0">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/exercises">
                  Manage Exercises
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/templates/new">
                  🔥 Create New Template
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div>
          <TemplatesList />
        </div>
      </main>
    </ClientHydrate>
  );
}
