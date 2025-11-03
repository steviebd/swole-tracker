#!/usr/bin/env bun
import { spawn } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

async function main() {
  const TARGET_ENV = process.argv[2] || "dev";

  const validEnvs = ["dev", "staging", "production", "preview"];
  if (!validEnvs.includes(TARGET_ENV)) {
    console.error(
      `❌ Error: Unknown environment '${TARGET_ENV}'. Use one of ${validEnvs.join(", ")}.`,
    );
    process.exit(1);
  }

  const CACHE_DIR = join(process.cwd(), ".wrangler", "tmp");
  const CACHE_FILE = join(CACHE_DIR, `d1_db_id_${TARGET_ENV}`);

  let DB_ID = process.env.D1_DB_ID || "";

  if (!DB_ID && existsSync(CACHE_FILE)) {
    try {
      DB_ID = readFileSync(CACHE_FILE, "utf-8").trim();
      console.log(`📋 Using cached D1_DB_ID for ${TARGET_ENV}`);
    } catch {
      // Ignore cache read errors
    }
  }

  if (!DB_ID) {
    DB_ID = await new Promise<string>((resolve) => {
      const proc = spawn(
        "infisical",
        ["run", "--env", TARGET_ENV, "--command", "echo $D1_DB_ID"],
        {
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      let output = "";
      proc.stdout.on("data", (data) => (output += data.toString()));
      proc.on("close", (code) => {
        resolve(code === 0 ? output.trim() : "");
      });
    });

    // Cache the retrieved DB_ID
    if (DB_ID) {
      try {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(CACHE_FILE, DB_ID);
        console.log(`💾 Cached D1_DB_ID for ${TARGET_ENV}`);
      } catch {
        // Ignore cache write errors
      }
    }
  }

  if (!DB_ID) {
    console.error(
      `❌ Error: Could not retrieve D1_DB_ID from Infisical for '${TARGET_ENV}'`,
    );
    process.exit(1);
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (!uuidRegex.test(DB_ID)) {
    console.error(
      `❌ Error: D1_DB_ID from Infisical doesn't look valid: ${DB_ID}`,
    );
    process.exit(1);
  }

  console.log(`✅ Successfully updated cache for ${TARGET_ENV}: ${DB_ID}`);
}

main().catch(console.error);