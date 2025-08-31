"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { SHARED_USER_ID } from "~/lib/constants";

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const lastIdentifiedUser = useRef<string | null>(null);

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
      capture_pageview: false,
    });

    // Identify the shared user for analytics
    if (lastIdentifiedUser.current !== SHARED_USER_ID) {
      posthog.identify(SHARED_USER_ID, {
        app_mode: "public_shared",
        user_type: "shared",
      });
      lastIdentifiedUser.current = SHARED_USER_ID;
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
