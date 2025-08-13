import { createServerSupabaseClient } from "~/lib/supabase-server";

import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { PreferencesStatusBar } from "~/app/_components/PreferencesStatusBar";
import { HomePageHeader } from "~/app/_components/HomePageHeader";
import { DashboardContent } from "~/app/_components/DashboardContent";

import HydrateClient from "~/trpc/HydrateClient";
import {
  getQueryClient,
  getDehydratedState,
  prefetchHome,
} from "~/trpc/prefetch";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // SSR prefetch + hydrate for faster first paint when signed in
  const qc = getQueryClient();
  await prefetchHome(qc);
  const state = getDehydratedState(qc);

  if (!user) {
    return (
      <HydrateClient state={state}>
        <div className="relative mx-auto max-w-4xl text-center flex items-center justify-center min-h-[60vh] px-3 sm:px-4">
          <div className="glass-surface card p-4 sm:p-6 md:p-8 lg:p-10 rounded-xl w-full">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              💪 <span className="text-purple-400">Swole</span> Tracker
            </h1>
            <p className="text-secondary mx-auto mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base md:text-lg">
              Simple, mobile-first workout tracking. Log your workouts, track
              your progress, and get stronger.
            </p>
            <div className="mt-4 sm:mt-6 md:mt-8">
              <SignInButtons />
            </div>
          </div>
        </div>
      </HydrateClient>
    );
  }

  return (
    <HydrateClient state={state}>
      <>
        <div className="fixed inset-x-0 top-0 z-40">
          <PreferencesStatusBar />
          <HomePageHeader />
        </div>
        <div className="pt-24 sm:pt-28 md:pt-32">
          <DashboardContent />
        </div>
      </>
    </HydrateClient>
  );
}
