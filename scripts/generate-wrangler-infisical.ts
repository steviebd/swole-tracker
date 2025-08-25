#!/usr/bin/env bun
/**
 * generate-wrangler-infisical.ts
 *
 * Generates a single wrangler.toml for the target environment using Infisical.
 * Supports dev, staging, and production environments with environment-specific configuration.
 *
 * Features:
 *  - Pulls all configuration from Infisical based on INFISICAL_ENVIRONMENT
 *  - Generates single environment-specific wrangler.toml (not multi-environment)
 *  - Supports domain/route configuration from Infisical
 *  - Categorizes variables into build-time vars and runtime secrets
 *
 * Required for Infisical:
 *  - INFISICAL_CLIENT_ID
 *  - INFISICAL_SECRET
 *  - INFISICAL_PROJECT_ID (workspaceId)
 *  - INFISICAL_ENVIRONMENT (dev, staging, production)
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { config } from "dotenv";

const projectRoot = resolve(process.cwd());

console.log("🔧 Generating wrangler.toml with consolidated variables...");
console.log("🔐 Infisical integration enabled when credentials are present.");

/**
 * Load .env files to pick up Infisical credentials and other config
 * Prefers .env.local, falls back to .env
 */
const envFiles = [".env.local", ".env"];
let envLoaded = false;
for (const envFile of envFiles) {
  const envPath = join(projectRoot, envFile);
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log(`📄 Loaded environment from ${envFile}`);
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  console.log(
    "⚠️  No .env files found, using environment variables from process.env",
  );
}

const INFISICAL_API_URL =
  process.env.INFISICAL_API_URL || "https://app.infisical.com";

async function getInfisicalToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const url = `${INFISICAL_API_URL}/api/v1/auth/universal-auth/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Infisical login failed: ${res.status} ${res.statusText} - ${body}`,
    );
  }
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) {
    throw new Error("Infisical login response missing accessToken");
  }
  return data.accessToken;
}

async function getInfisicalSecrets(options: {
  token: string;
  workspaceId: string;
  environment: string;
  secretPath?: string;
}): Promise<Record<string, string>> {
  const { token, workspaceId, environment } = options;
  const secretPath =
    options.secretPath !== undefined ? options.secretPath : "/";
  const params = new URLSearchParams({
    environment,
    workspaceId,
    secretPath,
  });
  const url = `${INFISICAL_API_URL}/api/v3/secrets/raw?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Infisical API Error:", body);
    throw new Error(
      `Failed to get Infisical secrets: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as {
    secrets?: Array<{ secretKey: string; secretValue: string }>;
  };
  const secrets = data.secrets || [];
  const map: Record<string, string> = {};
  for (const s of secrets) {
    map[s.secretKey] = s.secretValue;
  }
  return map;
}

/**
 * Pull from Infisical and inject into process.env using fill-only precedence
 * (Do not override any existing .env/process.env values.)
 */
async function pullInfisicalAndInject(): Promise<{
  fetched: Record<string, string>;
  envName: string | null;
}> {
  const {
    INFISICAL_CLIENT_ID,
    INFISICAL_SECRET,
    INFISICAL_PROJECT_ID,
    ENVIRONMENT,
  } = process.env;

  // Support correct key and common typo
  const INFISICAL_ENVIRONMENT =
    process.env.INFISICAL_ENVIRONMENT || process.env.INFISICAL_ENVIROMENT;

  if (!INFISICAL_CLIENT_ID || !INFISICAL_SECRET || !INFISICAL_PROJECT_ID) {
    console.log(
      "ℹ️  Infisical credentials not fully set; skipping Infisical fetch.",
    );
    return { fetched: {}, envName: null };
  }

  // Use explicit INFISICAL_ENVIRONMENT or fallback with validation
  const normalizedEnv = INFISICAL_ENVIRONMENT || (() => {
    const e = (ENVIRONMENT || "dev").toLowerCase();
    if (e === "production" || e === "prod") return "production";
    if (e === "staging") return "staging"; 
    return "dev"; // default to dev
  })();
  
  // Validate environment
  if (!['dev', 'staging', 'production'].includes(normalizedEnv)) {
    throw new Error(`Invalid INFISICAL_ENVIRONMENT: ${normalizedEnv}. Must be 'dev', 'staging', or 'production'`);
  }

  const secretPath = process.env.INFISICAL_SECRET_PATH || "/";

  console.log(
    `🔗 Fetching Infisical secrets for environment="${normalizedEnv}" ` +
      `path="${secretPath}"`,
  );

  const token = await getInfisicalToken(
    INFISICAL_CLIENT_ID,
    INFISICAL_SECRET,
  );

  const fetched = await getInfisicalSecrets({
    token,
    workspaceId: INFISICAL_PROJECT_ID,
    environment: normalizedEnv,
    secretPath,
  });

  const keys = Object.keys(fetched);
  console.log(`✅ Pulled ${keys.length} secrets from Infisical.`);

  // Fill-only precedence: only set if not present
  for (const [k, v] of Object.entries(fetched)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }

  return { fetched, envName: normalizedEnv };
}

/**
 * Reads existing wrangler.toml to collect existing secret names (comments)
 */
function readExistingWranglerConfig(): {
  existingVars: Record<string, string>;
  existingSecrets: string[];
} {
  const wranglerPath = join(projectRoot, "wrangler.toml");
  if (!existsSync(wranglerPath)) {
    return { existingVars: {}, existingSecrets: [] };
  }
  try {
    const content = readFileSync(wranglerPath, "utf8");
    const existingVars: Record<string, string> = {};
    const existingSecrets: string[] = [];

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

      if (inSecretsSection && trimmed.startsWith("#") && trimmed.includes("=")) {
        const commentMatch = trimmed.match(/^#\s*(\w+)\s*=/);
        if (commentMatch) {
          existingSecrets.push(commentMatch[1]);
        }
      }
    }

    return { existingVars, existingSecrets };
  } catch {
    console.log(
      "⚠️  Could not read existing wrangler.toml, will create new one",
    );
    return { existingVars: {}, existingSecrets: [] };
  }
}

/**
 * Categorize environment variables into build-time vars and runtime secrets
 */
function categorizeEnvironmentVariables(
  envObj: Record<string, string | undefined>,
  infisicalKeys: Set<string>,
) {
  const buildTimeVars: Record<string, string> = {};
  const runtimeSecretNames = new Set<string>();

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
    // Cloudflare infrastructure IDs (can be in [vars] for dev, but secrets for prod)
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_D1_DATABASE_ID",
    "CLOUDFLARE_RATE_LIMIT_KV_ID", 
    "CLOUDFLARE_CACHE_KV_ID",
    "STAGING_CLOUDFLARE_D1_DATABASE_ID",
    "STAGING_CLOUDFLARE_RATE_LIMIT_KV_ID",
    "STAGING_CLOUDFLARE_CACHE_KV_ID",
    "PRODUCTION_CLOUDFLARE_D1_DATABASE_ID", 
    "PRODUCTION_CLOUDFLARE_RATE_LIMIT_KV_ID",
    "PRODUCTION_CLOUDFLARE_CACHE_KV_ID",
    // Domain configuration
    "CLOUDFLARE_ZONE_NAME",
    "STAGING_CLOUDFLARE_DOMAIN",
    "PRODUCTION_CLOUDFLARE_DOMAIN",
    "CLOUDFLARE_DOMAIN",
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
    "CLOUDFLARE_API_TOKEN", // Wrangler CLI token - should be secret
  ];

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

  const isSystemVar = (key: string) =>
    systemEnvVarsToExclude.some(
      (pattern) => key.startsWith(pattern) || key === pattern,
    );

  const isBuildTimeKey = (key: string) =>
    buildTimePatterns.some(
      (pattern) => key === pattern || key.startsWith(pattern),
    );

  const matchesSecretPattern = (key: string) =>
    runtimeSecretPatterns.some(
      (pattern) => key.endsWith(pattern) || key.includes(pattern),
    );

  for (const [key, value] of Object.entries(envObj)) {
    if (!value) continue;
    if (isSystemVar(key)) continue;

    const buildTime = isBuildTimeKey(key);

    if (buildTime) {
      buildTimeVars[key] = value;
      continue;
    }

    if (matchesSecretPattern(key) || infisicalKeys.has(key)) {
      runtimeSecretNames.add(key);
    }
  }

  return {
    buildTimeVars,
    runtimeSecrets: Array.from(runtimeSecretNames),
  };
}

async function main() {
  try {
    // 1) Pull Infisical and inject into process.env (fill-only)
    const { fetched: infisicalSecrets, envName } =
      await pullInfisicalAndInject();
    if (envName) {
      console.log(
        `🔁 Infisical merge strategy: fill-only (no overrides). Keys merged: ${
          Object.keys(infisicalSecrets).length
        }`,
      );
    }

    // 2) Categorize env after Infisical injection  
    const env = process.env;
    const infisicalKeySet = new Set(Object.keys(infisicalSecrets));
    const { buildTimeVars, runtimeSecrets } = categorizeEnvironmentVariables(
      env,
      infisicalKeySet,
    );

    // Create runtime variables from environment (includes Infisical secrets)
    const runtimeVars: Record<string, string> = {};
    for (const key of runtimeSecrets) {
      if (env[key]) {
        runtimeVars[key] = env[key];
      }
    }
    
    // Combine all variables for the [vars] section
    const allVars = { ...buildTimeVars, ...runtimeVars };
    
    console.log(
      `📊 Found ${Object.keys(buildTimeVars).length} build-time vars and ` +
        `${runtimeSecrets.length} runtime secrets`,
    );
    console.log(`📝 Generating single wrangler.toml for environment: ${envName || 'local'}`);

    // 4) Generate environment-specific wrangler.toml (single config approach)
    // Use the actual INFISICAL_ENVIRONMENT for targeting, not the ENVIRONMENT variable from Infisical
    const INFISICAL_ENVIRONMENT = process.env.INFISICAL_ENVIRONMENT || process.env.INFISICAL_ENVIROMENT;
    const targetEnv = INFISICAL_ENVIRONMENT || 'dev';
    const workerName = getWorkerName(targetEnv);
    const databaseName = getDatabaseName(targetEnv);
    
    let wranglerConfig = `# wrangler.toml - Generated for ${targetEnv} environment
# Do not commit this file; it is generated each build.
# Source: Infisical environment '${targetEnv}'

name = "${workerName}"
main = ".open-next/worker.js"
compatibility_date = "2025-08-21"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[observability]
enabled = true
head_sampling_rate = 1

# Variables (build-time + runtime from Infisical)
[vars]
${Object.entries(allVars)
  .map(([key, value]) => `${key} = "${value.replace(/"/g, '\\"')}"`)
  .join('\n')}
`;

    // Add routes for staging/production
    if (targetEnv !== 'dev') {
      const domain = getDomain(env, targetEnv);
      const zoneName = env.CLOUDFLARE_ZONE_NAME;
      
      if (domain && zoneName) {
        wranglerConfig += `
# Custom Domain Route
[[routes]]
pattern = "${domain}/*"
zone_name = "${zoneName}"
`;
      }
    }

    // Add D1 database configuration
    const databaseId = getDatabaseId(env, targetEnv);
    if (databaseId) {
      wranglerConfig += `
# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "${databaseName}"
database_id = "${databaseId}"
migrations_dir = "drizzle"
experimental_remote = true
`;
    }

    // Add KV namespaces
    const rateLimitKvId = getKvId(env, targetEnv, 'RATE_LIMIT');
    const cacheKvId = getKvId(env, targetEnv, 'CACHE');
    
    if (rateLimitKvId) {
      wranglerConfig += `
# Rate Limit KV
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${rateLimitKvId}"
experimental_remote = true
`;
    }
    
    if (cacheKvId) {
      wranglerConfig += `
# Cache KV
[[kv_namespaces]]
binding = "CACHE_KV"
id = "${cacheKvId}"
experimental_remote = true
`;
    }

    const wranglerPath = join(projectRoot, "wrangler.toml");
    writeFileSync(wranglerPath, wranglerConfig);

    console.log("✅ Generated wrangler.toml successfully");
    console.log("📁 Location:", wranglerPath);
    console.log(
      "\n🔒 IMPORTANT: Set your Variables and Secrets in the Cloudflare Dashboard:",
    );
    console.log("   - Go to your Worker in Cloudflare Dashboard");
    console.log("   - Navigate to Settings > Variables and Secrets");
    console.log("   - Add your environment variables and secrets there");
    console.log(
      "   - They will persist across deployments unlike wrangler.toml [vars] sections",
    );

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
        "\n💡 Add these to your .env.local, set via Infisical, or in Cloudflare Dashboard",
      );
    } else {
      console.log("\n✅ All required environment variables are configured");
    }

    if (Object.keys(infisicalSecrets).length > 0) {
      console.log(
        `\n🔎 Infisical fetched keys (${
          Object.keys(infisicalSecrets).length
        }):`,
      );
      console.log(
        "   " + Object.keys(infisicalSecrets).sort().join(", "),
      );
    }
  } catch (error) {
    console.error("❌ Error generating wrangler.toml:", error);
    process.exit(1);
  }
}

/**
 * Helper functions for environment-specific configuration
 */
function getWorkerName(env: string): string {
  switch (env) {
    case 'staging': return 'swole-tracker-staging';
    case 'production': return 'swole-tracker-production';
    default: return 'swole-tracker';
  }
}

function getDatabaseName(env: string): string {
  switch (env) {
    case 'staging': return 'swole-tracker-staging';
    case 'production': return 'swole-tracker-prod';
    default: return 'swole-tracker-dev';
  }
}

function getDomain(envVars: Record<string, string | undefined>, targetEnv: string): string | null {
  switch (targetEnv) {
    case 'staging':
      return envVars.STAGING_CLOUDFLARE_DOMAIN || envVars.CLOUDFLARE_DOMAIN || null;
    case 'production':
      return envVars.PRODUCTION_CLOUDFLARE_DOMAIN || envVars.CLOUDFLARE_DOMAIN || null;
    default:
      return null;
  }
}

function getDatabaseId(envVars: Record<string, string | undefined>, targetEnv: string): string | null {
  switch (targetEnv) {
    case 'staging':
      return envVars.STAGING_CLOUDFLARE_D1_DATABASE_ID || envVars.CLOUDFLARE_D1_DATABASE_ID || null;
    case 'production':
      return envVars.PRODUCTION_CLOUDFLARE_D1_DATABASE_ID || envVars.CLOUDFLARE_D1_DATABASE_ID || null;
    default:
      return envVars.CLOUDFLARE_D1_DATABASE_ID || null;
  }
}

function getKvId(envVars: Record<string, string | undefined>, targetEnv: string, kvType: 'RATE_LIMIT' | 'CACHE'): string | null {
  const suffix = kvType === 'RATE_LIMIT' ? 'RATE_LIMIT_KV_ID' : 'CACHE_KV_ID';
  
  switch (targetEnv) {
    case 'staging':
      return envVars[`STAGING_CLOUDFLARE_${suffix}`] || envVars[`CLOUDFLARE_${suffix}`] || null;
    case 'production':
      return envVars[`PRODUCTION_CLOUDFLARE_${suffix}`] || envVars[`CLOUDFLARE_${suffix}`] || null;
    default:
      return envVars[`CLOUDFLARE_${suffix}`] || null;
  }
}

await main();