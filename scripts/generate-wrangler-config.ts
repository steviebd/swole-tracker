#!/usr/bin/env bun
/**
 * Generate wrangler.toml configuration from environment variables.
 *
 * Writes two files so it works both locally and inside Cloudflare Workers Builds:
 * - ./wrangler.toml                                  (for local dev / CI)
 * - ./.vercel/output/wrangler.toml                   (for Deploy/Versions step)
 */

import { config } from 'dotenv';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
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
      routes?: Array<{
        pattern: string;
        custom_domain?: boolean;
      }>;
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
      routes?: Array<{
        pattern: string;
        custom_domain?: boolean;
      }>;
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

    // Load environment variables from .env files (only if not already in process.env)
    // In Cloudflare builds, env vars are already available in process.env
    if (!process.env.CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID) {
      const envFiles = ['.env.local', '.env'];
      for (const envFile of envFiles) {
        const envPath = join(projectRoot, envFile);
        if (existsSync(envPath)) {
          config({ path: envPath });
          console.log(`📄 Loaded environment variables from ${envFile}`);
          break;
        }
      }
    } else {
      console.log(`📄 Using environment variables from process.env (Cloudflare build)`);
    }
    
    console.log('🔧 Generating wrangler configurations...');
    console.log('📁 Project root:', projectRoot);
    console.log('📁 Artefact root:', artefactRoot);

    // Check if we're in Cloudflare build environment (no env vars available during build)
    const isCloudfareBuild = !process.env.CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID && !process.env.CLOUDFLARE_DEV_RATE_LIMIT_KV_ID;
    
    if (isCloudfareBuild) {
      console.log('🔍 Detected Cloudflare build environment - using dashboard bindings');
    } else {
      console.log('🔍 Environment variables check:');
      const requiredVars = [
        'CLOUDFLARE_STAGING_D1_DATABASE_ID',
        'CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID', 
        'CLOUDFLARE_STAGING_CACHE_KV_ID',
        'WORKOS_CLIENT_ID'
      ];
      
      for (const varName of requiredVars) {
        const value = process.env[varName];
        console.log(`   ${varName}: ${value ? 'SET' : 'MISSING'}`);
      }
    }

    const config: WranglerConfig = {
      name: 'swole-tracker',
      compatibility_date: '2024-03-20',

      env: {
        production: {
          d1_databases: [
            {
              binding: 'DB',
              database_name: 'swole-tracker-prod',
              database_id: process.env.CLOUDFLARE_PROD_D1_DATABASE_ID || 'prod-db-from-dashboard',
            },
          ],
          kv_namespaces: [
            {
              binding: 'RATE_LIMIT_KV',
              id: process.env.CLOUDFLARE_PROD_RATE_LIMIT_KV_ID || 'prod-rate-limit-from-dashboard',
            },
            {
              binding: 'CACHE_KV',
              id: process.env.CLOUDFLARE_PROD_CACHE_KV_ID || 'prod-cache-from-dashboard',
            },
          ],
          vars: {
            WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID || 'workos-from-dashboard',
          },
          routes: process.env.CLOUDFLARE_PROD_DOMAIN ? [
            {
              pattern: `${process.env.CLOUDFLARE_PROD_DOMAIN}/*`,
              custom_domain: true,
            },
          ] : undefined,
        },

        staging: {
          d1_databases: process.env.CLOUDFLARE_STAGING_D1_DATABASE_ID ? [
            {
              binding: 'DB',
              database_name: 'swole-tracker-staging',
              database_id: process.env.CLOUDFLARE_STAGING_D1_DATABASE_ID,
            },
          ] : [],
          kv_namespaces: (process.env.CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID && process.env.CLOUDFLARE_STAGING_CACHE_KV_ID) ? [
            {
              binding: 'RATE_LIMIT_KV',
              id: process.env.CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID,
            },
            {
              binding: 'CACHE_KV',
              id: process.env.CLOUDFLARE_STAGING_CACHE_KV_ID,
            },
          ] : [],
          vars: process.env.WORKOS_CLIENT_ID ? {
            WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID,
          } : {},
          routes: process.env.CLOUDFLARE_STAGING_DOMAIN ? [
            {
              pattern: `${process.env.CLOUDFLARE_STAGING_DOMAIN}/*`,
              custom_domain: true,
            },
          ] : undefined,
        },
      },

      // Local dev bindings
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'swole-tracker-dev',
          database_id: process.env.CLOUDFLARE_DEV_D1_DATABASE_ID!,
          migrations_dir: 'drizzle',
        },
      ],
      kv_namespaces: [
        {
          binding: 'RATE_LIMIT_KV',
          id: process.env.CLOUDFLARE_DEV_RATE_LIMIT_KV_ID!,
        },
        {
          binding: 'CACHE_KV',
          id: process.env.CLOUDFLARE_DEV_CACHE_KV_ID!,
        },
      ],
      vars: {
        WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID!,
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

[observability.logs]
enabled = false

[vars]
ENVIRONMENT = "development"
WORKOS_CLIENT_ID = "${config.vars?.WORKOS_CLIENT_ID ?? ''}"

# Staging Environment
[env.staging]
name = "swole-tracker-staging"

${config.env.staging.d1_databases.length > 0 ? `[[env.staging.d1_databases]]
binding = "DB"
database_name = "swole-tracker-staging"
database_id = "${config.env.staging.d1_databases[0]!.database_id}"
migrations_dir = "drizzle"` : '# D1 databases configured via Cloudflare Dashboard'}

${config.env.staging.kv_namespaces.length > 0 ? `[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "${config.env.staging.kv_namespaces[0]!.id}"

[[env.staging.kv_namespaces]]
binding = "CACHE_KV"
id = "${config.env.staging.kv_namespaces[1]!.id}"` : '# KV namespaces configured via Cloudflare Dashboard'}

[env.staging.vars]
ENVIRONMENT = "staging"
${Object.keys(config.env.staging.vars || {}).length > 0 ? `WORKOS_CLIENT_ID = "${config.env.staging.vars?.WORKOS_CLIENT_ID ?? ''}"` : '# Environment variables configured via Cloudflare Dashboard'}

${config.env.staging.routes ? config.env.staging.routes.map(route => 
  `[[env.staging.routes]]
pattern = "${route.pattern}"`
).join('\n\n') : ''}

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

${config.env.production.routes ? config.env.production.routes.map(route => 
  `[[env.production.routes]]
pattern = "${route.pattern}"`
).join('\n\n') : ''}

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
    'CLOUDFLARE_STAGING_D1_DATABASE_ID',
    'CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID',
    'CLOUDFLARE_STAGING_CACHE_KV_ID',
    'WORKOS_CLIENT_ID',
  ];

  const optionalVars = [
    'CLOUDFLARE_STAGING_DOMAIN',
    'CLOUDFLARE_PROD_DOMAIN',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  const optionalPresent = optionalVars.filter((v) => process.env[v]);
  
  if (missing.length > 0) {
    console.log('\n⚠️  Missing environment variables:');
    for (const v of missing) console.log(`   - ${v}`);
    console.log('\n💡 Update your CI/Cloudflare Build env with these values before deploying to production');
    console.log('📄 See .env.example for the complete list of required variables\n');
  } else {
    console.log('✅ All required environment variables are configured');
  }

  if (optionalPresent.length > 0) {
    console.log('🌐 Custom domain configuration:');
    for (const v of optionalPresent) {
      const domain = process.env[v];
      const env = v.includes('STAGING') ? 'staging' : 'production';
      console.log(`   - ${env}: https://${domain}/`);
    }
  }
}

if (import.meta.main) {
  generateWranglerConfigs();
}

export { generateWranglerConfigs as generateWranglerToml };
