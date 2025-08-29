"use client";

import { type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-nextjs/components";
import { env } from "~/env";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Wrapper to match expected signature for ConvexProviderWithAuthKit
  const useAuthWrapper = () => {
    const auth = useAuth();
    
    return {
      isLoading: false, // WorkOS auth doesn't expose loading state the same way
      user: auth?.user || null,
      getAccessToken: async () => {
        // This would need to be implemented based on WorkOS access token retrieval
        return null;
      },
    };
  };

  return (
    <AuthKitProvider>
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuthWrapper}>
        {children}
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  );
}