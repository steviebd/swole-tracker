#!/usr/bin/env bun
import { spawn } from "child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

async function main() {
  const TARGET_ENV = process.argv[2] || "dev";
  const isCI = process.env.CI === 'true';

  const validEnvs = ["dev", "staging", "production", "preview"];
  if (!validEnvs.includes(TARGET_ENV)) {
    console.error(
      `❌ Error: Unknown environment '${TARGET_ENV}'. Use one of ${validEnvs.join(", ")}.`,
    );
    process.exit(1);
  }

  const CONFIG_FILE = "wrangler.toml";
  const TEMPLATE_FILE = "wrangler.template.toml";
  const BACKUP_FILE = `${CONFIG_FILE}.backup`;

  if (!existsSync(CONFIG_FILE)) {
    if (existsSync(TEMPLATE_FILE)) {
      writeFileSync(CONFIG_FILE, readFileSync(TEMPLATE_FILE));
      console.log(`🆕 Seeded ${CONFIG_FILE} from ${TEMPLATE_FILE}`);
    } else {
      console.error(
        `❌ Error: neither ${CONFIG_FILE} nor ${TEMPLATE_FILE} found`,
      );
      process.exit(1);
    }
  }

  console.log(
    `🔄 Updating ${CONFIG_FILE} for env '${TARGET_ENV}'${isCI ? ' (CI mode)' : ' with Infisical secrets'}…`,
  );

  let DB_ID = process.env.D1_DB_ID || "";

  if (isCI) {
    if (!DB_ID) {
      console.error(
        `❌ Error: D1_DB_ID environment variable is required in CI but not set`,
      );
      process.exit(1);
    }
    console.log(`🔧 Using D1_DB_ID from environment variable (CI mode)`);
  } else {
    // Check for cached D1_DB_ID first
    const CACHE_DIR = join(process.cwd(), ".wrangler", "tmp");
    const CACHE_FILE = join(CACHE_DIR, `d1_db_id_${TARGET_ENV}`);

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
  }

  if (!DB_ID) {
    if (isCI) {
      console.error(
        `❌ Error: D1_DB_ID environment variable is required in CI but not set`,
      );
    } else {
      console.error(
        `❌ Error: Could not retrieve D1_DB_ID from Infisical for '${TARGET_ENV}'`,
      );
    }
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

  copyFileSync(CONFIG_FILE, BACKUP_FILE);
  console.log(`DEBUG: Backed up ${CONFIG_FILE} to ${BACKUP_FILE}`);

  let content = readFileSync(CONFIG_FILE, "utf-8");

  // Replace {{ D1_DB_ID }} placeholder
  content = content.replace(/\{\{\s*D1_DB_ID\s*\}\}/g, DB_ID);

  // Replace {{ CLOUDFLARE_ACCOUNT_ID }} placeholder
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  if (accountId) {
    content = content.replace(
      /\{\{\s*CLOUDFLARE_ACCOUNT_ID\s*\}\}/g,
      accountId,
    );
  }

  // Ensure the build command is set to use the TypeScript script
  const buildCommandPattern = /\[build\]\s*\n\s*command\s*=\s*"[^"]*"/;
  if (buildCommandPattern.test(content)) {
    content = content.replace(buildCommandPattern, '[build]\ncommand = "bun scripts/opennext-build.ts"');
  } else {
    // If no build command section exists, add it after the compatibility_flags line
    const compatFlagsPattern = /(compatibility_flags\s*=\s*\[.*?\])/;
    if (compatFlagsPattern.test(content)) {
      content = content.replace(compatFlagsPattern, '$1\n\n[build]\ncommand = "bun scripts/opennext-build.ts"');
    }
  }

  const varNames = [
    "WORKOS_API_KEY",
    "WORKOS_CLIENT_ID",
    "WORKOS_COOKIE_PASSWORD",
    "WORKER_SESSION_SECRET",
    "ENCRYPTION_MASTER_KEY",
    "WHOOP_CLIENT_ID",
    "WHOOP_CLIENT_SECRET",
    "WHOOP_WEBHOOK_SECRET",
    "WHOOP_SYNC_RATE_LIMIT_PER_HOUR",
    "AI_GATEWAY_API_KEY",
    "AI_GATEWAY_MODEL",
    "AI_GATEWAY_PROMPT",
    "AI_GATEWAY_JOKE_MEMORY_NUMBER",
    "AI_GATEWAY_MODEL_HEALTH",
    "AI_DEBRIEF_MODEL",
    "AI_DEBRIEF_TEMPERATURE",
    "VERCEL_AI_GATEWAY_API_KEY",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "NEXT_PUBLIC_SITE_URL",
    "RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR",
    "RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR",
    "RATE_LIMIT_API_CALLS_PER_MINUTE",
    "RATE_LIMIT_ENABLED",
  ];

  const varsHeader = `  [env.${TARGET_ENV}.vars]`;
  const missingEnvVars: string[] = [];
  const blockLines = [varsHeader];
  for (const name of varNames) {
    const value = process.env[name] || "";
    if (!value) {
      missingEnvVars.push(name);
    }
    blockLines.push(`  ${name} = ${JSON.stringify(value)}`);
  }
  blockLines.push("");
  const block = blockLines.join("\n");

  // Use regex to find and replace vars section
  const varsPattern = new RegExp(
    `(  \\[env\\.${TARGET_ENV}\\.vars\\]\\n(?:  [^\\n]*\\n)*)`,
    "m",
  );
  const match = content.match(varsPattern);

  if (match) {
    content = content.replace(match[0], block);
  } else {
    console.log(
      `⚠️  Warning: Could not find existing [env.${TARGET_ENV}.vars] section, skipping vars update`,
    );
  }

  writeFileSync(CONFIG_FILE, content);
  console.log(`DEBUG: Updated ${CONFIG_FILE} with new configuration`);
  
  // Only update if content actually changed to avoid triggering unnecessary rebuilds
  const originalContent = readFileSync(BACKUP_FILE, "utf-8");
  if (originalContent === content) {
    console.log(`DEBUG: No changes detected in ${CONFIG_FILE}, restoring backup to avoid triggering rebuild`);
    copyFileSync(BACKUP_FILE, CONFIG_FILE);
  }
  console.log(`DEBUG: Updated ${CONFIG_FILE} with new configuration`);

  if (missingEnvVars.length > 0) {
    const unresolved = missingEnvVars.sort().join(", ");
    console.log(
      `⚠️  Warning: Missing env vars for env.${TARGET_ENV}.vars entries: ${unresolved}`,
    );
  }

  console.log(`✅ env.${TARGET_ENV}.database_id -> ${DB_ID}`);
  if (TARGET_ENV === "dev" && !isCI) {
    console.log("✅ env.dev.vars refreshed from current Infisical session");
  }
  console.log(`   Backup saved as ${BACKUP_FILE}`);
}

main().catch(console.error);
