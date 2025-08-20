#!/usr/bin/env node
import { execSync } from 'child_process';

// Get environment from CI or command line args
const ciEnv = process.env.CF_PAGES_BRANCH;
const argEnv = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1];

let workerName = 'swole-tracker';
let environment = '';

// Determine worker name based on environment
if (ciEnv) {
  // Cloudflare Pages CI environment detection
  if (ciEnv === 'main') {
    workerName = 'swole-tracker-production';
    environment = 'production';
  } else if (ciEnv.startsWith('feat/') || ciEnv.startsWith('feature/')) {
    workerName = 'swole-tracker-staging';
    environment = 'staging';
  } else {
    workerName = 'swole-tracker-staging';
    environment = 'staging';
  }
} else if (argEnv) {
  // Manual deployment with --env flag
  if (argEnv === 'production') {
    workerName = 'swole-tracker-production';
    environment = 'production';
  } else if (argEnv === 'staging') {
    workerName = 'swole-tracker-staging';
    environment = 'staging';
  } else {
    workerName = 'swole-tracker';
    environment = '';
  }
}

console.log(`🚀 Deploying to worker: ${workerName} (environment: ${environment || 'development'})`);

const deployCommand = [
  'npx wrangler versions upload',
  `--name ${workerName}`,
  '--script .vercel/output/static/_worker.js/index.js',
  '--compatibility-date 2024-03-20',
  '--compatibility-flags nodejs_compat',
  environment ? `--env ${environment}` : ''
].filter(Boolean).join(' ');

try {
  console.log(`Running: ${deployCommand}`);
  execSync(deployCommand, { stdio: 'inherit' });
  console.log('✅ Deployment successful!');
} catch (error) {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
}