"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";

export function WhoopConnection() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    resetTime: string;
  } | null>(null);
  const searchParams = useSearchParams();

  const { data: integrationStatus, refetch: refetchStatus } =
    api.whoop.getIntegrationStatus.useQuery();
  const { refetch: refetchWorkouts } = api.whoop.getWorkouts.useQuery();

  useEffect(() => {
    const success = searchParams?.get("success");
    const error = searchParams?.get("error");

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
          errorMessage =
            "Whoop integration is not configured. Please check environment variables.";
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-8">
      {/* Connection Status & Controls */}
      <div className="flex justify-center">
        <div className="card max-w-md p-8 text-center">
          <h2 className="mb-4 text-xl font-semibold">Whoop Integration</h2>

          {integrationStatus?.isConnected ? (
            <div className="space-y-4">
              <div style={{ color: 'var(--color-success)' }}>
                Connected to Whoop
                {integrationStatus.connectedAt && (
                  <div 
                    className="text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Since {formatDate(new Date(integrationStatus.connectedAt))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleSync}
                  disabled={syncLoading || rateLimit?.remaining === 0}
                  className="btn-primary w-full px-6 py-3 font-semibold disabled:opacity-50"
                >
                  {syncLoading ? "Syncing..." : "Sync with Whoop"}
                </button>
                {rateLimit && (
                  <div 
                    className="mt-2 text-center text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {rateLimit.remaining > 0
                      ? `${rateLimit.remaining} syncs remaining this hour`
                      : `Rate limit reached. Resets at ${new Date(rateLimit.resetTime).toLocaleTimeString()}`}
                  </div>
                )}
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="btn-primary w-full px-6 py-3 font-semibold disabled:opacity-50"
                >
                  {isLoading ? "Connecting..." : "Reconnect to Whoop"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Sync your Whoop workout metrics with your workout data to
                optimize your training schedule.
              </p>
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="btn-primary w-full px-6 py-3 font-semibold disabled:opacity-50"
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
            className="card max-w-md p-4"
            style={{
              borderColor: message.type === "success" 
                ? 'var(--color-success)'
                : 'var(--color-danger)'
            }}
          >
            <div
              style={{
                color: message.type === "success"
                  ? 'var(--color-success)'
                  : 'var(--color-danger)'
              }}
            >
              {message.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
