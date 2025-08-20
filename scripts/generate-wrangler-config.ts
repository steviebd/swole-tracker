#!/usr/bin/env bun
/**
 * Generate wrangler.toml configuration from environment variables.
 *
 * Writes two files so it works both locally and inside Cloudflare Workers Builds:
 * - ./wrangler.toml                                  (for local dev / CI)
 * - ./.vercel/output/wrangler.toml                   (for Deploy/Versions step)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

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

type Placement = 'root' | 'output';

function generateWranglerConfigs(): void {
  try {
    // Resolve project and artefact roots reliably
    const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const artefactRoot = join(projectRoot, '.vercel', 'output');
    
    console.log('🔧 Generating wrangler configurations...');
    console.log('📁 Project root:', projectRoot);
    console.log('📁 Artefact root:', artefactRoot);

    const config: WranglerConfig = {
      name: 'swole-tracker',
      compatibility_date: '2024-03-20',

      env: {
        production: {
          d1_databases: [
            {
              binding: 'DB',
              database_name: 'swole-tracker-prod',
              database_id:
                process.env.CLOUDFLARE_PROD_D1_DATABASE_ID || 'your_production_d1_database_id',
            },
          ],
          kv_namespaces: [
            {
              binding: 'RATE_LIMIT_KV',
              id: process.env.CLOUDFLARE_PROD_RATE_LIMIT_KV_ID || 'your_production_rate_limit_kv_id',
            },
            {
              binding: 'CACHE_KV',
              id: process.env.CLOUDFLARE_PROD_CACHE_KV_ID || 'your_production_cache_kv_id',
            },
          ],
          vars: {
            WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || 'client_production_example',
          },
        },

        staging: {
          d1_databases: [
            {
              binding: 'DB',
              database_name: 'swole-tracker-staging',
              database_id:
                process.env.CLOUDFLARE_STAGING_D1_DATABASE_ID || 'staging-database-id',
            },
          ],
          kv_namespaces: [
            {
              binding: 'RATE_LIMIT_KV',
              id:
                process.env.CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID ||
                '6bee9b5d291c426e8d68c188720a504e',
            },
            {
              binding: 'CACHE_KV',
              id:
                process.env.CLOUDFLARE_STAGING_CACHE_KV_ID || 'c7322688c2a845c9aee5570769aa9817',
            },
          ],
          vars: {
            WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || 'client_staging_example',
          },
        },
      },

      // Local dev bindings (safe IDs)
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'swole-tracker-dev',
          database_id: 'fd83bd6b-1d9f-4351-a23a-df3eed070fe1',
          migrations_dir: 'drizzle',
        },
      ],
      kv_namespaces: [
        {
          binding: 'RATE_LIMIT_KV',
          id: '24ffbf891bf1445d82533a65d92a9cd9',
        },
        {
          binding: 'CACHE_KV',
          id: '8314e00d68f24565b5993af382148b63',
        },
      ],
      vars: {
        WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || 'client_development_example',
      },
    };

    const rootToml = generateTomlFromConfig(config, 'root');
    const outputToml = generateTomlFromConfig(config, 'output');

    // Ensure artefact dir exists
    mkdirSync(artefactRoot, { recursive: true });

    // Write to both locations
    const rootPath = join(projectRoot, 'wrangler.toml');
    const outputPath = join(artefactRoot, 'wrangler.toml');
    
    writeFileSync(rootPath, rootToml);
    writeFileSync(outputPath, outputToml);

    console.log('✅ Generated wrangler.toml successfully');
    console.log('📁 Root    :', rootPath);
    console.log('📁 Artefact:', outputPath);

    // Validate required environment variables
    validateEnvironmentVariables();
  } catch (error) {
    console.error('❌ Failed to generate wrangler.toml:', error);
    process.exit(1);
  }
}

function generateTomlFromConfig(config: WranglerConfig, placement: Placement): string {
  // main path differs depending on where the config file lives
  const mainPath = placement === 'root'
    ? '.vercel/output/static/_worker.js/index.js'
    : 'static/_worker.js/index.js'; // when config lives inside .vercel/output

  return `# wrangler.toml - Generated from environment variables
# Do not commit this file; it is generated each build.

name = "${config.name}"
main = "${mainPath}"
compatibility_date = "${config.compatibility_date}"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "development"
WORKOS_CLIENT_ID = "${config.vars?.WORKOS_CLIENT_ID ?? ''}"

# Staging Environment
[env.staging]
name = "swole-tracker-staging"

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
WORKOS_CLIENT_ID = "${config.env.staging.vars?.WORKOS_CLIENT_ID ?? ''}"

# Production Environment
[env.production]
name = "swole-tracker-production"

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
WORKOS_CLIENT_ID = "${config.env.production.vars?.WORKOS_CLIENT_ID ?? ''}"

# Local Development (default/root)
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
`;
}

function validateEnvironmentVariables(): void {
  const requiredVars = [
    'CLOUDFLARE_PROD_D1_DATABASE_ID',
    'CLOUDFLARE_PROD_RATE_LIMIT_KV_ID',
    'CLOUDFLARE_PROD_CACHE_KV_ID',
    'WORKOS_CLIENT_ID',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.log('\n⚠️  Missing environment variables:');
    for (const v of missing) console.log(`   - ${v}`);
    console.log('\n💡 Update your CI/Cloudflare Build env with these values before deploying to production');
    console.log('📄 See .env.example for the complete list of required variables\n');
  } else {
    console.log('✅ All required environment variables are configured');
  }
}

if (import.meta.main) {
  generateWranglerConfigs();
}

export { generateWranglerConfigs as generateWranglerToml };
