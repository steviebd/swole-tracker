"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getConnectionState,
  onConnectionChange,
  type ConnectionState
} from "~/lib/offline-queue";

interface OnlineStatusHook {
  isOnline: boolean;
  connectionState: ConnectionState;
  hasChecked: boolean;
  checkConnection: () => Promise<boolean>;
}

export function useOnlineStatus(): OnlineStatusHook {
  const [isOnline, setIsOnline] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(getConnectionState());

  // Advanced connection check using fetch
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return true;
    }

    // First check navigator.onLine
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok || response.status === 404; // 404 is still a connection
    } catch (error) {
      // Network error means we're offline
      return false;
    }
  }, []);

  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Initialize connection state
    const initialState = getConnectionState();
    setConnectionState(initialState);
    setIsOnline(initialState.isOnline);
    setHasChecked(true);

    // Set up connection state monitoring
    const unsubscribe = onConnectionChange((newState) => {
      setConnectionState(newState);
      setIsOnline(newState.isOnline);
    });

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Online status initialized:", initialState);
    }

    const handleOnline = async () => {
      // Double-check with actual connectivity test
      const actuallyOnline = await checkConnection();
      const newState = getConnectionState();
      setConnectionState(newState);
      setIsOnline(actuallyOnline);
      
      if (process.env.NODE_ENV === "development") {
        console.log("Connection event - online:", actuallyOnline, newState);
      }
    };

    const handleOffline = () => {
      const newState = getConnectionState();
      setConnectionState(newState);
      setIsOnline(false);
      
      if (process.env.NODE_ENV === "development") {
        console.log("Connection lost", newState);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-check connection when app becomes visible
        handleOnline();
      }
    };

    // Listen for browser events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic connectivity check (every 30 seconds when online)
    let intervalId: NodeJS.Timeout;
    if (initialState.isOnline) {
      intervalId = setInterval(async () => {
        const stillOnline = await checkConnection();
        if (!stillOnline && isOnline) {
          handleOffline();
        }
      }, 30000);
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [checkConnection]);

  return {
    isOnline: hasChecked ? isOnline : true,
    connectionState,
    hasChecked,
    checkConnection
  };
}

// Legacy compatibility
export function useOnlineStatusSimple(): boolean {
  const { isOnline } = useOnlineStatus();
  return isOnline;
}
