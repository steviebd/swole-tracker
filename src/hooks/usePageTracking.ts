"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    const getPageName = (path: string) => {
      if (path === "/") return "home";
      if (path === "/templates") return "templates";
      if (path === "/templates/new") return "new_template";
      if (path.startsWith("/templates/") && path.endsWith("/edit"))
        return "edit_template";
      if (path === "/workout/start") return "start_workout";
      if (path.startsWith("/workout/session/")) return "workout_session";
      if (path === "/workouts") return "workout_history";
      return "unknown";
    };
  }, [pathname]);
}
