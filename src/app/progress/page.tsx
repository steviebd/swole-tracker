import { createServerSupabaseClient } from "~/lib/supabase-server";
import { redirect } from "next/navigation";
import { Suspense, lazy } from "react";

const ProgressDashboard = lazy(() => import("../_components/ProgressDashboard").then(module => ({ default: module.ProgressDashboard })));

const ProgressLoading = () => (
  <div className="container mx-auto px-6 sm:px-8 py-8">
    <div className="animate-pulse space-y-8">
      <div className="h-8 bg-muted/50 rounded w-48"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
);

export default async function ProgressPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <Suspense fallback={<ProgressLoading />}>
      <ProgressDashboard />
    </Suspense>
  );
}