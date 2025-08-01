"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { WorkoutDetailOverlay } from "./workout-detail-overlay";
import { useLocalStorage } from "~/hooks/use-local-storage";
import { useWorkoutUpdates } from "~/hooks/use-workout-updates";

export function WhoopWorkouts() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; resetTime: string } | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [clickOrigin, setClickOrigin] = useState<{ x: number; y: number } | undefined>();

  // Use custom localStorage hook for persistent preferences
  const [showAll, setShowAll, isShowAllLoaded] = useLocalStorage('whoop-workouts-show-all', false);
  const [sportFilter, setSportFilter, isSportFilterLoaded] = useLocalStorage('whoop-workouts-sport-filter', 'all');

  // Debug function to clear localStorage (temporary)
  const clearPreferences = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('whoop-workouts-sport-filter');
      localStorage.removeItem('whoop-workouts-show-all');
      window.location.reload();
    }
  };

  const { data: integrationStatus } = api.whoop.getIntegrationStatus.useQuery();
  const { data: workouts, refetch: refetchWorkouts, isLoading: workoutsLoading } = api.whoop.getWorkouts.useQuery();

  // Listen for real-time workout updates via SSE
  useWorkoutUpdates(() => {
    // Refetch workouts when we receive an update
    void refetchWorkouts();
  });

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

  // Get unique sports for filter dropdown
  const uniqueSports = workouts ? [...new Set(workouts.map(w => w.sport_name).filter((sport): sport is string => sport !== null && sport !== undefined))] : [];

  // Filter and sort workouts by start time (latest first)
  const filteredWorkouts = workouts ? workouts.filter(workout => 
    sportFilter === "all" || workout.sport_name === sportFilter
  ) : [];
  
  const sortedWorkouts = [...filteredWorkouts].sort((a, b) => 
    new Date(b.start).getTime() - new Date(a.start).getTime()
  );
  
  const displayedWorkouts = showAll ? sortedWorkouts : sortedWorkouts.slice(0, 3);

  const handleWorkoutClick = (workout: any, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    setClickOrigin({ x: centerX, y: centerY });
    setSelectedWorkout(workout);
  };

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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
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
            
            {/* Sport Filter */}
            {uniqueSports.length > 0 && (
              <div className="flex items-center gap-3">
                <label htmlFor="sport-filter" className="text-sm text-gray-400">
                  Filter by sport:
                </label>
                <select
                  id="sport-filter"
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400 transition-colors"
                >
                  <option value="all">All Sports</option>
                  {uniqueSports.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
                <button
                  onClick={clearPreferences}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-400 rounded"
                  title="Clear corrupted localStorage data"
                >
                  Reset Prefs
                </button>
              </div>
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
                  className="rounded-lg bg-gray-800 p-6 transition-all duration-200 hover:bg-gray-700 cursor-pointer hover:scale-105 hover:shadow-lg"
                  onClick={(e) => handleWorkoutClick(workout, e)}
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
              <p className="text-gray-400">
                {sportFilter !== "all" && sortedWorkouts.length === 0 
                  ? "No workouts from whoop" 
                  : "No workouts found. Click \"Sync with Whoop\" to fetch your data."}
              </p>
            </div>
          )}
        </div>
      )}



      {/* Workout Detail Overlay */}
      <WorkoutDetailOverlay
        workout={selectedWorkout}
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        clickOrigin={clickOrigin}
      />
    </div>
  );
}
