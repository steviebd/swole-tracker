#!/usr/bin/env bun
/**
 * Local deployment script for Cloudflare Workers
 * 
 * This script handles the complete deployment pipeline:
 * 1. Environment variable validation
 * 2. Environment substitution in wrangler.toml
 * 3. Application build
 * 4. Cloudflare Workers deployment
 * 5. Basic health check
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { substituteEnvironmentVariables } from './substitute-env-variables';

const execAsync = promisify(exec);

interface DeployOptions {
  environment: 'development' | 'staging' | 'production';
  dryRun?: boolean;
  skipBuild?: boolean;
  skipHealthCheck?: boolean;
}

async function deployToWorkers(options: DeployOptions): Promise<void> {
  const { environment, dryRun = false, skipBuild = false, skipHealthCheck = false } = options;

  console.log(`🚀 Deploying Swole Tracker to Cloudflare Workers (${environment})`);
  console.log('=' .repeat(60));

  try {
    // Step 1: Validate environment
    console.log('\n📋 Step 1: Validating environment...');
    await validateEnvironment(environment);

    // Step 2: Substitute environment variables
    console.log('\n🔄 Step 2: Substituting environment variables...');
    if (dryRun) {
      console.log('🔍 Dry run mode - skipping actual substitution');
    } else {
      substituteEnvironmentVariables({
        environment,
        dryRun: false
      });
    }

    // Step 3: Build the application
    if (!skipBuild) {
      console.log('\n🏗️  Step 3: Building application...');
      if (dryRun) {
        console.log('🔍 Dry run mode - skipping actual build');
      } else {
        await buildApplication();
      }
    } else {
      console.log('\n⏭️  Step 3: Skipping build (--skip-build flag)');
    }

    // Step 4: Deploy to Cloudflare Workers
    console.log('\n☁️  Step 4: Deploying to Cloudflare Workers...');
    if (dryRun) {
      console.log('🔍 Dry run mode - skipping actual deployment');
      console.log(`Would deploy with: npx wrangler deploy ${environment !== 'development' ? `--env ${environment}` : ''}`);
    } else {
      await deployWithWrangler(environment);
    }

    // Step 5: Health check
    if (!skipHealthCheck && !dryRun) {
      console.log('\n🏥 Step 5: Running health check...');
      await healthCheck(environment);
    } else if (skipHealthCheck) {
      console.log('\n⏭️  Step 5: Skipping health check (--skip-health-check flag)');
    }

    console.log('\n✅ Deployment completed successfully!');
    printDeploymentSummary(environment);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

async function validateEnvironment(environment: string): Promise<void> {
  const requiredEnvVars: Record<string, string[]> = {
    production: [
      'CLOUDFLARE_PROD_D1_DATABASE_ID',
      'CLOUDFLARE_PROD_RATE_LIMIT_KV_ID',
      'CLOUDFLARE_PROD_CACHE_KV_ID',
      'CLOUDFLARE_API_TOKEN'
    ],
    staging: [
      'CLOUDFLARE_STAGING_D1_DATABASE_ID',
      'CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID',
      'CLOUDFLARE_STAGING_CACHE_KV_ID',
      'CLOUDFLARE_API_TOKEN'
    ],
    development: [
      'CLOUDFLARE_API_TOKEN'
    ]
  };

  const required = requiredEnvVars[environment] || [];
  const missing = required.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error(`\n🚨 Missing required environment variables for ${environment}:`);
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Set these in your .env.local file or environment');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log(`✅ All required environment variables for ${environment} are configured`);
}

async function buildApplication(): Promise<void> {
  console.log('🏗️  Building Next.js application with Cloudflare compatibility...');
  
  const { stdout, stderr } = await execAsync('bun run build:cloudflare', {
    env: { ...process.env, NODE_ENV: 'production' }
  });

  if (stderr && !stderr.includes('warn')) {
    console.warn('⚠️  Build warnings:', stderr);
  }

  console.log('✅ Application build completed');
}

async function deployWithWrangler(environment: string): Promise<void> {
  const envFlag = environment !== 'development' ? `--env ${environment}` : '';
  const command = `npx wrangler deploy ${envFlag}`.trim();
  
  console.log(`🚀 Executing: ${command}`);
  
  const { stdout, stderr } = await execAsync(command, {
    env: { ...process.env }
  });

  if (stderr && !stderr.includes('warn')) {
    console.warn('⚠️  Deployment warnings:', stderr);
  }

  console.log('✅ Cloudflare Workers deployment completed');
}

async function healthCheck(environment: string): Promise<void> {
  const urls: Record<string, string> = {
    development: 'https://swole-tracker.workers.dev',
    staging: 'https://staging.swole-tracker.workers.dev',
    production: 'https://swole-tracker.workers.dev'
  };

  const baseUrl = urls[environment];
  if (!baseUrl) {
    console.log('⚠️  No health check URL configured for this environment');
    return;
  }

  const healthCheckUrl = `${baseUrl}/api/joke`;
  
  console.log(`🔍 Checking health at: ${healthCheckUrl}`);
  console.log('⏳ Waiting 10 seconds for deployment to propagate...');
  
  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    const response = await fetch(healthCheckUrl);
    if (response.ok) {
      console.log('✅ Health check passed - application is responding');
    } else {
      console.warn(`⚠️  Health check returned status: ${response.status}`);
    }
  } catch (error) {
    console.warn('⚠️  Health check failed - this may be normal for new deployments:', error);
  }
}

function printDeploymentSummary(environment: string): void {
  const urls: Record<string, string> = {
    development: 'https://swole-tracker.workers.dev',
    staging: 'https://staging.swole-tracker.workers.dev', 
    production: 'https://swole-tracker.workers.dev'
  };

  console.log('\n' + '='.repeat(60));
  console.log('🎉 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${environment}`);
  console.log(`🌐 URL: ${urls[environment] || 'Not configured'}`);
  console.log(`⏰ Deployed at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
}

function parseArgs(): DeployOptions {
  const args = process.argv.slice(2);
  const options: DeployOptions = {
    environment: 'development'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--env':
      case '-e':
        options.environment = args[++i] as DeployOptions['environment'];
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--skip-health-check':
        options.skipHealthCheck = true;
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
Cloudflare Workers Deployment Script

USAGE:
  bun run deploy:workers [OPTIONS]
  bun scripts/deploy-workers.ts [OPTIONS]

OPTIONS:
  -e, --env <environment>    Environment to deploy to (development, staging, production)
  -d, --dry-run              Show what would be done without executing
  --skip-build               Skip the build step (useful for quick redeploys)
  --skip-health-check        Skip the post-deployment health check
  -h, --help                 Show this help message

EXAMPLES:
  bun run deploy:workers --env staging
  bun run deploy:workers --env production --dry-run
  bun scripts/deploy-workers.ts --env staging --skip-build

PREREQUISITES:
  1. Set required environment variables (see script for details)
  2. Install dependencies: bun install
  3. Ensure Cloudflare API token is configured

ENVIRONMENT VARIABLES:
  Development:
    - CLOUDFLARE_API_TOKEN

  Staging:
    - CLOUDFLARE_API_TOKEN
    - CLOUDFLARE_STAGING_D1_DATABASE_ID
    - CLOUDFLARE_STAGING_RATE_LIMIT_KV_ID
    - CLOUDFLARE_STAGING_CACHE_KV_ID

  Production:
    - CLOUDFLARE_API_TOKEN
    - CLOUDFLARE_PROD_D1_DATABASE_ID
    - CLOUDFLARE_PROD_RATE_LIMIT_KV_ID
    - CLOUDFLARE_PROD_CACHE_KV_ID
`);
}

// Run if called directly
if (import.meta.main) {
  const options = parseArgs();
  await deployToWorkers(options);
}

export { deployToWorkers };