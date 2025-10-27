import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    databaseId: process.env.D1_DB_ID ?? "",
    token: process.env.CLOUDFLARE_API_TOKEN ?? "",
  },
} satisfies Config;
