"use client";

import React from "react";
import { useSyncIndicator } from "~/hooks/use-sync-indicator";

export interface SyncIndicatorProps {
  useSyncIndicatorHook?: typeof useSyncIndicator;
}

export function SyncIndicator({
  useSyncIndicatorHook = useSyncIndicator,
}: SyncIndicatorProps = {}) {
  const { status, isActive, badgeText } = useSyncIndicatorHook();

  if (!isActive) {
    return null;
  }

  const getBackgroundColor = () => {
    switch (status) {
      case "error":
        return "bg-red-600";
      case "offline":
        return "bg-orange-600";
      case "saving":
      case "syncing":
        return "bg-blue-600";
      default:
        return "bg-green-600";
    }
  };

  return (
    <div
      className={`text-background fixed top-4 right-4 z-40 flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg ${getBackgroundColor()}`}
    >
      {(status === "syncing" || status === "saving") && (
        <div className="flex space-x-1">
          <div
            className="bg-background h-1 w-1 animate-bounce rounded-full [animation-delay:-0.3s]"
            data-testid="animated-dot"
          ></div>
          <div
            className="bg-background h-1 w-1 animate-bounce rounded-full [animation-delay:-0.15s]"
            data-testid="animated-dot"
          ></div>
          <div
            className="bg-background h-1 w-1 animate-bounce rounded-full"
            data-testid="animated-dot"
          ></div>
        </div>
      )}
      {status === "offline" && (
        <div
          className="bg-background h-2 w-2 animate-pulse rounded-full"
          data-testid="pulse-dot"
        ></div>
      )}
      {status === "error" && (
        <div
          className="bg-background flex h-2 w-2 items-center justify-center rounded-full text-xs"
          data-testid="error-indicator"
        >
          !
        </div>
      )}
      <span className="text-xs">{badgeText}</span>
    </div>
  );
}
