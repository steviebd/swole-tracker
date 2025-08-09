import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import ClientHydrate from "~/trpc/HydrateClient";
import { getQueryClient, getDehydratedState, prefetchTemplatesIndex } from "~/trpc/prefetch";
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
      <main className="min-h-screen container-default py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between glass-header rounded-xl px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="link-primary">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold">Workout Templates</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/exercises"
              className="btn-secondary"
            >
              Manage Exercises
            </Link>
            <Link
              href="/templates/new"
              className="btn-primary"
            >
              New Template
            </Link>
          </div>
        </div>

        {/* Templates List */}
        <div className="glass-surface card p-4">
          <TemplatesList />
        </div>
      </main>
    </ClientHydrate>
  );
}
