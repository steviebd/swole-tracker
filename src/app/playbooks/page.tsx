import { SessionCookie } from "~/lib/session-cookie";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Suspense, lazy } from "react";

const PlaybooksListView = lazy(() =>
  import("../_components/playbooks/PlaybooksListView").then((module) => ({
    default: module.PlaybooksListView,
  })),
);

const PlaybooksLoading = () => (
  <div className="container mx-auto px-6 py-8 sm:px-8">
    <div className="animate-pulse space-y-8">
      <div className="flex items-center justify-between">
        <div className="bg-muted/50 h-8 w-48 rounded"></div>
        <div className="bg-muted/50 h-10 w-36 rounded"></div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/50 h-48 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export default async function PlaybooksPage() {
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

  return (
    <Suspense fallback={<PlaybooksLoading />}>
      <PlaybooksListView />
    </Suspense>
  );
}
