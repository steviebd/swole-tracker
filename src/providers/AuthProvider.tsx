"use client";

import { useAuth as useWorkOSAuth } from "@workos-inc/authkit-nextjs/components";

// Wrapper for WorkOS auth to provide isLoading compatibility
export function useAuth() {
  const workosAuth = useWorkOSAuth();
  
  return {
    ...workosAuth,
    isLoading: false, // WorkOS doesn't provide loading state the same way
  };
}

// The AuthProvider functionality is handled by AuthKitProvider in ConvexClientProvider