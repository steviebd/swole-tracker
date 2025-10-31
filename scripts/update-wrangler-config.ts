#!/usr/bin/env bun
import { spawn } from "child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";

async function main() {
  const TARGET_ENV = process.argv[2] || "dev";

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
    `🔄 Updating ${CONFIG_FILE} for env '${TARGET_ENV}' with Infisical secrets…`,
  );

  // Prefer an already-provided D1 ID – avoids launching a nested Infisical process.
  let DB_ID = process.env.D1_DB_ID || "";

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

  copyFileSync(CONFIG_FILE, BACKUP_FILE);

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

  if (missingEnvVars.length > 0) {
    const unresolved = missingEnvVars.sort().join(", ");
    console.log(
      `⚠️  Warning: Missing env vars for env.${TARGET_ENV}.vars entries: ${unresolved}`,
    );
  }

  console.log(`✅ env.${TARGET_ENV}.database_id -> ${DB_ID}`);
  if (TARGET_ENV === "dev") {
    console.log("✅ env.dev.vars refreshed from current Infisical session");
  }
  console.log(`   Backup saved as ${BACKUP_FILE}`);
}

main().catch(console.error);
