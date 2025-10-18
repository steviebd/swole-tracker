"use client";

import { useEffect, useState } from "react";

/**
 * Track whether the current document is visible (tab focused or window active).
 * Defaults to true during SSR and falls back gracefully in unsupported environments.
 */
export function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") {
      return true;
    }
    return !document.hidden;
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
