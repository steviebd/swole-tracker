"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { logger } from "~/lib/logger";

// WorkOS user type (matching WorkOS API response)
interface WorkOSUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
}

export interface AuthContextType {
  user: WorkOSUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  onAuthFailure: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// Fetch user session from API
async function fetchSession(): Promise<{ user: WorkOSUser | null }> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include", // Include cookies
    });

    if (response.ok) {
      return (await response.json()) as { user: WorkOSUser | null };
    } else {
      return { user: null };
    }
  } catch (error) {
    logger.error("Failed to fetch session", error);
    return { user: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WorkOSUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      logger.debug("Getting initial WorkOS session");
      const { user } = await fetchSession();
      setUser(user);
      setIsLoading(false);
    };

    getInitialSession();
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear offline data and cache before signing out
      const { clearAllOfflineData } = await import("~/lib/offline-storage");
      await clearAllOfflineData();

      // Call logout API
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      logger.info("User signed out and cache cleared");
    } catch (error) {
      logger.error("Error during sign out", error);
    } finally {
      router.push("/");
    }
  }, [router]);

  const onAuthFailure = useCallback(() => {
    logger.warn(
      "Authentication failure detected, clearing client-side auth state",
    );
    setUser(null);
    // Don't automatically redirect - let the user decide when to re-authenticate
    // The UI will update to show login prompts when user state becomes null
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signOut,
      onAuthFailure,
    }),
    [user, isLoading, signOut, onAuthFailure],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Debug utility - can be called from browser console
if (typeof window !== "undefined") {
  (window as any).debugAuth = {
    checkAuth: async () => {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });
      const session = (await response.json()) as { user: WorkOSUser | null };
      console.log("Current WorkOS session:", session);
      return session;
    },
  };
}
