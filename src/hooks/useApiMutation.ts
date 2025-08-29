"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";

/**
 * Enhanced useMutation hook with consistent error handling and toast notifications
 * Usage: const mutate = useApiMutation(api.templates.create);
 * Then call: mutate({ name: "Test" });
 */
export function useApiMutation(func: any): any {
  const mutation = useMutation(func);
  
  return async (args?: any) => {
    try {
      return await mutation(args);
    } catch (error) {
      console.error("Mutation error:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
      throw error;
    }
  };
}