"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import posthog from "posthog-js";

/**
 * Hook to monitor token refresh failures and handle session expiry
 * Works with Convex's automatic token refresh mechanism
 */
export function useTokenRefreshHandler(
  onSessionExpired?: () => void
) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const wasAuthenticatedRef = useRef<boolean>(false);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * Stop session monitoring
   */
  const stopSessionMonitoring = useRef(() => {
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = undefined;
    }
  }).current;

  /**
   * Start monitoring session validity by making periodic lightweight queries
   */
  const startSessionMonitoring = useRef(() => {
    // Clear any existing interval
    stopSessionMonitoring();

    // Check session every 5 minutes
    sessionCheckIntervalRef.current = setInterval(() => {
      // If we think we're authenticated but the auth state shows otherwise,
      // it might be a silent refresh failure
      if (wasAuthenticatedRef.current && !isAuthenticated && !isLoading) {
        console.warn("Session check failed - auth state inconsistent");
        
        posthog.capture("session_check_failed", {
          timestamp: new Date().toISOString(),
          expected_authenticated: true,
          actual_authenticated: isAuthenticated,
        });

        onSessionExpired?.();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }).current;

  useEffect(() => {
    // Track authentication state changes
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      // User just became authenticated
      wasAuthenticatedRef.current = true;
      console.log("Authentication established");
      
      // Start periodic session validation
      startSessionMonitoring();
    } else if (!isAuthenticated && wasAuthenticatedRef.current && !isLoading) {
      // User was authenticated but now isn't (and not loading)
      // This likely means token refresh failed
      wasAuthenticatedRef.current = false;
      console.warn("Authentication lost - possible token refresh failure");
      
      // Stop session monitoring
      stopSessionMonitoring();
      
      // Track the event
      posthog.capture("token_refresh_failure", {
        timestamp: new Date().toISOString(),
        was_authenticated: true,
      });
      
      // Notify parent component
      onSessionExpired?.();
    }
  }, [isAuthenticated, isLoading, onSessionExpired, startSessionMonitoring, stopSessionMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSessionMonitoring();
    };
  }, [stopSessionMonitoring]);

  return {
    isAuthenticated,
    isLoading,
    hasSessionExpired: wasAuthenticatedRef.current && !isAuthenticated && !isLoading,
  };
}