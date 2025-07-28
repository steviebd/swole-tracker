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
    <div className="fixed top-4 right-4 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg z-40 flex items-center gap-2">
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
      </div>
      <span className="text-xs">
        {isMutating > 0 ? "Saving..." : "Syncing..."}
      </span>
    </div>
  );
}
