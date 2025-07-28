"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
      capture_pageview: false, // We'll handle this manually
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        posthog.identify(user.id, {
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName,
          createdAt: user.createdAt,
        });
        posthog.capture("user_signed_in", {
          userId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
        });
      } else {
        posthog.reset();
      }
    }
  }, [user, isLoaded]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
