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
      <main className="container-default min-h-screen py-4 sm:py-6">
        {/* Header */}
        <div className="glass-header mb-4 sm:mb-6 rounded-xl px-3 sm:px-4 py-3">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Link href="/" className="link-primary text-sm sm:text-base flex-shrink-0">
                ← Back
              </Link>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Workout Templates</h1>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:gap-3 flex-shrink-0">
              <Link href="/exercises" className="btn-secondary text-center text-sm sm:text-base py-2">
                Manage Exercises
              </Link>
              <Link href="/templates/new" className="btn-primary text-center text-sm sm:text-base py-2">
                New Template
              </Link>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="glass-surface card p-3 sm:p-4">
          <TemplatesList />
        </div>
      </main>
    </ClientHydrate>
  );
}
