"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { type User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "~/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { logger } from "~/lib/logger";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      logger.debug("Getting initial session");
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        logger.debug("Initial session result", {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
        });

        if (error) {
          logger.warn("Session error", { error: error.message });
          // Clear any stale session data
          await supabase.auth.signOut();
        }
        setUser(session?.user ?? null);
      } catch (error) {
        logger.error("Failed to get session", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug("Auth state change", {
        event,
        hasUser: !!session?.user?.id,
      });

      if (event === "TOKEN_REFRESHED") {
        logger.debug("Token refreshed successfully");
      } else if (event === "SIGNED_OUT") {
        logger.debug("User signed out");
      } else if (event === "SIGNED_IN") {
        logger.debug("User signed in");
      }

      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    try {
      // Clear offline data and cache before signing out
      const { clearAllOfflineData } = await import("~/lib/offline-storage");
      await clearAllOfflineData();

      // Sign out from Supabase
      await supabase.auth.signOut();

      logger.info("User signed out and cache cleared");
    } catch (error) {
      logger.error("Error during sign out", error);

      // Still attempt to sign out even if cache clearing fails
      await supabase.auth.signOut();
    } finally {
      router.push("/");
    }
  }, [router, supabase.auth]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signOut,
    }),
    [user, isLoading, signOut],
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
    clearAuth: () => {
      import("~/lib/supabase-browser").then(({ clearSupabaseAuth }) => {
        clearSupabaseAuth();
        window.location.reload();
      });
    },
    checkAuth: async () => {
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      console.log("Current auth state:", { data, error });
      return { data, error };
    },
    migrateToSSR: async () => {
      console.log("Migrating auth from localStorage to SSR cookies...");
      const { createBrowserSupabaseClient, clearSupabaseAuth } = await import(
        "~/lib/supabase-browser"
      );

      // Get current session from localStorage
      const oldSupabase = await import("@supabase/supabase-js");
      const { env } = await import("~/env");
      const oldClient = oldSupabase.createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
      const { data: oldSession } = await oldClient.auth.getSession();

      if (oldSession?.session) {
        console.log("Found existing session, migrating...");

        // Clear old storage
        clearSupabaseAuth();

        // Create new SSR client and set session
        const newClient = createBrowserSupabaseClient();
        await newClient.auth.setSession(oldSession.session);

        console.log("Migration complete! Reloading page...");
        window.location.reload();
      } else {
        console.log("No session found to migrate");
      }
    },
  };
}
