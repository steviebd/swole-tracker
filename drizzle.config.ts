import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  out: "./drizzle",
  tablesFilter: ["swole-tracker_*"],
  dbCredentials: {
    url: ".wrangler/state/swole-tracker-dev.db",
  },
} satisfies Config;
