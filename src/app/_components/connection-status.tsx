"use client";

import { useOnlineStatus } from "~/hooks/use-online-status";

export function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  // Debug logging in development
  if (process.env.NODE_ENV === "development") {
    console.log("ConnectionStatus rendering, isOnline:", isOnline);
  }

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-50 bg-yellow-600 px-4 py-2 text-center text-sm text-white">
      <span className="inline-flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-200"></div>
        You&apos;re offline. Changes will sync when connection is restored.
      </span>
    </div>
  );
}
