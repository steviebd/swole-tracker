#!/usr/bin/env bun

/**
 * Migration Helper Script
 * 
 * Provides utilities to help with Clerk -> Supabase migration across environments.
 * Includes user mapping creation and validation tools.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';

const action = process.argv[2];
const envFile = process.argv[3] || '.env';

if (!action) {
  console.log(`
🛠️  Migration Helper Tools

Usage: bun run scripts/migration-helper.ts [action] [env-file]

Actions:
  create-mapping    - Generate mapping SQL from current users
  validate-mapping  - Validate mapping data
  user-report      - Generate detailed user report

Examples:
  # Development
  bun run scripts/migration-helper.ts create-mapping

  # Production  
  bun run scripts/migration-helper.ts create-mapping .env.production
  `);
  process.exit(1);
}

// Load environment
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
const connection = postgres(env.DATABASE_URL ?? '');
const db = drizzle(connection);

console.log(`🔧 Using: ${envFile} (${env.NODE_ENV || 'development'})`);

async function createMapping() {
  console.log('🔍 Analyzing users for mapping generation...');
  
  // Get all unique user IDs with their data spread
  const userAnalysis = await db.execute(sql`
    WITH user_data AS (
      SELECT 
        user_id,
        'workout_template' as table_name,
        COUNT(*) as record_count,
        MAX("createdAt") as last_activity
      FROM "swole-tracker_workout_template" 
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      
      UNION ALL
      
      SELECT 
        user_id,
        'workout_session' as table_name,
        COUNT(*) as record_count,
        MAX("createdAt") as last_activity
      FROM "swole-tracker_workout_session"
      WHERE user_id IS NOT NULL  
      GROUP BY user_id
      
      UNION ALL
      
      SELECT 
        user_id,
        'session_exercise' as table_name,
        COUNT(*) as record_count,
        MAX("createdAt") as last_activity
      FROM "swole-tracker_session_exercise"
      WHERE user_id IS NOT NULL
      GROUP BY user_id
    )
    SELECT 
      user_id,
      COUNT(DISTINCT table_name) as tables_with_data,
      SUM(record_count) as total_records,
      MAX(last_activity) as most_recent_activity
    FROM user_data
    GROUP BY user_id
    ORDER BY total_records DESC, most_recent_activity DESC;
  `);
  
  console.log(`\n📊 Found ${userAnalysis.length} unique users:\n`);
  
  userAnalysis.forEach((user, index) => {
    console.log(`${index + 1}. User ID: ${user.user_id}`);
    console.log(`   Tables: ${user.tables_with_data}`);
    console.log(`   Records: ${user.total_records}`);
    console.log(`   Last activity: ${user.most_recent_activity}`);
    console.log('');
  });
  
  // Generate mapping SQL template
  console.log('📝 Generated mapping SQL template:');
  console.log('');
  console.log('-- Insert this into your mapping table after updating with real Supabase UUIDs and emails');
  console.log('INSERT INTO "swole-tracker_user_migration_mapping"');
  console.log('(clerk_user_id, supabase_user_id, email, migration_environment)');
  console.log('VALUES');
  
  const mappingValues = userAnalysis.map((user, index) => {
    return `  ('${user.user_id}', 'REPLACE_WITH_SUPABASE_UUID_${index + 1}', 'user${index + 1}@example.com', '${env.NODE_ENV || 'development'}')`;
  });
  
  console.log(mappingValues.join(',\n') + ';');
  console.log('');
  
  // Save to file
  const sqlFile = `user-mapping-${env.NODE_ENV || 'development'}-${Date.now()}.sql`;
  const sqlContent = `-- User mapping for ${env.NODE_ENV || 'development'} environment
-- Generated on ${new Date().toISOString()}
-- Total users: ${userAnalysis.length}

INSERT INTO "swole-tracker_user_migration_mapping"
(clerk_user_id, supabase_user_id, email, migration_environment)
VALUES
${mappingValues.join(',\n')};

-- User analysis:
${userAnalysis.map((user, index) => `-- ${index + 1}. ${user.user_id}: ${user.total_records} records across ${user.tables_with_data} tables`).join('\n')}
`;
  
  await Bun.write(sqlFile, sqlContent);
  console.log(`💾 Saved mapping template to: ${sqlFile}`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Update the SQL file with real Supabase user UUIDs and emails');
  console.log('2. Run the SQL against your database');
  console.log('3. Execute: bun run scripts/production-migration.ts --env-file', envFile, 'migrate-users --dry-run');
}

async function validateMapping() {
  console.log('🔍 Validating mapping data...');
  
  try {
    const mappings = await db.execute(sql`
      SELECT 
        clerk_user_id,
        supabase_user_id,
        email,
        migration_status,
        migration_environment
      FROM "swole-tracker_user_migration_mapping"
      WHERE migration_environment = ${env.NODE_ENV || 'development'}
      ORDER BY migrated_at DESC;
    `);
    
    if (mappings.length === 0) {
      console.log('❌ No mapping data found for this environment');
      console.log('Run create-mapping first to generate mapping SQL');
      return;
    }
    
    console.log(`\n📋 Found ${mappings.length} mappings for ${env.NODE_ENV || 'development'}:\n`);
    
    let validMappings = 0;
    let invalidMappings = 0;
    
    for (const mapping of mappings) {
      console.log(`👤 ${mapping.email}`);
      console.log(`   Clerk ID: ${mapping.clerk_user_id}`);
      console.log(`   Supabase ID: ${mapping.supabase_user_id}`);
      console.log(`   Status: ${mapping.migration_status}`);
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(mapping.supabase_user_id)) {
        console.log('   ❌ Invalid Supabase UUID format');
        invalidMappings++;
      } else {
        console.log('   ✅ Valid UUID format');
        validMappings++;
      }
      
      // Check if Clerk user has data
      const clerkData = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM "swole-tracker_workout_template" 
        WHERE user_id = ${mapping.clerk_user_id}
      `);
      
      console.log(`   Data records: ${clerkData[0]?.count || 0}`);
      console.log('');
    }
    
    console.log(`📊 Validation Summary:`);
    console.log(`   Valid mappings: ${validMappings}`);
    console.log(`   Invalid mappings: ${invalidMappings}`);
    console.log(`   Ready for migration: ${invalidMappings === 0 ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.log('❌ Error validating mappings:', error);
    console.log('Make sure the mapping table exists and has data');
  }
}

async function userReport() {
  console.log('📊 Generating detailed user report...');
  
  const report = {
    environment: env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown',
    users: [] as any[]
  };
  
  // Get detailed user analysis
  const users = await db.execute(sql`
    SELECT DISTINCT user_id 
    FROM "swole-tracker_workout_template" 
    WHERE user_id IS NOT NULL
    UNION
    SELECT DISTINCT user_id 
    FROM "swole-tracker_workout_session" 
    WHERE user_id IS NOT NULL;
  `);
  
  for (const userRow of users) {
    const userId = userRow.user_id;
    console.log(`\n👤 Analyzing user: ${userId}`);
    
    const userReport = {
      user_id: userId,
      tables: {} as Record<string, any>,
      total_records: 0,
      first_activity: null,
      last_activity: null
    };
    
    const tables = [
      'swole-tracker_workout_template',
      'swole-tracker_template_exercise',
      'swole-tracker_workout_session', 
      'swole-tracker_session_exercise',
      'swole-tracker_user_preferences'
    ];
    
    for (const table of tables) {
      try {
        const tableData = await db.execute(sql.raw(`
          SELECT 
            COUNT(*) as count,
            MIN("createdAt") as first_record,
            MAX("createdAt") as last_record
          FROM "${table}"
          WHERE user_id = $1;
        `), [userId]);
        
        const data = tableData[0];
        userReport.tables[table] = {
          count: parseInt(data.count),
          first_record: data.first_record,
          last_record: data.last_record
        };
        
        userReport.total_records += parseInt(data.count);
        
        if (data.first_record && (!userReport.first_activity || data.first_record < userReport.first_activity)) {
          userReport.first_activity = data.first_record;
        }
        
        if (data.last_record && (!userReport.last_activity || data.last_record > userReport.last_activity)) {
          userReport.last_activity = data.last_record;
        }
        
        console.log(`   ${table}: ${data.count} records`);
      } catch (error) {
        console.log(`   ${table}: Error - ${error.message}`);
      }
    }
    
    console.log(`   Total records: ${userReport.total_records}`);
    console.log(`   Activity span: ${userReport.first_activity} to ${userReport.last_activity}`);
    
    report.users.push(userReport);
  }
  
  // Save detailed report
  const reportFile = `user-report-${env.NODE_ENV || 'development'}-${Date.now()}.json`;
  await Bun.write(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Detailed report saved to: ${reportFile}`);
  console.log(`📊 Summary: ${report.users.length} users, ${report.users.reduce((sum, u) => sum + u.total_records, 0)} total records`);
}

async function main() {
  try {
    switch (action) {
      case 'create-mapping':
        await createMapping();
        break;
      case 'validate-mapping':
        await validateMapping();
        break;
      case 'user-report':
        await userReport();
        break;
      default:
        console.log(`❌ Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();