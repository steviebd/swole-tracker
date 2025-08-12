import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import ClientHydrate from "~/trpc/HydrateClient";
import {
  getQueryClient,
  getDehydratedState,
  prefetchTemplatesIndex,
} from "~/trpc/prefetch";
import { TemplatesList } from "~/app/_components/templates-list";

export default async function TemplatesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // SSR prefetch + hydrate using TanStack Query to avoid client refetch
  const qc = getQueryClient();
  await prefetchTemplatesIndex(qc);
  const state = getDehydratedState(qc);

  return (
    <ClientHydrate state={state}>
      <main className="container-default min-h-screen py-6">
        {/* Header */}
        <div className="glass-header mb-6 rounded-xl px-3 sm:px-4 py-3">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center gap-4">
              <Link href="/" className="link-primary">
                ← Back
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">Workout Templates</h1>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:gap-3">
              <Link href="/exercises" className="btn-secondary text-center">
                Manage Exercises
              </Link>
              <Link href="/templates/new" className="btn-primary text-center">
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
