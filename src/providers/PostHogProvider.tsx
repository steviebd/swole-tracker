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
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
      capture_pageview: false,
    });
  }, []);

  useEffect(() => {
    if (user) {
      if (lastIdentifiedUser.current !== user.id) {
        posthog.identify(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
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
