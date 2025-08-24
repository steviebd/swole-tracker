#!/usr/bin/env bun
/**
 * Simple wrangler.toml generator for consolidated variables
 * Uses environment variables from .env files or process.env
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
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
  console.log(
    "⚠️  No .env files found, using environment variables from process.env",
  );
}

const env = process.env;

/**
 * Reads existing wrangler.toml file and extracts existing variables
 */
function readExistingWranglerConfig() {
  const wranglerPath = join(projectRoot, "wrangler.toml");

  if (!existsSync(wranglerPath)) {
    return { existingVars: {}, existingSecrets: [] };
  }

  try {
    const content = readFileSync(wranglerPath, "utf8");
    const existingVars: Record<string, string> = {};
    const existingSecrets: string[] = [];

    // Simple TOML parser for [vars] and secrets sections
    const lines = content.split("\n");
    let inVarsSection = false;
    let inSecretsSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === "[vars]") {
        inVarsSection = true;
        inSecretsSection = false;
        continue;
      }

      if (trimmed.startsWith("[env.") && trimmed.includes(".vars]")) {
        inVarsSection = true;
        inSecretsSection = false;
        continue;
      }

      if (trimmed.includes("# Runtime Secrets")) {
        inSecretsSection = true;
        inVarsSection = false;
        continue;
      }

      if (trimmed.startsWith("[") && trimmed !== "[vars]") {
        inVarsSection = false;
        inSecretsSection = false;
      }

      if (inVarsSection && trimmed.includes("=") && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const varName = key.trim();
          const varValue = valueParts
            .join("=")
            .trim()
            .replace(/^["']|["']$/g, "");
          existingVars[varName] = varValue;
        }
      }

      if (
        inSecretsSection &&
        trimmed.startsWith("#") &&
        trimmed.includes("=")
      ) {
        const commentMatch = trimmed.match(/^#\s*(\w+)\s*=/);
        if (commentMatch) {
          existingSecrets.push(commentMatch[1]);
        }
      }
    }

    return { existingVars, existingSecrets };
  } catch (error) {
    console.log(
      "⚠️  Could not read existing wrangler.toml, will create new one",
    );
    return { existingVars: {}, existingSecrets: [] };
  }
}

/**
 * Categorizes environment variables into build-time vars and runtime secrets
 */
function categorizeEnvironmentVariables() {
  const buildTimeVars: Record<string, string> = {};
  const runtimeSecrets: string[] = [];

  // Define which variables should be build-time vs runtime
  const buildTimePatterns = [
    "NODE_ENV",
    "NEXT_PUBLIC_",
    "RATE_LIMIT_",
    "ENVIRONMENT",
    "SKIP_ENV_VALIDATION",
    "NEXT_TELEMETRY_DISABLED",
    "WHOOP_CLIENT_ID",
    "WHOOP_SYNC_RATE_LIMIT_PER_HOUR",
    "AI_GATEWAY_MODEL",
    "AI_GATEWAY_PROMPT",
    "AI_GATEWAY_JOKE_MEMORY_NUMBER",
    "AI_GATEWAY_MODEL_HEALTH",
  ];

  const runtimeSecretPatterns = [
    "API_KEY",
    "SECRET",
    "TOKEN",
    "PASSWORD",
    "DATABASE_URL",
    "WORKOS_API_KEY",
    "WHOOP_CLIENT_SECRET",
    "WHOOP_WEBHOOK_SECRET",
    "VERCEL_AI_GATEWAY_API_KEY",
    "AI_GATEWAY_API_KEY",
  ];

  // System environment variables to exclude from wrangler.toml
  const systemEnvVarsToExclude = [
    "HOME",
    "PATH",
    "USER",
    "SHELL",
    "PWD",
    "OLDPWD",
    "TERM",
    "LANG",
    "LC_",
    "ANDROID_HOME",
    "BUN_INSTALL",
    "COLORTERM",
    "COMMAND_MODE",
    "GHOSTTY_",
    "TMPDIR",
    "_",
    "VOLTA_HOME",
    "JAVA_HOME",
    "EDITOR",
    "PAGER",
    "SSH_",
    "XDG_",
    "DISPLAY",
    "SESSION_MANAGER",
  ];

  Object.entries(env).forEach(([key, value]) => {
    if (!value) return;

    // Skip system environment variables
    const isSystemVar = systemEnvVarsToExclude.some(
      (pattern) => key.startsWith(pattern) || key === pattern,
    );

    if (isSystemVar) {
      return;
    }

    // Check if it's a build-time variable
    const isBuildTime = buildTimePatterns.some(
      (pattern) => key.startsWith(pattern) || key === pattern,
    );

    // Check if it's a runtime secret
    const isRuntimeSecret = runtimeSecretPatterns.some(
      (pattern) => key.includes(pattern) || key.endsWith(pattern),
    );

    if (isBuildTime) {
      buildTimeVars[key] = value;
    } else if (isRuntimeSecret) {
      runtimeSecrets.push(key);
    }
  });

  return { buildTimeVars, runtimeSecrets };
}

// Read existing wrangler.toml to preserve dashboard variables
const { existingVars, existingSecrets } = readExistingWranglerConfig();

// Categorize environment variables
const { buildTimeVars, runtimeSecrets } = categorizeEnvironmentVariables();

// Merge existing vars with new ones (new ones take precedence)
const mergedVars = { ...existingVars, ...buildTimeVars };

// Merge existing secrets with new ones
const allSecrets = Array.from(new Set([...existingSecrets, ...runtimeSecrets]));

console.log(
  `📊 Found ${Object.keys(buildTimeVars).length} build-time vars and ${allSecrets.length} runtime secrets`,
);
console.log(
  `⚠️  Variables and Secrets are managed via Cloudflare Dashboard - not included in wrangler.toml`,
);
console.log(
  `📝 Generated infrastructure-only config (D1, KV, routes)`,
);

const wranglerConfig = `# wrangler.toml - Generated from environment variables
# Do not commit this file; it is generated each build.
# 
# IMPORTANT: All runtime Variables and Secrets are managed via Cloudflare Dashboard
# This file only contains infrastructure configuration (D1, KV, routes)
# Do NOT add [vars] sections here as they will override Dashboard settings

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

# Variables and Secrets are managed via Cloudflare Dashboard
# Do not add [vars] sections here to avoid overriding Dashboard settings

# Staging Environment
[env.staging]
name = "swole-tracker-staging"

${
  (env.STAGING_CLOUDFLARE_DOMAIN || env.CLOUDFLARE_DOMAIN) &&
  env.CLOUDFLARE_ZONE_NAME
    ? `[[env.staging.routes]]
pattern = "${env.STAGING_CLOUDFLARE_DOMAIN || env.CLOUDFLARE_DOMAIN}/*"
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
  (env.CLOUDFLARE_RATE_LIMIT_KV_ID ||
    env.STAGING_CLOUDFLARE_RATE_LIMIT_KV_ID) &&
  (env.CLOUDFLARE_CACHE_KV_ID || env.STAGING_CLOUDFLARE_CACHE_KV_ID)
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

# Variables and Secrets for staging are managed via Cloudflare Dashboard
# Set ENVIRONMENT=staging and other variables in the Dashboard Variables section

${
  allSecrets.length > 0
    ? `# Runtime Secrets (set via Cloudflare Dashboard or wrangler secret put)
${allSecrets
  .map((key) => `# ${key} = "[REDACTED - SET VIA DASHBOARD]"`)
  .join("\n")}`
    : "# No runtime secrets configured"
}

# Production Environment
[env.production]
name = "swole-tracker-production"

${
  (env.PRODUCTION_CLOUDFLARE_DOMAIN || env.CLOUDFLARE_DOMAIN) &&
  env.CLOUDFLARE_ZONE_NAME
    ? `[[env.production.routes]]
pattern = "${env.PRODUCTION_CLOUDFLARE_DOMAIN || env.CLOUDFLARE_DOMAIN}/*"
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

# Variables and Secrets for production are managed via Cloudflare Dashboard
# Set ENVIRONMENT=production and other variables in the Dashboard Variables section

${
  allSecrets.length > 0
    ? `# Runtime Secrets (set via Cloudflare Dashboard or wrangler secret put)
${allSecrets
  .map((key) => `# ${key} = "[REDACTED - SET VIA DASHBOARD]"`)
  .join("\n")}`
    : "# No runtime secrets configured"
}

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
console.log("\n🔒 IMPORTANT: Set your Variables and Secrets in the Cloudflare Dashboard:");
console.log("   - Go to your Worker in Cloudflare Dashboard");
console.log("   - Navigate to Settings > Variables and Secrets");
console.log("   - Add your environment variables and secrets there");
console.log("   - They will persist across deployments unlike wrangler.toml [vars] sections");

// Validate required variables
const requiredVars = [
  "CLOUDFLARE_D1_DATABASE_ID",
  "CLOUDFLARE_RATE_LIMIT_KV_ID",
  "CLOUDFLARE_CACHE_KV_ID",
  "WORKOS_CLIENT_ID",
  "WORKOS_API_KEY",
];

const missing = requiredVars.filter((v) => !env[v]);

if (missing.length > 0) {
  console.log("\n⚠️  Missing environment variables:");
  missing.forEach((v) => console.log(`   - ${v}`));
  console.log(
    "\n💡 Add these to your .env.local file or set them in Cloudflare Dashboard",
  );
} else {
  console.log("\n✅ All required environment variables are configured");
}
