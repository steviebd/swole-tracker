"use client";

import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { useAuth, useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { ConvexReactClient } from "convex/react";
import { useCallback } from "react";

// Initialize Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Adapter to match the expected UseAuth signature for Convex
function useAuthAdapter() {
  const auth = useAuth();
  const { getAccessToken } = useAccessToken();
  
  const adaptedGetAccessToken = useCallback(async (): Promise<string | null> => {
    if (!auth.user) return null;
    try {
      const token = await getAccessToken();
      return token || null;
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  }, [auth.user, getAccessToken]);

  return {
    isLoading: auth.loading,
    user: auth.user,
    getAccessToken: adaptedGetAccessToken,
  };
}

export default function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProviderWithAuthKit client={convex} useAuth={useAuthAdapter}>
      {children}
    </ConvexProviderWithAuthKit>
  );
}