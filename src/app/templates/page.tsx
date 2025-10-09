import { redirect } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import ClientHydrate from "~/trpc/HydrateClient";
import {
  getQueryClient,
  getDehydratedState,
  prefetchTemplatesIndex,
} from "~/trpc/prefetch";
import { TemplatesList } from "~/app/_components/templates-list";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import Link from "next/link";

export default async function TemplatesPage() {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);

  if (!session || SessionCookie.isExpired(session)) {
    redirect("/auth/login");
  }

  // SSR prefetch + hydrate using TanStack Query to avoid client refetch
  const qc = getQueryClient();
  await prefetchTemplatesIndex(qc);
  const state = getDehydratedState(qc);

  return (
    <ClientHydrate state={state}>
      <PageShell
        title="Your Workout Arsenal"
        description="Organise, duplicate, and launch templates built for your training focus."
        backHref="/"
        backLabel="Dashboard"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/exercises">Manage Exercises</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/templates/new">Create Template</Link>
            </Button>
          </div>
        }
      >
        <TemplatesList />
      </PageShell>
    </ClientHydrate>
  );
}
