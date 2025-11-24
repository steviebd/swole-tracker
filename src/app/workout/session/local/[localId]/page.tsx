import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionCookie } from "~/lib/session-cookie";
import { headers } from "next/headers";

import { RedirectCountdown } from "./redirect-countdown";

interface LocalWorkoutSessionPageProps {
  params: Promise<{ localId: string }>;
}

export default async function LocalWorkoutSessionPage({
  params,
}: LocalWorkoutSessionPageProps) {
  try {
    const headersList = await headers();
    const mockRequest = {
      headers: {
        get: (name: string) => headersList.get(name),
      },
    } as Request;

    const session = await SessionCookie.get(mockRequest);
    const { localId } = await params;

    if (!session || SessionCookie.isExpired(session)) {
      redirect("/auth/login");
    }

    // Local sessions are no longer supported
    // Provide a helpful message and redirect to workout history
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-destructive mb-4 text-2xl font-bold">
            Local Session Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            Local workout sessions are no longer supported. <br />
            Your workout may have been moved to your workout history.
          </p>
          <div className="border-border/60 bg-muted/20 text-muted-foreground mb-6 rounded-lg border p-4 text-left text-sm">
            <p className="text-foreground mb-2 font-semibold">Next steps</p>
            <ul className="space-y-2">
              <li>
                Open the sync tray in the header to review the offline queue and
                confirm the session finished uploading.
              </li>
              <li>
                If the workout still appears as pending, keep the app open on a
                stable connection until the sync indicator turns green.
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/workouts" className="btn-primary">
              View Workout History
            </Link>
            <Link href="/workout/start" className="btn-secondary px-4 py-2">
              Start New Workout
            </Link>
          </div>
          <RedirectCountdown href="/workouts" />
          <p className="text-muted-foreground mt-4 text-xs">
            Session ID: {localId}
          </p>
          <Link
            href="/support"
            className="text-primary mt-3 inline-flex items-center justify-center text-sm font-medium underline"
          >
            Need help? Contact support
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    // Handle errors gracefully
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-destructive mb-4 text-2xl font-bold">
            Local Session Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            Local workout sessions are no longer supported. <br />
            Your workout may have been moved to your workout history.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/workouts" className="btn-primary">
              View Workout History
            </Link>
            <Link href="/workout/start" className="btn-secondary px-4 py-2">
              Start New Workout
            </Link>
          </div>
          <RedirectCountdown href="/workouts" />
          <p className="text-muted-foreground mt-4 text-xs">
            Session ID: Unknown
          </p>
          <Link
            href="/support"
            className="text-primary mt-3 inline-flex items-center justify-center text-sm font-medium underline"
          >
            Need help? Contact support
          </Link>
        </div>
      </div>
    );
  }
}
