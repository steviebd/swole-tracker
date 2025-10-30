#!/usr/bin/env bun
import { spawn } from "child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { join } from "path";

const TARGET_ENV = process.argv[2] || "dev";

const validEnvs = ["dev", "staging", "production", "preview"];
if (!validEnvs.includes(TARGET_ENV)) {
  console.error(`❌ Error: Unknown environment '${TARGET_ENV}'. Use one of ${validEnvs.join(", ")}.`);
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
    console.error(`❌ Error: neither ${CONFIG_FILE} nor ${TEMPLATE_FILE} found`);
    process.exit(1);
  }
}

console.log(`🔄 Updating ${CONFIG_FILE} for env '${TARGET_ENV}' with Infisical secrets…`);

// Prefer an already-provided D1 ID – avoids launching a nested Infisical process.
let DB_ID = process.env.D1_DB_ID || "";

if (!DB_ID) {
  DB_ID = await new Promise<string>((resolve) => {
    const proc = spawn("infisical", ["run", "--env", TARGET_ENV, "--command", "echo $D1_DB_ID"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    proc.stdout.on("data", (data) => (output += data.toString()));
    proc.on("close", (code) => {
      resolve(code === 0 ? output.trim() : "");
    });
  });
}

if (!DB_ID) {
  console.error(`❌ Error: Could not retrieve D1_DB_ID from Infisical for '${TARGET_ENV}'`);
  process.exit(1);
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
if (!uuidRegex.test(DB_ID)) {
  console.error(`❌ Error: D1_DB_ID from Infisical doesn't look valid: ${DB_ID}`);
  process.exit(1);
}

copyFileSync(CONFIG_FILE, BACKUP_FILE);

let content = readFileSync(CONFIG_FILE, "utf-8");

const placeholderPattern = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;
const missingPlaceholders = new Set<string>();

content = content.replace(placeholderPattern, (match, key) => {
  const value = process.env[key];
  if (value === undefined) {
    missingPlaceholders.add(key);
    return match;
  }
  return value;
});

const dbPattern = new RegExp(`(\\[\\[env\\.${TARGET_ENV}\\.d1_databases\\]\\][^\\[]*?database_id\\s*=\\s*")([^"]*)(")`, "s");
if (!dbPattern.test(content)) {
  console.error(`❌ Could not locate env.${TARGET_ENV} D1 configuration in ${CONFIG_FILE}`);
  process.exit(1);
}

content = content.replace(dbPattern, (match, start, oldId, end) => `${start}${DB_ID}${end}`);

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

// Use regex to find and replace the vars section
const varsPattern = new RegExp(`(  \\[env\\.${TARGET_ENV}\\.vars\\]\\n(?:  [^\\n]*\\n)*)`, "m");
const match = content.match(varsPattern);

if (match) {
  content = content.replace(match[0], block);
} else {
  console.log(`⚠️  Warning: Could not find existing [env.${TARGET_ENV}.vars] section, skipping vars update`);
  // Don't add a new section
  const envHeader = `[env.${TARGET_ENV}]`;
  const envHeaderIndex = content.indexOf(envHeader);

  if (envHeaderIndex === -1) {
    console.error(`❌ Could not locate env.${TARGET_ENV} block in ${CONFIG_FILE}`);
    process.exit(1);
  }

  const sameEnvDb = content.indexOf(`  [[env.${TARGET_ENV}.`, envHeaderIndex);
  const nextEnvSection = content.indexOf("\n[env.", envHeaderIndex + envHeader.length);

  const candidates = [sameEnvDb, nextEnvSection].filter(pos => pos !== -1);
  const anchor = candidates.length > 0 ? Math.min(...candidates) : content.length;

  const before = content.slice(0, anchor).trimEnd();
  const after = content.slice(anchor).trimStart();
  content = `${before}\n\n${block}${after}`;
}

writeFileSync(CONFIG_FILE, content);

if (missingPlaceholders.size > 0) {
  const unresolved = Array.from(missingPlaceholders).sort().join(", ");
  console.log(`⚠️  Warning: No environment values found for placeholders: ${unresolved}`);
}

if (missingEnvVars.length > 0) {
  const unresolved = missingEnvVars.sort().join(", ");
  console.log(`⚠️  Warning: Missing env vars for env.${TARGET_ENV}.vars entries: ${unresolved}`);
}

console.log(`✅ env.${TARGET_ENV}.database_id -> ${DB_ID}`);
if (TARGET_ENV === "dev") {
  console.log("✅ env.dev.vars refreshed from current Infisical session");
}
console.log(`   Backup saved as ${BACKUP_FILE}`);