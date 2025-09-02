"use client";

import { type ReactNode, useEffect, useState, useCallback } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

import { env } from "~/env";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL!);

// Minimal useAuth hook for Convex that fetches a WorkOS access token from our API
function useConvexAuthBridge() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/token");
        if (res.ok) {
          const text = await res.text();
          if (!cancelled) setToken(text || null);
        }
      } catch (_) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchAccessToken = useCallback(async () => token, [token]);
  return {
    isLoading: loading,
    isAuthenticated: !!token,
    fetchAccessToken,
  };
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthBridge}>
      {children}
    </ConvexProviderWithAuth>
  );
}

