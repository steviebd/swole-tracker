"use client";

import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";

export function useConvexAuth() {
  const user = useQuery(api.users.getUserProfile);
  
  return {
    user,
    isAuthenticated: !!user,
    isLoading: user === undefined,
  };
}