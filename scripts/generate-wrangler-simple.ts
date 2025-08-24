#!/usr/bin/env bun
/**
 * Simple wrangler.toml generator for consolidated variables
 * Uses Infisical CLI to inject environment variables
 */

import { writeFileSync } from "fs";
import { join, resolve } from "path";
import { config } from "dotenv";

const projectRoot = resolve(process.cwd());

console.log("🔧 Generating wrangler.toml with consolidated variables...");

// Try to load .env.local or .env as fallback
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

const env = process.env;

/**
 * Categorizes environment variables into build-time vars and runtime secrets
 */
function categorizeEnvironmentVariables() {
  const buildTimeVars: Record<string, string> = {};
  const runtimeSecrets: string[] = [];

  // Define which variables should be build-time vs runtime
  const buildTimePatterns = [
    'NODE_ENV',
    'NEXT_PUBLIC_',
    'RATE_LIMIT_',
    'ENVIRONMENT',
    'SKIP_ENV_VALIDATION',
    'NEXT_TELEMETRY_DISABLED',
    'WHOOP_CLIENT_ID',
    'WHOOP_SYNC_RATE_LIMIT_PER_HOUR',
    'AI_GATEWAY_MODEL',
    'AI_GATEWAY_PROMPT',
    'AI_GATEWAY_JOKE_MEMORY_NUMBER',
    'AI_GATEWAY_MODEL_HEALTH'
  ];

  const runtimeSecretPatterns = [
    'API_KEY',
    'SECRET',
    'TOKEN',
    'PASSWORD',
    'DATABASE_URL',
    'WORKOS_API_KEY',
    'WHOOP_CLIENT_SECRET',
    'WHOOP_WEBHOOK_SECRET',
    'VERCEL_AI_GATEWAY_API_KEY',
    'AI_GATEWAY_API_KEY'
  ];

  // System environment variables to exclude from wrangler.toml
  const systemEnvVarsToExclude = [
    'HOME', 'PATH', 'USER', 'SHELL', 'PWD', 'OLDPWD', 'TERM', 'LANG', 'LC_',
    'ANDROID_HOME', 'BUN_INSTALL', 'COLORTERM', 'COMMAND_MODE', 'GHOSTTY_',
    'TMPDIR', '_', 'VOLTA_HOME', 'JAVA_HOME', 'EDITOR', 'PAGER', 'SSH_',
    'XDG_', 'DISPLAY', 'SESSION_MANAGER'
  ];

  Object.entries(env).forEach(([key, value]) => {
    if (!value) return;

    // Skip system environment variables
    const isSystemVar = systemEnvVarsToExclude.some(pattern => 
      key.startsWith(pattern) || key === pattern
    );

    if (isSystemVar) {
      return;
    }

    // Check if it's a build-time variable
    const isBuildTime = buildTimePatterns.some(pattern => 
      key.startsWith(pattern) || key === pattern
    );

    // Check if it's a runtime secret
    const isRuntimeSecret = runtimeSecretPatterns.some(pattern => 
      key.includes(pattern) || key.endsWith(pattern)
    );

    if (isBuildTime) {
      buildTimeVars[key] = value;
    } else if (isRuntimeSecret) {
      runtimeSecrets.push(key);
    }
  });

  return { buildTimeVars, runtimeSecrets };
}

// Categorize environment variables
const { buildTimeVars, runtimeSecrets } = categorizeEnvironmentVariables();

console.log(`📊 Categorized ${Object.keys(buildTimeVars).length} build-time vars and ${runtimeSecrets.length} runtime secrets`);

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
${Object.entries(buildTimeVars)
  .filter(([key]) => key !== 'ENVIRONMENT')
  .map(([key, value]) => `${key} = "${value}"`)
  .join('\n')}

# Staging Environment
[env.staging]
name = "swole-tracker-staging"

${
  env.CLOUDFLARE_DOMAIN && env.CLOUDFLARE_ZONE_NAME
    ? `[env.staging.routes]
pattern = "${env.CLOUDFLARE_DOMAIN}"
zone_name = "${env.CLOUDFLARE_ZONE_NAME}"`
    : "# No staging route configured in environment variables"
}

${
  env.CLOUDFLARE_D1_DATABASE_ID || env.STAGING_CLOUDFLARE_D1_DATABASE_ID
    ? `[[env.staging.d1_databases]]
binding = "DB"
database_name = "swole-tracker-staging"
database_id = "${env.STAGING_CLOUDFLARE_D1_DATABASE_ID || env.CLOUDFLARE_D1_DATABASE_ID}"
migrations_dir = "drizzle"
experimental_remote = true`
    : "# D1 databases configured via Cloudflare Dashboard"
}

${
  (env.CLOUDFLARE_RATE_LIMIT_KV_ID || env.STAGING_CLOUDFLARE_RATE_LIMIT_KV_ID) && (env.CLOUDFLARE_CACHE_KV_ID || env.STAGING_CLOUDFLARE_CACHE_KV_ID)
    ? `[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${env.STAGING_CLOUDFLARE_RATE_LIMIT_KV_ID || env.CLOUDFLARE_RATE_LIMIT_KV_ID}"
experimental_remote = true

[[env.staging.kv_namespaces]]
binding = "CACHE_KV"
id = "${env.STAGING_CLOUDFLARE_CACHE_KV_ID || env.CLOUDFLARE_CACHE_KV_ID}"
experimental_remote = true`
    : "# KV namespaces configured via Cloudflare Dashboard"
}

[env.staging.vars]
ENVIRONMENT = "staging"
${Object.entries(buildTimeVars)
  .filter(([key]) => key !== 'ENVIRONMENT')
  .map(([key, value]) => `${key} = "${value}"`)
  .join('\n')}

${runtimeSecrets.length > 0 
  ? `# Runtime Secrets (set via Cloudflare Dashboard or wrangler secret put)
${runtimeSecrets
  .map(key => `# ${key} = "[REDACTED - SET VIA DASHBOARD]"`)
  .join('\n')}`
  : '# No runtime secrets configured'}

# Production Environment
[env.production]
name = "swole-tracker-production"

${
  env.CLOUDFLARE_DOMAIN && env.CLOUDFLARE_ZONE_NAME
    ? `[env.production.routes]
pattern = "${env.CLOUDFLARE_DOMAIN}"
zone_name = "${env.CLOUDFLARE_ZONE_NAME}"`
    : "# No production route configured in environment variables"
}

[[env.production.d1_databases]]
binding = "DB"
database_name = "swole-tracker-prod"
database_id = "${env.PRODUCTION_CLOUDFLARE_D1_DATABASE_ID || env.CLOUDFLARE_D1_DATABASE_ID || "prod-db-from-dashboard"}"
migrations_dir = "drizzle"
experimental_remote = true

[[env.production.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${env.PRODUCTION_CLOUDFLARE_RATE_LIMIT_KV_ID || env.CLOUDFLARE_RATE_LIMIT_KV_ID || "prod-rate-limit-from-dashboard"}"
experimental_remote = true

[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "${env.PRODUCTION_CLOUDFLARE_CACHE_KV_ID || env.CLOUDFLARE_CACHE_KV_ID || "prod-cache-from-dashboard"}"
experimental_remote = true

[env.production.vars]
ENVIRONMENT = "production"
${Object.entries(buildTimeVars)
  .filter(([key]) => key !== 'ENVIRONMENT')
  .map(([key, value]) => `${key} = "${value}"`)
  .join('\n')}

${runtimeSecrets.length > 0 
  ? `# Runtime Secrets (set via Cloudflare Dashboard or wrangler secret put)
${runtimeSecrets
  .map(key => `# ${key} = "[REDACTED - SET VIA DASHBOARD]"`)
  .join('\n')}`
  : '# No runtime secrets configured'}

# Local Development (default/root)
[[d1_databases]]
binding = "DB"
database_name = "swole-tracker-dev"
database_id = "${env.CLOUDFLARE_D1_DATABASE_ID || "undefined"}"
preview_database_id = "${env.CLOUDFLARE_D1_DATABASE_ID || "undefined"}"
migrations_dir = "drizzle"
experimental_remote = true

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${env.CLOUDFLARE_RATE_LIMIT_KV_ID || "undefined"}"
experimental_remote = true

[[kv_namespaces]]
binding = "CACHE_KV"
id = "${env.CLOUDFLARE_CACHE_KV_ID || "undefined"}"
experimental_remote = true
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
  "WORKOS_CLIENT_ID",
  "WORKOS_API_KEY"
];

const missing = requiredVars.filter(v => !env[v]);

if (missing.length > 0) {
  console.log("\n⚠️  Missing environment variables:");
  missing.forEach(v => console.log(`   - ${v}`));
  console.log("\n💡 Add these to your .env.local file or Infisical");
} else {
  console.log("\n✅ All required environment variables are configured");
}