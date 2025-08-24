import { relations, sql } from "drizzle-orm";
import { index, sqliteTableCreator, unique, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * D1/SQLite schema for the Swole Tracker application.
 * Migrated from PostgreSQL schema to SQLite/D1 compatibility.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `swole-tracker_${name}`);

// Workout Templates
export const workoutTemplates = createTable(
  "workout_template",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    name: d.text().notNull(),
    user_id: d.text().notNull(),
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("template_user_id_idx").on(t.user_id),
    index("template_name_idx").on(t.name),
    // Composite index to prevent rapid duplicates and improve query performance
    index("template_user_name_created_idx").on(t.user_id, t.name, t.createdAt),
  ],
); // RLS disabled - using application-level security

// Template Exercises
export const templateExercises = createTable(
  "template_exercise",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    templateId: d
      .integer()
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseName: d.text().notNull(),
    orderIndex: d.integer().notNull().default(0),
    linkingRejected: d.integer().notNull().default(0), // SQLite boolean as integer: 0 = false, 1 = true
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
  }),
  (t) => [
    index("template_exercise_user_id_idx").on(t.user_id),
    index("template_exercise_template_id_idx").on(t.templateId),
    index("template_exercise_order_idx").on(t.templateId, t.orderIndex),
  ],
); // RLS disabled - using application-level security

// Workout Sessions
export const workoutSessions = createTable(
  "workout_session",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    templateId: d
      .integer()
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    workoutDate: d.text().notNull(), // ISO timestamp string
    // Phase 2 additions
    theme_used: d.text(), // 'dark' | 'light' | 'system' (validated in app layer)
    device_type: d.text(), // 'android' | 'ios' | 'desktop' | 'ipad' | 'other'
    perf_metrics: d.text(), // JSON stored as text
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("session_user_id_idx").on(t.user_id),
    index("session_template_id_idx").on(t.templateId),
    index("session_workout_date_idx").on(t.workoutDate),
  ],
); // RLS disabled - using application-level security

// Session Exercises
export const sessionExercises = createTable(
  "session_exercise",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    sessionId: d
      .integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    templateExerciseId: d
      .integer()
      .references(() => templateExercises.id, { onDelete: "set null" }),
    exerciseName: d.text().notNull(),
    setOrder: d.integer().notNull().default(0),
    weight: d.real(), // Numeric precision handled in application layer
    reps: d.integer(),
    sets: d.integer(),
    unit: d.text().notNull().default("kg"),
    // Phase 2 additions
    rpe: d.integer(), // SQLite doesn't have smallint, use integer
    rest_seconds: d.integer(),
    is_estimate: d.integer().notNull().default(0), // Boolean as integer
    is_default_applied: d.integer().notNull().default(0), // Boolean as integer
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
  }),
  (t) => [
    index("session_exercise_user_id_idx").on(t.user_id),
    index("session_exercise_session_id_idx").on(t.sessionId),
    index("session_exercise_template_exercise_id_idx").on(t.templateExerciseId),
    index("session_exercise_name_idx").on(t.exerciseName),
  ],
); // RLS disabled - using application-level security

// User Preferences
export const userPreferences = createTable(
  "user_preferences",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull().unique(),
    defaultWeightUnit: d.text().notNull().default("kg"),
    // Phase 2 additions
    predictive_defaults_enabled: d.integer().notNull().default(0),
    right_swipe_action: d
      .text()
      .notNull()
      .default("collapse_expand"),
    // Wellness feature
    enable_manual_wellness: d.integer().notNull().default(0),
    // AI Suggestions progression preferences
    progression_type: d
      .text()
      .notNull()
      .default("adaptive"), // "linear" | "percentage" | "adaptive"
    linear_progression_kg: d.real().default(2.5), // Default 2.5kg increment
    percentage_progression: d.real().default(2.5), // Default 2.5% increment
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [index("user_preferences_user_id_idx").on(t.user_id)],
); // RLS disabled - using application-level security

// User Migration Table - Maps Supabase user IDs to WorkOS user IDs during migration
export const userMigration = createTable(
  "user_migration",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    supabase_user_id: d.text().unique().notNull(),
    workos_user_id: d.text().unique().notNull(),
    migration_status: d.text().notNull().default("pending"), // 'pending', 'completed', 'failed'
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    migrated_at: d.text(),
  }),
  (t) => [
    index("user_migration_supabase_user_idx").on(t.supabase_user_id),
    index("user_migration_workos_user_idx").on(t.workos_user_id),
    index("user_migration_status_idx").on(t.migration_status),
    index("user_migration_created_at_idx").on(t.createdAt),
  ],
); // RLS disabled - using application-level security

// Daily Jokes
export const dailyJokes = createTable(
  "daily_joke",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    joke: d.text().notNull(),
    aiModel: d.text().notNull(),
    prompt: d.text().notNull(),
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
  }),
  (t) => [
    index("daily_joke_user_id_idx").on(t.user_id),
    index("daily_joke_created_at_idx").on(t.createdAt),
    index("daily_joke_user_date_idx").on(t.user_id, t.createdAt),
  ],
); // RLS disabled - using application-level security

// User Integrations (OAuth tokens for external services)
export const userIntegrations = createTable(
  "user_integration",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    provider: d.text().notNull(), // 'whoop', 'strava', etc.
    accessToken: d.text().notNull(),
    refreshToken: d.text(),
    expiresAt: d.text(), // ISO timestamp string
    scope: d.text(), // OAuth scopes granted
    isActive: d.integer().notNull().default(1), // Boolean as integer
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("user_integration_user_id_idx").on(t.user_id),
    index("user_integration_provider_idx").on(t.provider),
    index("user_integration_user_provider_idx").on(t.user_id, t.provider),
  ],
); // RLS disabled - using application-level security

// External Workouts from Whoop
export const externalWorkoutsWhoop = createTable(
  "whoop_workout",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    whoopWorkoutId: d.text().notNull().unique(), // Whoop's workout ID
    start: d.text().notNull(), // ISO timestamp string
    end: d.text().notNull(), // ISO timestamp string
    timezone_offset: d.text(),
    sport_name: d.text(),
    score_state: d.text(), // "SCORED", "PENDING_SCORE", etc.
    score: d.text(), // JSON stored as text
    during: d.text(), // JSON stored as text
    zone_duration: d.text(), // JSON stored as text
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("external_workout_whoop_user_id_idx").on(t.user_id),
    index("external_workout_whoop_workout_id_idx").on(t.whoopWorkoutId),
    index("external_workout_whoop_start_idx").on(t.start),
    index("external_workout_whoop_user_start_idx").on(t.user_id, t.start),
    index("external_workout_whoop_user_workout_id_idx").on(t.user_id, t.whoopWorkoutId),
  ],
); // RLS disabled - using application-level security

// Rate Limiting for API requests (will be migrated to KV storage)
export const rateLimits = createTable(
  "rate_limit",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    endpoint: d.text().notNull(), // e.g., 'whoop_sync'
    requests: d.integer().notNull().default(0),
    windowStart: d.text().notNull(), // ISO timestamp string
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("rate_limit_user_endpoint_idx").on(t.user_id, t.endpoint),
    index("rate_limit_window_idx").on(t.windowStart),
  ],
); // RLS disabled - using application-level security

// Master Exercises - Shared exercises across templates
export const masterExercises = createTable(
  "master_exercise",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    name: d.text().notNull(),
    normalizedName: d.text().notNull(), // Lowercased, trimmed name for fuzzy matching
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("master_exercise_user_id_idx").on(t.user_id),
    index("master_exercise_name_idx").on(t.name),
    index("master_exercise_normalized_name_idx").on(t.normalizedName),
    index("master_exercise_user_normalized_idx").on(
      t.user_id,
      t.normalizedName,
    ),
    // Unique constraint: prevent duplicate master exercise names per user
    unique("master_exercise_user_name_unique").on(t.user_id, t.normalizedName),
  ],
); // RLS disabled - using application-level security

// Exercise Links - Maps template exercises to master exercises
export const exerciseLinks = createTable(
  "exercise_link",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    templateExerciseId: d
      .integer()
      .notNull()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    masterExerciseId: d
      .integer()
      .notNull()
      .references(() => masterExercises.id, { onDelete: "cascade" }),
    user_id: d.text().notNull(),
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
  }),
  (t) => [
    index("exercise_link_template_exercise_idx").on(t.templateExerciseId),
    index("exercise_link_master_exercise_idx").on(t.masterExerciseId),
    index("exercise_link_user_id_idx").on(t.user_id),
    // Unique constraint: each template exercise can only be linked to one master exercise
    unique("exercise_link_template_exercise_unique").on(t.templateExerciseId),
  ],
); // RLS disabled - using application-level security

// AI Health Advice - Store AI advice responses for historical tracking
export const healthAdvice = createTable(
  "health_advice",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    sessionId: d
      .integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    // Store the full request and response for historical tracking
    request: d.text().notNull(), // JSON stored as text
    response: d.text().notNull(), // JSON stored as text
    // Extract key metrics for easy querying
    readiness_rho: d.real(), // 0.00-1.00
    overload_multiplier: d.real(), // 0.90-1.10
    session_predicted_chance: d.real(), // 0.00-1.00
    // Track user interaction
    user_accepted_suggestions: d.integer().notNull().default(0),
    total_suggestions: d.integer().notNull(),
    // Performance tracking
    response_time_ms: d.integer(),
    model_used: d.text(),
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
  }),
  (t) => [
    index("health_advice_user_id_idx").on(t.user_id),
    index("health_advice_session_id_idx").on(t.sessionId),
    index("health_advice_created_at_idx").on(t.createdAt),
    index("health_advice_user_created_idx").on(t.user_id, t.createdAt),
    // Unique constraint: one advice per session per user
    unique("health_advice_user_session_unique").on(t.user_id, t.sessionId),
  ],
); // RLS disabled - using application-level security

// Webhook Events Log (for debugging and audit trail)
export const webhookEvents = createTable(
  "webhook_event",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    provider: d.text().notNull(), // 'whoop', 'strava', etc.
    eventType: d.text().notNull(), // 'workout.updated', etc.
    userId: d.text(), // May be null if user mapping fails
    externalUserId: d.text(), // User ID from external provider
    externalEntityId: d.text(), // Workout ID, etc.
    payload: d.text(), // JSON stored as text
    headers: d.text(), // JSON stored as text
    status: d.text().notNull().default("received"), // 'received', 'processed', 'failed', 'ignored'
    error: d.text(), // Error message if processing failed
    processingTime: d.integer(), // Processing time in ms
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    processedAt: d.text(),
  }),
  (t) => [
    index("webhook_event_provider_idx").on(t.provider),
    index("webhook_event_type_idx").on(t.eventType),
    index("webhook_event_user_id_idx").on(t.userId),
    index("webhook_event_external_user_id_idx").on(t.externalUserId),
    index("webhook_event_status_idx").on(t.status),
    index("webhook_event_created_at_idx").on(t.createdAt),
  ],
); // RLS disabled - using application-level security

// Wellness Data - Manual wellness inputs for enhanced workout intelligence
export const wellnessData = createTable(
  "wellness_data",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    sessionId: d
      .integer()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    date: d.text().notNull(), // Date in YYYY-MM-DD format
    
    // Manual wellness inputs (2 total)
    energy_level: d.integer(), // 1-10 scale
    sleep_quality: d.integer(), // 1-10 scale
    
    // Metadata
    device_timezone: d.text(), // Store device timezone for context
    submitted_at: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    
    // Context
    has_whoop_data: d.integer().notNull().default(0), // Boolean as integer
    whoop_data: d.text(), // JSON stored as text
    notes: d.text(), // User notes (max 500 chars enforced in app)
    
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    // Indexes for performance
    index("wellness_data_user_id_idx").on(t.user_id),
    index("wellness_data_user_date_idx").on(t.user_id, t.date),
    index("wellness_data_user_session_idx").on(t.user_id, t.sessionId),
    index("wellness_data_submitted_at_idx").on(t.user_id, t.submitted_at),
    // Unique constraint: One wellness entry per session (prevents race conditions)
    unique("wellness_data_user_session_unique").on(t.user_id, t.sessionId),
  ],
); // RLS disabled - using application-level security

// WHOOP Recovery Data (read:recovery)
export const whoopRecovery = createTable(
  "whoop_recovery",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    whoop_recovery_id: d.text().notNull().unique(), // WHOOP's recovery ID
    cycle_id: d.text(), // Link to cycle
    date: d.text().notNull(), // Date in YYYY-MM-DD format
    
    // Recovery metrics
    recovery_score: d.integer(), // 0-100
    hrv_rmssd_milli: d.real(), // HRV in milliseconds
    hrv_rmssd_baseline: d.real(), // HRV baseline
    resting_heart_rate: d.integer(), // BPM
    resting_heart_rate_baseline: d.integer(), // BPM baseline
    
    // Full recovery data
    raw_data: d.text(), // JSON stored as text
    
    // Metadata
    timezone_offset: d.text(),
    webhook_received_at: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("whoop_recovery_user_id_idx").on(t.user_id),
    index("whoop_recovery_user_date_idx").on(t.user_id, t.date),
    index("whoop_recovery_whoop_id_idx").on(t.whoop_recovery_id),
    index("whoop_recovery_cycle_id_idx").on(t.cycle_id),
    index("whoop_recovery_user_received_idx").on(t.user_id, t.webhook_received_at),
    uniqueIndex("whoop_recovery_user_date_unique").on(t.user_id, t.date),
  ],
);

// WHOOP Cycles Data (read:cycles)
export const whoopCycles = createTable(
  "whoop_cycle",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    whoop_cycle_id: d.text().notNull().unique(), // WHOOP's cycle ID
    
    // Cycle timing
    start: d.text().notNull(), // ISO timestamp string
    end: d.text().notNull(), // ISO timestamp string
    timezone_offset: d.text(),
    
    // Cycle metrics
    day_strain: d.real(), // 0-21 strain scale
    average_heart_rate: d.integer(), // BPM
    max_heart_rate: d.integer(), // BPM
    kilojoule: d.real(), // Energy expenditure
    
    // Full cycle data
    raw_data: d.text(), // JSON stored as text
    
    // Metadata
    webhook_received_at: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
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
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    whoop_sleep_id: d.text().notNull().unique(), // WHOOP's sleep ID
    
    // Sleep timing
    start: d.text().notNull(), // ISO timestamp string
    end: d.text().notNull(), // ISO timestamp string
    timezone_offset: d.text(),
    
    // Sleep metrics
    sleep_performance_percentage: d.integer(), // 0-100
    total_sleep_time_milli: d.integer(), // Milliseconds
    sleep_efficiency_percentage: d.real(),
    slow_wave_sleep_time_milli: d.integer(),
    rem_sleep_time_milli: d.integer(),
    light_sleep_time_milli: d.integer(),
    wake_time_milli: d.integer(),
    arousal_time_milli: d.integer(),
    disturbance_count: d.integer(),
    sleep_latency_milli: d.integer(),
    
    // Full sleep data
    raw_data: d.text(), // JSON stored as text
    
    // Metadata
    webhook_received_at: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("whoop_sleep_user_id_idx").on(t.user_id),
    index("whoop_sleep_user_start_idx").on(t.user_id, t.start),
    index("whoop_sleep_whoop_id_idx").on(t.whoop_sleep_id),
    index("whoop_sleep_performance_idx").on(t.user_id, t.sleep_performance_percentage),
  ],
);

// WHOOP Profile Data (read:profile)
export const whoopProfile = createTable(
  "whoop_profile",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    whoop_user_id: d.text().notNull(), // WHOOP's user ID
    
    // Profile data
    email: d.text(),
    first_name: d.text(),
    last_name: d.text(),
    
    // Full profile data
    raw_data: d.text(), // JSON stored as text
    
    // Metadata
    webhook_received_at: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    last_updated: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("whoop_profile_user_id_idx").on(t.user_id),
    index("whoop_profile_whoop_user_id_idx").on(t.whoop_user_id),
    uniqueIndex("whoop_profile_user_unique").on(t.user_id),
  ],
);

// WHOOP Body Measurements (read:body_measurement)
export const whoopBodyMeasurement = createTable(
  "whoop_body_measurement",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    whoop_measurement_id: d.text().notNull().unique(), // WHOOP's measurement ID
    
    // Measurement data
    height_meter: d.real(), // Height in meters
    weight_kilogram: d.real(), // Weight in kg
    max_heart_rate: d.integer(), // BPM
    
    // Metadata
    measurement_date: d.text(), // Date in YYYY-MM-DD format
    
    // Full measurement data
    raw_data: d.text(), // JSON stored as text
    
    // Metadata
    webhook_received_at: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
    updatedAt: d.text(),
  }),
  (t) => [
    index("whoop_body_measurement_user_id_idx").on(t.user_id),
    index("whoop_body_measurement_date_idx").on(t.user_id, t.measurement_date),
    index("whoop_body_measurement_whoop_id_idx").on(t.whoop_measurement_id),
  ],
);

// AI Suggestion History - Track user interactions with AI suggestions
export const aiSuggestionHistory = createTable(
  "ai_suggestion_history",
  (d) => ({
    id: d.integer().primaryKey({ autoIncrement: true }),
    user_id: d.text().notNull(),
    sessionId: d
      .integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseName: d.text().notNull(),
    setId: d.text().notNull(), // Format: templateExerciseId_setIndex
    setIndex: d.integer().notNull(), // 0-based set index
    
    // Suggestion details
    suggested_weight_kg: d.real(),
    suggested_reps: d.integer(),
    suggested_rest_seconds: d.integer(),
    suggestion_rationale: d.text(),
    
    // User interaction
    action: d.text().notNull(), // 'accepted', 'rejected', 'modified'
    accepted_weight_kg: d.real(), // What user actually used
    accepted_reps: d.integer(),
    
    // Context
    progression_type: d.text(), // User's progression preference at time of suggestion
    readiness_score: d.real(), // Readiness at time of suggestion
    plateau_detected: d.integer().notNull().default(0), // Boolean as integer
    
    // Metadata
    interaction_time_ms: d.integer(), // Time from suggestion to interaction
    createdAt: d.text().default(sql`(datetime('now', 'utc'))`).notNull(),
  }),
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

// Health Advice Relations
export const healthAdviceRelations = relations(healthAdvice, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [healthAdvice.sessionId],
    references: [workoutSessions.id],
  }),
}));

// Wellness Data Relations
export const wellnessDataRelations = relations(wellnessData, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [wellnessData.sessionId],
    references: [workoutSessions.id],
  }),
}));

// AI Suggestion History Relations
export const aiSuggestionHistoryRelations = relations(aiSuggestionHistory, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [aiSuggestionHistory.sessionId],
    references: [workoutSessions.id],
  }),
}));

// WHOOP Data Relations
export const whoopRecoveryRelations = relations(whoopRecovery, ({ one }) => ({
  cycle: one(whoopCycles, {
    fields: [whoopRecovery.cycle_id],
    references: [whoopCycles.whoop_cycle_id],
  }),
}));

export const whoopCyclesRelations = relations(whoopCycles, ({ many }) => ({
  recoveries: many(whoopRecovery),
}));

export const whoopSleepRelations = relations(whoopSleep, ({ }) => ({
  // Could add relationship to cycles if needed
}));

export const whoopProfileRelations = relations(whoopProfile, ({ }) => ({
  // Profile is standalone
}));

export const whoopBodyMeasurementRelations = relations(whoopBodyMeasurement, ({ }) => ({
  // Measurements are standalone
}));