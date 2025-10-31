#!/usr/bin/env bun
import { spawn } from "child_process";
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from "fs";
import { join } from "path";

console.log("🔧 Setting up D1 databases for all environments...");
console.log("");
console.log("Prerequisites:");
console.log("1. Create separate D1 databases in Cloudflare dashboard:");
console.log("   - swole-tracker-dev");
console.log("   - swole-tracker-staging");
console.log("   - swole-tracker-prod");
console.log("2. Get the database IDs from Cloudflare dashboard");
console.log("3. Set D1_DB_ID_* environment variables in Infisical for each environment");
console.log("");
console.log("Environment variables needed in Infisical:");
console.log("- dev: D1_DB_ID");
console.log("- staging: D1_DB_ID");
console.log("- production: D1_DB_ID");
console.log("(Each environment should have its own D1_DB_ID value)");
console.log("");

function promptUser(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (key) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      console.log("");
      resolve(key.toString().toLowerCase() === "y");
    });
  });
}

const ready = await promptUser("Do you have the database IDs ready? (y/N): ");
if (!ready) {
  console.log("❌ Please create the databases first and get their IDs.");
  process.exit(1);
}

// Get database IDs from Infisical
console.log("🔍 Getting database IDs from Infisical...");

function runInfisical(env: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("infisical", ["run", "--env", env, "--command", "echo $D1_DB_ID"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    proc.stdout.on("data", (data) => (output += data.toString()));
    proc.stderr.on("data", () => {}); // ignore stderr
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        resolve("");
      }
    });
  });
}

const DEV_DB_ID = await runInfisical("dev");
const STAGING_DB_ID = await runInfisical("staging");
const PROD_DB_ID = await runInfisical("production");

if (!DEV_DB_ID || !STAGING_DB_ID || !PROD_DB_ID) {
  console.log("❌ Error: Could not retrieve all database IDs from Infisical");
  console.log("Make sure D1_DB_ID is set in dev, staging, and production environments");
  console.log("");
  console.log("Current values:");
  console.log(`  Dev D1_DB_ID: ${DEV_DB_ID || "NOT_SET"}`);
  console.log(`  Staging D1_DB_ID: ${STAGING_DB_ID || "NOT_SET"}`);
  console.log(`  Prod D1_DB_ID: ${PROD_DB_ID || "NOT_SET"}`);
  process.exit(1);
}

console.log("✅ Retrieved database IDs:");
console.log(`  Dev: ${DEV_DB_ID}`);
console.log(`  Staging: ${STAGING_DB_ID}`);
console.log(`  Prod: ${PROD_DB_ID}`);

// Update wrangler.toml
console.log("");
console.log("🔄 Updating wrangler.toml...");

// Backup current config
copyFileSync("wrangler.toml", "wrangler.toml.bak");

let content = readFileSync("wrangler.toml", "utf-8");

// Update staging database ID
content = content.replace(
  /(\[env\.staging\])/,
  `$1\n  database_id = "${STAGING_DB_ID}"`
);
content = content.replace(
  /database_id = "df72a743-bd0c-4015-806f-b12e13f14eb3"/g,
  `database_id = "${STAGING_DB_ID}"`
);

// Update production database ID
content = content.replace(
  /(\[env\.production\])/,
  `$1\n  database_id = "${PROD_DB_ID}"`
);
content = content.replace(
  /database_id = "df72a743-bd0c-4015-806f-b12e13f14eb3"/g,
  `database_id = "${PROD_DB_ID}"`
);

// Update preview database ID (using staging for preview)
content = content.replace(
  /(\[env\.preview\])/,
  `$1\n  database_id = "${STAGING_DB_ID}"`
);

writeFileSync("wrangler.toml", content);

unlinkSync("wrangler.toml.bak");

console.log("✅ Updated wrangler.toml with separate database IDs");
console.log("");
console.log("🎉 Setup complete! You can now use:");
console.log("  bun run db:push:dev     - Push to dev database");
console.log("  bun run db:push:staging - Push to staging database");
console.log("  bun run db:push:prod    - Push to production database");
console.log("  bun run db:push:all     - Push to all databases");
console.log("");
console.log("Note: Make sure your Infisical environments have the correct D1_DB_ID_* variables set.");