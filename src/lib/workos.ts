import { WorkOS } from "@workos-inc/node";
import { env } from "~/env";

let workos: WorkOS | null = null;

// Singleton WorkOS client factory for Workers environment
export function getWorkOS(): WorkOS {
  if (!workos) {
    // In development, allow placeholder values
    if (process.env.NODE_ENV === "development") {
      workos = new WorkOS(env.WORKOS_API_KEY || "placeholder_key");
    } else {
      if (!env.WORKOS_API_KEY) {
        throw new Error("WORKOS_API_KEY is required but not provided");
      }
      if (!env.WORKOS_CLIENT_ID) {
        throw new Error("WORKOS_CLIENT_ID is required but not provided");
      }
      workos = new WorkOS(env.WORKOS_API_KEY);
    }
  }
  return workos;
}

// Export types for use in other files
export type { User, Organization } from "@workos-inc/node";
