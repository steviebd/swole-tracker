"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Custom hook to get the current authenticated user's profile
 * 
 * This hook wraps the Convex query api.users.getUserProfile and provides
 * a convenient interface for accessing the current user's data throughout
 * the application.
 * 
 * @returns The current user's profile data or null if not authenticated/loading
 */
export function useCurrentUser() {
  const user = useQuery(api.users.getUserProfile);
  
  return user;
}