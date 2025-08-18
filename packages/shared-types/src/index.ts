// Shared Types Package - Main Export File
// This file exports all types from both common.ts and database.ts

// Re-export all common types and schemas
export * from './common';

// Re-export all database types
export * from './database';

// Import types for use in functions below
import type {
  BaseTable,
  UserScopedTable,
  WorkoutTemplate,
  WorkoutSession,
  WhoopRecovery,
  WhoopCycle,
  WhoopSleep,
  WhoopProfile,
  WhoopBodyMeasurement,
  WeightUnit,
  ThemeType,
  ProgressionType,
  DeviceType,
  WebhookStatus,
  SuggestionAction,
} from './database';

// ===========================================
// TYPE GUARDS AND UTILITY FUNCTIONS
// ===========================================

/**
 * Type guard to check if a table has user_id field
 */
export function isUserScopedTable(table: any): table is UserScopedTable {
  return table && typeof table === 'object' && 'user_id' in table;
}

/**
 * Type guard to check if a table has the base table structure
 */
export function isBaseTable(table: any): table is BaseTable {
  return table && typeof table === 'object' && 'id' in table && 'createdAt' in table;
}

/**
 * Type guard for workout template
 */
export function isWorkoutTemplate(obj: any): obj is WorkoutTemplate {
  return obj && 
    typeof obj === 'object' && 
    'name' in obj && 
    'user_id' in obj && 
    typeof obj.name === 'string';
}

/**
 * Type guard for workout session
 */
export function isWorkoutSession(obj: any): obj is WorkoutSession {
  return obj && 
    typeof obj === 'object' && 
    'templateId' in obj && 
    'workoutDate' in obj && 
    'user_id' in obj;
}

/**
 * Type guard for WHOOP data tables
 */
export function isWhoopData(obj: any): obj is WhoopRecovery | WhoopCycle | WhoopSleep | WhoopProfile | WhoopBodyMeasurement {
  return obj && 
    typeof obj === 'object' && 
    'user_id' in obj && 
    ('whoop_recovery_id' in obj || 
     'whoop_cycle_id' in obj || 
     'whoop_sleep_id' in obj || 
     'whoop_user_id' in obj || 
     'whoop_measurement_id' in obj);
}

// ===========================================
// CONSTANTS AND DEFAULTS
// ===========================================

export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'kg';
export const DEFAULT_THEME: ThemeType = 'system';
export const DEFAULT_PROGRESSION_TYPE: ProgressionType = 'adaptive';
export const DEFAULT_LINEAR_PROGRESSION_KG = '2.5';
export const DEFAULT_PERCENTAGE_PROGRESSION = '2.5';

export const WEIGHT_UNITS: WeightUnit[] = ['kg', 'lbs'];
export const THEME_TYPES: ThemeType[] = ['dark', 'light', 'system'];
export const DEVICE_TYPES: DeviceType[] = ['android', 'ios', 'desktop', 'ipad', 'other'];
export const PROGRESSION_TYPES: ProgressionType[] = ['linear', 'percentage', 'adaptive'];
export const WEBHOOK_STATUSES: WebhookStatus[] = ['received', 'processed', 'failed', 'ignored'];
export const SUGGESTION_ACTIONS: SuggestionAction[] = ['accepted', 'rejected', 'modified'];

// ===========================================
// TABLE NAME CONSTANTS
// ===========================================

export const TABLE_NAMES = {
  WORKOUT_TEMPLATES: 'swole-tracker_workout_template',
  TEMPLATE_EXERCISES: 'swole-tracker_template_exercise',
  WORKOUT_SESSIONS: 'swole-tracker_workout_session',
  SESSION_EXERCISES: 'swole-tracker_session_exercise',
  USER_PREFERENCES: 'swole-tracker_user_preferences',
  MASTER_EXERCISES: 'swole-tracker_master_exercise',
  EXERCISE_LINKS: 'swole-tracker_exercise_link',
  USER_INTEGRATIONS: 'swole-tracker_user_integration',
  EXTERNAL_WORKOUTS_WHOOP: 'swole-tracker_whoop_workout',
  WHOOP_RECOVERY: 'swole-tracker_whoop_recovery',
  WHOOP_CYCLES: 'swole-tracker_whoop_cycle',
  WHOOP_SLEEP: 'swole-tracker_whoop_sleep',
  WHOOP_PROFILE: 'swole-tracker_whoop_profile',
  WHOOP_BODY_MEASUREMENT: 'swole-tracker_whoop_body_measurement',
  HEALTH_ADVICE: 'swole-tracker_health_advice',
  WELLNESS_DATA: 'swole-tracker_wellness_data',
  AI_SUGGESTION_HISTORY: 'swole-tracker_ai_suggestion_history',
  DAILY_JOKES: 'swole-tracker_daily_joke',
  RATE_LIMITS: 'swole-tracker_rate_limit',
  WEBHOOK_EVENTS: 'swole-tracker_webhook_event',
} as const;

export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];