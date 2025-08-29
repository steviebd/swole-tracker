"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { useAuth } from '@workos-inc/authkit-react';
import { env } from "~/env";

const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithAuthKit>
  );
}