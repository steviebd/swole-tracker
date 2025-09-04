import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";
import { dbMonitor, monitorQuery } from "./monitoring";
import { logger } from "~/lib/logger";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

/**
 * Optimized connection pool configuration for better performance
 * These settings balance connection efficiency with resource usage
 */
const createConnection = (url: string) => {
  const sql = postgres(url, {
    // Connection pool settings
    max: env.NODE_ENV === "production" ? 20 : 5, // Max concurrent connections
    idle_timeout: 20, // Close idle connections after 20 seconds
    max_lifetime: 60 * 30, // Close connections after 30 minutes
    connect_timeout: 10, // Connection timeout in seconds
    
    // Performance optimizations
    prepare: false, // Disable prepared statements for better compatibility with serverless
    transform: {
      undefined: null, // Transform undefined to null for better database compatibility
    },
    
    // Connection retry settings
    connection: {
      application_name: "swole-tracker",
    },
    
    // Logging in development
    debug: env.NODE_ENV === "development" && process.env.DEBUG_SQL === "true",
    
    // Error handling
    onnotice: env.NODE_ENV === "development" ? console.log : undefined,

    // Connection monitoring hooks (postgres-js specific)
    ...(env.NODE_ENV === "development" && {
      // Note: These hooks might not be available in all versions of postgres-js
      // Connection monitoring is handled separately below
    }),
  });

  // Monitor connection pool metrics periodically
  if (env.NODE_ENV === "development" || process.env.MONITOR_DB === "true") {
    setInterval(() => {
      const stats = {
        active: 0, // postgres-js doesn't expose these directly
        idle: 0,   // but we can implement custom tracking if needed
        total: env.NODE_ENV === "production" ? 20 : 5,
        waiting: 0,
      };
      dbMonitor.updateConnectionMetrics(stats);
    }, 30000); // Every 30 seconds
  }

  return sql;
};

const conn = globalForDb.conn ?? createConnection(env.DATABASE_URL ?? "");
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { 
  schema,
  // Enable query logging in development
  logger: env.NODE_ENV === "development" && process.env.DEBUG_SQL === "true",
});

// Export database utilities for performance optimizations
export { monitorQuery, dbMonitor, checkDatabaseHealth } from "./monitoring";
export { 
  batchInsertWorkouts, 
  batchUpdateSessionExercises, 
  batchCreateMasterExerciseLinks, 
  batchDeleteWorkouts,
  type BatchWorkoutData 
} from "./utils";
