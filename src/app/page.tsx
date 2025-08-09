import { currentUser } from "@clerk/nextjs/server";

import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { DashboardContent } from "~/app/_components/DashboardContent";
import { HomePageLayout } from "~/app/_components/HomePageLayout";

import HydrateClient from "~/trpc/HydrateClient";
import {
  getQueryClient,
  getDehydratedState,
  prefetchHome,
} from "~/trpc/prefetch";

export default async function Home() {
  const user = await currentUser();

  // SSR prefetch + hydrate for faster first paint when signed in
  const qc = getQueryClient();
  await prefetchHome(qc);
  const state = getDehydratedState(qc);

  if (!user) {
    return (
      <HydrateClient state={state}>
        <HomePageLayout showHeader={false} showStatusBar={false}>
          <div className="relative mx-auto max-w-3xl text-center flex items-center justify-center min-h-[60vh]">
            <div className="glass-surface card p-10 rounded-xl">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                💪 <span className="text-purple-400">Swole</span> Tracker
              </h1>
              <p className="text-secondary mx-auto mt-4 max-w-2xl text-lg">
                Simple, mobile-first workout tracking. Log your workouts, track
                your progress, and get stronger.
              </p>
              <div className="mt-8">
                <SignInButtons />
              </div>
            </div>
          </div>
        </HomePageLayout>
      </HydrateClient>
    );
  }

  return (
    <HydrateClient state={state}>
      <HomePageLayout>
        <DashboardContent />
      </HomePageLayout>
    </HydrateClient>
  );
}
