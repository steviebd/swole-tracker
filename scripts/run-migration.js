// Migration script to create master exercise links for existing data
// Run this in the browser console on the development server

async function runMigration() {
  try {
    console.log("Starting master exercise migration...");

    // Get the tRPC client from window
    const { trpc } = window;
    if (!trpc) {
      console.error("tRPC client not found. Make sure you're on the app page.");
      return;
    }

    // Call the migration endpoint
    const result = await trpc.workouts.migrateMasterExercises.mutate();

    console.log("Migration completed:", result);

    if (result.success) {
      console.log(`✅ Successfully migrated ${result.migrated} exercises`);
      if (result.created > 0) {
        console.log(`📝 Created ${result.created} new master exercises`);
      }
      if (result.linked > 0) {
        console.log(
          `🔗 Linked ${result.linked} exercises to existing master exercises`,
        );
      }

      // Refresh the page to see the changes
      setTimeout(() => {
        console.log("🔄 Refreshing page to apply changes...");
        window.location.reload();
      }, 2000);
    } else {
      console.error("❌ Migration failed:", result.message);
    }
  } catch (error) {
    console.error("❌ Error running migration:", error);
  }
}

// Auto-run if this is executed directly
if (typeof window !== "undefined") {
  console.log(
    "🚀 Migration script loaded. Run runMigration() to start the migration.",
  );
  window.runMigration = runMigration;
}

export { runMigration };
