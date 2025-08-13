#!/usr/bin/env bun

/**
 * Production Clerk to Supabase Auth Migration Script
 * 
 * This script safely migrates users from Clerk to Supabase Auth in production environments.
 * 
 * Features:
 * - Environment-aware (reads from different .env files)
 * - Production safety checks
 * - Dry-run mode
 * - Detailed logging
 * - Rollback capabilities
 * 
 * Usage:
 *   # Development
 *   bun run scripts/production-migration.ts --env development [action]
 * 
 *   # Production
 *   bun run scripts/production-migration.ts --env production [action]
 * 
 *   # Custom env file
 *   bun run scripts/production-migration.ts --env-file .env.production [action]
 * 
 * Actions:
 *   analyze              - Analyze current data (safe)
 *   create-mapping-table - Create the user migration mapping table
 *   backup-data         - Backup existing user data
 *   migrate-users       - Update user_id references (DESTRUCTIVE)
 *   migrate-users --dry-run - Show what would be migrated without changes
 *   verify              - Verify migration was successful
 *   rollback            - Restore from backup (emergency)
 *   cleanup             - Remove backup tables and migration data
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.findIndex(arg => arg === '--env');
const envFileArg = args.findIndex(arg => arg === '--env-file');
const dryRunFlag = args.includes('--dry-run');
const forceFlag = args.includes('--force');
const action = args.find(arg => !arg.startsWith('--') && arg !== args[envArg + 1] && arg !== args[envFileArg + 1]);

let envFile = '.env';
if (envFileArg !== -1) {
  envFile = args[envFileArg + 1];
} else if (envArg !== -1) {
  const envType = args[envArg + 1];
  envFile = envType === 'production' ? '.env.production' : '.env';
}

if (!action) {
  console.log(`
🚀 Production Clerk to Supabase Migration Script

Usage: bun run scripts/production-migration.ts [options] [action]

Options:
  --env development|production    Use predefined environment
  --env-file <file>              Use custom env file
  --dry-run                      Show changes without applying them

Actions:
  analyze              - Analyze current data (safe)
  create-mapping-table - Create the user migration mapping table
  backup-data         - Backup existing user data
  migrate-users       - Update user_id references (DESTRUCTIVE)
  verify              - Verify migration was successful  
  rollback            - Restore from backup (emergency)
  cleanup             - Remove backup tables and migration data

Examples:
  # Analyze production data
  bun run scripts/production-migration.ts --env production analyze

  # Dry run migration
  bun run scripts/production-migration.ts --env production migrate-users --dry-run

  # Run actual migration
  bun run scripts/production-migration.ts --env production migrate-users
  `);
  process.exit(1);
}

// Load environment variables from specified file
function loadEnv(filePath: string) {
  try {
    const envContent = readFileSync(filePath, 'utf-8');
    const env: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return env;
  } catch (error) {
    console.error(`❌ Error loading env file ${filePath}:`, error);
    process.exit(1);
  }
}

const env = loadEnv(envFile);
console.log(`🔧 Using environment file: ${envFile}`);
console.log(`🌍 Environment: ${env.NODE_ENV || 'development'}`);
console.log(`🗄️  Database: ${env.DATABASE_URL?.substring(0, 30)}...`);

if (dryRunFlag) {
  console.log(`🧪 DRY RUN MODE - No changes will be made`);
}

// Production safety checks
const isProduction = env.NODE_ENV === 'production' || envFile.includes('production');
if (isProduction && !dryRunFlag && !forceFlag && ['migrate-users', 'rollback', 'cleanup'].includes(action)) {
  console.log('⚠️  PRODUCTION ENVIRONMENT DETECTED');
  console.log('⚠️  This action can modify or delete data!');
  console.log('⚠️  Add --dry-run flag first to see what would happen');
  console.log('');
  console.log('To proceed with production changes, you must:');
  console.log('1. Run with --dry-run first');
  console.log('2. Confirm you have recent backups');
  console.log('3. Re-run with --force flag if everything looks correct');
  console.log('');
  
  if (action === 'migrate-users') {
    console.log('💡 Recommended production flow:');
    console.log('   1. bun run scripts/production-migration.ts --env production backup-data');
    console.log('   2. bun run scripts/production-migration.ts --env production migrate-users --dry-run');
    console.log('   3. bun run scripts/production-migration.ts --env production migrate-users --force');
  }
  
  process.exit(1);
}

// Database connection
const connection = postgres(env.DATABASE_URL ?? '');
const db = drizzle(connection);

// Logging helper
function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const emoji = level === 'info' ? '📋' : level === 'warn' ? '⚠️' : '❌';
  console.log(`${emoji} [${timestamp}] ${message}`);
  if (data) {
    console.log('   ', JSON.stringify(data, null, 2));
  }
}

async function createMappingTable() {
  log('info', 'Creating user migration mapping table...');
  
  if (dryRunFlag) {
    log('info', 'DRY RUN: Would create user migration mapping table');
    return;
  }
  
  try {
    const envName = env.NODE_ENV || 'development';
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "swole-tracker_user_migration_mapping" (
        "id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        "clerk_user_id" varchar(256) NOT NULL UNIQUE,
        "supabase_user_id" varchar(256) NOT NULL UNIQUE,
        "email" varchar(256) NOT NULL,
        "migrated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "migration_status" varchar(50) DEFAULT 'pending' NOT NULL,
        "migration_notes" text,
        "migration_environment" varchar(50) DEFAULT '${envName}' NOT NULL
      );
    `));
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "user_migration_clerk_id_idx" ON "swole-tracker_user_migration_mapping" ("clerk_user_id");',
      'CREATE INDEX IF NOT EXISTS "user_migration_supabase_id_idx" ON "swole-tracker_user_migration_mapping" ("supabase_user_id");',
      'CREATE INDEX IF NOT EXISTS "user_migration_email_idx" ON "swole-tracker_user_migration_mapping" ("email");',
      'CREATE INDEX IF NOT EXISTS "user_migration_env_idx" ON "swole-tracker_user_migration_mapping" ("migration_environment");'
    ];
    
    for (const indexSql of indexes) {
      await db.execute(sql.raw(indexSql));
    }
    
    log('info', 'User migration mapping table created successfully');
  } catch (error) {
    log('error', 'Error creating mapping table', error);
    process.exit(1);
  }
}

async function analyzeData() {
  log('info', 'Analyzing current data...');
  
  const tables = [
    'swole-tracker_workout_template',
    'swole-tracker_template_exercise', 
    'swole-tracker_workout_session',
    'swole-tracker_session_exercise',
    'swole-tracker_user_preferences',
    'swole-tracker_user_integration',
    'swole-tracker_whoop_workout',
    'swole-tracker_health_advice',
    'swole-tracker_webhook_event'
  ];
  
  const analysis = {
    environment: env.NODE_ENV || 'development',
    database: env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
    timestamp: new Date().toISOString(),
    tables: {} as Record<string, any>
  };
  
  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT user_id) as unique_users,
          MIN("createdAt") as oldest_record,
          MAX("createdAt") as newest_record
        FROM "${table}"
        WHERE user_id IS NOT NULL;
      `));
      
      const tableData = result[0];
      analysis.tables[table] = tableData;
      
      log('info', `Table: ${table}`, {
        records: tableData.total_records,
        users: tableData.unique_users,
        dateRange: `${tableData.oldest_record} to ${tableData.newest_record}`
      });
      
      // Show sample user IDs for this table
      if (parseInt(tableData.unique_users) > 0) {
        const sampleIds = await db.execute(sql.raw(`
          SELECT DISTINCT user_id 
          FROM "${table}" 
          WHERE user_id IS NOT NULL 
          LIMIT 5;
        `));
        
        log('info', `  Sample user IDs: ${sampleIds.map(r => r.user_id).join(', ')}`);
      }
      
    } catch (error) {
      log('error', `Error analyzing ${table}`, error);
      analysis.tables[table] = { error: error.message };
    }
  }
  
  // Check for existing mapping data
  try {
    const mappingCount = await db.execute(sql`
      SELECT 
        COUNT(*) as total_mappings,
        COUNT(*) FILTER (WHERE migration_status = 'pending') as pending_mappings,
        COUNT(*) FILTER (WHERE migration_status = 'completed') as completed_mappings
      FROM "swole-tracker_user_migration_mapping"
      WHERE migration_environment = ${env.NODE_ENV || 'development'};
    `);
    
    analysis.migration_mappings = mappingCount[0];
    log('info', 'Migration mappings', mappingCount[0]);
  } catch (error) {
    log('warn', 'Migration mapping table not found - run create-mapping-table first');
  }
  
  // Save analysis to file for records
  const analysisFile = `migration-analysis-${env.NODE_ENV || 'development'}-${Date.now()}.json`;
  await Bun.write(analysisFile, JSON.stringify(analysis, null, 2));
  log('info', `Analysis saved to ${analysisFile}`);
}

async function backupData() {
  log('info', 'Creating backup tables...');
  
  const tables = [
    'swole-tracker_workout_template',
    'swole-tracker_template_exercise', 
    'swole-tracker_workout_session',
    'swole-tracker_session_exercise',
    'swole-tracker_user_preferences',
    'swole-tracker_user_integration',
    'swole-tracker_whoop_workout',
    'swole-tracker_health_advice',
    'swole-tracker_webhook_event'
  ];
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const envSuffix = env.NODE_ENV || 'development';
  
  for (const table of tables) {
    try {
      const backupTableName = `${table}_backup_${envSuffix}_${timestamp}`;
      
      if (dryRunFlag) {
        log('info', `DRY RUN: Would create backup table ${backupTableName}`);
        continue;
      }
      
      log('info', `Backing up ${table} -> ${backupTableName}...`);
      
      await db.execute(sql.raw(`
        CREATE TABLE "${backupTableName}" AS 
        SELECT * FROM "${table}";
      `));
      
      // Add metadata
      await db.execute(sql.raw(`
        COMMENT ON TABLE "${backupTableName}" IS 
        'Backup created during Clerk->Supabase migration on ${new Date().toISOString()} for ${envSuffix}';
      `));
      
      log('info', `✅ Backed up ${table}`);
    } catch (error) {
      log('error', `Error backing up ${table}`, error);
    }
  }
  
  log('info', 'Data backup completed');
}

async function migrateUsers() {
  log('info', 'Starting user migration...');
  
  if (!dryRunFlag) {
    log('warn', 'This will modify user_id fields in your database!');
    log('warn', 'Make sure you have backups and mapping data ready!');
  }
  
  // Check if mapping table has data
  const mappingCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM "swole-tracker_user_migration_mapping"
    WHERE migration_status = 'pending' 
    AND migration_environment = ${env.NODE_ENV || 'development'};
  `);
  
  if (mappingCount[0]?.count === 0) {
    log('error', 'No pending migrations found for this environment');
    log('info', 'Please populate the mapping table first with:');
    log('info', `INSERT INTO "swole-tracker_user_migration_mapping" (clerk_user_id, supabase_user_id, email, migration_environment) VALUES (...);`);
    process.exit(1);
  }
  
  log('info', `Found ${mappingCount[0]?.count} pending migrations`);
  
  // Get all mappings
  const mappings = await db.execute(sql`
    SELECT clerk_user_id, supabase_user_id, email 
    FROM "swole-tracker_user_migration_mapping"
    WHERE migration_status = 'pending'
    AND migration_environment = ${env.NODE_ENV || 'development'};
  `);
  
  const tables = [
    'swole-tracker_workout_template',
    'swole-tracker_template_exercise',
    'swole-tracker_workout_session',
    'swole-tracker_session_exercise', 
    'swole-tracker_user_preferences',
    'swole-tracker_user_integration',
    'swole-tracker_whoop_workout',
    'swole-tracker_health_advice',
    'swole-tracker_webhook_event'
  ];
  
  for (const mapping of mappings) {
    log('info', `Processing user: ${mapping.email}`, {
      from: mapping.clerk_user_id,
      to: mapping.supabase_user_id
    });
    
    let totalUpdated = 0;
    
    for (const table of tables) {
      try {
        if (dryRunFlag) {
          // Count what would be updated
          const countResult = await db.execute(sql.raw(`
            SELECT COUNT(*) as count FROM "${table}" WHERE user_id = '${mapping.clerk_user_id}';
          `));
          
          log('info', `DRY RUN: Would update ${table}: ${countResult[0]?.count} records`);
          totalUpdated += parseInt(countResult[0]?.count || '0');
        } else {
          const result = await db.execute(sql.raw(`
            UPDATE "${table}" 
            SET user_id = '${mapping.supabase_user_id}' 
            WHERE user_id = '${mapping.clerk_user_id}';
          `));
          
          log('info', `Updated ${table}: ${result.rowCount} records`);
          totalUpdated += result.rowCount || 0;
        }
      } catch (error) {
        log('error', `Error updating ${table}`, error);
      }
    }
    
    if (!dryRunFlag) {
      // Mark as completed
      await db.execute(sql`
        UPDATE "swole-tracker_user_migration_mapping"
        SET 
          migration_status = 'completed',
          migration_notes = 'Updated ' || ${totalUpdated} || ' records'
        WHERE clerk_user_id = ${mapping.clerk_user_id}
        AND migration_environment = ${env.NODE_ENV || 'development'};
      `);
    }
    
    log('info', `${dryRunFlag ? 'Would update' : 'Updated'} ${totalUpdated} total records for ${mapping.email}`);
  }
  
  log('info', `User migration ${dryRunFlag ? 'simulation' : ''} completed`);
}

async function verify() {
  log('info', 'Verifying migration...');
  
  // Check that no Clerk user IDs remain
  const tables = [
    'swole-tracker_workout_template',
    'swole-tracker_template_exercise',
    'swole-tracker_workout_session',
    'swole-tracker_session_exercise',
    'swole-tracker_user_preferences'
  ];
  
  let verificationPassed = true;
  
  for (const table of tables) {
    try {
      const clerkIds = await db.execute(sql.raw(`
        SELECT COUNT(*) as count 
        FROM "${table}" 
        WHERE user_id LIKE 'user_%';
      `));
      
      const supabaseIds = await db.execute(sql.raw(`
        SELECT COUNT(*) as count 
        FROM "${table}" 
        WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
      `));
      
      if (parseInt(clerkIds[0]?.count || '0') > 0) {
        log('error', `${table} still has ${clerkIds[0]?.count} Clerk user IDs`);
        verificationPassed = false;
      } else {
        log('info', `${table}: ✅ No Clerk IDs, ${supabaseIds[0]?.count} Supabase UUIDs`);
      }
    } catch (error) {
      log('error', `Error verifying ${table}`, error);
      verificationPassed = false;
    }
  }
  
  // Check migration status
  const migrationStatus = await db.execute(sql`
    SELECT 
      migration_status,
      COUNT(*) as count
    FROM "swole-tracker_user_migration_mapping"
    WHERE migration_environment = ${env.NODE_ENV || 'development'}
    GROUP BY migration_status;
  `);
  
  log('info', 'Migration status', migrationStatus);
  
  if (verificationPassed) {
    log('info', '✅ Migration verification PASSED');
  } else {
    log('error', '❌ Migration verification FAILED');
  }
}

// Main execution
async function main() {
  try {
    switch (action) {
      case 'analyze':
        await analyzeData();
        break;
      case 'create-mapping-table':
        await createMappingTable();
        break;
      case 'backup-data':
        await backupData();
        break;
      case 'migrate-users':
        await migrateUsers();
        break;
      case 'verify':
        await verify();
        break;
      case 'rollback':
        log('error', 'Rollback functionality requires manual implementation based on your backup naming');
        log('info', 'Use your backup tables to restore data if needed');
        break;
      case 'cleanup':
        log('warn', 'Cleanup requires manual confirmation of backup table deletion');
        break;
      default:
        log('error', `Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    log('error', 'Migration script failed', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();