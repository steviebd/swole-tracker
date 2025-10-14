"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { WorkoutDetailOverlay } from "./workout-detail-overlay";
import { useLocalStorage } from "~/hooks/use-local-storage";
import { useWorkoutUpdates } from "~/hooks/use-workout-updates";
import { WhoopRecovery } from "./whoop-recovery";
import { WhoopSleep } from "./whoop-sleep";
import { WhoopCycles } from "./whoop-cycles";
import { WhoopProfile } from "./whoop-profile";
import { WhoopBodyMeasurements } from "./whoop-body-measurements";
import { Card, CardContent, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { useWhoopConnect } from "~/hooks/use-whoop-connect";

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
  const [dateRange, setDateRange] = useLocalStorage(
    "whoop-workouts-date-range",
    "all",
  );
  const [syncStatusFilter, setSyncStatusFilter] = useLocalStorage(
    "whoop-workouts-sync-status",
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

  const { data: integrationStatus, refetch: refetchStatus } =
    api.whoop.getIntegrationStatus.useQuery();
  const {
    data: workouts,
    refetch: refetchWorkouts,
    isLoading: workoutsLoading,
  } = api.whoop.getWorkouts.useQuery();
  const {
    startConnect: startWhoopConnect,
    isConnecting: connectLoading,
    error: connectError,
    resetError: resetConnectError,
  } = useWhoopConnect();

  // Handle OAuth flow results
  useEffect(() => {
    const success = searchParams?.get("success");
    const error = searchParams?.get("error");

    if (success === "true") {
      setMessage({
        type: "success",
        text: "🎉 Successfully connected to Whoop! You can now sync your workouts.",
      });
    } else if (error) {
      let errorMessage = "Failed to connect to Whoop. Please try again.";

      switch (error) {
        case "whoop_not_configured":
          errorMessage =
            "Whoop integration is not configured. Please contact support.";
          break;
        case "unauthorized":
          errorMessage = "You must be logged in to connect Whoop.";
          break;
        case "invalid_state":
          errorMessage =
            "Security validation failed. Please try connecting again.";
          break;
        case "no_code":
          errorMessage =
            "Authorization was cancelled or failed. Please try again.";
          break;
        case "token_exchange_failed":
          errorMessage =
            "Failed to complete Whoop connection. Please try again.";
          break;
        case "access_denied":
          errorMessage =
            "You denied access to Whoop. Please grant access to sync workouts.";
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
        resetConnectError();
      }, 10000);
    }
  }, [searchParams, resetConnectError]);

  useEffect(() => {
    if (connectError) {
      setMessage({ type: "error", text: connectError });
    }
  }, [connectError]);

  // Listen for real-time workout updates via SSE
  useWorkoutUpdates(() => {
    // Refetch workouts when we receive an update
    void refetchWorkouts();
  });

  const handleCleanup = async () => {
    setCleanupLoading(true);
    setMessage(null);
    resetConnectError();

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
    resetConnectError();

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
          if (synced.recovery > 0)
            parts.push(`${synced.recovery} recovery records`);
          if (synced.cycles > 0) parts.push(`${synced.cycles} cycles`);
          if (synced.sleep > 0) parts.push(`${synced.sleep} sleep records`);
          if (synced.profile > 0)
            parts.push(`${synced.profile} profile update`);
          if (synced.bodyMeasurements > 0)
            parts.push(`${synced.bodyMeasurements} measurements`);

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
    ? workouts.filter((workout) => {
        // Sport filter
        if (sportFilter !== "all" && workout.sport_name !== sportFilter) {
          return false;
        }

        // Date range filter
        if (dateRange !== "all") {
          const workoutDate = new Date(workout.start);
          const now = new Date();
          const daysDiff = Math.floor(
            (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          switch (dateRange) {
            case "7d":
              if (daysDiff > 7) return false;
              break;
            case "30d":
              if (daysDiff > 30) return false;
              break;
            case "90d":
              if (daysDiff > 90) return false;
              break;
          }
        }

        // Sync status filter
        if (syncStatusFilter !== "all") {
          const hasScore = workout.score && workout.score_state === "SCORED";
          if (syncStatusFilter === "scored" && !hasScore) return false;
          if (syncStatusFilter === "pending" && hasScore) return false;
        }

        return true;
      })
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
      {/* Overview Card */}
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Connection Status */}
              <div className="text-center">
                <div className="mb-2 text-2xl">
                  {integrationStatus?.isConnected ? "🔗" : "❌"}
                </div>
                <h3 className="mb-1 text-sm font-semibold">Connection</h3>
                <p className="text-muted-foreground text-xs">
                  {integrationStatus?.isConnected
                    ? integrationStatus.isExpired
                      ? "Token expired"
                      : "Connected"
                    : "Not connected"}
                </p>
                {integrationStatus?.connectedAt && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Since{" "}
                    {new Date(
                      integrationStatus.connectedAt,
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Last Sync */}
              <div className="text-center">
                <div className="mb-2 text-2xl">🔄</div>
                <h3 className="mb-1 text-sm font-semibold">Last Sync</h3>
                <p className="text-muted-foreground text-xs">
                  {integrationStatus?.lastSyncAt
                    ? new Date(integrationStatus.lastSyncAt).toLocaleString()
                    : "Never"}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="text-center">
                <div className="mb-2 text-2xl">⚡</div>
                <h3 className="mb-1 text-sm font-semibold">Actions</h3>
                <div className="space-y-2">
                  {integrationStatus?.isConnected ? (
                    <>
                      <Button
                        onClick={handleSync}
                        disabled={
                          syncLoading ||
                          cleanupLoading ||
                          rateLimit?.remaining === 0
                        }
                        size="sm"
                        className="w-full"
                      >
                        {syncLoading ? "Syncing..." : "Sync Data"}
                      </Button>
                      {integrationStatus.isExpired && (
                        <Button
                          onClick={() => {
                            setMessage(null);
                            resetConnectError();
                            void startWhoopConnect();
                          }}
                          disabled={connectLoading}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          {connectLoading ? "Reconnecting..." : "Reconnect"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        setMessage(null);
                        resetConnectError();
                        void startWhoopConnect();
                      }}
                      disabled={connectLoading || syncLoading || cleanupLoading}
                      size="sm"
                      className="w-full"
                    >
                      {connectLoading ? "Connecting..." : "Connect Whoop"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Controls */}
      <div className="flex justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            {integrationStatus?.isConnected ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Button
                    onClick={handleCleanup}
                    disabled={syncLoading || cleanupLoading}
                    variant="secondary"
                    className="w-full"
                    size="sm"
                  >
                    {cleanupLoading
                      ? "Cleaning Up..."
                      : "🧹 Remove Duplicate Workouts"}
                  </Button>
                </div>
                {rateLimit && (
                  <div className="text-muted-foreground text-center text-xs">
                    {rateLimit.remaining > 0
                      ? `${rateLimit.remaining} syncs remaining this hour`
                      : `Rate limit reached. Resets at ${new Date(rateLimit.resetTime).toLocaleTimeString()}`}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription className="text-center">
                    Get started by connecting your Whoop account above
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex justify-center">
          <Alert
            variant={message.type === "success" ? "default" : "destructive"}
            className="max-w-md"
          >
            <AlertDescription className="flex items-start justify-between">
              <span className="text-sm">{message.text}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMessage(null);
                  resetConnectError();
                }}
                className="ml-4 h-auto p-0 text-lg leading-none hover:bg-transparent"
                aria-label="Dismiss message"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Workouts Display */}
      {integrationStatus?.isConnected && (
        <div>
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Workouts</h2>
              {sortedWorkouts.length > 3 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="h-auto p-0 text-sm"
                >
                  {showAll
                    ? "Show Less"
                    : `Show All (${sortedWorkouts.length})`}
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sport Filter */}
              {uniqueSports.length > 0 && (
                <>
                  <label
                    htmlFor="sport-filter"
                    className="text-muted-foreground text-sm"
                  >
                    Sport:
                  </label>
                  <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger className="w-32" id="sport-filter">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      {uniqueSports.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Date Range Filter */}
              <label
                htmlFor="date-range-filter"
                className="text-muted-foreground text-sm"
              >
                Date:
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32" id="date-range-filter">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              {/* Sync Status Filter */}
              <label
                htmlFor="sync-status-filter"
                className="text-muted-foreground text-sm"
              >
                Status:
              </label>
              <Select
                value={syncStatusFilter}
                onValueChange={setSyncStatusFilter}
              >
                <SelectTrigger className="w-32" id="sync-status-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="scored">Scored</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={clearPreferences}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                title="Clear corrupted localStorage data"
              >
                Reset Prefs
              </Button>
            </div>
          </div>

          {workoutsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : displayedWorkouts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedWorkouts.map((workout) => {
                const hasScore =
                  workout.score && workout.score_state === "SCORED";
                const isPending = workout.score_state === "PENDING_SCORE";
                const hasError = !hasScore && !isPending && workout.score_state;

                return (
                  <Card
                    key={workout.id}
                    className="cursor-pointer p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                    onClick={(e) => handleWorkoutClick(workout, e)}
                  >
                    <CardContent className="p-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-muted-foreground text-sm">
                            {formatDateTime(
                              new Date(workout.start),
                              new Date(workout.end),
                            )}
                          </div>
                          {hasError && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-400">
                              Error
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400">
                              Pending
                            </span>
                          )}
                        </div>

                        <CardTitle className="text-lg">
                          {workout.sport_name || "Unknown Sport"}
                        </CardTitle>

                        <div className="text-muted-foreground text-sm">
                          <span className="font-medium">Score:</span>{" "}
                          {formatScore(workout.score, workout.score_state)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="py-8">
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  {sportFilter !== "all" && sortedWorkouts.length === 0
                    ? "No workouts from whoop"
                    : 'No workouts found. Click "Sync with Whoop" to fetch your data.'}
                </p>
              </CardContent>
            </Card>
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
