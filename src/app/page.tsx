import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ThemeSwitcher } from "~/app/_components/theme-switcher";

import { RecentWorkoutsTRPC } from "~/app/_components/recent-workouts-trpc";
import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { JokeOfTheDay } from "~/app/_components/joke-of-the-day";

import HydrateClient from "~/trpc/HydrateClient";
import { getQueryClient, getDehydratedState, prefetchHome } from "~/trpc/prefetch";
import ClientPreferencesTrigger from "./preferences-trigger";

export default async function Home() {
  const user = await currentUser();

  // SSR prefetch + hydrate for faster first paint when signed in
  const qc = getQueryClient();
  await prefetchHome(qc);
  const state = getDehydratedState(qc);

  if (!user) {
    return (
      <HydrateClient state={state}>
        <main className="min-h-screen container-default py-10">
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="glass-surface card p-10">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                💪 <span className="text-purple-400">Swole</span> Tracker
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
                Simple, mobile-first workout tracking. Log your workouts, track your progress, and get stronger.
              </p>
              <div className="mt-8">
                <SignInButtons />
              </div>
            </div>
          </div>
        </main>
      </HydrateClient>
    );
  }

  return (
    <HydrateClient state={state}>
      <ClientPreferencesTrigger />
      <main className="min-h-screen container-default py-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between glass-header rounded-xl px-4 py-3">
          <div>
            <h1 className="text-3xl font-bold">Swole Tracker</h1>
            <p className="text-secondary">
              Welcome back, {user.firstName ?? user.username}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/connect-whoop" className="text-sm link-primary">
              Connect Whoop
            </Link>
            {/* Desktop theme switcher (hidden on small screens since it's in bottom nav there) */}
            <div className="hidden md:block">
              <ThemeSwitcher />
            </div>
            <UserButton />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/workout/start" className="card glass-surface p-6 text-center transition">
            <h3 className="mb-2 text-xl font-semibold">Start Workout</h3>
            <p className="text-secondary">Begin a new workout session</p>
            <div className="mt-4">
              <span className="btn-primary inline-flex w-full justify-center">Open</span>
            </div>
          </Link>

          <div className="glass-surface card p-0">
            <JokeOfTheDay />
          </div>

          <Link href="/templates" className="card glass-surface p-6 text-center transition">
            <h3 className="mb-2 text-xl font-semibold">Manage Templates</h3>
            <p className="text-secondary">Create and edit workout templates</p>
            <div className="mt-4">
              <span className="btn-primary inline-flex w-full justify-center">Open</span>
            </div>
          </Link>
        </div>

        {/* Recent Workouts Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Workouts</h2>
            <Link href="/workouts" className="text-sm link-primary">
              View all workouts →
            </Link>
          </div>
          <div className="glass-surface card p-4">
            <RecentWorkoutsTRPC />
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
