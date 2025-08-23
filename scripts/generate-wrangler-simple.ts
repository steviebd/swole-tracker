#!/usr/bin/env bun
/**
 * Simple wrangler.toml generator for consolidated variables
 * Fetches secrets from Infisical using machine identity authentication
 */

import { writeFileSync } from "fs";
import { join, resolve } from "path";
import { config } from "dotenv";
import { InfisicalSDK } from "@infisical/sdk";

const projectRoot = resolve(process.cwd());

console.log("🔧 Generating wrangler.toml with consolidated variables...");

/**
 * Fetch secrets from Infisical using machine identity
 */
async function fetchInfisicalSecrets(): Promise<Record<string, string>> {
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;

  console.log("🔍 Checking Infisical credentials...");
  console.log(`   INFISICAL_CLIENT_ID: ${clientId ? '✅ Found' : '❌ Missing'}`);
  console.log(`   INFISICAL_SECRET: ${clientSecret ? '✅ Found' : '❌ Missing'}`);
  console.log(`   INFISICAL_PROJECT_ID: ${projectId ? '✅ Found' : '❌ Missing'}`);

  if (!clientId || !clientSecret) {
    console.log("⚠️  Infisical machine identity credentials not found, falling back to local .env files");
    console.log("💡 Add INFISICAL_CLIENT_ID and INFISICAL_SECRET to your .env.local or environment");
    return {};
  }

  if (!projectId) {
    console.log("⚠️  INFISICAL_PROJECT_ID not found - this may be required depending on your Infisical setup");
  }

  try {
    console.log("🔐 Authenticating with Infisical...");
    
    const client = new InfisicalSDK();
    
    await client.auth().universalAuth.login({
      clientId,
      clientSecret,
    });
    
    console.log("✅ Successfully authenticated with Infisical");
    
    // If no project ID is provided, we need to handle this case
    if (!projectId) {
      console.log("⚠️  Cannot fetch secrets without INFISICAL_PROJECT_ID");
      console.log("💡 Please add INFISICAL_PROJECT_ID to your environment variables");
      return {};
    }
    
    // Fetch secrets from different environments
    const environments = ["dev", "staging", "production"];
    const secrets: Record<string, string> = {};
    
    for (const env of environments) {
      try {
        console.log(`📦 Fetching secrets for environment: ${env}`);
        const envSecrets = await client.secrets().listSecrets({
          environment: env,
          projectId,
        });
        
        // Add environment prefix to avoid conflicts
        envSecrets.secrets.forEach((secret) => {
          const key = env === "dev" ? secret.secretKey : `${env.toUpperCase()}_${secret.secretKey}`;
          secrets[key] = secret.secretValue;
        });
        
        console.log(`✅ Fetched ${envSecrets.secrets.length} secrets for ${env}`);
      } catch (error) {
        console.log(`⚠️  Could not fetch secrets for ${env}:`, error instanceof Error ? error.message : error);
      }
    }
    
    return secrets;
  } catch (error) {
    console.log("❌ Failed to fetch secrets from Infisical:", error instanceof Error ? error.message : error);
    console.log("🔍 Error details:", error);
    return {};
  }
}

// Load local environment variables as fallback
const envFiles = [".env.local", ".env"];
let envLoaded = false;

for (const envFile of envFiles) {
  const envPath = join(projectRoot, envFile);
  try {
    config({ path: envPath });
    console.log(`📄 Loaded local environment from ${envFile}`);
    envLoaded = true;
    break;
  } catch (e) {
    console.log(`❌ Could not load ${envFile}`);
  }
}

// Fetch secrets from Infisical
const infisicalSecrets = await fetchInfisicalSecrets();

// Merge environment variables (Infisical secrets take precedence)
const env = { ...process.env, ...infisicalSecrets };

console.log(`🔑 Using ${Object.keys(infisicalSecrets).length} secrets from Infisical + ${envLoaded ? 'local' : 'system'} environment variables`);

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
WORKOS_CLIENT_ID = "${env.WORKOS_CLIENT_ID || ""}"
WORKOS_API_KEY = "${env.WORKOS_API_KEY || ""}"

# Staging Environment
[env.staging]
name = "swole-tracker-staging"

${
  env.CLOUDFLARE_STAGING_DOMAIN && env.CLOUDFLARE_ZONE_NAME
    ? `[env.staging.routes]
pattern = "${env.CLOUDFLARE_STAGING_DOMAIN}"
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
WORKOS_CLIENT_ID = "${env.STAGING_WORKOS_CLIENT_ID || env.WORKOS_CLIENT_ID || ""}"
WORKOS_API_KEY = "${env.STAGING_WORKOS_API_KEY || env.WORKOS_API_KEY || ""}"

# Production Environment
[env.production]
name = "swole-tracker-production"

${
  env.CLOUDFLARE_PROD_DOMAIN && env.CLOUDFLARE_ZONE_NAME
    ? `[env.production.routes]
pattern = "${env.CLOUDFLARE_PROD_DOMAIN}"
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
WORKOS_CLIENT_ID = "${env.PRODUCTION_WORKOS_CLIENT_ID || env.WORKOS_CLIENT_ID || "workos-from-dashboard"}"
WORKOS_API_KEY = "${env.PRODUCTION_WORKOS_API_KEY || env.WORKOS_API_KEY || "workos-api-from-dashboard"}"

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
