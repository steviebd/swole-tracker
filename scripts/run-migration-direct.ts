#!/usr/bin/env bun

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { type AppRouter } from "../src/server/api/root";
import { loadEnvConfig } from "@next/env";

// Load environment variables
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
      headers: {
        // You'll need to provide auth headers here
        // This is just for testing - in production you'd use proper auth
      },
    }),
  ],
});

async function runMigration() {
  try {
    console.log("🚀 Starting master exercise migration...");

    // Note: This won't work without proper authentication
    // You need to be logged in to call this endpoint
    const result = await client.workouts.migrateMasterExercises.mutate();

    console.log("✅ Migration completed:", result);

    if (result.success) {
      console.log(`📊 Successfully migrated ${result.migrated} exercises`);
      if (result.created && result.created > 0) {
        console.log(`📝 Created ${result.created} new master exercises`);
      }
      if (result.linked && result.linked > 0) {
        console.log(
          `🔗 Linked ${result.linked} exercises to existing master exercises`,
        );
      }
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.log("\n💡 To run the migration manually:");
    console.log("1. Start the development server: bun dev");
    console.log("2. Navigate to: http://localhost:3000/migrate");
    console.log('3. Click "Run Migration" button');
  }
}

runMigration();
