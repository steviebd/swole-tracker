#!/usr/bin/env bun

/**
 * Simple Migration Management Script
 * 
 * Provides basic commands for managing user migrations.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { env } from '../src/env.js';

const connection = postgres(env.DATABASE_URL);
const db = drizzle(connection);

const command = process.argv[2];
const args = process.argv.slice(3);

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

async function showMappings() {
  console.log('📋 Current migration mappings:');
  
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

async function addMapping(clerkId: string, supabaseUuid: string, email: string) {
  // Validate inputs
  if (!isValidClerkId(clerkId)) {
    console.log('❌ Invalid Clerk ID format. Must start with "user_"');
    return;
  }
  
  if (!isValidUUID(supabaseUuid)) {
    console.log('❌ Invalid UUID format.');
    return;
  }
  
  if (!isValidEmail(email)) {
    console.log('❌ Invalid email format.');
    return;
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
  
  // Analyze existing data
  console.log(`🔍 Analyzing data for Clerk ID: ${clerkId}`);
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
  
  try {
    await db.execute(sql`
      INSERT INTO "swole-tracker_user_migration_mapping"
      (clerk_user_id, supabase_user_id, email, migration_environment)
      VALUES (${clerkId}, ${supabaseUuid}, ${email}, 'development');
    `);
    
    console.log('✅ Mapping added successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Clerk ID: ${clerkId}`);
    console.log(`   Supabase UUID: ${supabaseUuid}`);
    console.log(`   Records to migrate: ${totalRecords}`);
  } catch (error) {
    console.log('❌ Error adding mapping:', error.message);
  }
}

async function updateMapping(clerkId: string, field: string, newValue: string) {
  const existing = await db.execute(sql`
    SELECT * FROM "swole-tracker_user_migration_mapping"
    WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
  `);
  
  if (existing.length === 0) {
    console.log('❌ No mapping found for that Clerk ID.');
    return;
  }
  
  const mapping = existing[0];
  console.log('📝 Current mapping:');
  console.log(`   Email: ${mapping.email}`);
  console.log(`   Clerk ID: ${mapping.clerk_user_id}`);
  console.log(`   Supabase UUID: ${mapping.supabase_user_id}`);
  console.log(`   Status: ${mapping.migration_status}`);
  
  try {
    switch (field.toLowerCase()) {
      case 'email':
        if (!isValidEmail(newValue)) {
          console.log('❌ Invalid email format.');
          return;
        }
        await db.execute(sql`
          UPDATE "swole-tracker_user_migration_mapping"
          SET email = ${newValue}
          WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
        `);
        break;
        
      case 'supabase_id':
        if (!isValidUUID(newValue)) {
          console.log('❌ Invalid UUID format.');
          return;
        }
        await db.execute(sql`
          UPDATE "swole-tracker_user_migration_mapping"
          SET supabase_user_id = ${newValue}
          WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
        `);
        break;
        
      case 'status':
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
    
    console.log(`✅ Updated ${field} to: ${newValue}`);
  } catch (error) {
    console.log('❌ Error updating mapping:', error.message);
  }
}

async function deleteMapping(clerkId: string) {
  const existing = await db.execute(sql`
    SELECT * FROM "swole-tracker_user_migration_mapping"
    WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
  `);
  
  if (existing.length === 0) {
    console.log('❌ No mapping found for that Clerk ID.');
    return;
  }
  
  const mapping = existing[0];
  console.log(`🗑️  Deleting mapping for: ${mapping.email}`);
  console.log(`   Clerk ID: ${mapping.clerk_user_id}`);
  console.log(`   Supabase UUID: ${mapping.supabase_user_id}`);
  
  await db.execute(sql`
    DELETE FROM "swole-tracker_user_migration_mapping"
    WHERE clerk_user_id = ${clerkId} AND migration_environment = 'development';
  `);
  
  console.log('✅ Mapping deleted successfully!');
}

async function analyzeUser(clerkId: string) {
  console.log(`🔍 Analyzing data for Clerk ID: ${clerkId}`);
  
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

function showHelp() {
  console.log(`
🚀 Simple Migration Management Script

Usage: bun run scripts/simple-migration.ts <command> [args]

Commands:
  show                                    - Show current mappings
  add <clerkId> <supabaseUuid> <email>   - Add new mapping
  update <clerkId> <field> <newValue>    - Update existing mapping
  delete <clerkId>                       - Delete mapping
  analyze <clerkId>                      - Analyze user data
  migrate-dry                            - Run migration dry-run
  migrate                                - Run actual migration

Examples:
  # Show current mappings
  bun run scripts/simple-migration.ts show

  # Add new mapping
  bun run scripts/simple-migration.ts add user_abc123 123e4567-e89b-12d3-a456-426614174000 user@example.com

  # Update email address
  bun run scripts/simple-migration.ts update user_abc123 email newemail@example.com

  # Update Supabase UUID
  bun run scripts/simple-migration.ts update user_abc123 supabase_id cb72d98b-e8c9-4f56-a2e0-65b43c2fd6e4

  # Analyze user data
  bun run scripts/simple-migration.ts analyze user_abc123

  # Run migration dry-run
  bun run scripts/simple-migration.ts migrate-dry

  # Run actual migration
  bun run scripts/simple-migration.ts migrate
  `);
}

async function main() {
  try {
    switch (command) {
      case 'show':
        await showMappings();
        break;
        
      case 'add':
        if (args.length !== 3) {
          console.log('❌ Usage: add <clerkId> <supabaseUuid> <email>');
          return;
        }
        await addMapping(args[0], args[1], args[2]);
        break;
        
      case 'update':
        if (args.length !== 3) {
          console.log('❌ Usage: update <clerkId> <field> <newValue>');
          return;
        }
        await updateMapping(args[0], args[1], args[2]);
        break;
        
      case 'delete':
        if (args.length !== 1) {
          console.log('❌ Usage: delete <clerkId>');
          return;
        }
        await deleteMapping(args[0]);
        break;
        
      case 'analyze':
        if (args.length !== 1) {
          console.log('❌ Usage: analyze <clerkId>');
          return;
        }
        await analyzeUser(args[0]);
        break;
        
      case 'migrate-dry':
        console.log('🚀 Running migration dry-run...');
        const { spawn: spawnDry } = require('child_process');
        const childDry = spawn('bun', ['run', 'scripts/production-migration.ts', '--env', 'development', 'migrate-users', '--dry-run'], { stdio: 'inherit' });
        break;
        
      case 'migrate':
        console.log('🚀 Running actual migration...');
        const { spawn } = require('child_process');
        const child = spawn('bun', ['run', 'scripts/production-migration.ts', '--env', 'development', 'migrate-users'], { stdio: 'inherit' });
        break;
        
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

main();