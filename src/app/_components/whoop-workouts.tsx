"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { WorkoutDetailOverlay } from "./workout-detail-overlay";
import { useLocalStorage } from "~/hooks/use-local-storage";
import { useWorkoutUpdates } from "~/hooks/use-workout-updates";

export function WhoopWorkouts() {
  const searchParams = useSearchParams();
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    resetTime: string;
  } | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [clickOrigin, setClickOrigin] = useState<
    { x: number; y: number } | undefined
  >();

  // Use custom localStorage hook for persistent preferences
  const [showAll, setShowAll] = useLocalStorage(
    "whoop-workouts-show-all",
    false,
  );
  const [sportFilter, setSportFilter] = useLocalStorage(
    "whoop-workouts-sport-filter",
    "all",
  );

  // Debug function to clear localStorage (temporary)
  const clearPreferences = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("whoop-workouts-sport-filter");
      localStorage.removeItem("whoop-workouts-show-all");
      window.location.reload();
    }
  };

  const { data: integrationStatus } = api.whoop.getIntegrationStatus.useQuery();
  const {
    data: workouts,
    refetch: refetchWorkouts,
    isLoading: workoutsLoading,
  } = api.whoop.getWorkouts.useQuery();

  // Handle OAuth flow results
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setMessage({
        type: "success",
        text: "🎉 Successfully connected to Whoop! You can now sync your workouts.",
      });
    } else if (error) {
      let errorMessage = "Failed to connect to Whoop. Please try again.";
      
      switch (error) {
        case "whoop_not_configured":
          errorMessage = "Whoop integration is not configured. Please contact support.";
          break;
        case "unauthorized":
          errorMessage = "You must be logged in to connect Whoop.";
          break;
        case "invalid_state":
          errorMessage = "Security validation failed. Please try connecting again.";
          break;
        case "no_code":
          errorMessage = "Authorization was cancelled or failed. Please try again.";
          break;
        case "token_exchange_failed":
          errorMessage = "Failed to complete Whoop connection. Please try again.";
          break;
        case "access_denied":
          errorMessage = "You denied access to Whoop. Please grant access to sync workouts.";
          break;
        default:
          errorMessage = `Connection failed: ${error}. Please try again.`;
      }
      
      setMessage({
        type: "error",
        text: errorMessage,
      });
    }

    // Clear the URL parameters after showing the message
    if (success || error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
      
      // Auto-hide message after 10 seconds
      setTimeout(() => {
        setMessage(null);
      }, 10000);
    }
  }, [searchParams]);

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
          text:
            result.message || "Rate limit exceeded. Please try again later.",
        });
        setRateLimit({ remaining: 0, resetTime: result.resetTime });
      } else {
        setMessage({ type: "error", text: result.error || "Sync failed" });
      }
    } catch (_error) {
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

    const strainScore = score?.strain;
    if (strainScore && typeof strainScore === "number") {
      return `${strainScore.toFixed(1)} (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
    }

    return `-- (${scoreState?.replace("_", " ") || "UNKNOWN"})`;
  };

  // Get unique sports for filter dropdown
  const uniqueSports = workouts
    ? [
        ...new Set(
          workouts
            .map((w) => w.sport_name)
            .filter(
              (sport): sport is string => sport !== null && sport !== undefined,
            ),
        ),
      ]
    : [];

  // Filter and sort workouts by start time (latest first)
  const filteredWorkouts = workouts
    ? workouts.filter(
        (workout) =>
          sportFilter === "all" || workout.sport_name === sportFilter,
      )
    : [];

  const sortedWorkouts = [...filteredWorkouts].sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
  );

  const displayedWorkouts = showAll
    ? sortedWorkouts
    : sortedWorkouts.slice(0, 3);

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
        <div className="card max-w-md rounded-lg p-6 text-center">
          {integrationStatus?.isConnected ? (
            <div className="space-y-4">
              <div style={{ color: 'var(--color-success)' }}>
                ✅ Connected to Whoop
              </div>
              <button
                onClick={handleSync}
                disabled={syncLoading || rateLimit?.remaining === 0}
                className="btn-primary w-full px-6 py-3 disabled:opacity-50"
              >
                {syncLoading ? "Syncing..." : "Sync with Whoop"}
              </button>
              {rateLimit && (
                <div className="text-secondary text-center text-xs">
                  {rateLimit.remaining > 0
                    ? `${rateLimit.remaining} syncs remaining this hour`
                    : `Rate limit reached. Resets at ${new Date(rateLimit.resetTime).toLocaleTimeString()}`}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div style={{ color: 'var(--color-danger)' }}>
                ❌ Not connected to Whoop
              </div>
              <Link
                href="/api/auth/whoop/authorize"
                className="btn-primary block w-full px-6 py-3 text-center"
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
            className="max-w-md rounded-lg border p-4"
            style={{
              backgroundColor: message.type === "success" 
                ? 'color-mix(in oklab, var(--color-success) 15%, var(--color-bg-surface) 85%)'
                : 'color-mix(in oklab, var(--color-danger) 15%, var(--color-bg-surface) 85%)',
              borderColor: message.type === "success" 
                ? 'var(--color-success)'
                : 'var(--color-danger)',
              color: message.type === "success" 
                ? 'var(--color-success)'
                : 'var(--color-danger)'
            }}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm">{message.text}</p>
              <button
                onClick={() => setMessage(null)}
                className="ml-4 text-lg leading-none transition-colors"
                style={{
                  color: message.type === "success" 
                    ? 'var(--color-success)'
                    : 'var(--color-danger)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workouts Display */}
      {integrationStatus?.isConnected && (
        <div>
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Workouts</h2>
              {sortedWorkouts.length > 3 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="link-primary text-sm no-underline"
                >
                  {showAll
                    ? "Show Less"
                    : `Show All (${sortedWorkouts.length})`}
                </button>
              )}
            </div>

            {/* Sport Filter */}
            {uniqueSports.length > 0 && (
              <div className="flex items-center gap-3">
                <label
                  htmlFor="sport-filter"
                  className="text-secondary text-sm"
                >
                  Filter by sport:
                </label>
                <select
                  id="sport-filter"
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: 'var(--color-bg-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    boxShadow: '0 0 0 2px color-mix(in oklab, var(--color-primary) 50%, transparent)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
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
                  className="rounded border px-2 py-1 text-xs transition-colors"
                  style={{
                    borderColor: 'var(--color-danger)',
                    color: 'var(--color-danger)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'color-mix(in oklab, var(--color-danger) 15%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Clear corrupted localStorage data"
                >
                  Reset Prefs
                </button>
              </div>
            )}
          </div>

          {workoutsLoading ? (
            <div className="py-8 text-center">
              <p className="text-secondary">Loading workouts...</p>
            </div>
          ) : displayedWorkouts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="card cursor-pointer p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  onClick={(e) => handleWorkoutClick(workout, e)}
                >
                  <div className="space-y-3">
                    <div className="text-muted text-sm">
                      {formatDateTime(
                        new Date(workout.start),
                        new Date(workout.end),
                      )}
                    </div>

                    <h3 className="text-lg font-semibold">
                      {workout.sport_name || "Unknown Sport"}
                    </h3>

                    <div className="text-secondary text-sm">
                      <span className="font-medium">Score:</span>{" "}
                      {formatScore(workout.score, workout.score_state)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-secondary">
                {sportFilter !== "all" && sortedWorkouts.length === 0
                  ? "No workouts from whoop"
                  : 'No workouts found. Click "Sync with Whoop" to fetch your data.'}
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
