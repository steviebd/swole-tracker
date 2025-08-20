#!/usr/bin/env bun
/**
 * Substitute environment variables in wrangler.toml for deployment
 * This script reads wrangler.toml and replaces ${VAR_NAME} with actual environment values
 * Designed for GitHub Actions and CI/CD environments
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface EnvSubstitutionOptions {
  inputFile?: string;
  outputFile?: string;
  environment?: string;
  dryRun?: boolean;
}

function substituteEnvironmentVariables(options: EnvSubstitutionOptions = {}): void {
  const {
    inputFile = 'wrangler.toml',
    outputFile = 'wrangler.toml',
    environment = process.env.NODE_ENV || 'development',
    dryRun = false
  } = options;

  const inputPath = join(process.cwd(), inputFile);
  const outputPath = join(process.cwd(), outputFile);

  try {
    // Read the template file
    let content = readFileSync(inputPath, 'utf8');
    console.log(`📖 Reading ${inputFile}...`);

    // Define environment variable mappings
    const envMappings: Record<string, string | undefined> = {
      'CLOUDFLARE_PROD_D1_DATABASE_ID': process.env.CLOUDFLARE_PROD_D1_DATABASE_ID,
      'CLOUDFLARE_PROD_RATE_LIMIT_KV_ID': process.env.CLOUDFLARE_PROD_RATE_LIMIT_KV_ID,
      'CLOUDFLARE_PROD_CACHE_KV_ID': process.env.CLOUDFLARE_PROD_CACHE_KV_ID,
      'CLOUDFLARE_STAGING_D1_DATABASE_ID': process.env.CLOUDFLARE_STAGING_D1_DATABASE_ID,
      'CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID': process.env.CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID,
      'CLOUDFLARE_STAGING_CACHE_KV_ID': process.env.CLOUDFLARE_STAGING_CACHE_KV_ID,
      'WORKOS_CLIENT_ID': process.env.WORKOS_CLIENT_ID,
    };

    // Track substitutions
    const substitutions: string[] = [];
    const missingVars: string[] = [];

    // Perform substitutions
    Object.entries(envMappings).forEach(([varName, value]) => {
      const placeholder = `\${${varName}}`;
      
      if (content.includes(placeholder)) {
        if (value) {
          content = content.replace(new RegExp(`\\$\\{${varName}\\}`, 'g'), value);
          substitutions.push(`${varName} = ${value.substring(0, 8)}...`);
        } else {
          missingVars.push(varName);
        }
      }
    });

    // Report results
    if (substitutions.length > 0) {
      console.log('✅ Successfully substituted:');
      substitutions.forEach(sub => console.log(`   - ${sub}`));
    }

    if (missingVars.length > 0) {
      console.log('\n⚠️  Missing environment variables:');
      missingVars.forEach(varName => console.log(`   - ${varName}`));
      console.log('\n💡 Set these variables in your CI/CD environment or .env file');
    }

    // Handle dry run vs actual write
    if (dryRun) {
      console.log('\n🔍 Dry run mode - would write to:', outputPath);
      console.log('\n📄 Substituted content preview (first 500 chars):');
      console.log(content.substring(0, 500));
      if (content.length > 500) {
        console.log('...(truncated)');
      }
    } else {
      // Write the substituted content
      writeFileSync(outputPath, content, 'utf8');
      console.log(`\n✅ Environment variables substituted in ${outputFile}`);
      console.log(`📁 Output file: ${outputPath}`);
    }

    // Validate critical environment variables for the target environment
    validateCriticalVariables(environment, envMappings);

  } catch (error) {
    console.error('❌ Error substituting environment variables:', error);
    process.exit(1);
  }
}

function validateCriticalVariables(
  environment: string,
  envMappings: Record<string, string | undefined>
): void {
  const criticalVars: Record<string, string[]> = {
    production: [
      'CLOUDFLARE_PROD_D1_DATABASE_ID',
      'CLOUDFLARE_PROD_RATE_LIMIT_KV_ID',
      'CLOUDFLARE_PROD_CACHE_KV_ID'
    ],
    staging: [
      'CLOUDFLARE_STAGING_D1_DATABASE_ID',
      'CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID',
      'CLOUDFLARE_STAGING_CACHE_KV_ID'
    ],
    development: []
  };

  const requiredVars = criticalVars[environment] || [];
  const missing = requiredVars.filter(varName => !envMappings[varName]);

  if (missing.length > 0) {
    console.log(`\n🚨 Missing critical variables for ${environment} environment:`);
    missing.forEach(varName => console.log(`   - ${varName}`));
    
    if (environment === 'production') {
      console.log('\n💥 Production deployment will fail without these variables!');
      process.exit(1);
    } else {
      console.log(`\n⚠️  ${environment} deployment may not work correctly without these variables.`);
    }
  } else if (requiredVars.length > 0) {
    console.log(`\n✅ All critical variables for ${environment} environment are configured.`);
  }
}

// Parse command line arguments
function parseArgs(): EnvSubstitutionOptions {
  const args = process.argv.slice(2);
  const options: EnvSubstitutionOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--input':
      case '-i':
        options.inputFile = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputFile = args[++i];
        break;
      case '--env':
      case '-e':
        options.environment = args[++i];
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Environment Variable Substitution Script

USAGE:
  bun run env:substitute [OPTIONS]

OPTIONS:
  -i, --input <file>     Input file (default: wrangler.toml)
  -o, --output <file>    Output file (default: wrangler.toml)
  -e, --env <env>        Target environment (production, staging, development)
  -d, --dry-run          Show what would be substituted without writing
  -h, --help             Show this help message

EXAMPLES:
  bun run env:substitute
  bun run env:substitute --env production
  bun run env:substitute --dry-run
  bun run env:substitute --input wrangler.toml.template --output wrangler.toml

ENVIRONMENT VARIABLES:
  CLOUDFLARE_PROD_D1_DATABASE_ID       Production D1 database ID
  CLOUDFLARE_PROD_RATE_LIMIT_KV_ID     Production rate limit KV ID
  CLOUDFLARE_PROD_CACHE_KV_ID          Production cache KV ID
  CLOUDFLARE_STAGING_D1_DATABASE_ID    Staging D1 database ID
  CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID  Staging rate limit KV ID
  CLOUDFLARE_STAGING_CACHE_KV_ID       Staging cache KV ID
  WORKOS_CLIENT_ID                     WorkOS client ID

For GitHub Actions, set these as repository secrets.
For local development, set these in .env.local
`);
}

// Run if called directly
if (import.meta.main) {
  const options = parseArgs();
  substituteEnvironmentVariables(options);
}

export { substituteEnvironmentVariables };