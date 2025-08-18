#!/usr/bin/env tsx

/**
 * Data Migration Script: Supabase PostgreSQL → Cloudflare D1
 * 
 * This script migrates user data from Supabase PostgreSQL to Cloudflare D1
 * with user ID mapping from Supabase Auth to WorkOS.
 * 
 * Usage:
 *   bun run migrate-data --env=staging --dry-run
 *   bun run migrate-data --env=production --execute
 */

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/d1';
import { 
  users, workoutTemplates, templateExercises, workoutSessions, 
  sessionExercises, userPreferences, userIntegrations, userFeedback,
  exerciseLinks, whoopRecovery, whoopSleep, whoopCycles, 
  whoopBodyMeasurements, whoopWorkouts 
} from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

interface MigrationOptions {
  env: 'staging' | 'production';
  dryRun: boolean;
  batchSize: number;
  userIdMapping?: Record<string, string>; // Supabase ID → WorkOS ID
}

interface MigrationStats {
  usersProcessed: number;
  templatesProcessed: number;
  workoutsProcessed: number;
  exercisesProcessed: number;
  preferencesProcessed: number;
  integrationsProcessed: number;
  whoopDataProcessed: number;
  errors: string[];
}

class DataMigrator {
  private supabase: any;
  private d1db: any;
  private options: MigrationOptions;
  private stats: MigrationStats;

  constructor(options: MigrationOptions) {
    this.options = options;
    this.stats = {
      usersProcessed: 0,
      templatesProcessed: 0,
      workoutsProcessed: 0,
      exercisesProcessed: 0,
      preferencesProcessed: 0,
      integrationsProcessed: 0,
      whoopDataProcessed: 0,
      errors: []
    };

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize D1 client (would need actual D1 binding in production)
    console.log('⚠️  D1 client initialization placeholder - requires actual Cloudflare Workers environment');
  }

  /**
   * Main migration orchestrator
   */
  async migrate(): Promise<MigrationStats> {
    console.log('🚀 Starting data migration...');
    console.log(`Environment: ${this.options.env}`);
    console.log(`Dry run: ${this.options.dryRun}`);
    
    try {
      // 1. Migrate user preferences first
      await this.migrateUserPreferences();
      
      // 2. Migrate workout templates and exercises
      await this.migrateWorkoutTemplates();
      
      // 3. Migrate workout sessions and exercises
      await this.migrateWorkoutSessions();
      
      // 4. Migrate user integrations
      await this.migrateUserIntegrations();
      
      // 5. Migrate WHOOP data
      await this.migrateWhoopData();
      
      // 6. Migrate exercise links
      await this.migrateExerciseLinks();
      
      console.log('✅ Migration completed successfully!');
      this.printStats();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push(`Migration failed: ${error}`);
    }
    
    return this.stats;
  }

  /**
   * Migrate user preferences with user ID mapping
   */
  private async migrateUserPreferences(): Promise<void> {
    console.log('📋 Migrating user preferences...');
    
    try {
      const { data: preferences, error } = await this.supabase
        .from('swole-tracker_user_preferences')
        .select('*');
        
      if (error) throw error;
      
      for (const pref of preferences) {
        // Map Supabase user ID to WorkOS user ID
        const workosUserId = this.mapUserId(pref.user_id);
        
        const migratedPref = {
          user_id: workosUserId,
          preferred_units: pref.preferred_units || 'metric',
          default_rest_time: pref.default_rest_time || 60,
          enable_sound: Boolean(pref.enable_sound ?? true),
          predictive_defaults_enabled: Boolean(pref.predictive_defaults_enabled ?? false),
          enable_manual_wellness: Boolean(pref.enable_manual_wellness ?? false),
          createdAt: this.formatDate(pref.createdAt),
          updatedAt: this.formatDate(pref.updatedAt),
        };
        
        if (!this.options.dryRun) {
          // Insert into D1 (placeholder)
          console.log('  → Would insert preference for user:', workosUserId);
        }
        
        this.stats.preferencesProcessed++;
      }
      
      console.log(`✓ Processed ${this.stats.preferencesProcessed} user preferences`);
      
    } catch (error) {
      const errorMsg = `Failed to migrate user preferences: ${error}`;
      console.error('❌', errorMsg);
      this.stats.errors.push(errorMsg);
    }
  }

  /**
   * Migrate workout templates and associated exercises
   */
  private async migrateWorkoutTemplates(): Promise<void> {
    console.log('🏋️  Migrating workout templates...');
    
    try {
      const { data: templates, error } = await this.supabase
        .from('swole-tracker_workout_templates')
        .select(`
          *,
          swole-tracker_template_exercises(*)
        `);
        
      if (error) throw error;
      
      for (const template of templates) {
        const workosUserId = this.mapUserId(template.user_id);
        
        const migratedTemplate = {
          id: template.id,
          user_id: workosUserId,
          name: template.name,
          createdAt: this.formatDate(template.createdAt),
          updatedAt: this.formatDate(template.updatedAt),
        };
        
        if (!this.options.dryRun) {
          // Insert template into D1
          console.log('  → Would insert template:', migratedTemplate.name);
        }
        
        // Migrate associated exercises
        for (const exercise of template['swole-tracker_template_exercises'] || []) {
          const migratedExercise = {
            id: exercise.id,
            user_id: workosUserId,
            templateId: template.id,
            exerciseName: exercise.exerciseName,
            orderIndex: exercise.orderIndex,
            linkingRejected: Boolean(exercise.linkingRejected ?? false),
            createdAt: this.formatDate(exercise.createdAt),
          };
          
          if (!this.options.dryRun) {
            console.log('    → Would insert exercise:', migratedExercise.exerciseName);
          }
          
          this.stats.exercisesProcessed++;
        }
        
        this.stats.templatesProcessed++;
      }
      
      console.log(`✓ Processed ${this.stats.templatesProcessed} templates with ${this.stats.exercisesProcessed} exercises`);
      
    } catch (error) {
      const errorMsg = `Failed to migrate workout templates: ${error}`;
      console.error('❌', errorMsg);
      this.stats.errors.push(errorMsg);
    }
  }

  /**
   * Migrate workout sessions and associated exercises
   */
  private async migrateWorkoutSessions(): Promise<void> {
    console.log('🏃 Migrating workout sessions...');
    
    try {
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data: sessions, error } = await this.supabase
          .from('swole-tracker_workout_sessions')
          .select(`
            *,
            swole-tracker_session_exercises(*)
          `)
          .range(offset, offset + this.options.batchSize - 1);
          
        if (error) throw error;
        
        if (!sessions || sessions.length === 0) {
          hasMore = false;
          continue;
        }
        
        for (const session of sessions) {
          const workosUserId = this.mapUserId(session.user_id);
          
          const migratedSession = {
            id: session.id,
            user_id: workosUserId,
            templateId: session.templateId,
            workoutDate: this.formatDate(session.workoutDate),
            duration: session.duration || null,
            notes: session.notes || null,
            isCompleted: Boolean(session.isCompleted ?? false),
            createdAt: this.formatDate(session.createdAt),
            updatedAt: this.formatDate(session.updatedAt),
          };
          
          if (!this.options.dryRun) {
            console.log('  → Would insert session:', session.id);
          }
          
          // Migrate session exercises
          for (const exercise of session['swole-tracker_session_exercises'] || []) {
            const migratedExercise = {
              id: exercise.id,
              user_id: workosUserId,
              sessionId: session.id,
              exerciseName: exercise.exerciseName,
              sets: exercise.sets || '[]',
              orderIndex: exercise.orderIndex,
              personalBest: Boolean(exercise.personalBest ?? false),
              createdAt: this.formatDate(exercise.createdAt),
            };
            
            if (!this.options.dryRun) {
              console.log('    → Would insert session exercise:', exercise.exerciseName);
            }
          }
          
          this.stats.workoutsProcessed++;
        }
        
        offset += this.options.batchSize;
        hasMore = sessions.length === this.options.batchSize;
      }
      
      console.log(`✓ Processed ${this.stats.workoutsProcessed} workout sessions`);
      
    } catch (error) {
      const errorMsg = `Failed to migrate workout sessions: ${error}`;
      console.error('❌', errorMsg);
      this.stats.errors.push(errorMsg);
    }
  }

  /**
   * Migrate user integrations (WHOOP, etc.)
   */
  private async migrateUserIntegrations(): Promise<void> {
    console.log('🔗 Migrating user integrations...');
    
    try {
      const { data: integrations, error } = await this.supabase
        .from('swole-tracker_user_integrations')
        .select('*');
        
      if (error) throw error;
      
      for (const integration of integrations) {
        const workosUserId = this.mapUserId(integration.user_id);
        
        const migratedIntegration = {
          user_id: workosUserId,
          provider: integration.provider,
          provider_user_id: integration.provider_user_id,
          access_token: integration.access_token, // Encrypt in production
          refresh_token: integration.refresh_token, // Encrypt in production
          expires_at: this.formatDate(integration.expires_at),
          scope: integration.scope || null,
          is_active: Boolean(integration.is_active ?? true),
          createdAt: this.formatDate(integration.createdAt),
          updatedAt: this.formatDate(integration.updatedAt),
        };
        
        if (!this.options.dryRun) {
          console.log('  → Would insert integration:', integration.provider);
        }
        
        this.stats.integrationsProcessed++;
      }
      
      console.log(`✓ Processed ${this.stats.integrationsProcessed} user integrations`);
      
    } catch (error) {
      const errorMsg = `Failed to migrate user integrations: ${error}`;
      console.error('❌', errorMsg);
      this.stats.errors.push(errorMsg);
    }
  }

  /**
   * Migrate WHOOP data (recovery, sleep, cycles, etc.)
   */
  private async migrateWhoopData(): Promise<void> {
    console.log('📊 Migrating WHOOP data...');
    
    const tables = [
      'swole-tracker_whoop_recovery',
      'swole-tracker_whoop_sleep', 
      'swole-tracker_whoop_cycles',
      'swole-tracker_whoop_body_measurements',
      'swole-tracker_whoop_workouts'
    ];
    
    for (const tableName of tables) {
      try {
        const { data: records, error } = await this.supabase
          .from(tableName)
          .select('*');
          
        if (error) throw error;
        
        for (const record of records) {
          const workosUserId = this.mapUserId(record.user_id);
          
          // Transform record based on table type
          const migratedRecord = {
            ...record,
            user_id: workosUserId,
            createdAt: this.formatDate(record.createdAt),
            updatedAt: this.formatDate(record.updatedAt),
          };
          
          if (!this.options.dryRun) {
            console.log(`  → Would insert ${tableName} record for user:`, workosUserId);
          }
          
          this.stats.whoopDataProcessed++;
        }
        
        console.log(`✓ Processed ${records.length} records from ${tableName}`);
        
      } catch (error) {
        const errorMsg = `Failed to migrate ${tableName}: ${error}`;
        console.error('❌', errorMsg);
        this.stats.errors.push(errorMsg);
      }
    }
  }

  /**
   * Migrate exercise links
   */
  private async migrateExerciseLinks(): Promise<void> {
    console.log('🔗 Migrating exercise links...');
    
    try {
      const { data: links, error } = await this.supabase
        .from('swole-tracker_exercise_links')
        .select('*');
        
      if (error) throw error;
      
      for (const link of links) {
        const workosUserId = this.mapUserId(link.user_id);
        
        const migratedLink = {
          id: link.id,
          user_id: workosUserId,
          userExerciseName: link.userExerciseName,
          linkedExerciseName: link.linkedExerciseName,
          confidence: link.confidence || 0.0,
          isUserApproved: Boolean(link.isUserApproved ?? false),
          createdAt: this.formatDate(link.createdAt),
        };
        
        if (!this.options.dryRun) {
          console.log('  → Would insert exercise link:', link.userExerciseName);
        }
      }
      
      console.log(`✓ Processed ${links.length} exercise links`);
      
    } catch (error) {
      const errorMsg = `Failed to migrate exercise links: ${error}`;
      console.error('❌', errorMsg);
      this.stats.errors.push(errorMsg);
    }
  }

  /**
   * Map Supabase user ID to WorkOS user ID
   */
  private mapUserId(supabaseUserId: string): string {
    if (this.options.userIdMapping && this.options.userIdMapping[supabaseUserId]) {
      return this.options.userIdMapping[supabaseUserId];
    }
    
    // Fallback: use Supabase ID if no mapping exists (for testing)
    return supabaseUserId;
  }

  /**
   * Format date for D1 storage (ISO string)
   */
  private formatDate(date: any): string {
    if (!date) return new Date().toISOString();
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return new Date().toISOString();
  }

  /**
   * Print migration statistics
   */
  private printStats(): void {
    console.log('\n📊 Migration Statistics:');
    console.log('─────────────────────────');
    console.log(`Users processed: ${this.stats.usersProcessed}`);
    console.log(`Templates processed: ${this.stats.templatesProcessed}`);
    console.log(`Workouts processed: ${this.stats.workoutsProcessed}`);
    console.log(`Exercises processed: ${this.stats.exercisesProcessed}`);
    console.log(`Preferences processed: ${this.stats.preferencesProcessed}`);
    console.log(`Integrations processed: ${this.stats.integrationsProcessed}`);
    console.log(`WHOOP data processed: ${this.stats.whoopDataProcessed}`);
    console.log(`Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options: MigrationOptions = {
    env: 'staging',
    dryRun: true,
    batchSize: 100,
    userIdMapping: {}
  };
  
  for (const arg of args) {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1] as 'staging' | 'production';
    } else if (arg === '--execute') {
      options.dryRun = false;
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    }
  }
  
  // Validate environment
  if (!['staging', 'production'].includes(options.env)) {
    console.error('❌ Invalid environment. Use --env=staging or --env=production');
    process.exit(1);
  }
  
  // Production safety check
  if (options.env === 'production' && options.dryRun) {
    console.log('🛡️  Production environment detected. Use --execute to run actual migration.');
  }
  
  console.log('🔧 Migration Configuration:');
  console.log(`  Environment: ${options.env}`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log(`  Batch size: ${options.batchSize}`);
  console.log('');
  
  // Initialize and run migrator
  const migrator = new DataMigrator(options);
  await migrator.migrate();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DataMigrator, type MigrationOptions, type MigrationStats };