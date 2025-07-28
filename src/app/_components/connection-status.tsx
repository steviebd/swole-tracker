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
    <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white px-4 py-2 text-sm text-center z-50">
      <span className="inline-flex items-center gap-2">
        <div className="w-2 h-2 bg-yellow-200 rounded-full animate-pulse"></div>
        You&apos;re offline. Changes will sync when connection is restored.
      </span>
    </div>
  );
}
