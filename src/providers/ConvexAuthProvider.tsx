"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ConvexAuthProviderProps {
  children: ReactNode;
}

export function ConvexAuthProvider({ children }: ConvexAuthProviderProps) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}