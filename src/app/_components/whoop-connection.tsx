"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";

export function WhoopConnection() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; resetTime: string } | null>(null);
  const searchParams = useSearchParams();

  const { data: integrationStatus, refetch: refetchStatus } = api.whoop.getIntegrationStatus.useQuery();
  const { data: workouts, refetch: refetchWorkouts } = api.whoop.getWorkouts.useQuery();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      setMessage({ type: "success", text: "Successfully connected to Whoop!" });
      void refetchStatus();
    } else if (error) {
      let errorMessage = "Failed to connect to Whoop";
      switch (error) {
        case "unauthorized":
          errorMessage = "You must be logged in to connect to Whoop";
          break;
        case "invalid_state":
          errorMessage = "Invalid request state. Please try again.";
          break;
        case "no_code":
          errorMessage = "Authorization code not received";
          break;
        case "token_exchange_failed":
          errorMessage = "Failed to exchange authorization code";
          break;
        case "whoop_not_configured":
          errorMessage = "Whoop integration is not configured. Please check environment variables.";
          break;
        case "oauth2_validation_failed":
          errorMessage = "OAuth2 validation failed. Please try again.";
          break;
        default:
          errorMessage = `Connection failed: ${error}`;
      }
      setMessage({ type: "error", text: errorMessage });
    }
  }, [searchParams, refetchStatus]);

  const handleConnect = async () => {
    setIsLoading(true);
    setMessage(null);
    window.location.href = "/api/auth/whoop/authorize";
  };

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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDuration = (start: Date, end: Date) => {
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getScoreColor = (scoreState: string) => {
    switch (scoreState) {
      case "SCORED":
        return "text-green-400";
      case "PENDING_SCORE":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="space-y-8">
      {/* Connection Status & Controls */}
      <div className="flex justify-center">
        <div className="max-w-md rounded-lg bg-gray-800 p-8 text-center">
          <h2 className="mb-4 text-xl font-semibold">Whoop Integration</h2>
          
          {integrationStatus?.isConnected ? (
            <div className="space-y-4">
              <div className="text-green-400">
                ✅ Connected to Whoop
                {integrationStatus.connectedAt && (
                  <div className="text-sm text-gray-400">
                    Since {formatDate(new Date(integrationStatus.connectedAt))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleSync}
                  disabled={syncLoading || (rateLimit?.remaining === 0)}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {syncLoading ? "Syncing..." : "Sync with Whoop"}
                </button>
                {rateLimit && (
                  <div className="text-xs text-gray-400 text-center mt-2">
                    {rateLimit.remaining > 0 ? (
                      `${rateLimit.remaining} syncs remaining this hour`
                    ) : (
                      `Rate limit reached. Resets at ${new Date(rateLimit.resetTime).toLocaleTimeString()}`
                    )}
                  </div>
                )}
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="w-full rounded-lg bg-purple-600 px-6 py-3 font-semibold transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading ? "Connecting..." : "Reconnect to Whoop"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-300">
                Sync your Whoop workout metrics with your workout data to optimize
                your training schedule.
              </p>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full rounded-lg bg-purple-600 px-6 py-3 font-semibold transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? "Connecting..." : "Connect to Whoop"}
              </button>
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
      {integrationStatus?.isConnected && workouts && workouts.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl font-semibold">Your Whoop Workouts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workouts.map((workout) => (
              <div
                key={workout.id}
                className="rounded-lg bg-gray-800 p-6 transition-colors hover:bg-gray-700"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {workout.sport_name || "Unknown Sport"}
                  </h3>
                  <span className={`text-sm font-medium ${getScoreColor(workout.score_state ?? "")}`}>
                    {workout.score_state?.replace("_", " ") || "Unknown"}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-300">
                  <div>
                    <span className="font-medium">Start:</span> {formatDate(new Date(workout.start))}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>{" "}
                    {formatDuration(new Date(workout.start), new Date(workout.end))}
                  </div>
                  
                  {workout.score && typeof workout.score === "object" ? (
                    <div className="mt-4 rounded bg-gray-900 p-3">
                      <div className="text-xs font-medium text-gray-400 mb-2">Score Details</div>
                      {(workout.score as any)?.strain && (
                        <div>Strain: {((workout.score as any).strain as number).toFixed(1)}</div>
                      )}
                      {(workout.score as any)?.average_heart_rate && (
                        <div>Avg HR: {(workout.score as any).average_heart_rate} bpm</div>
                      )}
                      {(workout.score as any)?.max_heart_rate && (
                        <div>Max HR: {(workout.score as any).max_heart_rate} bpm</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {integrationStatus?.isConnected && workouts && workouts.length === 0 && (
        <div className="text-center">
          <p className="text-gray-400">No workouts synced yet. Click &quot;Sync with Whoop&quot; to fetch your data.</p>
        </div>
      )}
    </div>
  );
}
