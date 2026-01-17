#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync } from "fs";

const TARGET_ENV = process.argv[2] || "dev";
const CONFIG_FILE = "wrangler.toml";

if (!existsSync(CONFIG_FILE)) {
  console.error(`Error: ${CONFIG_FILE} not found`);
  process.exit(1);
}

const content = readFileSync(CONFIG_FILE, "utf-8");

const varNames = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
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
  "E2E_TEST_USERNAME",
  "E2E_TEST_PASSWORD",
];

const vars: Record<string, string> = {};

function extractVarsFromSection(lines: string[], startLine: number): number {
  let i = startLine;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("[")) {
      return i;
    }
    if (line.includes("=")) {
      const match = line.match(/^\s*(\w+)\s*=\s*(.+)$/);
      if (match) {
        const name = match[1];
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (varNames.includes(name)) {
          vars[name] = value;
        }
      }
    }
    i++;
  }
  return i;
}

const lines = content.split("\n");

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith(`[env.${TARGET_ENV}]`)) {
    i = extractVarsFromSection(lines, i + 1);
  } else if (line.startsWith("[[d1_databases]]")) {
    i = extractD1DbId(lines, i + 1);
  } else if (!line.startsWith("[") && line.includes("=")) {
    const match = line.match(/^\s*(\w+)\s*=\s*(.+)$/);
    if (match) {
      const name = match[1];
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (varNames.includes(name)) {
        vars[name] = value;
      }
    }
  }
}

function extractD1DbId(lines: string[], startLine: number): number {
  let i = startLine;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("[")) {
      return i;
    }
    if (line.includes("database_id")) {
      const match = line.match(/database_id\s*=\s*(.+)/);
      if (match) {
        let value = match[1].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        vars["D1_DB_ID"] = value;
      }
    }
    i++;
  }
  return i;
}

const envLines = Object.entries(vars).map(
  ([name, value]) => `${name}=${value}`,
);
const envContent = envLines.join("\n");

writeFileSync(".env.local", envContent);
console.log(
  `✅ Generated .env.local with ${Object.keys(vars).length} variables for ${TARGET_ENV} environment`,
);
