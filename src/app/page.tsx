import Link from "next/link";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { RecentWorkouts } from "~/app/_components/recent-workouts";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-center">
            💪 <span className="text-purple-400">Swole</span> Tracker
          </h1>
          <p className="text-xl text-gray-300 text-center max-w-2xl">
            Simple, mobile-first workout tracking. Log your workouts, track your progress, and get swole.
          </p>
          <Link
            href="/api/auth/signin"
            className="rounded-lg bg-purple-600 px-8 py-3 font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            Sign in with Discord
          </Link>
        </div>
      </main>
    );
  }

  // Prefetch data for authenticated users
  void api.templates.getAll.prefetch();
  void api.workouts.getRecent.prefetch({ limit: 5 });

  return (
    <HydrateClient>
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">💪 Swole Tracker</h1>
              <p className="text-gray-400">Welcome back, {session.user.name}</p>
            </div>
            <Link
              href="/api/auth/signout"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link
              href="/workout/start"
              className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg p-6 text-center"
            >
              <h3 className="text-xl font-semibold mb-2">🏋️ Start Workout</h3>
              <p className="text-purple-100">Begin a new workout session</p>
            </Link>
            <Link
              href="/templates"
              className="bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg p-6 text-center"
            >
              <h3 className="text-xl font-semibold mb-2">📋 Manage Templates</h3>
              <p className="text-gray-300">Create and edit workout templates</p>
            </Link>
          </div>

          {/* Recent Workouts Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Workouts</h2>
              <Link 
                href="/workouts" 
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                View all →
              </Link>
            </div>
            <RecentWorkouts />
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
