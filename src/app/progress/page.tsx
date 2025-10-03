import { SessionCookie } from "~/lib/session-cookie";
import { redirect } from "next/navigation";
import { Suspense, lazy } from "react";
import { headers } from "next/headers";

const ProgressDashboard = lazy(() =>
  import("../_components/ProgressDashboard").then((module) => ({
    default: module.ProgressDashboard,
  })),
);

const ProgressLoading = () => (
  <div className="container mx-auto px-6 py-8 sm:px-8">
    <div className="animate-pulse space-y-8">
      <div className="bg-muted/50 h-8 w-48 rounded"></div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/50 h-32 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export default async function ProgressPage() {
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
    <Suspense fallback={<ProgressLoading />}>
      <ProgressDashboard />
    </Suspense>
  );
}
