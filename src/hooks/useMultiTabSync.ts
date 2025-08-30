"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import posthog from "posthog-js";

const BROADCAST_CHANNEL_NAME = "swole-tracker-auth";

type AuthSyncMessage = {
  type: "logout" | "login" | "session_expired";
  timestamp: number;
  userId?: string;
};

/**
 * Hook to synchronize authentication state across multiple tabs/windows
 * Uses BroadcastChannel API for inter-tab communication
 */
export function useMultiTabSync() {
  const { user, signOut } = useAuth();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only initialize if BroadcastChannel is supported
    if (typeof BroadcastChannel === "undefined") {
      console.warn("BroadcastChannel not supported - multi-tab sync disabled");
      return;
    }

    // Initialize broadcast channel
    channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);

    // Listen for messages from other tabs
    const handleMessage = (event: MessageEvent<AuthSyncMessage>) => {
      const { type, timestamp, userId } = event.data;
      
      console.log("Received auth sync message:", { type, timestamp, userId });

      switch (type) {
        case "logout":
          // If we receive a logout message and we're currently authenticated,
          // reload the page to force re-evaluation of auth state
          if (user) {
            console.log("Other tab logged out - reloading page");
            posthog.capture("multi_tab_logout_sync", {
              source_tab: false,
              timestamp: new Date().toISOString(),
            });
            
            // Small delay to ensure the message was from another tab
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
          break;
          
        case "session_expired":
          // Handle session expiry from other tabs
          if (user) {
            console.log("Session expired in other tab - reloading");
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
          break;

        case "login":
          // If another tab logged in and we're not authenticated, reload
          if (!user && userId) {
            console.log("Other tab logged in - reloading page");
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
          break;
      }
    };

    channelRef.current.addEventListener("message", handleMessage);

    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener("message", handleMessage);
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [user]);

  // Track user login/logout changes and broadcast to other tabs
  useEffect(() => {
    const currentUserId = user?.id || null;
    const previousUserId = lastUserIdRef.current;

    if (currentUserId !== previousUserId) {
      if (channelRef.current) {
        if (currentUserId && !previousUserId) {
          // User logged in
          const message: AuthSyncMessage = {
            type: "login",
            timestamp: Date.now(),
            userId: currentUserId,
          };
          
          console.log("Broadcasting login to other tabs");
          channelRef.current.postMessage(message);
          
          posthog.capture("multi_tab_login_sync", {
            source_tab: true,
            userId: currentUserId,
            timestamp: new Date().toISOString(),
          });
        } else if (!currentUserId && previousUserId) {
          // User logged out
          const message: AuthSyncMessage = {
            type: "logout",
            timestamp: Date.now(),
            userId: previousUserId,
          };
          
          console.log("Broadcasting logout to other tabs");
          channelRef.current.postMessage(message);
          
          posthog.capture("multi_tab_logout_sync", {
            source_tab: true,
            userId: previousUserId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      lastUserIdRef.current = currentUserId;
    }
  }, [user]);

  /**
   * Broadcast session expiry to other tabs
   */
  const broadcastSessionExpiry = () => {
    if (channelRef.current) {
      const message: AuthSyncMessage = {
        type: "session_expired",
        timestamp: Date.now(),
      };
      
      console.log("Broadcasting session expiry to other tabs");
      channelRef.current.postMessage(message);
      
      posthog.capture("multi_tab_session_expired", {
        source_tab: true,
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Enhanced signOut that broadcasts to other tabs
   */
  const enhancedSignOut = async () => {
    // Broadcast logout before actually signing out
    if (channelRef.current && user) {
      const message: AuthSyncMessage = {
        type: "logout",
        timestamp: Date.now(),
        userId: user.id,
      };
      
      channelRef.current.postMessage(message);
    }

    // Perform the actual sign out
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  };

  return {
    enhancedSignOut,
    broadcastSessionExpiry,
  };
}