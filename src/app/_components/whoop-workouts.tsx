"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export function WhoopWorkouts() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; resetTime: string } | null>(null);

  const { data: integrationStatus } = api.whoop.getIntegrationStatus.useQuery();
  const { data: workouts, refetch: refetchWorkouts, isLoading: workoutsLoading } = api.whoop.getWorkouts.useQuery();

  const handleSync = async () => {
    setSyncLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/whoop/sync-workouts", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Sync completed! ${result.newWorkouts} new workouts, ${result.duplicates} duplicates skipped.`,
        });
        setRateLimit(result.rateLimit);
        void refetchWorkouts();
      } else if (response.status === 429) {
        setMessage({ 
          type: "error", 
          text: result.message || "Rate limit exceeded. Please try again later." 
        });
        setRateLimit({ remaining: 0, resetTime: result.resetTime });
      } else {
        setMessage({ type: "error", text: result.error || "Sync failed" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error during sync" });
    } finally {
      setSyncLoading(false);
    }
  };

  const formatDateTime = (start: Date, end: Date) => {
    const startTime = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(start);
    
    const endTime = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(end);
    
    return `${startTime} - ${endTime}`;
  };

  const formatScore = (score: any, scoreState: string | null) => {
    if (!score || typeof score !== "object") {
      return `-- (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
    }
    
    const strainScore = (score as any)?.strain;
    if (strainScore && typeof strainScore === "number") {
      return `${strainScore.toFixed(1)} (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
    }
    
    return `-- (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
  };

  // Sort workouts by start time (latest first) and limit display
  const sortedWorkouts = workouts ? [...workouts].sort((a, b) => 
    new Date(b.start).getTime() - new Date(a.start).getTime()
  ) : [];
  
  const displayedWorkouts = showAll ? sortedWorkouts : sortedWorkouts.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Sync Controls */}
      <div className="flex justify-center">
        <div className="max-w-md rounded-lg bg-gray-800 p-6 text-center">
          {integrationStatus?.isConnected ? (
            <div className="space-y-4">
              <div className="text-green-400">
                ✅ Connected to Whoop
              </div>
              <button
                onClick={handleSync}
                disabled={syncLoading || (rateLimit?.remaining === 0)}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {syncLoading ? "Syncing..." : "Sync with Whoop"}
              </button>
              {rateLimit && (
                <div className="text-xs text-gray-400 text-center">
                  {rateLimit.remaining > 0 ? (
                    `${rateLimit.remaining} syncs remaining this hour`
                  ) : (
                    `Rate limit reached. Resets at ${new Date(rateLimit.resetTime).toLocaleTimeString()}`
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-red-400">
                ❌ Not connected to Whoop
              </div>
              <Link
                href="/connect-whoop"
                className="block w-full rounded-lg bg-purple-600 px-6 py-3 font-semibold transition-colors hover:bg-purple-700"
              >
                Connect Whoop Now
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex justify-center">
          <div
            className={`max-w-md rounded-lg p-4 ${
              message.type === "success" ? "bg-green-900 text-green-100" : "bg-red-900 text-red-100"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* Workouts Display */}
      {integrationStatus?.isConnected && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Your Workouts</h2>
            {sortedWorkouts.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {showAll ? "Show Less" : `Show All (${sortedWorkouts.length})`}
              </button>
            )}
          </div>

          {workoutsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading workouts...</p>
            </div>
          ) : displayedWorkouts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="rounded-lg bg-gray-800 p-6 transition-colors hover:bg-gray-700"
                >
                  <div className="space-y-3">
                    <div className="text-sm text-gray-400">
                      {formatDateTime(new Date(workout.start), new Date(workout.end))}
                    </div>
                    
                    <h3 className="text-lg font-semibold">
                      {workout.sport_name || "Unknown Sport"}
                    </h3>
                    
                    <div className="text-sm text-gray-300">
                      <span className="font-medium">Score:</span> {formatScore(workout.score, workout.score_state)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No workouts found. Click "Sync with Whoop" to fetch your data.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
