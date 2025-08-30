"use client";

import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { useAuth, useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { ConvexReactClient } from "convex/react";
import { useCallback, useState } from "react";
import { useTokenRefreshHandler } from "~/hooks/useTokenRefreshHandler";
import { useMultiTabSync } from "~/hooks/useMultiTabSync";
import { SessionExpiryModal, useSessionExpiryHandler } from "~/components/auth/SessionExpiryModal";

// Initialize Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Enhanced auth provider that integrates session management and error handling
function EnhancedAuthProvider({ children }: { children: React.ReactNode }) {
  const {
    showModal,
    handleTokenRefreshFailure,
    handleSignIn,
    handleDismiss,
  } = useSessionExpiryHandler();

  const { enhancedSignOut, broadcastSessionExpiry } = useMultiTabSync();

  // Use token refresh handler with session expiry callback
  useTokenRefreshHandler(() => {
    broadcastSessionExpiry();
    handleTokenRefreshFailure();
  });

  return (
    <>
      {children}
      <SessionExpiryModal
        isOpen={showModal}
        onClose={handleDismiss}
        onSignIn={handleSignIn}
      />
    </>
  );
}

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
      // This could indicate a token refresh failure
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
      <EnhancedAuthProvider>
        {children}
      </EnhancedAuthProvider>
    </ConvexProviderWithAuthKit>
  );
}