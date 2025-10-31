import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject-9a5289e0-f1de-4d72-9bfa-d09451be725d.sqlite",
  },
} satisfies Config;
