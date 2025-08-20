import { type Config } from "drizzle-kit";

/**
 * Migration configuration for D1 (SQLite) database.
 * This configuration supports both local development and Cloudflare Workers deployment.
 */

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite", // Change dialect to sqlite for D1
  out: "./drizzle",
  tablesFilter: ["swole-tracker_*"],
} satisfies Config;
