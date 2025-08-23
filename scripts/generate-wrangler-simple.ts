#!/usr/bin/env bun
/**
 * Simple wrangler.toml generator for consolidated variables
 */

import { writeFileSync } from "fs";
import { join, resolve } from "path";
import { config } from "dotenv";

const projectRoot = resolve(process.cwd());

console.log("🔧 Generating wrangler.toml with consolidated variables...");

// Try to load .env.local or .env
const envFiles = [".env.local", ".env"];
let envLoaded = false;

for (const envFile of envFiles) {
  const envPath = join(projectRoot, envFile);
  try {
    config({ path: envPath });
    console.log(`📄 Loaded environment from ${envFile}`);
    envLoaded = true;
    break;
  } catch (e) {
    console.log(`❌ Could not load ${envFile}`);
  }
}

if (!envLoaded) {
  console.log("⚠️  No .env files found, using environment variables from process.env");
}

const wranglerConfig = `# wrangler.toml - Generated from environment variables
# Do not commit this file; it is generated each build.

name = "swole-tracker"
main = ".open-next/worker.js"
compatibility_date = "2025-08-21"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[observability]
enabled = true
head_sampling_rate = 1

[vars]
ENVIRONMENT = "development"
WORKOS_CLIENT_ID = "${process.env.WORKOS_CLIENT_ID || ""}"

# Staging Environment
[env.staging]
name = "swole-tracker-staging"

${
  process.env.CLOUDFLARE_D1_DATABASE_ID
    ? `[[env.staging.d1_databases]]
binding = "DB"
database_name = "swole-tracker-staging"
database_id = "${process.env.CLOUDFLARE_D1_DATABASE_ID}"
migrations_dir = "drizzle"`
    : "# D1 databases configured via Cloudflare Dashboard"
}

${
  process.env.CLOUDFLARE_RATE_LIMIT_KV_ID && process.env.CLOUDFLARE_CACHE_KV_ID
    ? `[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${process.env.CLOUDFLARE_RATE_LIMIT_KV_ID}"

[[env.staging.kv_namespaces]]
binding = "CACHE_KV"
id = "${process.env.CLOUDFLARE_CACHE_KV_ID}"`
    : "# KV namespaces configured via Cloudflare Dashboard"
}

[env.staging.vars]
ENVIRONMENT = "staging"
WORKOS_CLIENT_ID = "${process.env.WORKOS_CLIENT_ID || ""}"

# Production Environment
[env.production]
name = "swole-tracker-production"

[[env.production.d1_databases]]
binding = "DB"
database_name = "swole-tracker-prod"
database_id = "${process.env.CLOUDFLARE_D1_DATABASE_ID || "prod-db-from-dashboard"}"
migrations_dir = "drizzle"

[[env.production.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${process.env.CLOUDFLARE_RATE_LIMIT_KV_ID || "prod-rate-limit-from-dashboard"}"

[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "${process.env.CLOUDFLARE_CACHE_KV_ID || "prod-cache-from-dashboard"}"

[env.production.vars]
ENVIRONMENT = "production"
WORKOS_CLIENT_ID = "${process.env.WORKOS_CLIENT_ID || "workos-from-dashboard"}"

# Local Development (default/root)
[[d1_databases]]
binding = "DB"
database_name = "swole-tracker-dev"
database_id = "${process.env.CLOUDFLARE_D1_DATABASE_ID || "undefined"}"
migrations_dir = "drizzle"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${process.env.CLOUDFLARE_RATE_LIMIT_KV_ID || "undefined"}"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "${process.env.CLOUDFLARE_CACHE_KV_ID || "undefined"}"
`;

const wranglerPath = join(projectRoot, "wrangler.toml");
writeFileSync(wranglerPath, wranglerConfig);

console.log("✅ Generated wrangler.toml successfully");
console.log("📁 Location:", wranglerPath);

// Validate required variables
const requiredVars = [
  "CLOUDFLARE_D1_DATABASE_ID",
  "CLOUDFLARE_RATE_LIMIT_KV_ID", 
  "CLOUDFLARE_CACHE_KV_ID",
  "WORKOS_CLIENT_ID"
];

const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.log("\n⚠️  Missing environment variables:");
  missing.forEach(v => console.log(`   - ${v}`));
  console.log("\n💡 Add these to your .env.local file");
} else {
  console.log("\n✅ All required environment variables are configured");
}
