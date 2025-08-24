"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { useAuth } from "~/providers/AuthProvider";

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const { user } = useAuth();
  const lastIdentifiedUser = useRef<string | null>(null);

  useEffect(() => {
    // Skip PostHog entirely on localhost to prevent session recording issues
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      console.log("PostHog disabled on localhost to prevent session recording issues");
      return;
    }

    // Check if PostHog is already initialized to prevent reinitializing on hot reload
    if (posthog.__loaded) {
      console.log("PostHog already initialized, skipping init");
      return;
    }

    // Get PostHog key with validation
    const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    
    if (!postHogKey || postHogKey === "phc_test_dummy") {
      console.warn("PostHog key not configured properly, skipping initialization", {
        key: postHogKey ? postHogKey.substring(0, 8) + "..." : "undefined",
        hostname: typeof window !== "undefined" ? window.location.hostname : "server",
        env: process.env.NODE_ENV
      });
      return;
    }

    console.log("Initializing PostHog with key:", postHogKey.substring(0, 8) + "...");

    posthog.init(postHogKey, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_exceptions: true,
      debug: false, // Disable debug mode to prevent infinite loops
      capture_pageview: false,
      // Disable session recording in development to prevent infinite loops
      disable_session_recording: process.env.NODE_ENV === "development",
      // Additional safeguards for development
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") {
          console.log("PostHog loaded in development mode with session recording disabled");
          // Explicitly disable session recording as an extra safeguard
          posthog.stopSessionRecording();
        }
      },
      // Prevent recording on localhost to avoid issues with hot reload
      opt_out_capturing_by_default: false,
      opt_out_persistence_by_default: false,
    });
  }, []);

  useEffect(() => {
    // Skip user tracking on localhost
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      return;
    }

    if (user) {
      if (lastIdentifiedUser.current !== user.id) {
        posthog.identify(user.id, {
          email: user.email,
          name: user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          emailVerified: user.email_verified,
          createdAt: user.created_at,
        });
        posthog.capture("user_signed_in", {
          userId: user.id,
          email: user.email,
        });
        lastIdentifiedUser.current = user.id;
      }
    } else {
      if (lastIdentifiedUser.current !== null) {
        posthog.reset();
        lastIdentifiedUser.current = null;
      }
    }
  }, [user]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
