// Database types extracted from Drizzle schema
// This file provides comprehensive TypeScript types for all database tables

// ===========================================
// ENUMS AND CONSTANTS
// ===========================================

export type WeightUnit = "kg" | "lbs";
export type ThemeType = "dark" | "light" | "system";
export type DeviceType = "android" | "ios" | "desktop" | "ipad" | "other";
export type ProgressionType = "linear" | "percentage" | "adaptive";
export type SwipeAction = "collapse_expand" | string; // Extensible for future actions
export type IntegrationProvider = "whoop" | "strava" | string; // Extensible for future providers
export type WebhookStatus = "received" | "processed" | "failed" | "ignored";
export type SuggestionAction = "accepted" | "rejected" | "modified";
export type WhoopScoreState = "SCORED" | "PENDING_SCORE" | string; // Extensible for WHOOP states

// ===========================================
// CORE WORKOUT TABLES
// ===========================================

// Workout Templates
export interface WorkoutTemplate {
  id: number;
  name: string;
  user_id: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWorkoutTemplate {
  name: string;
  user_id: string;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWorkoutTemplate {
  name?: string;
  updatedAt?: Date | null;
}

// Template Exercises
export interface TemplateExercise {
  id: number;
  user_id: string;
  templateId: number;
  exerciseName: string;
  orderIndex: number;
  linkingRejected: boolean;
  createdAt: Date;
}

export interface InsertTemplateExercise {
  user_id: string;
  templateId: number;
  exerciseName: string;
  orderIndex?: number;
  linkingRejected?: boolean;
  createdAt?: Date;
}

export interface UpdateTemplateExercise {
  exerciseName?: string;
  orderIndex?: number;
  linkingRejected?: boolean;
}

// Workout Sessions
export interface WorkoutSession {
  id: number;
  user_id: string;
  templateId: number;
  workoutDate: Date;
  theme_used: ThemeType | null;
  device_type: DeviceType | null;
  perf_metrics: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWorkoutSession {
  user_id: string;
  templateId: number;
  workoutDate: Date;
  theme_used?: ThemeType | null;
  device_type?: DeviceType | null;
  perf_metrics?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWorkoutSession {
  workoutDate?: Date;
  theme_used?: ThemeType | null;
  device_type?: DeviceType | null;
  perf_metrics?: Record<string, any> | null;
  updatedAt?: Date | null;
}

// Session Exercises
export interface SessionExercise {
  id: number;
  user_id: string;
  sessionId: number;
  templateExerciseId: number | null;
  exerciseName: string;
  setOrder: number;
  weight: string | null; // Stored as numeric string
  reps: number | null;
  sets: number | null;
  unit: string;
  rpe: number | null;
  rest_seconds: number | null;
  is_estimate: boolean;
  is_default_applied: boolean;
  createdAt: Date;
}

export interface InsertSessionExercise {
  user_id: string;
  sessionId: number;
  templateExerciseId?: number | null;
  exerciseName: string;
  setOrder?: number;
  weight?: string | null;
  reps?: number | null;
  sets?: number | null;
  unit?: string;
  rpe?: number | null;
  rest_seconds?: number | null;
  is_estimate?: boolean;
  is_default_applied?: boolean;
  createdAt?: Date;
}

export interface UpdateSessionExercise {
  exerciseName?: string;
  setOrder?: number;
  weight?: string | null;
  reps?: number | null;
  sets?: number | null;
  unit?: string;
  rpe?: number | null;
  rest_seconds?: number | null;
  is_estimate?: boolean;
  is_default_applied?: boolean;
}

// ===========================================
// USER PREFERENCES AND SETTINGS
// ===========================================

export interface UserPreferences {
  id: number;
  user_id: string;
  defaultWeightUnit: string;
  predictive_defaults_enabled: boolean;
  right_swipe_action: string;
  enable_manual_wellness: boolean;
  progression_type: ProgressionType;
  linear_progression_kg: string | null; // Stored as numeric string
  percentage_progression: string | null; // Stored as numeric string
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertUserPreferences {
  user_id: string;
  defaultWeightUnit?: string;
  predictive_defaults_enabled?: boolean;
  right_swipe_action?: string;
  enable_manual_wellness?: boolean;
  progression_type?: ProgressionType;
  linear_progression_kg?: string | null;
  percentage_progression?: string | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateUserPreferences {
  defaultWeightUnit?: string;
  predictive_defaults_enabled?: boolean;
  right_swipe_action?: string;
  enable_manual_wellness?: boolean;
  progression_type?: ProgressionType;
  linear_progression_kg?: string | null;
  percentage_progression?: string | null;
  updatedAt?: Date | null;
}

// ===========================================
// EXERCISE MANAGEMENT
// ===========================================

// Master Exercises
export interface MasterExercise {
  id: number;
  user_id: string;
  name: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertMasterExercise {
  user_id: string;
  name: string;
  normalizedName: string;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateMasterExercise {
  name?: string;
  normalizedName?: string;
  updatedAt?: Date | null;
}

// Exercise Links
export interface ExerciseLink {
  id: number;
  templateExerciseId: number;
  masterExerciseId: number;
  user_id: string;
  createdAt: Date;
}

export interface InsertExerciseLink {
  templateExerciseId: number;
  masterExerciseId: number;
  user_id: string;
  createdAt?: Date;
}

// ===========================================
// EXTERNAL INTEGRATIONS
// ===========================================

// User Integrations
export interface UserIntegration {
  id: number;
  user_id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertUserIntegration {
  user_id: string;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateUserIntegration {
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  isActive?: boolean;
  updatedAt?: Date | null;
}

// External Workouts from Whoop
export interface ExternalWorkoutWhoop {
  id: number;
  user_id: string;
  whoopWorkoutId: string;
  start: Date;
  end: Date;
  timezone_offset: string | null;
  sport_name: string | null;
  score_state: string | null;
  score: Record<string, any> | null;
  during: Record<string, any> | null;
  zone_duration: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertExternalWorkoutWhoop {
  user_id: string;
  whoopWorkoutId: string;
  start: Date;
  end: Date;
  timezone_offset?: string | null;
  sport_name?: string | null;
  score_state?: string | null;
  score?: Record<string, any> | null;
  during?: Record<string, any> | null;
  zone_duration?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateExternalWorkoutWhoop {
  start?: Date;
  end?: Date;
  timezone_offset?: string | null;
  sport_name?: string | null;
  score_state?: string | null;
  score?: Record<string, any> | null;
  during?: Record<string, any> | null;
  zone_duration?: Record<string, any> | null;
  updatedAt?: Date | null;
}

// ===========================================
// WHOOP DATA TABLES
// ===========================================

// WHOOP Recovery Data
export interface WhoopRecovery {
  id: number;
  user_id: string;
  whoop_recovery_id: string;
  cycle_id: string | null;
  date: string; // Date string in YYYY-MM-DD format
  recovery_score: number | null;
  hrv_rmssd_milli: string | null; // Stored as numeric string
  hrv_rmssd_baseline: string | null; // Stored as numeric string
  resting_heart_rate: number | null;
  resting_heart_rate_baseline: number | null;
  raw_data: Record<string, any> | null;
  timezone_offset: string | null;
  webhook_received_at: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWhoopRecovery {
  user_id: string;
  whoop_recovery_id: string;
  cycle_id?: string | null;
  date: string;
  recovery_score?: number | null;
  hrv_rmssd_milli?: string | null;
  hrv_rmssd_baseline?: string | null;
  resting_heart_rate?: number | null;
  resting_heart_rate_baseline?: number | null;
  raw_data?: Record<string, any> | null;
  timezone_offset?: string | null;
  webhook_received_at?: Date;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWhoopRecovery {
  cycle_id?: string | null;
  date?: string;
  recovery_score?: number | null;
  hrv_rmssd_milli?: string | null;
  hrv_rmssd_baseline?: string | null;
  resting_heart_rate?: number | null;
  resting_heart_rate_baseline?: number | null;
  raw_data?: Record<string, any> | null;
  timezone_offset?: string | null;
  webhook_received_at?: Date;
  updatedAt?: Date | null;
}

// WHOOP Cycles Data
export interface WhoopCycle {
  id: number;
  user_id: string;
  whoop_cycle_id: string;
  start: Date;
  end: Date;
  timezone_offset: string | null;
  day_strain: string | null; // Stored as numeric string
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  kilojoule: string | null; // Stored as numeric string
  raw_data: Record<string, any> | null;
  webhook_received_at: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWhoopCycle {
  user_id: string;
  whoop_cycle_id: string;
  start: Date;
  end: Date;
  timezone_offset?: string | null;
  day_strain?: string | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  kilojoule?: string | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWhoopCycle {
  start?: Date;
  end?: Date;
  timezone_offset?: string | null;
  day_strain?: string | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  kilojoule?: string | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  updatedAt?: Date | null;
}

// WHOOP Sleep Data
export interface WhoopSleep {
  id: number;
  user_id: string;
  whoop_sleep_id: string;
  start: Date;
  end: Date;
  timezone_offset: string | null;
  sleep_performance_percentage: number | null;
  total_sleep_time_milli: number | null;
  sleep_efficiency_percentage: string | null; // Stored as numeric string
  slow_wave_sleep_time_milli: number | null;
  rem_sleep_time_milli: number | null;
  light_sleep_time_milli: number | null;
  wake_time_milli: number | null;
  arousal_time_milli: number | null;
  disturbance_count: number | null;
  sleep_latency_milli: number | null;
  raw_data: Record<string, any> | null;
  webhook_received_at: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWhoopSleep {
  user_id: string;
  whoop_sleep_id: string;
  start: Date;
  end: Date;
  timezone_offset?: string | null;
  sleep_performance_percentage?: number | null;
  total_sleep_time_milli?: number | null;
  sleep_efficiency_percentage?: string | null;
  slow_wave_sleep_time_milli?: number | null;
  rem_sleep_time_milli?: number | null;
  light_sleep_time_milli?: number | null;
  wake_time_milli?: number | null;
  arousal_time_milli?: number | null;
  disturbance_count?: number | null;
  sleep_latency_milli?: number | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWhoopSleep {
  start?: Date;
  end?: Date;
  timezone_offset?: string | null;
  sleep_performance_percentage?: number | null;
  total_sleep_time_milli?: number | null;
  sleep_efficiency_percentage?: string | null;
  slow_wave_sleep_time_milli?: number | null;
  rem_sleep_time_milli?: number | null;
  light_sleep_time_milli?: number | null;
  wake_time_milli?: number | null;
  arousal_time_milli?: number | null;
  disturbance_count?: number | null;
  sleep_latency_milli?: number | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  updatedAt?: Date | null;
}

// WHOOP Profile Data
export interface WhoopProfile {
  id: number;
  user_id: string;
  whoop_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  raw_data: Record<string, any> | null;
  webhook_received_at: Date;
  last_updated: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWhoopProfile {
  user_id: string;
  whoop_user_id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  last_updated?: Date;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWhoopProfile {
  whoop_user_id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  last_updated?: Date;
  updatedAt?: Date | null;
}

// WHOOP Body Measurements
export interface WhoopBodyMeasurement {
  id: number;
  user_id: string;
  whoop_measurement_id: string;
  height_meter: string | null; // Stored as numeric string
  weight_kilogram: string | null; // Stored as numeric string
  max_heart_rate: number | null;
  measurement_date: string | null; // Date string in YYYY-MM-DD format
  raw_data: Record<string, any> | null;
  webhook_received_at: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWhoopBodyMeasurement {
  user_id: string;
  whoop_measurement_id: string;
  height_meter?: string | null;
  weight_kilogram?: string | null;
  max_heart_rate?: number | null;
  measurement_date?: string | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWhoopBodyMeasurement {
  height_meter?: string | null;
  weight_kilogram?: string | null;
  max_heart_rate?: number | null;
  measurement_date?: string | null;
  raw_data?: Record<string, any> | null;
  webhook_received_at?: Date;
  updatedAt?: Date | null;
}

// ===========================================
// AI AND WELLNESS FEATURES
// ===========================================

// Health Advice
export interface HealthAdvice {
  id: number;
  user_id: string;
  sessionId: number;
  request: Record<string, any>;
  response: Record<string, any>;
  readiness_rho: string | null; // Stored as numeric string
  overload_multiplier: string | null; // Stored as numeric string
  session_predicted_chance: string | null; // Stored as numeric string
  user_accepted_suggestions: number;
  total_suggestions: number;
  response_time_ms: number | null;
  model_used: string | null;
  createdAt: Date;
}

export interface InsertHealthAdvice {
  user_id: string;
  sessionId: number;
  request: Record<string, any>;
  response: Record<string, any>;
  readiness_rho?: string | null;
  overload_multiplier?: string | null;
  session_predicted_chance?: string | null;
  user_accepted_suggestions?: number;
  total_suggestions: number;
  response_time_ms?: number | null;
  model_used?: string | null;
  createdAt?: Date;
}

export interface UpdateHealthAdvice {
  request?: Record<string, any>;
  response?: Record<string, any>;
  readiness_rho?: string | null;
  overload_multiplier?: string | null;
  session_predicted_chance?: string | null;
  user_accepted_suggestions?: number;
  total_suggestions?: number;
  response_time_ms?: number | null;
  model_used?: string | null;
}

// Wellness Data
export interface WellnessData {
  id: number;
  user_id: string;
  sessionId: number | null;
  date: string; // Date string in YYYY-MM-DD format
  energy_level: number | null;
  sleep_quality: number | null;
  device_timezone: string | null;
  submitted_at: Date;
  has_whoop_data: boolean;
  whoop_data: Record<string, any> | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertWellnessData {
  user_id: string;
  sessionId?: number | null;
  date: string;
  energy_level?: number | null;
  sleep_quality?: number | null;
  device_timezone?: string | null;
  submitted_at?: Date;
  has_whoop_data?: boolean;
  whoop_data?: Record<string, any> | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateWellnessData {
  sessionId?: number | null;
  date?: string;
  energy_level?: number | null;
  sleep_quality?: number | null;
  device_timezone?: string | null;
  submitted_at?: Date;
  has_whoop_data?: boolean;
  whoop_data?: Record<string, any> | null;
  notes?: string | null;
  updatedAt?: Date | null;
}

// AI Suggestion History
export interface AiSuggestionHistory {
  id: number;
  user_id: string;
  sessionId: number;
  exerciseName: string;
  setId: string;
  setIndex: number;
  suggested_weight_kg: string | null; // Stored as numeric string
  suggested_reps: number | null;
  suggested_rest_seconds: number | null;
  suggestion_rationale: string | null;
  action: SuggestionAction;
  accepted_weight_kg: string | null; // Stored as numeric string
  accepted_reps: number | null;
  progression_type: string | null;
  readiness_score: string | null; // Stored as numeric string
  plateau_detected: boolean;
  interaction_time_ms: number | null;
  createdAt: Date;
}

export interface InsertAiSuggestionHistory {
  user_id: string;
  sessionId: number;
  exerciseName: string;
  setId: string;
  setIndex: number;
  suggested_weight_kg?: string | null;
  suggested_reps?: number | null;
  suggested_rest_seconds?: number | null;
  suggestion_rationale?: string | null;
  action: SuggestionAction;
  accepted_weight_kg?: string | null;
  accepted_reps?: number | null;
  progression_type?: string | null;
  readiness_score?: string | null;
  plateau_detected?: boolean;
  interaction_time_ms?: number | null;
  createdAt?: Date;
}

export interface UpdateAiSuggestionHistory {
  exerciseName?: string;
  setId?: string;
  setIndex?: number;
  suggested_weight_kg?: string | null;
  suggested_reps?: number | null;
  suggested_rest_seconds?: number | null;
  suggestion_rationale?: string | null;
  action?: SuggestionAction;
  accepted_weight_kg?: string | null;
  accepted_reps?: number | null;
  progression_type?: string | null;
  readiness_score?: string | null;
  plateau_detected?: boolean;
  interaction_time_ms?: number | null;
}

// ===========================================
// UTILITY AND SYSTEM TABLES
// ===========================================

// Daily Jokes
export interface DailyJoke {
  id: number;
  user_id: string;
  joke: string;
  aiModel: string;
  prompt: string;
  createdAt: Date;
}

export interface InsertDailyJoke {
  user_id: string;
  joke: string;
  aiModel: string;
  prompt: string;
  createdAt?: Date;
}

// Rate Limits
export interface RateLimit {
  id: number;
  user_id: string;
  endpoint: string;
  requests: number;
  windowStart: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface InsertRateLimit {
  user_id: string;
  endpoint: string;
  requests?: number;
  windowStart: Date;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface UpdateRateLimit {
  requests?: number;
  windowStart?: Date;
  updatedAt?: Date | null;
}

// Webhook Events
export interface WebhookEvent {
  id: number;
  provider: string;
  eventType: string;
  userId: string | null;
  externalUserId: string | null;
  externalEntityId: string | null;
  payload: Record<string, any> | null;
  headers: Record<string, any> | null;
  status: WebhookStatus;
  error: string | null;
  processingTime: number | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface InsertWebhookEvent {
  provider: string;
  eventType: string;
  userId?: string | null;
  externalUserId?: string | null;
  externalEntityId?: string | null;
  payload?: Record<string, any> | null;
  headers?: Record<string, any> | null;
  status?: WebhookStatus;
  error?: string | null;
  processingTime?: number | null;
  createdAt?: Date;
  processedAt?: Date | null;
}

export interface UpdateWebhookEvent {
  userId?: string | null;
  status?: WebhookStatus;
  error?: string | null;
  processingTime?: number | null;
  processedAt?: Date | null;
}

// ===========================================
// RELATION TYPES FOR COMPLEX QUERIES
// ===========================================

// Workout Template with Relations
export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  exercises: TemplateExercise[];
}

export interface WorkoutTemplateWithSessions extends WorkoutTemplate {
  sessions: WorkoutSession[];
}

export interface WorkoutTemplateWithAll extends WorkoutTemplate {
  exercises: TemplateExercise[];
  sessions: WorkoutSession[];
}

// Workout Session with Relations
export interface WorkoutSessionWithTemplate extends WorkoutSession {
  template: WorkoutTemplate;
}

export interface WorkoutSessionWithExercises extends WorkoutSession {
  exercises: SessionExercise[];
}

export interface WorkoutSessionWithHealthAdvice extends WorkoutSession {
  healthAdvice: HealthAdvice | null;
}

export interface WorkoutSessionWithWellness extends WorkoutSession {
  wellnessData: WellnessData | null;
}

export interface WorkoutSessionWithAll extends WorkoutSession {
  template: WorkoutTemplate;
  exercises: SessionExercise[];
  healthAdvice: HealthAdvice | null;
  wellnessData: WellnessData | null;
}

// Template Exercise with Relations
export interface TemplateExerciseWithTemplate extends TemplateExercise {
  template: WorkoutTemplate;
}

export interface TemplateExerciseWithSessionExercises extends TemplateExercise {
  sessionExercises: SessionExercise[];
}

export interface TemplateExerciseWithExerciseLink extends TemplateExercise {
  exerciseLink: ExerciseLink | null;
}

// Session Exercise with Relations
export interface SessionExerciseWithSession extends SessionExercise {
  session: WorkoutSession;
}

export interface SessionExerciseWithTemplateExercise extends SessionExercise {
  templateExercise: TemplateExercise | null;
}

// Master Exercise with Relations
export interface MasterExerciseWithLinks extends MasterExercise {
  exerciseLinks: ExerciseLink[];
}

// Exercise Link with Relations
export interface ExerciseLinkWithBoth extends ExerciseLink {
  templateExercise: TemplateExercise;
  masterExercise: MasterExercise;
}

// User Integration with Relations
export interface UserIntegrationWithWhoopWorkouts extends UserIntegration {
  whoopWorkouts: ExternalWorkoutWhoop[];
}

// WHOOP Recovery with Relations
export interface WhoopRecoveryWithCycle extends WhoopRecovery {
  cycle: WhoopCycle | null;
}

// WHOOP Cycle with Relations
export interface WhoopCycleWithRecoveries extends WhoopCycle {
  recoveries: WhoopRecovery[];
}

// ===========================================
// AGGREGATE AND STATISTICS TYPES
// ===========================================

export interface WorkoutStatistics {
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  averageWorkoutDuration?: number;
  lastWorkoutDate?: Date;
  favoriteExercises: Array<{
    exerciseName: string;
    count: number;
  }>;
}

export interface ExerciseProgress {
  exerciseName: string;
  firstWorkout: Date;
  lastWorkout: Date;
  totalSessions: number;
  maxWeight: number;
  currentWeight: number;
  progressPercentage: number;
  recentSessions: Array<{
    date: Date;
    weight: number;
    reps: number;
    sets: number;
  }>;
}

export interface WhoopSummary {
  averageRecoveryScore?: number;
  averageStrain?: number;
  averageSleepPerformance?: number;
  lastSyncDate?: Date;
  totalWorkouts: number;
  dataAvailableDays: number;
}

// ===========================================
// UTILITY TYPES
// ===========================================

// Generic database table interface
export interface BaseTable {
  id: number;
  createdAt: Date;
  updatedAt?: Date | null;
}

// User-scoped table interface
export interface UserScopedTable extends BaseTable {
  user_id: string;
}

// Type helpers for creating type-safe database operations
export type SelectType<T> = T;
export type InsertType<T> = Omit<T, 'id' | 'createdAt'> & {
  createdAt?: Date;
};
export type UpdateType<T> = Partial<Omit<T, 'id' | 'user_id' | 'createdAt'>>;

// Union types for all tables
export type AllSelectTypes = 
  | WorkoutTemplate
  | TemplateExercise
  | WorkoutSession
  | SessionExercise
  | UserPreferences
  | MasterExercise
  | ExerciseLink
  | UserIntegration
  | ExternalWorkoutWhoop
  | WhoopRecovery
  | WhoopCycle
  | WhoopSleep
  | WhoopProfile
  | WhoopBodyMeasurement
  | HealthAdvice
  | WellnessData
  | AiSuggestionHistory
  | DailyJoke
  | RateLimit
  | WebhookEvent;

export type AllInsertTypes = 
  | InsertWorkoutTemplate
  | InsertTemplateExercise
  | InsertWorkoutSession
  | InsertSessionExercise
  | InsertUserPreferences
  | InsertMasterExercise
  | InsertExerciseLink
  | InsertUserIntegration
  | InsertExternalWorkoutWhoop
  | InsertWhoopRecovery
  | InsertWhoopCycle
  | InsertWhoopSleep
  | InsertWhoopProfile
  | InsertWhoopBodyMeasurement
  | InsertHealthAdvice
  | InsertWellnessData
  | InsertAiSuggestionHistory
  | InsertDailyJoke
  | InsertRateLimit
  | InsertWebhookEvent;