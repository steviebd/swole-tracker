"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { RedirectCountdown } from "./redirect-countdown";

export const Route = createFileRoute("/_app/workout/session/$localId")({
  component: WorkoutSessionPage,
});

function WorkoutSessionPage() {
  const { localId } = Route.useParams();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-destructive mb-4 text-2xl font-bold">
            Local Session Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            Local workout sessions are no longer supported. Your workout data
            may still be synced in the cloud.
          </p>
          <p className="text-muted-foreground mt-4 text-xs">
            Session ID: {localId}
          </p>
        </div>

        <Card className="border-border/60 bg-muted/20">
          <CardContent className="text-muted-foreground p-4 text-left text-sm">
            <h2 className="text-foreground mb-2 font-semibold">Next steps</h2>
            <ul className="list-inside list-disc space-y-2">
              <li>Open the sync tray in the header</li>
              <li>Ensure you have a stable internet connection</li>
              <li>
                If the workout still appears as pending, try logging in again
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/workouts">
            <Button className="btn-primary">View Workout History</Button>
          </Link>
          <Link to="/workout/start">
            <Button variant="secondary" className="px-4 py-2">
              Start New Workout
            </Button>
          </Link>
        </div>

        <RedirectCountdown href="/workouts" seconds={5} />

        <div className="text-center">
          <a
            href="/support"
            className="text-primary mt-3 inline-flex items-center justify-center text-sm font-medium underline"
          >
            Need help? Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
