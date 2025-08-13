#!/usr/bin/env bun

/**
 * Complete Clerk to Supabase Migration Script
 * 
 * This script automates the entire migration process:
 * 1. Discovers all Clerk users in the database
 * 2. Prompts for Supabase UUIDs for each user
 * 3. Creates mapping table and mappings
 * 4. Runs the migration
 * 
 * Usage: bun run scripts/complete-migration.ts [--dry-run]
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { env } from '../src/env.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

// Initialize connection later after env parsing

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.findIndex(arg => arg === '--env');
const envFileArg = args.findIndex(arg => arg === '--env-file');
const isDryRun = args.includes('--dry-run');
const isQuiet = args.includes('--quiet');

let envFile = '.env';
let targetEnv = 'development';

if (envFileArg !== -1 && args[envFileArg + 1]) {
  envFile = args[envFileArg + 1];
  targetEnv = envFile.includes('production') ? 'production' : 'development';
} else if (envArg !== -1 && args[envArg + 1]) {
  targetEnv = args[envArg + 1];
  envFile = targetEnv === 'production' ? '.env.production' : '.env';
}

// Load environment variables from specified file
function loadEnv(filePath: string) {
  try {
    const envContent = readFileSync(filePath, 'utf-8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error(`❌ Error loading env file ${filePath}:`, error);
    process.exit(1);
  }
}

const envVars = envFile !== '.env' ? loadEnv(envFile) : {};
const DATABASE_URL = envVars.DATABASE_URL || env.DATABASE_URL;

// Initialize database connection
const connection = postgres(DATABASE_URL);
const db = drizzle(connection);

interface UserData {
  clerkId: string;
  email?: string;
  recordCounts: Record<string, number>;
  totalRecords: number;
}

interface UserMapping {
  clerkId: string;
  supabaseUuid: string;
  email: string;
  totalRecords: number;
}

function log(message: string, data?: any) {
  if (!isQuiet) {
    console.log(message);
    if (data) {
      console.log('   ', JSON.stringify(data, null, 2));
    }
  }
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function prompt(question: string): Promise<string> {
  process.stdout.write(question + ' ');
  
  return new Promise((resolve) => {
    process.stdin.once('readable', () => {
      const input = process.stdin.read();
      if (input !== null) {
        resolve(input.toString().trim());
      }
    });
  });
}

async function confirmAction(message: string): Promise<boolean> {
  const response = await prompt(`${message} (y/N):`);
  return response.toLowerCase() === 'y' || response.toLowerCase() === 'yes';
}

async function discoverUsers(): Promise<UserData[]> {
  log('🔍 Discovering Clerk users in database...');
  
  const tables = [
    'swole-tracker_workout_template',
    'swole-tracker_template_exercise',
    'swole-tracker_workout_session',
    'swole-tracker_session_exercise',
    'swole-tracker_user_preferences',
    'swole-tracker_user_integration',
    'swole-tracker_whoop_workout',
    'swole-tracker_health_advice'
  ];
  
  // Get all unique Clerk user IDs
  const allUserIds = new Set<string>();
  
  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT DISTINCT user_id 
        FROM "${table}" 
        WHERE user_id LIKE 'user_%' AND user_id IS NOT NULL;
      `));
      
      result.forEach(row => {
        if (row.user_id) {
          allUserIds.add(row.user_id);
        }
      });
    } catch (error) {
      log(`⚠️  Error checking ${table}: ${error.message}`);
    }
  }
  
  log(`📊 Found ${allUserIds.size} unique Clerk users`);
  
  // Analyze each user
  const users: UserData[] = [];
  
  for (const clerkId of allUserIds) {
    const userData: UserData = {
      clerkId,
      recordCounts: {},
      totalRecords: 0
    };
    
    log(`\n📋 Analyzing user: ${clerkId}`);
    
    for (const table of tables) {
      try {
        const result = await db.execute(sql.raw(`
          SELECT COUNT(*) as count FROM "${table}" WHERE user_id = '${clerkId}';
        `));
        
        const count = parseInt(result[0]?.count || '0');
        userData.recordCounts[table] = count;
        userData.totalRecords += count;
        
        if (count > 0) {
          log(`   ${table}: ${count} records`);
        }
      } catch (error) {
        log(`   ${table}: Error - ${error.message}`);
        userData.recordCounts[table] = 0;
      }
    }
    
    log(`   Total records: ${userData.totalRecords}`);
    users.push(userData);
  }
  
  return users;
}

async function createMappingTable() {
  log('\n🏗️  Setting up migration infrastructure...');
  
  if (isDryRun) {
    log('DRY RUN: Would create mapping table');
    return;
  }
  
  try {
    const envName = targetEnv;
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "swole-tracker_user_migration_mapping" (
        "id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        "clerk_user_id" varchar(256) NOT NULL UNIQUE,
        "supabase_user_id" varchar(256) NOT NULL UNIQUE,
        "email" varchar(256) NOT NULL,
        "migrated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "migration_status" varchar(50) DEFAULT 'pending' NOT NULL,
        "migration_notes" text,
        "migration_environment" varchar(50) DEFAULT '${targetEnv}' NOT NULL
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
    
    log('✅ Migration table created successfully');
  } catch (error) {
    log('❌ Error creating mapping table:', error);
    throw error;
  }
}

async function collectUserMappings(users: UserData[]): Promise<UserMapping[]> {
  log('\n👥 Collecting Supabase UUID mappings for each user...');
  
  const mappings: UserMapping[] = [];
  
  // Enable stdin
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    console.log(`\n📝 User ${i + 1} of ${users.length}:`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Total records: ${user.totalRecords}`);
    console.log(`   Tables with data: ${Object.entries(user.recordCounts).filter(([, count]) => count > 0).map(([table]) => table.replace('swole-tracker_', '')).join(', ')}`);
    
    // Get email address
    let email = '';
    while (!email || !isValidEmail(email)) {
      email = await prompt('   Enter email address for this user:');
      if (!isValidEmail(email)) {
        console.log('   ❌ Invalid email format. Please try again.');
      }
    }
    
    // Get Supabase UUID
    let supabaseUuid = '';
    while (!supabaseUuid || !isValidUUID(supabaseUuid)) {
      supabaseUuid = await prompt('   Enter Supabase UUID for this user:');
      if (!isValidUUID(supabaseUuid)) {
        console.log('   ❌ Invalid UUID format. Please try again.');
      }
    }
    
    // Check for duplicates
    const isDuplicate = mappings.some(m => 
      m.supabaseUuid === supabaseUuid || 
      m.email === email || 
      m.clerkId === user.clerkId
    );
    
    if (isDuplicate) {
      console.log('   ❌ Duplicate detected! Please use unique values.');
      i--; // Retry this user
      continue;
    }
    
    mappings.push({
      clerkId: user.clerkId,
      supabaseUuid,
      email,
      totalRecords: user.totalRecords
    });
    
    console.log(`   ✅ Added mapping: ${email} (${user.totalRecords} records)`);
  }
  
  return mappings;
}

async function saveMappings(mappings: UserMapping[]) {
  log('\n💾 Saving user mappings...');
  
  if (isDryRun) {
    log('DRY RUN: Would save mappings to database');
    mappings.forEach(mapping => {
      log(`Would add: ${mapping.email} (${mapping.clerkId} → ${mapping.supabaseUuid})`);
    });
    return;
  }
  
  // Clear existing mappings for this environment
  await db.execute(sql`
    DELETE FROM "swole-tracker_user_migration_mapping"
    WHERE migration_environment = ${targetEnv};
  `);
  
  // Insert new mappings
  for (const mapping of mappings) {
    try {
      await db.execute(sql`
        INSERT INTO "swole-tracker_user_migration_mapping"
        (clerk_user_id, supabase_user_id, email, migration_environment, migration_notes)
        VALUES (${mapping.clerkId}, ${mapping.supabaseUuid}, ${mapping.email}, ${targetEnv}, ${`${mapping.totalRecords} records to migrate`});
      `);
      
      log(`✅ Saved mapping: ${mapping.email}`);
    } catch (error) {
      log(`❌ Error saving mapping for ${mapping.email}:`, error);
      throw error;
    }
  }
  
  log(`✅ Saved ${mappings.length} user mappings`);
}

async function runMigration() {
  log('\n🚀 Running migration...');
  
  const migrationArgs = [
    'run', 
    'scripts/production-migration.ts', 
    '--env', 
    targetEnv, 
    'migrate-users'
  ];
  
  if (isDryRun) {
    migrationArgs.push('--dry-run');
  }
  
  return new Promise<void>((resolve, reject) => {
    const child = spawn('bun', migrationArgs, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`\n✅ Migration ${isDryRun ? 'simulation' : ''} completed successfully!`);
        resolve();
      } else {
        log(`\n❌ Migration failed with exit code ${code}`);
        reject(new Error(`Migration failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      log('\n❌ Migration process error:', error);
      reject(error);
    });
  });
}

async function generateSummaryReport(users: UserData[], mappings: UserMapping[]) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    environment: targetEnv,
    dryRun: isDryRun,
    summary: {
      totalUsers: users.length,
      totalRecords: users.reduce((sum, user) => sum + user.totalRecords, 0),
      mappingsCreated: mappings.length
    },
    users: users.map(user => ({
      clerkId: user.clerkId,
      totalRecords: user.totalRecords,
      recordCounts: user.recordCounts
    })),
    mappings: mappings.map(mapping => ({
      email: mapping.email,
      clerkId: mapping.clerkId,
      supabaseUuid: mapping.supabaseUuid,
      totalRecords: mapping.totalRecords
    }))
  };
  
  const filename = `migration-report-${targetEnv}-${Date.now()}.json`;
  writeFileSync(filename, JSON.stringify(report, null, 2));
  
  log(`\n📊 Migration report saved to: ${filename}`);
  
  // Display summary
  console.log('\n📈 Migration Summary:');
  console.log(`   Users discovered: ${users.length}`);
  console.log(`   Total records to migrate: ${report.summary.totalRecords}`);
  console.log(`   Mappings created: ${mappings.length}`);
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes made)' : 'ACTUAL MIGRATION'}`);
  
  if (mappings.length > 0) {
    console.log('\n👥 User Mappings:');
    mappings.forEach((mapping, index) => {
      console.log(`   ${index + 1}. ${mapping.email}`);
      console.log(`      ${mapping.clerkId} → ${mapping.supabaseUuid}`);
      console.log(`      Records: ${mapping.totalRecords}`);
    });
  }
}

async function main() {
  console.log('🚀 Complete Clerk to Supabase Migration');
  console.log(`🔧 Using environment file: ${envFile}`);
  console.log(`🌍 Environment: ${targetEnv}`);
  console.log(`🗄️  Database: ${DATABASE_URL?.substring(0, 30)}...`);
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Step 1: Discover users
    const users = await discoverUsers();
    
    if (users.length === 0) {
      log('\n✅ No Clerk users found in database. Migration not needed.');
      return;
    }
    
    // Step 2: Confirm before proceeding
    console.log(`\n📋 Found ${users.length} users with ${users.reduce((sum, user) => sum + user.totalRecords, 0)} total records.`);
    
    if (!isDryRun) {
      const proceed = await confirmAction('Proceed with setting up the migration?');
      if (!proceed) {
        log('❌ Migration cancelled by user.');
        return;
      }
    }
    
    // Step 3: Create mapping table
    await createMappingTable();
    
    // Step 4: Collect user mappings
    const mappings = await collectUserMappings(users);
    
    // Step 5: Save mappings
    await saveMappings(mappings);
    
    // Step 6: Final confirmation before migration
    if (!isDryRun) {
      console.log('\n⚠️  FINAL CONFIRMATION');
      console.log('⚠️  This will permanently modify your database!');
      console.log('⚠️  Make sure you have backups!');
      
      const finalConfirm = await confirmAction('Run the actual migration now?');
      if (!finalConfirm) {
        log('❌ Migration cancelled. Mappings have been saved for later use.');
        log('💡 To run migration later: bun run scripts/production-migration.ts --env development migrate-users');
        return;
      }
    }
    
    // Step 7: Run migration
    await runMigration();
    
    // Step 8: Generate report
    await generateSummaryReport(users, mappings);
    
    if (!isDryRun) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('💡 Next steps:');
      console.log('   1. Test your application with Supabase Auth');
      console.log('   2. Verify user data is accessible');
      console.log('   3. Monitor for any issues');
    } else {
      console.log('\n🧪 Dry run completed successfully!');
      console.log('💡 To run the actual migration:');
      console.log('   bun run scripts/complete-migration.ts');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n👋 Migration interrupted by user');
  await connection.end();
  process.exit(0);
});

main();