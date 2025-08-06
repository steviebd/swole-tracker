import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, decimal, unique } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `swole-tracker_${name}`);

// Workout Templates
export const workoutTemplates = createTable(
  "workout_template",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }).notNull(),
    user_id: d.varchar({ length: 256 }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("template_user_id_idx").on(t.user_id),
    index("template_name_idx").on(t.name),
  ],
); // RLS disabled - using Clerk auth with application-level security

// Template Exercises
export const templateExercises = createTable(
  "template_exercise",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    templateId: d
      .integer()
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseName: d.varchar({ length: 256 }).notNull(),
    orderIndex: d.integer().notNull().default(0),
    linkingRejected: d.boolean().notNull().default(false), // Track if user explicitly chose not to link
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("template_exercise_user_id_idx").on(t.user_id),
    index("template_exercise_template_id_idx").on(t.templateId),
    index("template_exercise_order_idx").on(t.templateId, t.orderIndex),
  ],
); // RLS disabled - using Clerk auth with application-level security

// Workout Sessions
export const workoutSessions = createTable(
  "workout_session",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    templateId: d
      .integer()
      .notNull()
      .references(() => workoutTemplates.id),
    workoutDate: d.timestamp({ withTimezone: true }).notNull(),
    // Phase 2 additions
    theme_used: d.varchar({ length: 20 }), // 'CalmDark' | 'BoldDark' | 'PlayfulDark' (validated in app layer)
    device_type: d.varchar({ length: 20 }), // 'android' | 'ios' | 'desktop' | 'ipad' | 'other'
    perf_metrics: d.json(), // optional perf/telemetry blob
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("session_user_id_idx").on(t.user_id),
    index("session_template_id_idx").on(t.templateId),
    index("session_workout_date_idx").on(t.workoutDate),
  ],
); // RLS disabled - using Clerk auth with application-level security

// Session Exercises
export const sessionExercises = createTable(
  "session_exercise",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    sessionId: d
      .integer()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    templateExerciseId: d.integer().references(() => templateExercises.id, { onDelete: "set null" }),
    exerciseName: d.varchar({ length: 256 }).notNull(),
    setOrder: d.integer().notNull().default(0),
    weight: decimal("weight", { precision: 6, scale: 2 }),
    reps: d.integer(),
    sets: d.integer(),
    unit: d.varchar({ length: 10 }).notNull().default("kg"),
    // Phase 2 additions
    rpe: d.smallint(), // 6-10 recommended in UI, not enforced at DB
    rest_seconds: d.integer(), // rest time in seconds
    is_estimate: d.boolean().notNull().default(false),
    is_default_applied: d.boolean().notNull().default(false),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("session_exercise_user_id_idx").on(t.user_id),
    index("session_exercise_session_id_idx").on(t.sessionId),
    index("session_exercise_template_exercise_id_idx").on(t.templateExerciseId),
    index("session_exercise_name_idx").on(t.exerciseName),
  ],
); // RLS disabled - using Clerk auth with application-level security

// User Preferences
export const userPreferences = createTable(
  "user_preferences",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull().unique(),
    defaultWeightUnit: d.varchar({ length: 10 }).notNull().default("kg"),
    // Phase 2 additions
    predictive_defaults_enabled: d.boolean().notNull().default(false),
    right_swipe_action: d.varchar({ length: 32 }).notNull().default("collapse_expand"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("user_preferences_user_id_idx").on(t.user_id)],
); // RLS disabled - using Clerk auth with application-level security

// Note: With Clerk, we don't need users table as Clerk handles user management
// Instead, we reference Clerk user IDs directly in our app tables

// User Isolation: All data access is controlled by user_id = ctx.user.id
// This ensures complete data isolation between users at the application level

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

// Daily Jokes
export const dailyJokes = createTable(
  "daily_joke",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    joke: d.text().notNull(),
    aiModel: d.varchar({ length: 100 }).notNull(),
    prompt: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("daily_joke_user_id_idx").on(t.user_id),
    index("daily_joke_created_at_idx").on(t.createdAt),
    index("daily_joke_user_date_idx").on(t.user_id, t.createdAt),
  ],
); // RLS disabled - using Clerk auth with application-level security

// User Integrations (OAuth tokens for external services)
export const userIntegrations = createTable(
  "user_integration",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    provider: d.varchar({ length: 50 }).notNull(), // 'whoop', 'strava', etc.
    accessToken: d.text().notNull(),
    refreshToken: d.text(),
    expiresAt: d.timestamp({ withTimezone: true }),
    scope: d.varchar({ length: 500 }), // OAuth scopes granted
    isActive: d.boolean().notNull().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_integration_user_id_idx").on(t.user_id),
    index("user_integration_provider_idx").on(t.provider),
    index("user_integration_user_provider_idx").on(t.user_id, t.provider),
  ],
); // RLS disabled - using Clerk auth with application-level security

// External Workouts from Whoop
export const externalWorkoutsWhoop = createTable(
  "whoop_workout",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    whoopWorkoutId: d.varchar({ length: 256 }).notNull().unique(), // Whoop's workout ID
    start: d.timestamp({ withTimezone: true }).notNull(),
    end: d.timestamp({ withTimezone: true }).notNull(),
    timezone_offset: d.varchar({ length: 20 }),
    sport_name: d.varchar({ length: 100 }),
    score_state: d.varchar({ length: 50 }), // "SCORED", "PENDING_SCORE", etc.
    score: d.json(), // Full score object from Whoop
    during: d.json(), // During metrics object
    zone_duration: d.json(), // Zone duration object
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("external_workout_whoop_user_id_idx").on(t.user_id),
    index("external_workout_whoop_workout_id_idx").on(t.whoopWorkoutId),
    index("external_workout_whoop_start_idx").on(t.start),
    index("external_workout_whoop_user_start_idx").on(t.user_id, t.start),
  ],
); // RLS disabled - using Clerk auth with application-level security

// Rate Limiting for API requests
export const rateLimits = createTable(
  "rate_limit",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    endpoint: d.varchar({ length: 100 }).notNull(), // e.g., 'whoop_sync'
    requests: d.integer().notNull().default(0),
    windowStart: d.timestamp({ withTimezone: true }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("rate_limit_user_endpoint_idx").on(t.user_id, t.endpoint),
    index("rate_limit_window_idx").on(t.windowStart),
  ],
); // RLS disabled - using Clerk auth with application-level security

// Master Exercises - Shared exercises across templates
export const masterExercises = createTable(
  "master_exercise",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    user_id: d.varchar({ length: 256 }).notNull(),
    name: d.varchar({ length: 256 }).notNull(),
    normalizedName: d.varchar({ length: 256 }).notNull(), // Lowercased, trimmed name for fuzzy matching
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("master_exercise_user_id_idx").on(t.user_id),
    index("master_exercise_name_idx").on(t.name),
    index("master_exercise_normalized_name_idx").on(t.normalizedName),
    index("master_exercise_user_normalized_idx").on(t.user_id, t.normalizedName),
    // Unique constraint: prevent duplicate master exercise names per user
    unique("master_exercise_user_name_unique").on(t.user_id, t.normalizedName),
  ],
); // RLS disabled - using Clerk auth with application-level security

// Exercise Links - Maps template exercises to master exercises
export const exerciseLinks = createTable(
  "exercise_link",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    templateExerciseId: d
      .integer()
      .notNull()
      .references(() => templateExercises.id, { onDelete: "cascade" }),
    masterExerciseId: d
      .integer()
      .notNull()
      .references(() => masterExercises.id, { onDelete: "cascade" }),
    user_id: d.varchar({ length: 256 }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("exercise_link_template_exercise_idx").on(t.templateExerciseId),
    index("exercise_link_master_exercise_idx").on(t.masterExerciseId),
    index("exercise_link_user_id_idx").on(t.user_id),
    // Unique constraint: each template exercise can only be linked to one master exercise
    unique("exercise_link_template_exercise_unique").on(t.templateExerciseId),
  ],
); // RLS disabled - using Clerk auth with application-level security

// Relations for new tables
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

export const exerciseLinksRelations = relations(
  exerciseLinks,
  ({ one }) => ({
    templateExercise: one(templateExercises, {
      fields: [exerciseLinks.templateExerciseId],
      references: [templateExercises.id],
    }),
    masterExercise: one(masterExercises, {
      fields: [exerciseLinks.masterExerciseId],
      references: [masterExercises.id],
    }),
  }),
);

// Webhook Events Log (for debugging and audit trail)
export const webhookEvents = createTable(
  "webhook_event",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    provider: d.varchar({ length: 50 }).notNull(), // 'whoop', 'strava', etc.
    eventType: d.varchar({ length: 100 }).notNull(), // 'workout.updated', etc.
    userId: d.varchar({ length: 256 }), // May be null if user mapping fails
    externalUserId: d.varchar({ length: 256 }), // User ID from external provider
    externalEntityId: d.varchar({ length: 256 }), // Workout ID, etc.
    payload: d.json(), // Full webhook payload
    headers: d.json(), // Webhook headers for debugging
    status: d.varchar({ length: 20 }).notNull().default('received'), // 'received', 'processed', 'failed', 'ignored'
    error: d.text(), // Error message if processing failed
    processingTime: d.integer(), // Processing time in ms
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    processedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("webhook_event_provider_idx").on(t.provider),
    index("webhook_event_type_idx").on(t.eventType),
    index("webhook_event_user_id_idx").on(t.userId),
    index("webhook_event_external_user_id_idx").on(t.externalUserId),
    index("webhook_event_status_idx").on(t.status),
    index("webhook_event_created_at_idx").on(t.createdAt),
  ],
); // RLS disabled - using Clerk auth with application-level security
