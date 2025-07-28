"use client";

import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Set the actual online status after hydration
    const currentStatus = navigator.onLine;
    setIsOnline(currentStatus);
    setHasChecked(true);

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === "development") {
      console.log("Online status initialized:", currentStatus);
    }

    const handleOnline = () => {
      setIsOnline(true);
      if (process.env.NODE_ENV === "development") {
        console.log("Connection restored");
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      if (process.env.NODE_ENV === "development") {
        console.log("Connection lost");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Only return false if we've actually checked and confirmed offline
  return hasChecked ? isOnline : true;
}
