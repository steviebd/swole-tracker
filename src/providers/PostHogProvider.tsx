"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useMemo, useRef } from "react";
import { env } from "~/env";
import { useAuth } from "~/providers/AuthProvider";

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const { user } = useAuth();
  const lastIdentifiedUser = useRef<string | null>(null);

  const posthogConfig = useMemo(() => {
    const key = env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = env.NEXT_PUBLIC_POSTHOG_HOST;

    const isPlaceholderKey = !key || key === "phc_test_dummy";
    const isLocalhost =
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(
        window.location.hostname,
      );

    const shouldDisable = isPlaceholderKey || isLocalhost;

    if (shouldDisable) {
      return null;
    }

    const apiHost = host;
    const uiHost = host.replace(".i.posthog.com", ".posthog.com");

    return {
      key,
      options: {
        api_host: apiHost,
        ui_host: uiHost,
        defaults: "2025-05-24",
        capture_exceptions: true,
        debug: false,
        capture_pageview: false,
      } as const,
    };
  }, []);

  useEffect(() => {
    if (!posthogConfig) {
      posthog.reset();
      return;
    }

    posthog.init(posthogConfig.key, posthogConfig.options);

    return () => {
      posthog.reset();
    };
  }, [posthogConfig]);

  useEffect(() => {
    if (!posthogConfig) {
      if (lastIdentifiedUser.current !== null) {
        posthog.reset();
        lastIdentifiedUser.current = null;
      }
      return;
    }

    if (user) {
      if (lastIdentifiedUser.current !== user.id) {
        posthog.identify(user.id, {
          email: user.email,
          name:
            user.user_metadata?.display_name ||
            (user.first_name || user.last_name
              ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
              : user.email),
          first_name: user.first_name,
          last_name: user.last_name,
        });
        posthog.capture("user_signed_in", {
          userId: user.id,
          email: user.email,
        });
        lastIdentifiedUser.current = user.id;
      }
    } else {
      if (lastIdentifiedUser.current !== null) {
        // Clear analytics session
        posthog.reset();
        lastIdentifiedUser.current = null;

        // Clear cache analytics when user logs out
        void import("~/lib/cache-analytics").then(({ getCacheAnalytics }) => {
          const analytics = getCacheAnalytics();
          if (analytics) {
            analytics.recordCacheCleared("logout");
          }
        });
      }
    }
  }, [posthogConfig, user]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
