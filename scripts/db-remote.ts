#!/usr/bin/env bun
/**
 * Database operations script that works with different environments
 * Usage: bun run scripts/db-remote.ts [operation] [--env=staging|production]
 * 
 * Operations:
 * - migrate: Apply migrations to remote D1
 * - studio: Open Drizzle Studio with remote connection
 * - execute: Execute SQL command
 */

import { config } from 'dotenv'
import { existsSync } from 'fs'
import { execSync } from 'child_process'

// Load environment variables
config({ path: '.env.local' })

const INFISICAL_CLIENT_ID = process.env.INFISICAL_CLIENT_ID
const INFISICAL_SECRET = process.env.INFISICAL_SECRET
const INFISICAL_PROJECT_ID = process.env.INFISICAL_PROJECT_ID

async function fetchInfisicalSecrets(environment: string): Promise<Record<string, string>> {
  if (!INFISICAL_CLIENT_ID || !INFISICAL_SECRET || !INFISICAL_PROJECT_ID) {
    throw new Error('Infisical credentials not found in .env.local')
  }

  try {
    console.log(`🔗 Fetching database info from Infisical environment="${environment}"`)
    
    // Get access token
    const tokenResponse = await fetch('https://app.infisical.com/api/v1/auth/universal-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: INFISICAL_CLIENT_ID,
        clientSecret: INFISICAL_SECRET,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to authenticate with Infisical: ${tokenResponse.status}`)
    }

    const { accessToken } = await tokenResponse.json()

    // Get secrets
    const secretsResponse = await fetch(
      `https://app.infisical.com/api/v3/secrets/raw?workspaceId=${INFISICAL_PROJECT_ID}&environment=${environment}&secretPath=/`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )

    if (!secretsResponse.ok) {
      throw new Error(`Failed to fetch secrets: ${secretsResponse.status}`)
    }

    const { secrets } = await secretsResponse.json()
    const secretsMap: Record<string, string> = {}
    
    for (const secret of secrets) {
      secretsMap[secret.secretKey] = secret.secretValue
    }

    console.log(`✅ Pulled ${secrets.length} secrets from Infisical.`)
    return secretsMap
  } catch (error) {
    console.error('❌ Failed to fetch Infisical secrets:', error)
    throw error
  }
}

function getDatabaseName(environment: string): string {
  switch (environment) {
    case 'dev':
      return 'swole-tracker-dev'
    case 'staging':
      return 'swole-tracker-staging'
    case 'production':
      return 'swole-tracker-prod'
    default:
      throw new Error(`Unknown environment: ${environment}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const operation = args[0]
  
  if (!operation) {
    console.error('Usage: bun run scripts/db-remote.ts [operation] [--env=staging|production]')
    console.error('Operations: migrate, studio, execute')
    process.exit(1)
  }

  // Use INFISICAL_ENVIRONMENT first, then fall back to --env flag
  const INFISICAL_ENVIRONMENT = process.env.INFISICAL_ENVIRONMENT
  const envFlag = args.find(arg => arg.startsWith('--env='))
  const environment = INFISICAL_ENVIRONMENT || (envFlag ? envFlag.split('=')[1] : 'dev')
  
  if (!['dev', 'staging', 'production'].includes(environment)) {
    console.error('Environment must be dev, staging, or production')
    process.exit(1)
  }

  try {
    let databaseName = getDatabaseName(environment)
    let databaseId = databaseName // Default fallback
    
    // For staging and production, get the actual database ID from Infisical
    if (environment !== 'dev') {
      const secrets = await fetchInfisicalSecrets(environment)
      databaseId = secrets.CLOUDFLARE_D1_DATABASE_ID || databaseName
      console.log(`📊 Found database ID in Infisical: ${databaseId}`)
    }

    console.log(`🎯 Using database: ${databaseName} with ID: ${databaseId} (${environment} environment)`)

    switch (operation) {
      case 'migrate':
        console.log(`🔄 Applying migrations to ${databaseName}...`)
        execSync(`wrangler d1 migrations apply ${databaseName} --remote`, { stdio: 'inherit' })
        break

      case 'studio':
        console.log(`🔍 Opening Drizzle Studio for ${databaseName}...`)
        execSync(`wrangler d1 execute ${databaseName} --command='SELECT 1' --remote`, { stdio: 'inherit' })
        execSync('drizzle-kit studio', { stdio: 'inherit' })
        break

      case 'execute':
        const sqlFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1]
        const command = args.find(arg => arg.startsWith('--command='))?.split('=')[1]
        
        if (sqlFile && existsSync(sqlFile)) {
          console.log(`📄 Executing SQL file ${sqlFile} on ${databaseName}...`)
          execSync(`wrangler d1 execute ${databaseName} --file=${sqlFile} --remote`, { stdio: 'inherit' })
        } else if (command) {
          console.log(`⚡ Executing command "${command}" on ${databaseName}...`)
          execSync(`wrangler d1 execute ${databaseName} --command='${command}' --remote`, { stdio: 'inherit' })
        } else {
          console.error('Execute operation requires --file=path or --command="SQL"')
          process.exit(1)
        }
        break

      default:
        console.error(`Unknown operation: ${operation}`)
        console.error('Available operations: migrate, studio, execute')
        process.exit(1)
    }

    console.log(`✅ Database operation completed successfully`)
  } catch (error) {
    console.error('❌ Database operation failed:', error)
    process.exit(1)
  }
}

main().catch(console.error)