import { type Config } from "drizzle-kit";

/**
 * In CI/preview we may relax env validation, so DATABASE_URL can be undefined.
 * Drizzle's config typing requires a non-optional string for URL mode.
 * We coerce to empty string for non-prod to satisfy types; in production a real
 * DATABASE_URL must be provided or Drizzle CLI will fail at runtime.
 */
const databaseUrl = process.env.DATABASE_URL ?? "";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  tablesFilter: ["swole-tracker_*"],
} satisfies Config;
