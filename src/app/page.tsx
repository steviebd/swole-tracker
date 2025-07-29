import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

import { RecentWorkouts } from "~/app/_components/recent-workouts";
import { SignInButtons } from "~/app/_components/sign-in-buttons";
import { JokeOfTheDay } from "~/app/_components/joke-of-the-day";

export default async function Home() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-center">
            💪 <span className="text-purple-400">Swole</span> Tracker
          </h1>
          <p className="text-xl text-gray-300 text-center max-w-2xl">
            Simple, mobile-first workout tracking. Log your workouts, track your progress, and get swole.
          </p>
          <SignInButtons />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">💪 Swole Tracker</h1>
            <p className="text-gray-400">Welcome back, {user.firstName ?? user.username}</p>
          </div>
          <UserButton />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link
            href="/workout/start"
            className="bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg p-6 text-center"
          >
            <h3 className="text-xl font-semibold mb-2">🏋️ Start Workout</h3>
            <p className="text-purple-100">Begin a new workout session</p>
          </Link>
          <JokeOfTheDay />
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
  );
}
