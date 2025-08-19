#!/usr/bin/env bun
/**
 * Generate wrangler.toml configuration from environment variables
 * This keeps sensitive IDs out of version control while maintaining flexibility
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface WranglerConfig {
  name: string;
  compatibility_date: string;
  env: {
    production: {
      d1_databases: Array<{
        binding: string;
        database_name: string;
        database_id: string;
      }>;
      kv_namespaces: Array<{
        binding: string;
        id: string;
      }>;
      vars?: Record<string, string>;
    };
    staging: {
      d1_databases: Array<{
        binding: string;
        database_name: string;
        database_id: string;
      }>;
      kv_namespaces: Array<{
        binding: string;
        id: string;
      }>;
      vars?: Record<string, string>;
    };
  };
  d1_databases: Array<{
    binding: string;
    database_name: string;
    database_id: string;
    migrations_dir: string;
  }>;
  kv_namespaces: Array<{
    binding: string;
    id: string;
  }>;
  vars?: Record<string, string>;
}

function generateWranglerToml(): void {
  // Read environment variables (from .env or .dev.vars)
  const config: WranglerConfig = {
    name: "swole-tracker",
    compatibility_date: "2024-03-20",
    
    // Production Environment
    env: {
      production: {
        d1_databases: [
          {
            binding: "DB",
            database_name: "swole-tracker-prod",
            database_id: process.env.CLOUDFLARE_PROD_D1_DATABASE_ID || "your_production_d1_database_id"
          }
        ],
        kv_namespaces: [
          {
            binding: "RATE_LIMIT_KV",
            id: process.env.CLOUDFLARE_PROD_RATE_LIMIT_KV_ID || "your_production_rate_limit_kv_id"
          },
          {
            binding: "CACHE_KV", 
            id: process.env.CLOUDFLARE_PROD_CACHE_KV_ID || "your_production_cache_kv_id"
          }
        ],
        vars: {
          WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || "client_production_example"
        }
      },
      
      // Staging Environment
      staging: {
        d1_databases: [
          {
            binding: "DB",
            database_name: "swole-tracker-staging",
            database_id: process.env.CLOUDFLARE_STAGING_D1_DATABASE_ID || "staging-database-id"
          }
        ],
        kv_namespaces: [
          {
            binding: "RATE_LIMIT_KV",
            id: process.env.CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID || "6bee9b5d291c426e8d68c188720a504e"
          },
          {
            binding: "CACHE_KV",
            id: process.env.CLOUDFLARE_STAGING_CACHE_KV_ID || "c7322688c2a845c9aee5570769aa9817"
          }
        ],
        vars: {
          WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || "client_staging_example"
        }
      }
    },
    
    // Development (local) - use actual IDs since they're not sensitive for local dev
    d1_databases: [
      {
        binding: "DB",
        database_name: "swole-tracker-dev",
        database_id: "fd83bd6b-1d9f-4351-a23a-df3eed070fe1",
        migrations_dir: "drizzle"
      }
    ],
    kv_namespaces: [
      {
        binding: "RATE_LIMIT_KV",
        id: "24ffbf891bf1445d82533a65d92a9cd9"
      },
      {
        binding: "CACHE_KV",
        id: "8314e00d68f24565b5993af382148b63"
      }
    ],
    vars: {
      WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || "client_development_example"
    }
  };

  // Generate TOML content
  const tomlContent = generateTomlFromConfig(config);
  
  // Write to wrangler.toml
  const wranglerPath = join(process.cwd(), 'wrangler.toml');
  writeFileSync(wranglerPath, tomlContent);
  
  console.log('✅ Generated wrangler.toml successfully');
  console.log('📁 Location:', wranglerPath);
  
  // Validate required environment variables
  validateEnvironmentVariables();
}

function generateTomlFromConfig(config: WranglerConfig): string {
  return `# wrangler.toml - Generated from environment variables
# Run: bun run generate:wrangler to regenerate this file

name = "${config.name}"
main = "./.vercel/output/static/_worker.js/index.js"
compatibility_date = "${config.compatibility_date}"
compatibility_flags = ["nodejs_compat"]

# Worker configuration for Next.js app
[build]
command = "bun run build:cloudflare"
[build.upload]
format = "service-worker"

# Worker environment variables (non-sensitive)
[vars]
ENVIRONMENT = "development"
WORKOS_CLIENT_ID = "${config.vars?.WORKOS_CLIENT_ID}"

# Production Environment
[env.production]

[[env.production.d1_databases]]
binding = "DB"
database_name = "swole-tracker-prod"
database_id = "${config.env.production.d1_databases[0]!.database_id}"
migrations_dir = "drizzle"

[[env.production.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${config.env.production.kv_namespaces[0]!.id}"

[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "${config.env.production.kv_namespaces[1]!.id}"

[env.production.vars]
ENVIRONMENT = "production"
WORKOS_CLIENT_ID = "${config.env.production.vars?.WORKOS_CLIENT_ID}"
# Note: Sensitive variables like WORKOS_API_KEY should be set via Cloudflare Dashboard or GitHub Secrets

# Staging Environment
[env.staging]

[[env.staging.d1_databases]]
binding = "DB"
database_name = "swole-tracker-staging"
database_id = "${config.env.staging.d1_databases[0]!.database_id}"
migrations_dir = "drizzle"

[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${config.env.staging.kv_namespaces[0]!.id}"

[[env.staging.kv_namespaces]]
binding = "CACHE_KV"
id = "${config.env.staging.kv_namespaces[1]!.id}"

[env.staging.vars]
ENVIRONMENT = "staging"
WORKOS_CLIENT_ID = "${config.env.staging.vars?.WORKOS_CLIENT_ID}"

# Development (local)
[[d1_databases]]
binding = "DB"
database_name = "swole-tracker-dev"
database_id = "${config.d1_databases[0]!.database_id}"
migrations_dir = "drizzle"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${config.kv_namespaces[0]!.id}"

[[kv_namespaces]]
binding = "CACHE_KV"
id = "${config.kv_namespaces[1]!.id}"

# Note: Sensitive variables like WORKOS_API_KEY, DATABASE_URL, etc. should be set via:
# - GitHub Secrets for CI/CD deployment  
# - Cloudflare Dashboard for manual deployment
# - .env.local for local development
`;
}

function validateEnvironmentVariables(): void {
  const requiredVars = [
    'CLOUDFLARE_PROD_D1_DATABASE_ID',
    'CLOUDFLARE_PROD_RATE_LIMIT_KV_ID', 
    'CLOUDFLARE_PROD_CACHE_KV_ID',
    'WORKOS_CLIENT_ID'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.log('\n⚠️  Missing environment variables:');
    missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Update your .env file with these values before deploying to production');
    console.log('📄 See .env.example for the complete list of required variables\n');
  } else {
    console.log('✅ All required environment variables are configured');
  }
}

// Run if called directly
if (import.meta.main) {
  generateWranglerToml();
}

export { generateWranglerToml };