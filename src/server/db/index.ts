import { drizzle } from "drizzle-orm/d1";

import { env } from "~/env";
import * as schema from "./schema";

// For Cloudflare Workers, we use the D1 binding directly
// The DB binding is provided by the Workers runtime
export const db = drizzle(env.DB, {
  schema,
});

// Export database utilities for performance optimizations
export { monitorQuery, dbMonitor, checkDatabaseHealth } from "./monitoring";
export {
  batchInsertWorkouts,
  batchUpdateSessionExercises,
  batchCreateMasterExerciseLinks,
  batchDeleteWorkouts,
  type BatchWorkoutData,
} from "./utils";
