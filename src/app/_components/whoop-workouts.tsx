"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { WorkoutDetailOverlay } from "./workout-detail-overlay";
import { useLocalStorage } from "~/hooks/use-local-storage";
import { useWorkoutUpdates } from "~/hooks/use-workout-updates";
import { WhoopRecovery } from "./whoop-recovery";
import { WhoopSleep } from "./whoop-sleep";
import { WhoopCycles } from "./whoop-cycles";
import { WhoopProfile } from "./whoop-profile";
import { WhoopBodyMeasurements } from "./whoop-body-measurements";

export function WhoopWorkouts() {
  const searchParams = useSearchParams();
  const [syncLoading, setSyncLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
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

  const { data: integrationStatus, refetch: refetchStatus } = api.whoop.getIntegrationStatus.useQuery();
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

  const handleCleanup = async () => {
    setCleanupLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/whoop/cleanup-duplicates", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: result.message,
        });
        void refetchWorkouts(); // Refresh workout list
      } else {
        setMessage({ type: "error", text: result.error || "Cleanup failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error during cleanup" });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setMessage(null);

    try {
      // Use the comprehensive sync endpoint instead of just workouts
      const response = await fetch("/api/whoop/sync-all", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        const { synced, totalNewRecords } = result;
        let syncSummary = "Comprehensive sync completed! ";
        
        if (totalNewRecords > 0) {
          const parts = [];
          if (synced.workouts > 0) parts.push(`${synced.workouts} workouts`);
          if (synced.recovery > 0) parts.push(`${synced.recovery} recovery records`);
          if (synced.cycles > 0) parts.push(`${synced.cycles} cycles`);
          if (synced.sleep > 0) parts.push(`${synced.sleep} sleep records`);
          if (synced.profile > 0) parts.push(`${synced.profile} profile update`);
          if (synced.bodyMeasurements > 0) parts.push(`${synced.bodyMeasurements} measurements`);
          
          syncSummary += `New: ${parts.join(", ")}`;
        } else {
          syncSummary += "All data is up to date.";
        }

        if (result.synced.errors && result.synced.errors.length > 0) {
          syncSummary += ` (${result.synced.errors.length} errors occurred)`;
        }

        setMessage({
          type: "success",
          text: syncSummary,
        });
        void refetchWorkouts();
      } else if (response.status === 401 && result.needsReauthorization) {
        setMessage({
          type: "error",
          text: "🔐 Your WHOOP connection has expired. Please reconnect your account to continue syncing.",
        });
        // Refresh the integration status to show the connect button
        void refetchStatus();
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
    } catch {
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
              <div className="space-y-3">
                <button
                  onClick={handleSync}
                  disabled={syncLoading || cleanupLoading || rateLimit?.remaining === 0}
                  className="btn-primary w-full px-6 py-3 disabled:opacity-50"
                >
                  {syncLoading ? "Syncing All Data..." : "Sync All WHOOP Data"}
                </button>
                
                <button
                  onClick={handleCleanup}
                  disabled={syncLoading || cleanupLoading}
                  className="btn-secondary w-full px-4 py-2 text-sm disabled:opacity-50"
                >
                  {cleanupLoading ? "Cleaning Up..." : "🧹 Remove Duplicate Workouts"}
                </button>
              </div>
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
                prefetch={false}
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

      {/* Additional WHOOP Data Types */}
      {integrationStatus?.isConnected && (
        <div className="mt-12 space-y-12">
          <WhoopRecovery />
          <WhoopSleep />
          <WhoopCycles />
          <WhoopProfile />
          <WhoopBodyMeasurements />
        </div>
      )}

      {/* WHOOP v2 API and Webhook Coverage */}
      {integrationStatus?.isConnected && (
        <div className="mt-12">
          <div className="card max-w-4xl mx-auto p-6">
            <h3 className="text-xl font-semibold mb-4">🔗 WHOOP v2 API Integration Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Scope */}
              <div>
                <h4 className="font-medium mb-3 text-secondary">Current OAuth Scopes</h4>
                <div className="space-y-2 text-sm">
                  {integrationStatus?.scope?.split(' ').map((scope: string) => (
                    <div key={scope} className="flex items-center gap-2">
                      <span style={{ color: 'var(--color-success)' }}>✅</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 70%, var(--color-border) 30%)', color: 'var(--color-text)' }}>
                        {scope}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Webhook Coverage */}
              <div>
                <h4 className="font-medium mb-3 text-secondary">v2 Webhook Events</h4>
                <div className="space-y-2 text-sm">
                  {[
                    { event: 'workout.updated', supported: true },
                    { event: 'workout.deleted', supported: false },
                    { event: 'recovery.updated', supported: false },
                    { event: 'recovery.deleted', supported: false },
                    { event: 'sleep.updated', supported: false },
                    { event: 'sleep.deleted', supported: false },
                  ].map(({ event, supported }) => (
                    <div key={event} className="flex items-center gap-2">
                      <span style={{ color: supported ? 'var(--color-success)' : 'var(--color-muted)' }}>
                        {supported ? '✅' : '⏸️'}
                      </span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs" 
                           style={{ 
                             backgroundColor: 'color-mix(in oklab, var(--color-bg-surface) 70%, var(--color-border) 30%)', 
                             color: supported ? 'var(--color-text)' : 'var(--color-muted)'
                           }}>
                        {event}
                      </code>
                      {!supported && <span className="text-xs text-secondary">(not implemented)</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Sync Coverage */}
              <div>
                <h4 className="font-medium mb-3 text-secondary">Data Types Synced</h4>
                <div className="space-y-2 text-sm">
                  {[
                    'Workouts',
                    'Recovery',
                    'Sleep',
                    'Cycles',
                    'Profile',
                    'Body Measurements'
                  ].map((dataType) => (
                    <div key={dataType} className="flex items-center gap-2">
                      <span style={{ color: 'var(--color-success)' }}>✅</span>
                      <span>{dataType}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h4 className="font-medium mb-3 text-secondary">Technical Features</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--color-success)' }}>✅</span>
                    <span>UUID Identifiers (v2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--color-success)' }}>✅</span>
                    <span>Webhook Signature Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--color-success)' }}>✅</span>
                    <span>Temporal Deduplication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--color-success)' }}>✅</span>
                    <span>Real-time Updates (SSE)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--color-success)' }}>✅</span>
                    <span>Rate Limiting</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'color-mix(in oklab, var(--color-primary) 10%, var(--color-bg-surface) 90%)', borderLeft: '4px solid var(--color-primary)' }}>
              <h5 className="font-medium mb-2" style={{ color: 'var(--color-primary)' }}>🔮 Future Enhancements</h5>
              <ul className="text-sm text-secondary space-y-1">
                <li>• Add support for recovery/sleep webhook events</li>
                <li>• Implement workout.deleted handling</li>
                <li>• Add cycle data to webhook processing</li>
                <li>• Expand OAuth scopes for additional data access</li>
              </ul>
            </div>
          </div>
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
