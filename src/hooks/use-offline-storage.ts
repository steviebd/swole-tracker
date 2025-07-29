"use client";

import { useState, useEffect } from "react";

interface OfflineAction {
  id: string;
  type:
    | "create_template"
    | "update_template"
    | "delete_template"
    | "save_workout";
  data: Record<string, unknown>;
  timestamp: number;
}

export function useOfflineStorage() {
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);

  // Load pending actions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("swole-tracker-offline-actions");
      if (stored) {
        const parsed = JSON.parse(stored) as OfflineAction[];
        setPendingActions(parsed);
      }
    } catch (error) {
      console.error("Failed to load offline actions:", error);
    }
  }, []);

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "swole-tracker-offline-actions",
        JSON.stringify(pendingActions),
      );
    } catch (error) {
      console.error("Failed to save offline actions:", error);
    }
  }, [pendingActions]);

  const addPendingAction = (
    action: Omit<OfflineAction, "id" | "timestamp">,
  ) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setPendingActions((prev) => [...prev, newAction]);
    return newAction.id;
  };

  const removePendingAction = (id: string) => {
    setPendingActions((prev) => prev.filter((action) => action.id !== id));
  };

  const clearAllPendingActions = () => {
    setPendingActions([]);
  };

  return {
    pendingActions,
    addPendingAction,
    removePendingAction,
    clearAllPendingActions,
    hasPendingActions: pendingActions.length > 0,
  };
}
