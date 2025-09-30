"use client";

import { useCallback, useState } from "react";

interface UseWhoopConnectResult {
  startConnect: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
  resetError: () => void;
}

export function useWhoopConnect(): UseWhoopConnectResult {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startConnect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    let shouldResetLoading = true;

    try {
      const response = await fetch("/api/whoop/auth", {
        method: "POST",
      });

      if (response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { authorizeUrl?: string }
          | null;

        if (data?.authorizeUrl) {
          shouldResetLoading = false;
          window.location.assign(data.authorizeUrl);
          return;
        }

        setError(
          "We received an unexpected response from WHOOP. Please try again.",
        );
        return;
      }

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (response.status === 401) {
        setError("You need to sign in before connecting WHOOP.");
        return;
      }

      setError(
        data?.error ??
          "We couldn't start the WHOOP connection. Please try again soon.",
      );
    } catch (caughtError) {
      console.error("Failed to initiate WHOOP connection", caughtError);
      setError("Network issue while contacting WHOOP. Please try again.");
    } finally {
      if (shouldResetLoading) {
        setIsConnecting(false);
      }
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    startConnect,
    isConnecting,
    error,
    resetError,
  };
}

