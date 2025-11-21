import { SessionCookie } from "~/lib/session-cookie";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Suspense, lazy } from "react";

const PlaybookDetailView = lazy(() =>
  import("~/app/_components/playbooks/PlaybookDetailView").then((module) => ({
    default: module.PlaybookDetailView,
  })),
);

const DetailLoading = () => (
  <div className="container mx-auto px-6 py-8 sm:px-8">
    <div className="animate-pulse space-y-8">
      <div className="bg-muted/50 h-12 w-full rounded-lg"></div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/50 h-32 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export default async function PlaybookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const headersList = await headers();
  const mockRequest = {
    headers: {
      get: (name: string) => headersList.get(name),
    },
  } as Request;

  const session = await SessionCookie.get(mockRequest);

  if (!session || SessionCookie.isExpired(session)) {
    redirect("/");
  }

  const { id } = await params;

  return (
    <Suspense fallback={<DetailLoading />}>
      <PlaybookDetailView playbookId={parseInt(id)} />
    </Suspense>
  );
}
