#!/usr/bin/env bun

/**
 * Interactive Clerk to Supabase Migration Script
 * 
 * This script provides an interactive interface for migrating users
 * from Clerk to Supabase Auth with user input validation.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { env } from '../src/env.js';

const connection = postgres(env.DATABASE_URL);
const db = drizzle(connection);

// Utility functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidClerkId(clerkId: string): boolean {
  return clerkId.startsWith('user_') && clerkId.length > 10;
}

async function prompt(question: string): Promise<string> {
  process.stdout.write(question + ' ');
  for await (const line of console) {
    return line.trim();
  }
  return '';
}

async function confirmAction(message: string): Promise<boolean> {
  const response = await prompt(`${message} (y/N):`);
  return response.toLowerCase() === 'y' || response.toLowerCase() === 'yes';
}

async function showCurrentMappings() {
  console.log('\n📋 Current migration mappings:');
  
  const mappings = await db.execute(sql`
    SELECT clerk_user_id, supabase_user_id, email, migration_status
    FROM "swole-tracker_user_migration_mapping"
    WHERE migration_environment = 'development'
    ORDER BY "migrated_at" DESC;
  `);
  
  if (mappings.length === 0) {
    console.log('   No mappings found.');
    return;
  }
  
  mappings.forEach((mapping, index) => {
    console.log(`   ${index + 1}. ${mapping.email}`);
    console.log(`      Clerk ID: ${mapping.clerk_user_id}`);
    console.log(`      Supabase UUID: ${mapping.supabase_user_id}`);
    console.log(`      Status: ${mapping.migration_status}`);
    console.log('');
  });
}

async function analyzeUser(clerkId: string) {
  console.log(`\n🔍 Analyzing data for Clerk ID: ${clerkId}`);
  
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
  
  let totalRecords = 0;
  
  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT COUNT(*) as count FROM "${table}" WHERE user_id = '${clerkId}';
      `));
      
      const count = parseInt(result[0]?.count || '0');
      if (count > 0) {
        console.log(`   ${table}: ${count} records`);
        totalRecords += count;
      }
    } catch (error) {
      console.log(`   ${table}: Error - ${error.message}`);
    }
  }
  
  console.log(`   Total records: ${totalRecords}`);
  return totalRecords;
}

async function addMapping() {
  console.log('\n➕ Add New User Mapping');
  
  let clerkId = '';
  while (!clerkId || !isValidClerkId(clerkId)) {
    clerkId = await prompt('Enter Clerk User ID (e.g., user_abc123...):');
    if (!isValidClerkId(clerkId)) {
      console.log('❌ Invalid Clerk ID format. Must start with "user_" and be longer than 10 characters.');
    }
  }
  
  // Analyze existing data for this user
  const recordCount = await analyzeUser(clerkId);
  
  if (recordCount === 0) {
    console.log('⚠️  No records found for this Clerk ID.');
    const proceed = await confirmAction('Continue anyway?');
    if (!proceed) return;
  }
  
  let supabaseUuid = '';
  while (!supabaseUuid || !isValidUUID(supabaseUuid)) {
    supabaseUuid = await prompt('Enter Supabase User UUID (e.g., 123e4567-e89b-12d3-a456-426614174000):');
    if (!isValidUUID(supabaseUuid)) {
      console.log('❌ Invalid UUID format. Must be a valid UUID.');
    }
  }
  
  let email = '';
  while (!email || !isValidEmail(email)) {
    email = await prompt('Enter user email address:');
    if (!isValidEmail(email)) {
      console.log('❌ Invalid email format.');
    }
  }
  
  // Check for duplicates
  const existingMapping = await db.execute(sql`
    SELECT * FROM "swole-tracker_user_migration_mapping"
    WHERE (clerk_user_id = ${clerkId} OR supabase_user_id = ${supabaseUuid} OR email = ${email})
    AND migration_environment = 'development';
  `);
  
  if (existingMapping.length > 0) {
    console.log('❌ Duplicate mapping found:');
    existingMapping.forEach(mapping => {
      console.log(`   ${mapping.email}: ${mapping.clerk_user_id} → ${mapping.supabase_user_id}`);
    });
    return;
  }
  
  // Confirm before inserting
  console.log('\n📝 Mapping to add:');
  console.log(`   Email: ${email}`);
  console.log(`   Clerk ID: ${clerkId}`);
  console.log(`   Supabase UUID: ${supabaseUuid}`);
  console.log(`   Records to migrate: ${recordCount}`);
  
  const confirm = await confirmAction('Add this mapping?');
  if (!confirm) {
    console.log('❌ Cancelled.');
    return;
  }
  
  try {
    await db.execute(sql`
      INSERT INTO "swole-tracker_user_migration_mapping"
      (clerk_user_id, supabase_user_id, email, migration_environment)
      VALUES (${clerkId}, ${supabaseUuid}, ${email}, 'development');
    `);
    
    console.log('✅ Mapping added successfully!');
  } catch (error) {
    console.log('❌ Error adding mapping:', error.message);
  }
}

async function updateMapping() {
  console.log('\n✏️  Update Existing Mapping');
  
  await showCurrentMappings();
  
  const clerkId = await prompt('Enter Clerk User ID to update:');
  
  const existing = await db.execute(sql`
    SELECT * FROM "swole-tracker_user_migration_mapping"
    WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
  `);
  
  if (existing.length === 0) {
    console.log('❌ No mapping found for that Clerk ID.');
    return;
  }
  
  const mapping = existing[0];
  console.log('\n📝 Current mapping:');
  console.log(`   Email: ${mapping.email}`);
  console.log(`   Clerk ID: ${mapping.clerk_user_id}`);
  console.log(`   Supabase UUID: ${mapping.supabase_user_id}`);
  console.log(`   Status: ${mapping.migration_status}`);
  
  const field = await prompt('What to update? (email/supabase_id/status):');
  
  let newValue = '';
  switch (field.toLowerCase()) {
    case 'email':
      while (!newValue || !isValidEmail(newValue)) {
        newValue = await prompt('New email address:');
        if (!isValidEmail(newValue)) {
          console.log('❌ Invalid email format.');
        }
      }
      await db.execute(sql`
        UPDATE "swole-tracker_user_migration_mapping"
        SET email = ${newValue}
        WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
      `);
      break;
      
    case 'supabase_id':
      while (!newValue || !isValidUUID(newValue)) {
        newValue = await prompt('New Supabase UUID:');
        if (!isValidUUID(newValue)) {
          console.log('❌ Invalid UUID format.');
        }
      }
      await db.execute(sql`
        UPDATE "swole-tracker_user_migration_mapping"
        SET supabase_user_id = ${newValue}
        WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
      `);
      break;
      
    case 'status':
      newValue = await prompt('New status (pending/completed/failed):');
      if (!['pending', 'completed', 'failed'].includes(newValue)) {
        console.log('❌ Invalid status. Must be pending, completed, or failed.');
        return;
      }
      await db.execute(sql`
        UPDATE "swole-tracker_user_migration_mapping"
        SET migration_status = ${newValue}
        WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
      `);
      break;
      
    default:
      console.log('❌ Invalid field. Choose email, supabase_id, or status.');
      return;
  }
  
  console.log('✅ Mapping updated successfully!');
}

async function runMigration(dryRun: boolean = true) {
  const mode = dryRun ? 'DRY RUN' : 'ACTUAL MIGRATION';
  console.log(`\n🚀 ${mode}`);
  
  if (!dryRun) {
    console.log('⚠️  WARNING: This will permanently modify your database!');
    console.log('⚠️  Make sure you have backups before proceeding!');
    const confirm = await confirmAction('Continue with actual migration?');
    if (!confirm) {
      console.log('❌ Migration cancelled.');
      return;
    }
  }
  
  // Run the existing migration script
  const { spawn } = require('child_process');
  const args = ['run', 'scripts/production-migration.ts', '--env', 'development', 'migrate-users'];
  if (dryRun) args.push('--dry-run');
  
  const child = spawn('bun', args, { stdio: 'inherit' });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ ${mode} completed successfully!`);
    } else {
      console.log(`\n❌ ${mode} failed with exit code ${code}`);
    }
  });
}

async function deleteMapping() {
  console.log('\n🗑️  Delete Mapping');
  
  await showCurrentMappings();
  
  const clerkId = await prompt('Enter Clerk User ID to delete:');
  
  const existing = await db.execute(sql`
    SELECT * FROM "swole-tracker_user_migration_mapping"
    WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
  `);
  
  if (existing.length === 0) {
    console.log('❌ No mapping found for that Clerk ID.');
    return;
  }
  
  const mapping = existing[0];
  console.log(`\n⚠️  About to delete mapping for: ${mapping.email}`);
  console.log(`   Clerk ID: ${mapping.clerk_user_id}`);
  console.log(`   Supabase UUID: ${mapping.supabase_user_id}`);
  
  const confirm = await confirmAction('Delete this mapping?');
  if (!confirm) {
    console.log('❌ Cancelled.');
    return;
  }
  
  await db.execute(sql`
    DELETE FROM "swole-tracker_user_migration_mapping"
    WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
  `);
  
  console.log('✅ Mapping deleted successfully!');
}

async function main() {
  console.log('🚀 Interactive Clerk to Supabase Migration Tool');
  console.log('🌍 Environment: development');
  console.log('🗄️  Database:', env.DATABASE_URL?.substring(0, 30) + '...');
  
  // Enable stdin for Bun
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  while (true) {
    console.log('\n📋 What would you like to do?');
    console.log('   1. Show current mappings');
    console.log('   2. Add new user mapping');
    console.log('   3. Update existing mapping');
    console.log('   4. Delete mapping');
    console.log('   5. Analyze user data');
    console.log('   6. Run migration (dry-run)');
    console.log('   7. Run actual migration');
    console.log('   8. Exit');
    
    const choice = await prompt('\nEnter choice (1-8):');
    
    try {
      switch (choice) {
        case '1':
          await showCurrentMappings();
          break;
        case '2':
          await addMapping();
          break;
        case '3':
          await updateMapping();
          break;
        case '4':
          await deleteMapping();
          break;
        case '5':
          const clerkId = await prompt('Enter Clerk User ID to analyze:');
          await analyzeUser(clerkId);
          break;
        case '6':
          await runMigration(true);
          break;
        case '7':
          await runMigration(false);
          break;
        case '8':
          console.log('👋 Goodbye!');
          process.exit(0);
        default:
          console.log('❌ Invalid choice. Please enter 1-8.');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n👋 Goodbye!');
  await connection.end();
  process.exit(0);
});

main().catch(async (error) => {
  console.error('❌ Fatal error:', error);
  await connection.end();
  process.exit(1);
});