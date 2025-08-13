#!/usr/bin/env bun

/**
 * User Mapping Creation Helper
 * 
 * This script helps create the mapping between Clerk users and Supabase users.
 * You'll need to manually match users based on email addresses.
 * 
 * Usage:
 *   bun run scripts/create-user-mapping.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../src/env.js';
import { sql } from 'drizzle-orm';

// Database connection
const connection = postgres(env.DATABASE_URL ?? '');
const db = drizzle(connection);

async function createUserMapping() {
  console.log('🔍 Analyzing existing users in database...');
  
  // Get unique user IDs from the database
  const userIds = await db.execute(sql`
    SELECT DISTINCT user_id, COUNT(*) as record_count
    FROM (
      SELECT user_id FROM "swole-tracker_workout_template" WHERE user_id IS NOT NULL
      UNION ALL
      SELECT user_id FROM "swole-tracker_template_exercise" WHERE user_id IS NOT NULL
      UNION ALL  
      SELECT user_id FROM "swole-tracker_workout_session" WHERE user_id IS NOT NULL
      UNION ALL
      SELECT user_id FROM "swole-tracker_session_exercise" WHERE user_id IS NOT NULL
      UNION ALL
      SELECT user_id FROM "swole-tracker_user_preferences" WHERE user_id IS NOT NULL
    ) combined
    GROUP BY user_id
    ORDER BY record_count DESC;
  `);
  
  console.log(`📊 Found ${userIds.length} unique users in database:`);
  console.log('');
  
  userIds.forEach((user, index) => {
    console.log(`${index + 1}. User ID: ${user.user_id}`);
    console.log(`   Records: ${user.record_count}`);
    console.log('');
  });
  
  console.log('📋 To complete the migration, you need to:');
  console.log('');
  console.log('1. Export users from Clerk dashboard (includes emails)');
  console.log('2. Create corresponding users in Supabase Auth');  
  console.log('3. Insert mapping data into the migration table:');
  console.log('');
  console.log('   INSERT INTO "swole-tracker_user_migration_mapping"');
  console.log('   (clerk_user_id, supabase_user_id, email)');
  console.log('   VALUES');
  console.log("   ('user_clerk_id_1', 'supabase_uuid_1', 'user1@example.com'),");
  console.log("   ('user_clerk_id_2', 'supabase_uuid_2', 'user2@example.com');");
  console.log('');
  console.log('4. Run the migration script:');
  console.log('   bun run scripts/clerk-to-supabase-migration.ts migrate-users');
  console.log('');
  
  // Generate a template SQL for easy copy-paste
  console.log('📝 Template SQL (update with your actual user data):');
  console.log('');
  
  const templateSql = userIds.map((user, index) => {
    return `  ('${user.user_id}', 'REPLACE_WITH_SUPABASE_UUID_${index + 1}', 'REPLACE_WITH_EMAIL_${index + 1}')`;
  }).join(',\n');
  
  console.log('INSERT INTO "swole-tracker_user_migration_mapping"');
  console.log('(clerk_user_id, supabase_user_id, email)');
  console.log('VALUES');
  console.log(templateSql + ';');
  console.log('');
}

// Get recent user activity to help with identification
async function getUserActivity() {
  console.log('📈 Recent user activity (to help identify active users):');
  console.log('');
  
  const recentActivity = await db.execute(sql`
    SELECT 
      user_id,
      COUNT(*) as total_records,
      MAX("createdAt") as last_activity,
      COUNT(DISTINCT CASE WHEN "createdAt" > NOW() - INTERVAL '30 days' THEN 1 END) as recent_activity
    FROM (
      SELECT user_id, "createdAt" FROM "swole-tracker_workout_template" WHERE user_id IS NOT NULL
      UNION ALL
      SELECT user_id, "createdAt" FROM "swole-tracker_workout_session" WHERE user_id IS NOT NULL
    ) combined
    GROUP BY user_id
    ORDER BY last_activity DESC
    LIMIT 10;
  `);
  
  recentActivity.forEach((activity, index) => {
    console.log(`${index + 1}. User: ${activity.user_id}`);
    console.log(`   Total records: ${activity.total_records}`);
    console.log(`   Last activity: ${activity.last_activity}`);
    console.log(`   Recent activity: ${activity.recent_activity} records`);
    console.log('');
  });
}

async function main() {
  try {
    await createUserMapping();
    await getUserActivity();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();