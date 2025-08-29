"use client";

import { useQuery } from "convex/react";

/**
 * Enhanced useQuery hook with consistent error handling
 * Convex handles errors automatically, but this provides a consistent interface
 * Usage: const data = useApiQuery(api.templates.list, { userId: "123" });
 */
export function useApiQuery(func: any, args?: any): any {
  return useQuery(func, args);
}

/**
 * Conditional query hook - only runs when enabled
 * Usage: const data = useApiQueryEnabled(api.templates.list, { userId: "123" }, !!userId);
 */
export function useApiQueryEnabled(func: any, args?: any, enabled = true): any {
  return useQuery(func, enabled ? args : "skip");
}