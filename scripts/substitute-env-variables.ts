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
       'CLOUDFLARE_D1_DATABASE_ID': process.env.CLOUDFLARE_D1_DATABASE_ID,
       'CLOUDFLARE_RATE_LIMIT_KV_ID': process.env.CLOUDFLARE_RATE_LIMIT_KV_ID,
       'CLOUDFLARE_CACHE_KV_ID': process.env.CLOUDFLARE_CACHE_KV_ID,
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
  // Check for the unified variables that should be set by the build system
  const criticalVars = [
    'CLOUDFLARE_D1_DATABASE_ID',
    'CLOUDFLARE_RATE_LIMIT_KV_ID',
    'CLOUDFLARE_CACHE_KV_ID'
  ];

  const missing = criticalVars.filter(varName => !envMappings[varName]);

  if (missing.length > 0) {
    console.log(`\n🚨 Missing critical variables:`);
    missing.forEach(varName => console.log(`   - ${varName}`));
    console.log('\n💡 These should be set by your build/deployment system (GitHub Actions, CI/CD, etc.)');
    console.log('   based on the target environment (production, staging, development).');
  } else {
    console.log(`\n✅ All critical variables are configured.`);
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
   CLOUDFLARE_D1_DATABASE_ID            D1 database ID (set by build system)
   CLOUDFLARE_RATE_LIMIT_KV_ID          Rate limit KV ID (set by build system)
   CLOUDFLARE_CACHE_KV_ID               Cache KV ID (set by build system)
   WORKOS_CLIENT_ID                     WorkOS client ID

 These variables should be set by your build/deployment system (GitHub Actions, CI/CD, etc.)
 based on the target environment. For local development, set them in .env.local
`);
}

// Run if called directly
if (import.meta.main) {
  const options = parseArgs();
  substituteEnvironmentVariables(options);
}

export { substituteEnvironmentVariables };