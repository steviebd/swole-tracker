import { relations, sql } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  sqliteTable,
  text,
  integer,
  real,
  customType,
} from "drizzle-orm/sqlite-core";

// Custom date type for SQLite that stores as ISO string but returns Date objects
const date = customType<{
  data: Date;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  toDriver(value: Date): string {
    return value.toISOString();
  },
  fromDriver(value: string): Date {
    return new Date(value);
  },
});

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTable;

// Users
export const users = createTable(
  "user",
  {
    id: text().primaryKey(),
    email: text(),
    firstName: text(),
    lastName: text(),
    profilePictureUrl: text(),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [index("user_email_idx").on(t.email)],
); // WorkOS-managed identities stored locally for app data isolation

// Workout Templates
export const workoutTemplates = createTable(
  "workout_template",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    user_id: text().notNull(),
    dedupeKey: text(),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("template_user_id_idx").on(t.user_id),
    index("template_name_idx").on(t.name),
    uniqueIndex("template_user_dedupe_idx").on(t.user_id, t.dedupeKey),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Workout Sessions
export const workoutSessions = createTable(
  "workout_session",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    templateId: integer().references(() => workoutTemplates.id, {
      onDelete: "set null",
    }),
    workoutDate: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("workout_session_user_id_idx").on(t.user_id),
    index("workout_session_template_id_idx").on(t.templateId),
    index("workout_session_workout_date_idx").on(t.workoutDate),
    index("workout_session_user_date_idx").on(t.user_id, t.workoutDate),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Template Exercises
export const templateExercises = createTable(
  "template_exercise",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    templateId: integer()
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseName: text().notNull(),
    orderIndex: integer().notNull().default(0),
    linkingRejected: integer({ mode: "boolean" }).notNull().default(false), // Track if user explicitly chose not to link
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (t) => [
    index("template_exercise_user_id_idx").on(t.user_id),
    index("template_exercise_template_id_idx").on(t.templateId),
    index("template_exercise_order_idx").on(t.templateId, t.orderIndex),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Session Exercises
export const sessionExercises = createTable(
  "session_exercise",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    templateExerciseId: integer().references(() => templateExercises.id, {
      onDelete: "set null",
    }),
    exerciseName: text().notNull(),
    resolvedExerciseName: text().notNull().default(""),
    setOrder: integer().notNull().default(0),
    weight: real(),
    reps: integer(),
    sets: integer(),
    unit: text().notNull().default("kg"),
    // Phase 2 additions
    rpe: integer(), // 6-10 recommended in UI, not enforced at DB
    rest_seconds: integer(), // rest time in seconds
    is_estimate: integer({ mode: "boolean" }).notNull().default(false),
    is_default_applied: integer({ mode: "boolean" }).notNull().default(false),
    // Phase 3 additions: Exercise progression computed columns
    one_rm_estimate: real(),
    volume_load: real(),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (t) => [
    index("session_exercise_user_id_idx").on(t.user_id),
    index("session_exercise_session_id_idx").on(t.sessionId),
    index("session_exercise_template_exercise_id_idx").on(t.templateExerciseId),
    index("session_exercise_name_idx").on(t.exerciseName),
    // Critical composite indexes for performance
    index("session_exercise_user_exercise_idx").on(t.user_id, t.exerciseName),
    index("session_exercise_user_exercise_date_idx").on(
      t.user_id,
      t.exerciseName,
      t.sessionId,
    ),
    index("session_exercise_user_resolved_name_idx").on(
      t.user_id,
      t.resolvedExerciseName,
    ),
    index("session_exercise_user_template_idx").on(
      t.user_id,
      t.templateExerciseId,
    ),
    // Performance indexes for volume and progression queries (most critical)
    index("session_exercise_user_weight_idx").on(t.user_id, t.weight),
    index("session_exercise_user_exercise_weight_idx").on(
      t.user_id,
      t.exerciseName,
      t.weight,
    ),
    // Performance indexes for computed columns
    index("session_exercise_user_one_rm_idx").on(t.user_id, t.one_rm_estimate),
    index("session_exercise_user_volume_idx").on(t.user_id, t.volume_load),
    index("session_exercise_user_exercise_one_rm_idx").on(
      t.user_id,
      t.exerciseName,
      t.one_rm_estimate,
    ),
    index("session_exercise_user_exercise_volume_idx").on(
      t.user_id,
      t.exerciseName,
      t.volume_load,
    ),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// User Preferences
export const userPreferences = createTable(
  "user_preferences",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull().unique(),
    defaultWeightUnit: text().notNull().default("kg"),
    // Phase 2 additions
    predictive_defaults_enabled: integer({ mode: "boolean" })
      .notNull()
      .default(false),
    right_swipe_action: text().notNull().default("collapse_expand"),
    // Wellness feature
    enable_manual_wellness: integer({ mode: "boolean" })
      .notNull()
      .default(false),
    // AI Suggestions progression preferences
    progression_type: text().notNull().default("adaptive"), // "linear" | "percentage" | "adaptive"
    linear_progression_kg: real().default(2.5), // Default 2.5kg increment
    percentage_progression: real().default(2.5), // Default 2.5% increment
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [index("user_preferences_user_id_idx").on(t.user_id)],
); // RLS disabled - using WorkOS auth with application-level security


// User Integrations (OAuth tokens for external services)
export const userIntegrations = createTable(
  "user_integration",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    provider: text().notNull(), // 'whoop', 'strava', etc.
    externalUserId: text(), // External provider user identifier
    accessToken: text().notNull(),
    refreshToken: text(),
    expiresAt: date(),
    scope: text(), // OAuth scopes granted
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("user_integration_user_id_idx").on(t.user_id),
    index("user_integration_provider_idx").on(t.provider),
    index("user_integration_user_provider_idx").on(t.user_id, t.provider),
    index("user_integration_external_user_idx").on(t.externalUserId),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// External Workouts from Whoop
export const externalWorkoutsWhoop = createTable(
  "whoop_workout",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoopWorkoutId: text().notNull().unique(), // Whoop's workout ID
    start: date().notNull(),
    end: date().notNull(),
    timezone_offset: text(),
    sport_name: text(),
    score_state: text(), // "SCORED", "PENDING_SCORE", etc.
    score: text(), // Full score object from Whoop
    during: text(), // During metrics object
    zone_duration: text(), // Zone duration object
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("external_workout_whoop_user_id_idx").on(t.user_id),
    index("external_workout_whoop_workout_id_idx").on(t.whoopWorkoutId),
    index("external_workout_whoop_start_idx").on(t.start),
    index("external_workout_whoop_user_start_idx").on(t.user_id, t.start),
    index("external_workout_whoop_user_workout_id_idx").on(
      t.user_id,
      t.whoopWorkoutId,
    ),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Rate Limiting for API requests
export const rateLimits = createTable(
  "rate_limit",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    endpoint: text().notNull(), // e.g., 'whoop_sync'
    requests: integer().notNull().default(0),
    windowStart: text().notNull(),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("rate_limit_user_endpoint_idx").on(t.user_id, t.endpoint),
    index("rate_limit_window_idx").on(t.windowStart),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Master Exercises - Shared exercises across templates
export const masterExercises = createTable(
  "master_exercise",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    name: text().notNull(),
    normalizedName: text().notNull(), // Lowercased, trimmed name for fuzzy matching
    tags: text(), // Comma-separated tags for categorization
    muscleGroup: text(), // Primary muscle group (chest, back, legs, etc.)
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("master_exercise_user_id_idx").on(t.user_id),
    index("master_exercise_name_idx").on(t.name),
    index("master_exercise_normalized_name_idx").on(t.normalizedName),
    index("master_exercise_user_normalized_idx").on(
      t.user_id,
      t.normalizedName,
    ),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Exercise Links - Maps template exercises to master exercises
export const exerciseLinks = createTable(
  "exercise_link",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    templateExerciseId: integer()
      .notNull()
      .unique()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    masterExerciseId: integer()
      .notNull()
      .references(() => masterExercises.id, { onDelete: "cascade" }),
    user_id: text().notNull(),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (t) => [
    index("exercise_link_template_exercise_idx").on(t.templateExerciseId),
    index("exercise_link_master_exercise_idx").on(t.masterExerciseId),
    index("exercise_link_user_id_idx").on(t.user_id),
    index("exercise_link_user_master_idx").on(t.user_id, t.masterExerciseId),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// AI Health Advice - Store AI advice responses for historical tracking
export const healthAdvice = createTable(
  "health_advice",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    // Store the full request and response for historical tracking
    request: text().notNull(), // HealthAdviceRequest object
    response: text().notNull(), // HealthAdviceResponse object
    // Extract key metrics for easy querying
    readiness_rho: real(), // 0.00-1.00
    overload_multiplier: real(), // 0.90-1.10
    session_predicted_chance: real(), // 0.00-1.00
    // Track user interaction
    user_accepted_suggestions: integer().notNull().default(0),
    total_suggestions: integer().notNull(),
    // Performance tracking
    response_time_ms: integer(),
    model_used: text(),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (t) => [
    index("health_advice_user_id_idx").on(t.user_id),
    index("health_advice_session_id_idx").on(t.sessionId),
    index("health_advice_created_at_idx").on(t.createdAt),
    index("health_advice_user_created_idx").on(t.user_id, t.createdAt),
    uniqueIndex("health_advice_user_session_unique").on(t.user_id, t.sessionId),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Session Debriefs - Post-workout AI summaries with version history
export const sessionDebriefs = createTable(
  "session_debrief",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    version: integer().notNull().default(1),
    parentDebriefId: integer(),
    summary: text().notNull(),
    prHighlights: text(),
    adherenceScore: real(),
    focusAreas: text(),
    streakContext: text(),
    overloadDigest: text(),
    metadata: text(),
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    viewedAt: date(),
    dismissedAt: date(),
    pinnedAt: date(),
    regenerationCount: integer().notNull().default(0),
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("session_debrief_user_idx").on(t.user_id),
    index("session_debrief_session_idx").on(t.sessionId),
    index("session_debrief_created_idx").on(t.createdAt),
    index("session_debrief_user_created_idx").on(t.user_id, t.createdAt),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Webhook Events Log (for debugging and audit trail)
export const webhookEvents = createTable(
  "webhook_event",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    provider: text().notNull(), // 'whoop', 'strava', etc.
    eventType: text().notNull(), // 'workout.updated', etc.
    userId: text(), // May be null if user mapping fails
    externalUserId: text(), // User ID from external provider
    externalEntityId: text(), // Workout ID, etc.
    payload: text(), // Full webhook payload
    headers: text(), // Webhook headers for debugging
    status: text().notNull().default("received"), // 'received', 'processed', 'failed', 'ignored'
    error: text(), // Error message if processing failed
    processingTime: integer(), // Processing time in ms
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    processedAt: date(),
  },
  (t) => [
    index("webhook_event_provider_idx").on(t.provider),
    index("webhook_event_type_idx").on(t.eventType),
    index("webhook_event_user_id_idx").on(t.userId),
    index("webhook_event_external_user_id_idx").on(t.externalUserId),
    index("webhook_event_status_idx").on(t.status),
    index("webhook_event_created_at_idx").on(t.createdAt),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// Wellness Data - Manual wellness inputs for enhanced workout intelligence
export const wellnessData = createTable(
  "wellness_data",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer().references(() => workoutSessions.id, {
      onDelete: "cascade",
    }),
    date: date().notNull(),

    // Manual wellness inputs (2 total)
    energy_level: integer(), // 1-10 scale
    sleep_quality: integer(), // 1-10 scale

    // Metadata
    device_timezone: text(), // Store device timezone for context
    submitted_at: date()
      .default(sql`(datetime('now'))`)
      .notNull(), // Prevent backfill attempts

    // Context
    has_whoop_data: integer({ mode: "boolean" }).notNull().default(false),
    whoop_data: text(), // Store actual Whoop metrics for comparison
    notes: text(), // User notes (max 500 chars enforced in app)

    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    // Indexes for performance
    index("wellness_data_user_id_idx").on(t.user_id),
    index("wellness_data_user_date_idx").on(t.user_id, t.date),
    index("wellness_data_user_session_idx").on(t.user_id, t.sessionId),
    index("wellness_data_submitted_at_idx").on(t.user_id, t.submitted_at),
    uniqueIndex("wellness_data_user_session_unique").on(t.user_id, t.sessionId),
  ],
); // RLS disabled - using WorkOS auth with application-level security

// WHOOP Recovery Data (read:recovery)
export const whoopRecovery = createTable(
  "whoop_recovery",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_recovery_id: text().notNull().unique(), // WHOOP's recovery ID
    cycle_id: text(), // Link to cycle
    date: date().notNull(),

    // Recovery metrics
    recovery_score: integer(), // 0-100
    hrv_rmssd_milli: real(), // HRV in milliseconds
    hrv_rmssd_baseline: real(), // HRV baseline
    resting_heart_rate: integer(), // BPM
    resting_heart_rate_baseline: integer(), // BPM baseline
    respiratory_rate: real(), // breaths per minute
    respiratory_rate_baseline: real(), // baseline respiratory rate

    // Full recovery data
    raw_data: text(), // Complete recovery payload from WHOOP

    // Metadata
    timezone_offset: text(),
    webhook_received_at: date()
      .default(sql`(datetime('now'))`)
      .notNull(),

    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("whoop_recovery_user_id_idx").on(t.user_id),
    index("whoop_recovery_user_date_idx").on(t.user_id, t.date),
    index("whoop_recovery_whoop_id_idx").on(t.whoop_recovery_id),
    index("whoop_recovery_cycle_id_idx").on(t.cycle_id),
    index("whoop_recovery_user_received_idx").on(
      t.user_id,
      t.webhook_received_at,
    ),
  ],
);

// WHOOP Cycles Data (read:cycles)
export const whoopCycles = createTable(
  "whoop_cycle",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_cycle_id: text().notNull().unique(), // WHOOP's cycle ID

    // Cycle timing
    start: date().notNull(),
    end: date().notNull(),
    timezone_offset: text(),

    // Cycle metrics
    day_strain: real(), // 0-21 strain scale
    average_heart_rate: integer(), // BPM
    max_heart_rate: integer(), // BPM
    kilojoule: real(), // Energy expenditure
    percent_recorded: real(),
    distance_meter: integer(),
    altitude_gain_meter: integer(),
    altitude_change_meter: integer(),

    // Full cycle data
    raw_data: text(), // Complete cycle payload from WHOOP

    // Metadata
    webhook_received_at: date()
      .default(sql`(datetime('now'))`)
      .notNull(),

    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("whoop_cycle_user_id_idx").on(t.user_id),
    index("whoop_cycle_user_start_idx").on(t.user_id, t.start),
    index("whoop_cycle_whoop_id_idx").on(t.whoop_cycle_id),
    index("whoop_cycle_strain_idx").on(t.user_id, t.day_strain),
  ],
);

// WHOOP Sleep Data (read:sleep)
export const whoopSleep = createTable(
  "whoop_sleep",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_sleep_id: text().notNull().unique(), // WHOOP's sleep ID

    // Sleep timing
    start: date().notNull(),
    end: date().notNull(),
    timezone_offset: text(),

    // Sleep metrics
    sleep_performance_percentage: integer(), // 0-100
    total_sleep_time_milli: integer(), // Milliseconds
    sleep_efficiency_percentage: real(),
    slow_wave_sleep_time_milli: integer(),
    rem_sleep_time_milli: integer(),
    light_sleep_time_milli: integer(),
    wake_time_milli: integer(),
    arousal_time_milli: integer(),
    disturbance_count: integer(),
    sleep_latency_milli: integer(),
    sleep_consistency_percentage: real(),
    sleep_need_baseline_milli: integer(),
    sleep_need_from_sleep_debt_milli: integer(),
    sleep_need_from_recent_strain_milli: integer(),
    sleep_need_from_recent_nap_milli: integer(),

    // Full sleep data
    raw_data: text(), // Complete sleep payload from WHOOP

    // Metadata
    webhook_received_at: date()
      .default(sql`(datetime('now'))`)
      .notNull(),

    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("whoop_sleep_user_id_idx").on(t.user_id),
    index("whoop_sleep_user_start_idx").on(t.user_id, t.start),
    index("whoop_sleep_whoop_id_idx").on(t.whoop_sleep_id),
    index("whoop_sleep_performance_idx").on(
      t.user_id,
      t.sleep_performance_percentage,
    ),
  ],
);

// WHOOP Profile Data (read:profile)
export const whoopProfile = createTable(
  "whoop_profile",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_user_id: text().notNull(), // WHOOP's user ID

    // Profile data
    email: text(),
    first_name: text(),
    last_name: text(),

    // Full profile data
    raw_data: text(), // Complete profile payload from WHOOP

    // Metadata
    webhook_received_at: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    last_updated: date()
      .default(sql`(datetime('now'))`)
      .notNull(),

    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("whoop_profile_user_id_idx").on(t.user_id),
    index("whoop_profile_whoop_user_id_idx").on(t.whoop_user_id),
  ],
);

// WHOOP Body Measurements (read:body_measurement)
export const whoopBodyMeasurement = createTable(
  "whoop_body_measurement",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_measurement_id: text().notNull().unique(), // WHOOP's measurement ID

    // Measurement data
    height_meter: real(), // Height in meters
    weight_kilogram: real(), // Weight in kg
    max_heart_rate: integer(), // BPM

    // Metadata
    measurement_date: date(),

    // Full measurement data
    raw_data: text(), // Complete measurement payload from WHOOP

    // Metadata
    webhook_received_at: date()
      .default(sql`(datetime('now'))`)
      .notNull(),

    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date(),
  },
  (t) => [
    index("whoop_body_measurement_user_id_idx").on(t.user_id),
    index("whoop_body_measurement_date_idx").on(t.user_id, t.measurement_date),
    index("whoop_body_measurement_whoop_id_idx").on(t.whoop_measurement_id),
  ],
);

// OAuth States - Secure state management for OAuth flows
export const oauthStates = createTable(
  "oauth_state",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    state: text().notNull().unique(), // Unique state parameter
    user_id: text().notNull(),
    provider: text().notNull(), // 'whoop', 'strava', etc.
    redirect_uri: text().notNull(), // Callback URI
    client_ip: text(), // IPv4/IPv6 address
    user_agent_hash: text(), // SHA-256 hash of User-Agent
    expiresAt: date()
      .notNull()
      .default(sql`(datetime('now', '+10 minutes'))`), // 10 minute expiry
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (t) => [
    index("oauth_state_user_id_idx").on(t.user_id),
    index("oauth_state_provider_idx").on(t.provider),
    index("oauth_state_expires_at_idx").on(t.expiresAt),
    index("oauth_state_user_provider_idx").on(t.user_id, t.provider),
  ],
); // RLS disabled - using WorkOS auth with application-level security

export const sessions = createTable(
  "session",
  {
    id: text().primaryKey(), // Opaque session ID
    userId: text().notNull(),
    organizationId: text(),
    accessToken: text().notNull(),
    refreshToken: text(),
    expiresAt: integer().notNull(), // Unix timestamp in seconds
    accessTokenExpiresAt: integer(), // Unix timestamp in seconds
    sessionExpiresAt: integer(), // Unix timestamp in seconds
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
    updatedAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (t) => [
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt),
    index("session_access_expires_idx").on(t.accessTokenExpiresAt),
    index("session_session_expires_idx").on(t.sessionExpiresAt),
    // Remove unique constraint on userId to allow multiple sessions per user
  ],
); // RLS disabled - using WorkOS auth with application-level security

// AI Suggestion History - Track user interactions with AI suggestions
export const aiSuggestionHistory = createTable(
  "ai_suggestion_history",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseName: text().notNull(),
    setId: text().notNull(), // Format: templateExerciseId_setIndex
    setIndex: integer().notNull(), // 0-based set index

    // Suggestion details
    suggested_weight_kg: real(),
    suggested_reps: integer(),
    suggested_rest_seconds: integer(),
    suggestion_rationale: text(),

    // User interaction
    action: text().notNull(), // 'accepted', 'rejected', 'modified'
    accepted_weight_kg: real(), // What user actually used
    accepted_reps: integer(),

    // Context
    progression_type: text(), // User's progression preference at time of suggestion
    readiness_score: real(), // Readiness at time of suggestion
    plateau_detected: integer({ mode: "boolean" }).notNull().default(false),

    // Metadata
    interaction_time_ms: integer(), // Time from suggestion to interaction
    createdAt: date()
      .default(sql`(datetime('now'))`)
      .notNull(),
  },
  (t) => [
    index("ai_suggestion_history_user_id_idx").on(t.user_id),
    index("ai_suggestion_history_session_idx").on(t.sessionId),
    index("ai_suggestion_history_exercise_idx").on(t.exerciseName),
    index("ai_suggestion_history_action_idx").on(t.action),
    index("ai_suggestion_history_created_at_idx").on(t.createdAt),
    index("ai_suggestion_history_user_created_idx").on(t.user_id, t.createdAt),
  ],
);

// Relations
export const workoutTemplatesRelations = relations(
  workoutTemplates,
  ({ many }) => ({
    exercises: many(templateExercises),
    sessions: many(workoutSessions),
  }),
);

export const templateExercisesRelations = relations(
  templateExercises,
  ({ one, many }) => ({
    template: one(workoutTemplates, {
      fields: [templateExercises.templateId],
      references: [workoutTemplates.id],
    }),
    sessionExercises: many(sessionExercises),
    exerciseLink: one(exerciseLinks, {
      fields: [templateExercises.id],
      references: [exerciseLinks.templateExerciseId],
    }),
  }),
);

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    template: one(workoutTemplates, {
      fields: [workoutSessions.templateId],
      references: [workoutTemplates.id],
    }),
    exercises: many(sessionExercises),
    healthAdvice: one(healthAdvice, {
      fields: [workoutSessions.id],
      references: [healthAdvice.sessionId],
    }),
    wellnessData: one(wellnessData, {
      fields: [workoutSessions.id],
      references: [wellnessData.sessionId],
    }),
  }),
);

export const sessionExercisesRelations = relations(
  sessionExercises,
  ({ one }) => ({
    session: one(workoutSessions, {
      fields: [sessionExercises.sessionId],
      references: [workoutSessions.id],
    }),
    templateExercise: one(templateExercises, {
      fields: [sessionExercises.templateExerciseId],
      references: [templateExercises.id],
    }),
  }),
);

export const userIntegrationsRelations = relations(
  userIntegrations,
  ({ many }) => ({
    whoopWorkouts: many(externalWorkoutsWhoop),
  }),
);

export const externalWorkoutsWhoopRelations = relations(
  externalWorkoutsWhoop,
  ({ one }) => ({
    integration: one(userIntegrations, {
      fields: [externalWorkoutsWhoop.user_id],
      references: [userIntegrations.user_id],
    }),
  }),
);

export const masterExercisesRelations = relations(
  masterExercises,
  ({ many }) => ({
    exerciseLinks: many(exerciseLinks),
  }),
);

export const exerciseLinksRelations = relations(exerciseLinks, ({ one }) => ({
  templateExercise: one(templateExercises, {
    fields: [exerciseLinks.templateExerciseId],
    references: [templateExercises.id],
  }),
  masterExercise: one(masterExercises, {
    fields: [exerciseLinks.masterExerciseId],
    references: [masterExercises.id],
  }),
}));

export const healthAdviceRelations = relations(healthAdvice, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [healthAdvice.sessionId],
    references: [workoutSessions.id],
  }),
}));

export const sessionDebriefsRelations = relations(
  sessionDebriefs,
  ({ one, many }) => ({
    session: one(workoutSessions, {
      fields: [sessionDebriefs.sessionId],
      references: [workoutSessions.id],
    }),
    parent: one(sessionDebriefs, {
      fields: [sessionDebriefs.parentDebriefId],
      references: [sessionDebriefs.id],
      relationName: "session_debrief_parent",
    }),
    versions: many(sessionDebriefs, {
      relationName: "session_debrief_parent",
    }),
  }),
);

export const wellnessDataRelations = relations(wellnessData, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [wellnessData.sessionId],
    references: [workoutSessions.id],
  }),
}));

export const aiSuggestionHistoryRelations = relations(
  aiSuggestionHistory,
  ({ one }) => ({
    session: one(workoutSessions, {
      fields: [aiSuggestionHistory.sessionId],
      references: [workoutSessions.id],
    }),
  }),
);

export const whoopRecoveryRelations = relations(whoopRecovery, ({ one }) => ({
  cycle: one(whoopCycles, {
    fields: [whoopRecovery.cycle_id],
    references: [whoopCycles.whoop_cycle_id],
  }),
}));

export const whoopCyclesRelations = relations(whoopCycles, ({ many }) => ({
  recoveries: many(whoopRecovery),
}));

export const whoopSleepRelations = relations(whoopSleep, ({}) => ({
  // Could add relationship to cycles if needed
}));

export const whoopProfileRelations = relations(whoopProfile, ({}) => ({
  // Profile is standalone
}));

export const whoopBodyMeasurementRelations = relations(
  whoopBodyMeasurement,
  ({}) => ({
    // Measurements are standalone
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
