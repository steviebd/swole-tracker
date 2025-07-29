"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";

export function SyncIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isActive = isFetching > 0 || isMutating > 0;

  if (!isActive) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-white shadow-lg">
      <div className="flex space-x-1">
        <div className="h-1 w-1 animate-bounce rounded-full bg-white [animation-delay:-0.3s]"></div>
        <div className="h-1 w-1 animate-bounce rounded-full bg-white [animation-delay:-0.15s]"></div>
        <div className="h-1 w-1 animate-bounce rounded-full bg-white"></div>
      </div>
      <span className="text-xs">
        {isMutating > 0 ? "Saving..." : "Syncing..."}
      </span>
    </div>
  );
}
