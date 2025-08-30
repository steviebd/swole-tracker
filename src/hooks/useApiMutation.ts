"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import type { FunctionReference, OptionalRestArgs } from "convex/server";

/**
 * Enhanced useMutation hook with consistent error handling and toast notifications
 * Usage: const mutate = useApiMutation(api.templates.create);
 * Then call: mutate({ name: "Test" });
 */
export function useApiMutation<T extends FunctionReference<"mutation">>(
  func: T
): (...args: OptionalRestArgs<T>) => Promise<T["_returnType"]> {
  const mutation = useMutation(func);
  
  return async (...args: OptionalRestArgs<T>): Promise<T["_returnType"]> => {
    try {
      const result: T["_returnType"] = await mutation(...args);
      return result;
    } catch (error) {
      console.error("Mutation error:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
      throw error;
    }
  };
}