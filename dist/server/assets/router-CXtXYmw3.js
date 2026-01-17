import { createRootRouteWithContext, HeadContent, Outlet, Scripts, createFileRoute, lazyRouteComponent, redirect, createRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { QueryClient, MutationCache } from "@tanstack/react-query";
import { jsxs, jsx } from "react/jsx-runtime";
import { drizzle } from "drizzle-orm/d1";
import { relations, sql, eq } from "drizzle-orm";
import { sqliteTable, sqliteView, customType, integer, text, index, uniqueIndex, real } from "drizzle-orm/sqlite-core";
import { env } from "cloudflare:workers";
import { g as getRequest } from "../server.js";
import require$$0 from "crypto";
import require$$1 from "node:http";
import require$$2 from "node:https";
import require$$0$1 from "pluralize";
import require$$0$2 from "qs";
import require$$0$3 from "jose";
import require$$0$4 from "leb";
import require$$0$5 from "iron-session";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core";
import "@tanstack/router-core/ssr/server";
import "node:async_hooks";
import "h3-v2";
import "tiny-invariant";
import "seroval";
import "@tanstack/react-router/ssr/server";
const Route$7 = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Swole Tracker" }
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }]
  }),
  component: RootComponent
});
function RootComponent() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", className: "antialiased", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const $$splitComponentImporter$2 = () => import("./sign-in-XbJ6g7sR.js");
const Route$6 = createFileRoute("/sign-in")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var serverOnly = {};
var hasRequiredServerOnly;
function requireServerOnly() {
  if (hasRequiredServerOnly) return serverOnly;
  hasRequiredServerOnly = 1;
  throw new Error(
    "This module cannot be imported from a Client Component module. It should only be used from a Server Component."
  );
}
requireServerOnly();
const date = customType({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return value.toISOString();
  },
  fromDriver(value) {
    return new Date(value);
  }
});
const createTable = sqliteTable;
const users = createTable(
  "user",
  {
    id: text().primaryKey(),
    email: text(),
    firstName: text(),
    lastName: text(),
    profilePictureUrl: text(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [index("user_email_idx").on(t.email)]
);
const workoutTemplates = createTable(
  "workout_template",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    user_id: text().notNull(),
    dedupeKey: text(),
    warmupConfig: text(),
    // JSON: { [exerciseName]: WarmupStrategy }
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("template_user_id_idx").on(t.user_id),
    index("template_name_idx").on(t.name),
    uniqueIndex("template_user_dedupe_idx").on(t.user_id, t.dedupeKey)
  ]
);
const workoutSessions = createTable(
  "workout_session",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    templateId: integer().references(() => workoutTemplates.id, {
      onDelete: "set null"
    }),
    workoutDate: date().default(sql`(datetime('now'))`).notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("workout_session_user_id_idx").on(t.user_id),
    index("workout_session_template_id_idx").on(t.templateId),
    index("workout_session_workout_date_idx").on(t.workoutDate),
    index("workout_session_user_date_idx").on(t.user_id, t.workoutDate)
  ]
);
const templateExercises = createTable(
  "template_exercise",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    templateId: integer().notNull().references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseName: text().notNull(),
    orderIndex: integer().notNull().default(0),
    linkingRejected: integer({ mode: "boolean" }).notNull().default(false),
    // Track if user explicitly chose not to link
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("template_exercise_user_id_idx").on(t.user_id),
    index("template_exercise_template_id_idx").on(t.templateId),
    index("template_exercise_user_template_name_idx").on(
      t.user_id,
      t.templateId,
      t.exerciseName
    ),
    index("template_exercise_user_exercise_name_idx").on(
      t.user_id,
      t.exerciseName
    )
  ]
);
const sessionExercises = createTable(
  "session_exercise",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer().notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
    templateExerciseId: integer().references(() => templateExercises.id, {
      onDelete: "set null"
    }),
    exerciseName: text().notNull(),
    resolvedExerciseName: text().notNull().default(""),
    setOrder: integer().notNull().default(0),
    weight: real(),
    reps: integer(),
    sets: integer(),
    unit: text().notNull().default("kg"),
    // Phase 2 additions
    rpe: integer(),
    // 6-10 recommended in UI, not enforced at DB
    rest_seconds: integer(),
    // rest time in seconds
    is_estimate: integer({ mode: "boolean" }).notNull().default(false),
    is_default_applied: integer({ mode: "boolean" }).notNull().default(false),
    // Phase 3 additions: Exercise progression computed columns
    one_rm_estimate: real(),
    volume_load: real(),
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    // Critical composite indexes for performance (consolidated from redundant single-column indexes)
    index("session_exercise_user_exercise_idx").on(t.user_id, t.exerciseName),
    index("session_exercise_user_exercise_date_idx").on(
      t.user_id,
      t.exerciseName,
      t.sessionId
    ),
    index("session_exercise_user_resolved_name_idx").on(
      t.user_id,
      t.resolvedExerciseName
    ),
    index("session_exercise_user_template_idx").on(
      t.user_id,
      t.templateExerciseId
    ),
    // Performance indexes for volume and progression queries (most critical)
    index("session_exercise_user_weight_idx").on(t.user_id, t.weight),
    index("session_exercise_user_exercise_weight_idx").on(
      t.user_id,
      t.exerciseName,
      t.weight
    ),
    // Performance indexes for computed columns
    index("session_exercise_user_one_rm_idx").on(t.user_id, t.one_rm_estimate),
    index("session_exercise_user_volume_idx").on(t.user_id, t.volume_load),
    index("session_exercise_user_exercise_one_rm_idx").on(
      t.user_id,
      t.exerciseName,
      t.one_rm_estimate
    ),
    index("session_exercise_user_exercise_volume_idx").on(
      t.user_id,
      t.exerciseName,
      t.volume_load
    ),
    // Additional indexes for complex query patterns
    index("session_exercise_user_date_exercise_idx").on(
      t.user_id,
      sql`date(${workoutSessions.workoutDate})`,
      t.exerciseName
    ),
    // Phase 2: Additional indexes for query optimization and pagination
    index("session_exercise_user_resolved_exercise_session_idx").on(
      t.user_id,
      t.resolvedExerciseName,
      t.sessionId
    ),
    index("session_exercise_user_session_volume_one_rm_idx").on(
      t.user_id,
      t.sessionId,
      t.volume_load,
      t.one_rm_estimate
    ),
    // Bulk operations pattern (workouts.ts:823) - for session + exercise lookups
    index("session_exercise_user_session_name_idx").on(
      t.user_id,
      t.sessionId,
      t.exerciseName
    )
    // NEW: Critical missing index for dashboard queries (from TODO)
    // Note: This will be created via migration as SQLite doesn't support subqueries in indexes via Drizzle
  ]
);
const userPreferences = createTable(
  "user_preferences",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull().unique(),
    defaultWeightUnit: text().notNull().default("kg"),
    // Phase 2 additions
    predictive_defaults_enabled: integer({ mode: "boolean" }).notNull().default(false),
    right_swipe_action: text().notNull().default("collapse_expand"),
    // Wellness feature
    enable_manual_wellness: integer({ mode: "boolean" }).notNull().default(false),
    // AI Suggestions progression preferences
    progression_type: text().notNull().default("adaptive"),
    // "linear" | "percentage" | "adaptive"
    progression_type_enum: text().notNull().default("adaptive"),
    // Extracted from JSON for faster querying
    linear_progression_kg: real().default(2.5),
    // Default 2.5kg increment
    percentage_progression: real().default(2.5),
    // Default 2.5% increment
    targetWorkoutsPerWeek: real().notNull().default(3),
    // Warm-up configuration
    warmupStrategy: text().notNull().default("history"),
    // 'percentage' | 'fixed' | 'history' | 'none'
    warmupSetsCount: integer().notNull().default(3),
    warmupPercentages: text().notNull().default("[40, 60, 80]"),
    // JSON array of percentages
    warmup_percentages_array: text().notNull().default("40,60,80"),
    // Extracted from JSON for faster querying
    warmupRepsStrategy: text().notNull().default("match_working"),
    // 'match_working' | 'descending' | 'fixed'
    warmupFixedReps: integer().notNull().default(5),
    enableMovementPatternSharing: integer({ mode: "boolean" }).notNull().default(false),
    // Future ML feature
    // Recovery-Guided Session Planner preferences
    enableRecoveryPlanner: integer({ mode: "boolean" }).notNull().default(false),
    // Enable/disable recovery planner
    recoveryPlannerStrategy: text().notNull().default("adaptive"),
    // 'conservative' | 'moderate' | 'adaptive' | 'aggressive'
    recoveryPlannerSensitivity: integer().notNull().default(5),
    // 1-10 scale for how much recovery impacts recommendations
    autoAdjustIntensity: integer({ mode: "boolean" }).notNull().default(true),
    // Auto-adjust weights/volume based on recovery
    recoveryPlannerPreferences: text(),
    // JSON: Custom preferences for different recovery tiers
    // Plateau & Milestone preferences
    experienceLevel: text().notNull().default("intermediate"),
    // 'beginner' | 'intermediate' | 'advanced'
    bodyweight: real(),
    // User's bodyweight in kg
    bodyweightSource: text(),
    // 'manual' | 'whoop'
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [index("user_preferences_user_id_idx").on(t.user_id)]
);
const recoverySessionPlanner = createTable(
  "recovery_session_planner",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer().notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
    templateId: integer().references(() => workoutTemplates.id, {
      onDelete: "set null"
    }),
    // Recovery data at time of planning
    recoveryScore: integer(),
    // 0-100 from WHOOP or manual
    sleepPerformance: integer(),
    // 0-100 from WHOOP or manual
    hrvStatus: text(),
    // 'low' | 'baseline' | 'high' based on deviation from baseline
    rhrStatus: text(),
    // 'elevated' | 'baseline' | 'optimal' based on deviation from baseline
    readinessScore: real(),
    // 0.00-1.00 calculated composite readiness
    // Planner recommendations
    recommendation: text().notNull(),
    // 'train_as_planned' | 'reduce_intensity' | 'reduce_volume' | 'active_recovery' | 'rest_day'
    intensityAdjustment: real(),
    // 0.50-1.20 multiplier for weights/intensity
    volumeAdjustment: real(),
    // 0.50-1.20 multiplier for volume/sets
    suggestedModifications: text(),
    // JSON: Specific exercise modifications
    reasoning: text(),
    // Plain text explanation of the recommendation
    // User interaction
    userAction: text(),
    // 'accepted' | 'modified' | 'ignored' | 'deferred'
    appliedAdjustments: text(),
    // JSON: What adjustments were actually applied
    userFeedback: text(),
    // Optional user feedback on the recommendation
    // Context
    plannedWorkoutJson: text(),
    // JSON: Original planned workout
    adjustedWorkoutJson: text(),
    // JSON: Final workout after adjustments
    metadata: text(),
    // JSON: Additional context (stress factors, etc.)
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("recovery_session_planner_user_id_idx").on(t.user_id),
    index("recovery_session_planner_session_id_idx").on(t.sessionId),
    index("recovery_session_planner_template_id_idx").on(t.templateId),
    index("recovery_session_planner_recommendation_idx").on(t.recommendation),
    index("recovery_session_planner_user_created_idx").on(
      t.user_id,
      t.createdAt
    ),
    uniqueIndex("recovery_session_planner_user_session_unique").on(
      t.user_id,
      t.sessionId
    )
  ]
);
const userIntegrations = createTable(
  "user_integration",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    provider: text().notNull(),
    // 'whoop', 'strava', etc.
    externalUserId: text(),
    // External provider user identifier
    accessToken: text().notNull(),
    refreshToken: text(),
    expiresAt: date(),
    scope: text(),
    // OAuth scopes granted
    isActive: integer({ mode: "boolean" }).notNull().default(true),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("user_integration_user_id_idx").on(t.user_id),
    index("user_integration_provider_idx").on(t.provider),
    index("user_integration_user_provider_idx").on(t.user_id, t.provider),
    index("user_integration_external_user_idx").on(t.externalUserId)
  ]
);
const externalWorkoutsWhoop = createTable(
  "whoop_workout",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoopWorkoutId: text().notNull().unique(),
    // Whoop's workout ID
    start: date().notNull(),
    end: date().notNull(),
    timezone_offset: text(),
    sport_name: text(),
    score_state: text(),
    // "SCORED", "PENDING_SCORE", etc.
    score: text(),
    // Full score object from Whoop
    during: text(),
    // During metrics object
    zone_duration: text(),
    // Zone duration object
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("external_workout_whoop_user_id_idx").on(t.user_id),
    index("external_workout_whoop_workout_id_idx").on(t.whoopWorkoutId),
    index("external_workout_whoop_start_idx").on(t.start),
    index("external_workout_whoop_user_start_idx").on(t.user_id, t.start),
    index("external_workout_whoop_user_workout_id_idx").on(
      t.user_id,
      t.whoopWorkoutId
    )
  ]
);
const rateLimits = createTable(
  "rate_limit",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    endpoint: text().notNull(),
    // e.g., 'whoop_sync'
    requests: integer().notNull().default(0),
    windowStart: text().notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("rate_limit_user_endpoint_idx").on(t.user_id, t.endpoint),
    index("rate_limit_window_idx").on(t.windowStart)
  ]
);
const masterExercises = createTable(
  "master_exercise",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    name: text().notNull(),
    normalizedName: text().notNull(),
    // Lowercased, trimmed name for fuzzy matching
    tags: text(),
    // Comma-separated tags for categorization
    muscleGroup: text(),
    // Primary muscle group (chest, back, legs, etc.)
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("master_exercise_user_id_idx").on(t.user_id),
    index("master_exercise_name_idx").on(t.name),
    index("master_exercise_normalized_name_idx").on(t.normalizedName),
    index("master_exercise_user_normalized_idx").on(
      t.user_id,
      t.normalizedName
    )
  ]
);
const exerciseLinks = createTable(
  "exercise_link",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    templateExerciseId: integer().notNull().unique().references(() => templateExercises.id, { onDelete: "cascade" }),
    masterExerciseId: integer().notNull().references(() => masterExercises.id, { onDelete: "cascade" }),
    user_id: text().notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("exercise_link_template_exercise_idx").on(t.templateExerciseId),
    index("exercise_link_master_exercise_idx").on(t.masterExerciseId),
    index("exercise_link_user_id_idx").on(t.user_id),
    index("exercise_link_user_master_idx").on(t.user_id, t.masterExerciseId)
  ]
);
const exerciseResolutionCache = createTable(
  "exercise_resolution_cache",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    resolved_name: text().notNull(),
    master_exercise_id: integer(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("exercise_resolution_cache_id_idx").on(t.id),
    index("exercise_resolution_cache_user_idx").on(t.user_id),
    index("exercise_resolution_cache_user_name_idx").on(
      t.user_id,
      t.resolved_name
    )
  ]
);
const healthAdvice = createTable(
  "health_advice",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer().notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
    // Store the full request and response for historical tracking
    request: text().notNull(),
    // HealthAdviceRequest object
    response: text().notNull(),
    // HealthAdviceResponse object
    // Extract key metrics for easy querying
    readiness_rho: real(),
    // 0.00-1.00
    overload_multiplier: real(),
    // 0.90-1.10
    session_predicted_chance: real(),
    // 0.00-1.00
    // Track user interaction
    user_accepted_suggestions: integer().notNull().default(0),
    total_suggestions: integer().notNull(),
    // Performance tracking
    response_time_ms: integer(),
    model_used: text(),
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("health_advice_user_id_idx").on(t.user_id),
    index("health_advice_session_id_idx").on(t.sessionId),
    index("health_advice_created_at_idx").on(t.createdAt),
    index("health_advice_user_created_idx").on(t.user_id, t.createdAt),
    uniqueIndex("health_advice_user_session_unique").on(t.user_id, t.sessionId)
  ]
);
const sessionDebriefs = createTable(
  "session_debrief",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer().notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
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
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("session_debrief_user_id_idx").on(t.user_id),
    index("session_debrief_session_id_idx").on(t.sessionId),
    index("session_debrief_parent_debrief_id_idx").on(t.parentDebriefId),
    index("session_debrief_user_session_active_idx").on(
      t.user_id,
      t.sessionId,
      t.isActive
    )
  ]
);
const webhookEvents = createTable(
  "webhook_event",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    provider: text().notNull(),
    // 'whoop', 'strava', etc.
    eventType: text().notNull(),
    // 'workout.updated', etc.
    userId: text(),
    // May be null if user mapping fails
    externalUserId: text(),
    // User ID from external provider
    externalEntityId: text(),
    // Workout ID, etc.
    payload: text(),
    // Full webhook payload
    headers: text(),
    // Webhook headers for debugging
    status: text().notNull().default("received"),
    // 'received', 'processed', 'failed', 'ignored'
    error: text(),
    // Error message if processing failed
    processingTime: integer(),
    // Processing time in ms
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    processedAt: date()
  },
  (t) => [
    index("webhook_event_provider_idx").on(t.provider),
    index("webhook_event_type_idx").on(t.eventType),
    index("webhook_event_user_id_idx").on(t.userId),
    index("webhook_event_external_user_id_idx").on(t.externalUserId),
    index("webhook_event_status_idx").on(t.status),
    index("webhook_event_created_at_idx").on(t.createdAt)
  ]
);
const wellnessData = createTable(
  "wellness_data",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer().references(() => workoutSessions.id, {
      onDelete: "cascade"
    }),
    date: date().notNull(),
    // Manual wellness inputs (2 total)
    energy_level: integer(),
    // 1-10 scale
    sleep_quality: integer(),
    // 1-10 scale
    // Metadata
    device_timezone: text(),
    // Store device timezone for context
    submitted_at: date().default(sql`(datetime('now'))`).notNull(),
    // Prevent backfill attempts
    // Context
    has_whoop_data: integer({ mode: "boolean" }).notNull().default(false),
    whoop_data: text(),
    // Store actual Whoop metrics for comparison
    notes: text(),
    // User notes (max 500 chars enforced in app)
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    // Indexes for performance
    index("wellness_data_user_id_idx").on(t.user_id),
    index("wellness_data_user_date_idx").on(t.user_id, t.date),
    index("wellness_data_user_session_idx").on(t.user_id, t.sessionId),
    index("wellness_data_submitted_at_idx").on(t.user_id, t.submitted_at),
    uniqueIndex("wellness_data_user_session_unique").on(t.user_id, t.sessionId)
  ]
);
const whoopRecovery = createTable(
  "whoop_recovery",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_recovery_id: text().notNull().unique(),
    // WHOOP's recovery ID
    cycle_id: text(),
    // Link to cycle
    date: date().notNull(),
    // Recovery metrics
    recovery_score: integer(),
    // 0-100
    hrv_rmssd_milli: real(),
    // HRV in milliseconds
    hrv_rmssd_baseline: real(),
    // HRV baseline
    resting_heart_rate: integer(),
    // BPM
    resting_heart_rate_baseline: integer(),
    // BPM baseline
    respiratory_rate: real(),
    // breaths per minute
    respiratory_rate_baseline: real(),
    // baseline respiratory rate
    // Full recovery data
    raw_data: text(),
    // Complete recovery payload from WHOOP
    recovery_score_tier: text(),
    // Extracted: 'low', 'medium', 'high' for faster querying
    // Metadata
    timezone_offset: text(),
    webhook_received_at: date().default(sql`(datetime('now'))`).notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("whoop_recovery_user_id_idx").on(t.user_id),
    index("whoop_recovery_user_date_idx").on(t.user_id, t.date),
    index("whoop_recovery_whoop_id_idx").on(t.whoop_recovery_id),
    index("whoop_recovery_cycle_id_idx").on(t.cycle_id),
    index("whoop_recovery_user_received_idx").on(
      t.user_id,
      t.webhook_received_at
    )
  ]
);
const whoopCycles = createTable(
  "whoop_cycle",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_cycle_id: text().notNull().unique(),
    // WHOOP's cycle ID
    // Cycle timing
    start: date().notNull(),
    end: date().notNull(),
    timezone_offset: text(),
    // Cycle metrics
    day_strain: real(),
    // 0-21 strain scale
    average_heart_rate: integer(),
    // BPM
    max_heart_rate: integer(),
    // BPM
    kilojoule: real(),
    // Energy expenditure
    percent_recorded: real(),
    distance_meter: integer(),
    altitude_gain_meter: integer(),
    altitude_change_meter: integer(),
    // Full cycle data
    raw_data: text(),
    // Complete cycle payload from WHOOP
    // Metadata
    webhook_received_at: date().default(sql`(datetime('now'))`).notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("whoop_cycle_user_id_idx").on(t.user_id),
    index("whoop_cycle_user_start_idx").on(t.user_id, t.start),
    index("whoop_cycle_whoop_id_idx").on(t.whoop_cycle_id),
    index("whoop_cycle_strain_idx").on(t.user_id, t.day_strain)
  ]
);
const whoopSleep = createTable(
  "whoop_sleep",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_sleep_id: text().notNull().unique(),
    // WHOOP's sleep ID
    // Sleep timing
    start: date().notNull(),
    end: date().notNull(),
    timezone_offset: text(),
    // Sleep metrics
    sleep_performance_percentage: integer(),
    // 0-100
    total_sleep_time_milli: integer(),
    // Milliseconds
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
    raw_data: text(),
    // Complete sleep payload from WHOOP
    sleep_quality_tier: text(),
    // Extracted: 'poor', 'fair', 'good', 'excellent' for faster querying
    // Metadata
    webhook_received_at: date().default(sql`(datetime('now'))`).notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("whoop_sleep_user_id_idx").on(t.user_id),
    index("whoop_sleep_user_start_idx").on(t.user_id, t.start),
    index("whoop_sleep_whoop_id_idx").on(t.whoop_sleep_id),
    index("whoop_sleep_performance_idx").on(
      t.user_id,
      t.sleep_performance_percentage
    )
  ]
);
const whoopProfile = createTable(
  "whoop_profile",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_user_id: text().notNull(),
    // WHOOP's user ID
    // Profile data
    email: text(),
    first_name: text(),
    last_name: text(),
    // Full profile data
    raw_data: text(),
    // Complete profile payload from WHOOP
    // Metadata
    webhook_received_at: date().default(sql`(datetime('now'))`).notNull(),
    last_updated: date().default(sql`(datetime('now'))`).notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("whoop_profile_user_id_idx").on(t.user_id),
    index("whoop_profile_whoop_user_id_idx").on(t.whoop_user_id)
  ]
);
const whoopBodyMeasurement = createTable(
  "whoop_body_measurement",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    whoop_measurement_id: text().notNull().unique(),
    // WHOOP's measurement ID
    // Measurement data
    height_meter: real(),
    // Height in meters
    weight_kilogram: real(),
    // Weight in kg
    max_heart_rate: integer(),
    // BPM
    // Metadata
    measurement_date: date(),
    // Full measurement data
    raw_data: text(),
    // Complete measurement payload from WHOOP
    // Metadata
    webhook_received_at: date().default(sql`(datetime('now'))`).notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("whoop_body_measurement_user_id_idx").on(t.user_id),
    index("whoop_body_measurement_date_idx").on(t.user_id, t.measurement_date),
    index("whoop_body_measurement_whoop_id_idx").on(t.whoop_measurement_id)
  ]
);
const oauthStates = createTable(
  "oauth_state",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    state: text().notNull().unique(),
    // Unique state parameter
    user_id: text().notNull(),
    provider: text().notNull(),
    // 'whoop', 'strava', etc.
    redirect_uri: text().notNull(),
    // Callback URI
    client_ip: text(),
    // IPv4/IPv6 address
    user_agent_hash: text(),
    // SHA-256 hash of User-Agent
    expiresAt: date().notNull().default(sql`(datetime('now', '+10 minutes'))`),
    // 10 minute expiry
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("oauth_state_user_id_idx").on(t.user_id),
    index("oauth_state_provider_idx").on(t.provider),
    index("oauth_state_expires_at_idx").on(t.expiresAt),
    index("oauth_state_user_provider_idx").on(t.user_id, t.provider)
  ]
);
const sessions = createTable(
  "session",
  {
    id: text().primaryKey(),
    // Opaque session ID
    userId: text().notNull(),
    organizationId: text(),
    accessToken: text().notNull(),
    refreshToken: text(),
    expiresAt: integer().notNull(),
    // Unix timestamp in seconds
    accessTokenExpiresAt: integer(),
    // Unix timestamp in seconds
    sessionExpiresAt: integer(),
    // Unix timestamp in seconds
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt),
    index("session_access_expires_idx").on(t.accessTokenExpiresAt),
    index("session_session_expires_idx").on(t.sessionExpiresAt)
    // Remove unique constraint on userId to allow multiple sessions per user
  ]
);
const aiSuggestionHistory = createTable(
  "ai_suggestion_history",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    user_id: text().notNull(),
    sessionId: integer().notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseName: text().notNull(),
    setId: text().notNull(),
    // Format: templateExerciseId_setIndex
    setIndex: integer().notNull(),
    // 0-based set index
    // Suggestion details
    suggested_weight_kg: real(),
    suggested_reps: integer(),
    suggested_rest_seconds: integer(),
    suggestion_rationale: text(),
    // User interaction
    action: text().notNull(),
    // 'accepted', 'rejected', 'modified'
    accepted_weight_kg: real(),
    // What user actually used
    accepted_reps: integer(),
    // Context
    progression_type: text(),
    // User's progression preference at time of suggestion
    readiness_score: real(),
    // Readiness at time of suggestion
    plateau_detected: integer({ mode: "boolean" }).notNull().default(false),
    // Metadata
    interaction_time_ms: integer(),
    // Time from suggestion to interaction
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("ai_suggestion_history_user_id_idx").on(t.user_id),
    index("ai_suggestion_history_session_idx").on(t.sessionId),
    index("ai_suggestion_history_exercise_idx").on(t.exerciseName),
    index("ai_suggestion_history_action_idx").on(t.action),
    index("ai_suggestion_history_created_at_idx").on(t.createdAt),
    index("ai_suggestion_history_user_created_idx").on(t.user_id, t.createdAt)
  ]
);
const playbooks = createTable(
  "playbook",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text().notNull(),
    name: text().notNull(),
    goalText: text(),
    // Free text goal description
    goalPreset: text(),
    // 'powerlifting' | 'strength' | 'hypertrophy' | 'peaking' | null
    targetType: text().notNull(),
    // 'template' | 'exercise'
    targetIds: text().notNull(),
    // JSON array of template/exercise IDs
    duration: integer().notNull().default(6),
    // Duration in weeks (4-6)
    status: text().notNull().default("draft"),
    // 'draft' | 'active' | 'completed' | 'archived'
    metadata: text(),
    // JSON: user inputs for 1RMs, availability, equipment
    hasAiPlan: integer("has_ai_plan", { mode: "boolean" }).default(false),
    // Track if AI plan was generated
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date(),
    startedAt: date(),
    completedAt: date()
  },
  (t) => [
    index("playbook_user_id_idx").on(t.userId),
    index("playbook_status_idx").on(t.status),
    index("playbook_user_status_idx").on(t.userId, t.status),
    index("playbook_created_at_idx").on(t.createdAt)
  ]
);
const playbookWeeks = createTable(
  "playbook_week",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    playbookId: integer().notNull().references(() => playbooks.id, { onDelete: "cascade" }),
    weekNumber: integer().notNull(),
    // 1-6
    weekType: text().notNull().default("training"),
    // 'training' | 'deload' | 'pr_attempt'
    aiPlanJson: text(),
    // JSON: AI-generated sessions with exercises, sets, reps, weights
    algorithmicPlanJson: text(),
    // JSON: formula-based baseline for comparison
    volumeTarget: real(),
    // Calculated total volume target for the week
    status: text().notNull().default("pending"),
    // 'pending' | 'in_progress' | 'completed' | 'skipped'
    metadata: text(),
    // JSON: additional metadata
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("playbook_week_playbook_id_idx").on(t.playbookId),
    index("playbook_week_number_idx").on(t.playbookId, t.weekNumber),
    index("playbook_week_status_idx").on(t.status),
    uniqueIndex("playbook_week_unique").on(t.playbookId, t.weekNumber)
  ]
);
const playbookSessions = createTable(
  "playbook_session",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    playbookWeekId: integer().notNull().references(() => playbookWeeks.id, { onDelete: "cascade" }),
    sessionNumber: integer().notNull(),
    // 1-7 per week
    sessionDate: date(),
    // Nullable, set when scheduled
    prescribedWorkoutJson: text().notNull(),
    // JSON: sets, reps, weights per exercise
    actualWorkoutId: integer().references(() => workoutSessions.id, {
      onDelete: "set null"
    }),
    adherenceScore: real(),
    // 0-100, calculated post-session
    rpe: integer(),
    // 1-10, from questionnaire
    rpeNotes: text(),
    // User notes from RPE questionnaire
    deviation: text(),
    // JSON: comparison of prescribed vs actual
    activePlanType: text("active_plan_type", { enum: ["ai", "algorithmic"] }).default("algorithmic").notNull(),
    // Track which plan is active for this session
    isCompleted: integer({ mode: "boolean" }).notNull().default(false),
    completedAt: date(),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("playbook_session_week_id_idx").on(t.playbookWeekId),
    index("playbook_session_date_idx").on(t.sessionDate),
    index("playbook_session_workout_id_idx").on(t.actualWorkoutId),
    index("playbook_session_week_number_idx").on(
      t.playbookWeekId,
      t.sessionNumber
    ),
    uniqueIndex("playbook_session_unique").on(
      t.playbookWeekId,
      t.sessionNumber
    )
  ]
);
const playbookRegenerations = createTable(
  "playbook_regeneration",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    playbookId: integer().notNull().references(() => playbooks.id, { onDelete: "cascade" }),
    triggeredBySessionId: integer().references(() => playbookSessions.id, {
      onDelete: "set null"
    }),
    regenerationReason: text().notNull(),
    // 'manual' | 'deviation' | 'failed_pr' | 'rpe_feedback'
    affectedWeekStart: integer().notNull(),
    // Week number where regeneration starts
    affectedWeekEnd: integer().notNull(),
    // Week number where regeneration ends
    previousPlanSnapshot: text(),
    // JSON: snapshot of plan before regeneration
    newPlanSnapshot: text(),
    // JSON: snapshot of new plan
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("playbook_regeneration_playbook_id_idx").on(t.playbookId),
    index("playbook_regeneration_session_id_idx").on(t.triggeredBySessionId),
    index("playbook_regeneration_created_at_idx").on(t.playbookId, t.createdAt)
  ]
);
const workoutTemplatesRelations = relations(
  workoutTemplates,
  ({ many }) => ({
    exercises: many(templateExercises),
    sessions: many(workoutSessions)
  })
);
const templateExercisesRelations = relations(
  templateExercises,
  ({ one, many }) => ({
    template: one(workoutTemplates, {
      fields: [templateExercises.templateId],
      references: [workoutTemplates.id]
    }),
    sessionExercises: many(sessionExercises),
    exerciseLink: one(exerciseLinks, {
      fields: [templateExercises.id],
      references: [exerciseLinks.templateExerciseId]
    })
  })
);
const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    template: one(workoutTemplates, {
      fields: [workoutSessions.templateId],
      references: [workoutTemplates.id]
    }),
    exercises: many(sessionExercises),
    healthAdvice: one(healthAdvice, {
      fields: [workoutSessions.id],
      references: [healthAdvice.sessionId]
    }),
    wellnessData: one(wellnessData, {
      fields: [workoutSessions.id],
      references: [wellnessData.sessionId]
    }),
    recoveryPlanner: one(recoverySessionPlanner, {
      fields: [workoutSessions.id],
      references: [recoverySessionPlanner.sessionId]
    })
  })
);
const sessionExercisesRelations = relations(
  sessionExercises,
  ({ one }) => ({
    session: one(workoutSessions, {
      fields: [sessionExercises.sessionId],
      references: [workoutSessions.id]
    }),
    templateExercise: one(templateExercises, {
      fields: [sessionExercises.templateExerciseId],
      references: [templateExercises.id]
    })
  })
);
const userIntegrationsRelations = relations(
  userIntegrations,
  ({ many }) => ({
    whoopWorkouts: many(externalWorkoutsWhoop)
  })
);
const externalWorkoutsWhoopRelations = relations(
  externalWorkoutsWhoop,
  ({ one }) => ({
    integration: one(userIntegrations, {
      fields: [externalWorkoutsWhoop.user_id],
      references: [userIntegrations.user_id]
    })
  })
);
const masterExercisesRelations = relations(
  masterExercises,
  ({ many }) => ({
    exerciseLinks: many(exerciseLinks)
  })
);
const exerciseLinksRelations = relations(exerciseLinks, ({ one }) => ({
  templateExercise: one(templateExercises, {
    fields: [exerciseLinks.templateExerciseId],
    references: [templateExercises.id]
  }),
  masterExercise: one(masterExercises, {
    fields: [exerciseLinks.masterExerciseId],
    references: [masterExercises.id]
  })
}));
const healthAdviceRelations = relations(healthAdvice, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [healthAdvice.sessionId],
    references: [workoutSessions.id]
  })
}));
const sessionDebriefsRelations = relations(
  sessionDebriefs,
  ({ one, many }) => ({
    session: one(workoutSessions, {
      fields: [sessionDebriefs.sessionId],
      references: [workoutSessions.id]
    }),
    parent: one(sessionDebriefs, {
      fields: [sessionDebriefs.parentDebriefId],
      references: [sessionDebriefs.id],
      relationName: "session_debrief_parent"
    }),
    versions: many(sessionDebriefs, {
      relationName: "session_debrief_parent"
    })
  })
);
const wellnessDataRelations = relations(wellnessData, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [wellnessData.sessionId],
    references: [workoutSessions.id]
  })
}));
const recoverySessionPlannerRelations = relations(
  recoverySessionPlanner,
  ({ one }) => ({
    session: one(workoutSessions, {
      fields: [recoverySessionPlanner.sessionId],
      references: [workoutSessions.id]
    }),
    template: one(workoutTemplates, {
      fields: [recoverySessionPlanner.templateId],
      references: [workoutTemplates.id]
    })
  })
);
const aiSuggestionHistoryRelations = relations(
  aiSuggestionHistory,
  ({ one }) => ({
    session: one(workoutSessions, {
      fields: [aiSuggestionHistory.sessionId],
      references: [workoutSessions.id]
    })
  })
);
const whoopRecoveryRelations = relations(whoopRecovery, ({ one }) => ({
  cycle: one(whoopCycles, {
    fields: [whoopRecovery.cycle_id],
    references: [whoopCycles.whoop_cycle_id]
  })
}));
const whoopCyclesRelations = relations(whoopCycles, ({ many }) => ({
  recoveries: many(whoopRecovery)
}));
const whoopSleepRelations = relations(whoopSleep, ({}) => ({
  // Could add relationship to cycles if needed
}));
const whoopProfileRelations = relations(whoopProfile, ({}) => ({
  // Profile is standalone
}));
const whoopBodyMeasurementRelations = relations(
  whoopBodyMeasurement,
  ({}) => ({
    // Measurements are standalone
  })
);
const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));
const playbooksRelations = relations(playbooks, ({ many }) => ({
  weeks: many(playbookWeeks),
  regenerations: many(playbookRegenerations)
}));
const playbookWeeksRelations = relations(
  playbookWeeks,
  ({ one, many }) => ({
    playbook: one(playbooks, {
      fields: [playbookWeeks.playbookId],
      references: [playbooks.id]
    }),
    sessions: many(playbookSessions)
  })
);
const playbookSessionsRelations = relations(
  playbookSessions,
  ({ one }) => ({
    week: one(playbookWeeks, {
      fields: [playbookSessions.playbookWeekId],
      references: [playbookWeeks.id]
    }),
    actualWorkout: one(workoutSessions, {
      fields: [playbookSessions.actualWorkoutId],
      references: [workoutSessions.id]
    })
  })
);
const playbookRegenerationsRelations = relations(
  playbookRegenerations,
  ({ one }) => ({
    playbook: one(playbooks, {
      fields: [playbookRegenerations.playbookId],
      references: [playbooks.id]
    }),
    triggeredBySession: one(playbookSessions, {
      fields: [playbookRegenerations.triggeredBySessionId],
      references: [playbookSessions.id]
    })
  })
);
const exerciseDailySummary = createTable(
  "exercise_daily_summary",
  {
    user_id: text().notNull(),
    exercise_name: text().notNull(),
    date: date().notNull(),
    total_volume: real(),
    max_weight: real(),
    max_one_rm: real(),
    session_count: integer().notNull().default(0),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    uniqueIndex("exercise_daily_summary_pk").on(
      t.user_id,
      t.exercise_name,
      t.date
    ),
    index("exercise_daily_summary_user_exercise_idx").on(
      t.user_id,
      t.exercise_name
    ),
    index("exercise_daily_summary_user_date_idx").on(t.user_id, t.date),
    index("exercise_daily_summary_date_idx").on(t.date)
  ]
);
const exerciseWeeklySummary = createTable(
  "exercise_weekly_summary",
  {
    user_id: text().notNull(),
    exercise_name: text().notNull(),
    week_start: date().notNull(),
    // Monday of the week
    avg_volume: real(),
    max_one_rm: real(),
    session_count: integer().notNull().default(0),
    trend_slope: real(),
    // Linear regression slope for progression
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    uniqueIndex("exercise_weekly_summary_pk").on(
      t.user_id,
      t.exercise_name,
      t.week_start
    ),
    index("exercise_weekly_summary_user_exercise_idx").on(
      t.user_id,
      t.exercise_name
    ),
    index("exercise_weekly_summary_user_week_idx").on(t.user_id, t.week_start),
    index("exercise_weekly_summary_week_idx").on(t.week_start)
  ]
);
const exerciseMonthlySummary = createTable(
  "exercise_monthly_summary",
  {
    user_id: text().notNull(),
    exercise_name: text().notNull(),
    month_start: date().notNull(),
    // First day of the month
    total_volume: real(),
    max_one_rm: real(),
    session_count: integer().notNull().default(0),
    consistency_score: real(),
    // 0-1 score based on workout frequency
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    uniqueIndex("exercise_monthly_summary_pk").on(
      t.user_id,
      t.exercise_name,
      t.month_start
    ),
    index("exercise_monthly_summary_user_exercise_idx").on(
      t.user_id,
      t.exercise_name
    ),
    index("exercise_monthly_summary_user_month_idx").on(
      t.user_id,
      t.month_start
    ),
    index("exercise_monthly_summary_month_idx").on(t.month_start)
  ]
);
const keyLifts = createTable(
  "key_lifts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text().notNull(),
    masterExerciseId: integer().notNull(),
    isTracking: integer({ mode: "boolean" }).notNull().default(true),
    maintenanceMode: integer({ mode: "boolean" }).notNull().default(false),
    createdAt: date().default(sql`(datetime('now'))`).notNull(),
    updatedAt: date()
  },
  (t) => [
    index("key_lifts_user_master_idx").on(t.userId, t.masterExerciseId),
    index("key_lifts_user_tracking_idx").on(t.userId, t.isTracking),
    uniqueIndex("key_lifts_user_master_unique").on(
      t.userId,
      t.masterExerciseId
    )
  ]
);
const plateaus = createTable(
  "plateaus",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text().notNull(),
    masterExerciseId: integer().notNull(),
    keyLiftId: integer(),
    detectedAt: date().default(sql`(datetime('now'))`).notNull(),
    resolvedAt: date(),
    stalledWeight: real().notNull(),
    stalledReps: integer().notNull(),
    sessionCount: integer().notNull().default(3),
    status: text().notNull().default("active"),
    // 'active' | 'resolved' | 'maintaining'
    metadata: text(),
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("plateaus_user_status_detected_idx").on(
      t.userId,
      t.status,
      t.detectedAt
    ),
    index("plateaus_master_exercise_idx").on(t.masterExerciseId),
    index("plateaus_key_lift_idx").on(t.keyLiftId)
  ]
);
const milestones = createTable(
  "milestones",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text().notNull(),
    masterExerciseId: integer(),
    // nullable for volume milestones
    type: text().notNull(),
    // 'absolute_weight' | 'bodyweight_multiplier' | 'volume'
    targetValue: real().notNull(),
    targetMultiplier: real(),
    // for BW type
    isSystemDefault: integer({ mode: "boolean" }).notNull().default(false),
    isCustomized: integer({ mode: "boolean" }).notNull().default(false),
    experienceLevel: text().notNull(),
    createdAt: date().default(sql`(datetime('now'))`).notNull()
  },
  (t) => [
    index("milestones_user_master_idx").on(t.userId, t.masterExerciseId),
    index("milestones_user_type_level_idx").on(
      t.userId,
      t.type,
      t.experienceLevel
    ),
    index("milestones_system_default_idx").on(
      t.isSystemDefault,
      t.experienceLevel
    )
  ]
);
const milestoneAchievements = createTable(
  "milestone_achievements",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text().notNull(),
    milestoneId: integer().notNull(),
    achievedAt: date().default(sql`(datetime('now'))`).notNull(),
    achievedValue: real().notNull(),
    workoutId: integer(),
    metadata: text()
  },
  (t) => [
    index("milestone_achievements_user_achieved_idx").on(
      t.userId,
      t.achievedAt
    ),
    index("milestone_achievements_milestone_idx").on(t.milestoneId),
    index("milestone_achievements_workout_idx").on(t.workoutId),
    uniqueIndex("milestone_achievements_user_milestone_unique").on(
      t.userId,
      t.milestoneId
    )
  ]
);
const prForecasts = createTable(
  "pr_forecasts",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: text().notNull(),
    masterExerciseId: integer().notNull(),
    forecastedWeight: real().notNull(),
    estimatedWeeksLow: integer().notNull(),
    estimatedWeeksHigh: integer().notNull(),
    confidencePercent: integer().notNull(),
    whoopRecoveryFactor: real(),
    calculatedAt: date().default(sql`(datetime('now'))`).notNull(),
    metadata: text()
  },
  (t) => [
    index("pr_forecasts_user_master_calculated_idx").on(
      t.userId,
      t.masterExerciseId,
      t.calculatedAt
    ),
    index("pr_forecasts_master_exercise_idx").on(t.masterExerciseId),
    index("pr_forecasts_confidence_idx").on(t.confidencePercent)
  ]
);
const keyLiftsRelations = relations(keyLifts, ({ one, many }) => ({
  user: one(users, {
    fields: [keyLifts.userId],
    references: [users.id]
  }),
  masterExercise: one(masterExercises, {
    fields: [keyLifts.masterExerciseId],
    references: [masterExercises.id]
  }),
  plateaus: many(plateaus)
}));
const plateausRelations = relations(plateaus, ({ one, many }) => ({
  user: one(users, {
    fields: [plateaus.userId],
    references: [users.id]
  }),
  masterExercise: one(masterExercises, {
    fields: [plateaus.masterExerciseId],
    references: [masterExercises.id]
  }),
  keyLift: one(keyLifts, {
    fields: [plateaus.keyLiftId],
    references: [keyLifts.id]
  })
}));
const milestonesRelations = relations(milestones, ({ one, many }) => ({
  user: one(users, {
    fields: [milestones.userId],
    references: [users.id]
  }),
  masterExercise: one(masterExercises, {
    fields: [milestones.masterExerciseId],
    references: [masterExercises.id]
  }),
  achievements: many(milestoneAchievements)
}));
const milestoneAchievementsRelations = relations(
  milestoneAchievements,
  ({ one }) => ({
    user: one(users, {
      fields: [milestoneAchievements.userId],
      references: [users.id]
    }),
    milestone: one(milestones, {
      fields: [milestoneAchievements.milestoneId],
      references: [milestones.id]
    }),
    workout: one(workoutSessions, {
      fields: [milestoneAchievements.workoutId],
      references: [workoutSessions.id]
    })
  })
);
const prForecastsRelations = relations(prForecasts, ({ one }) => ({
  user: one(users, {
    fields: [prForecasts.userId],
    references: [users.id]
  }),
  masterExercise: one(masterExercises, {
    fields: [prForecasts.masterExerciseId],
    references: [masterExercises.id]
  })
}));
const viewExerciseNameResolution = sqliteView(
  "view_exercise_name_resolution"
).as(
  (qb) => qb.select({
    templateExerciseId: templateExercises.id,
    exerciseName: templateExercises.exerciseName,
    resolvedName: sql`COALESCE(${masterExercises.name}, ${templateExercises.exerciseName})`.as(
      "resolvedName"
    ),
    masterExerciseId: exerciseLinks.masterExerciseId
  }).from(templateExercises).leftJoin(
    exerciseLinks,
    eq(exerciseLinks.templateExerciseId, templateExercises.id)
  ).leftJoin(
    masterExercises,
    eq(masterExercises.id, exerciseLinks.masterExerciseId)
  )
);
const viewSessionExerciseMetrics = sqliteView(
  "view_session_exercise_metrics"
).as(
  (qb) => qb.select({
    sessionExerciseId: sessionExercises.id,
    sessionId: sessionExercises.sessionId,
    userId: sessionExercises.user_id,
    templateExerciseId: sessionExercises.templateExerciseId,
    exerciseName: sessionExercises.exerciseName,
    resolvedExerciseName: sql`COALESCE(NULLIF(${sessionExercises.resolvedExerciseName}, ''), ${sessionExercises.exerciseName})`.as(
      "resolvedExerciseName"
    ),
    workoutDate: workoutSessions.workoutDate,
    weight: sessionExercises.weight,
    reps: sessionExercises.reps,
    sets: sessionExercises.sets,
    unit: sessionExercises.unit,
    oneRmEstimate: sessionExercises.one_rm_estimate,
    volumeLoad: sessionExercises.volume_load
  }).from(sessionExercises).innerJoin(
    workoutSessions,
    eq(workoutSessions.id, sessionExercises.sessionId)
  )
);
const viewWhoopMetrics = sqliteView("view_whoop_metrics").as(
  (qb) => qb.select({
    userId: whoopRecovery.user_id,
    date: whoopRecovery.date,
    recoveryScore: whoopRecovery.recovery_score,
    sleepPerformance: sql`NULL`.as("sleepPerformance"),
    hrvNow: whoopRecovery.hrv_rmssd_milli,
    hrvBaseline: whoopRecovery.hrv_rmssd_baseline,
    rhrNow: whoopRecovery.resting_heart_rate,
    rhrBaseline: whoopRecovery.resting_heart_rate_baseline
  }).from(whoopRecovery)
);
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aiSuggestionHistory,
  aiSuggestionHistoryRelations,
  createTable,
  exerciseDailySummary,
  exerciseLinks,
  exerciseLinksRelations,
  exerciseMonthlySummary,
  exerciseResolutionCache,
  exerciseWeeklySummary,
  externalWorkoutsWhoop,
  externalWorkoutsWhoopRelations,
  healthAdvice,
  healthAdviceRelations,
  keyLifts,
  keyLiftsRelations,
  masterExercises,
  masterExercisesRelations,
  milestoneAchievements,
  milestoneAchievementsRelations,
  milestones,
  milestonesRelations,
  oauthStates,
  plateaus,
  plateausRelations,
  playbookRegenerations,
  playbookRegenerationsRelations,
  playbookSessions,
  playbookSessionsRelations,
  playbookWeeks,
  playbookWeeksRelations,
  playbooks,
  playbooksRelations,
  prForecasts,
  prForecastsRelations,
  rateLimits,
  recoverySessionPlanner,
  recoverySessionPlannerRelations,
  sessionDebriefs,
  sessionDebriefsRelations,
  sessionExercises,
  sessionExercisesRelations,
  sessions,
  sessionsRelations,
  templateExercises,
  templateExercisesRelations,
  userIntegrations,
  userIntegrationsRelations,
  userPreferences,
  users,
  viewExerciseNameResolution,
  viewSessionExerciseMetrics,
  viewWhoopMetrics,
  webhookEvents,
  wellnessData,
  wellnessDataRelations,
  whoopBodyMeasurement,
  whoopBodyMeasurementRelations,
  whoopCycles,
  whoopCyclesRelations,
  whoopProfile,
  whoopProfileRelations,
  whoopRecovery,
  whoopRecoveryRelations,
  whoopSleep,
  whoopSleepRelations,
  workoutSessions,
  workoutSessionsRelations,
  workoutTemplates,
  workoutTemplatesRelations
}, Symbol.toStringTag, { value: "Module" }));
function getDb() {
  const env$1 = env;
  if (!env$1.DB) {
    throw new Error("D1 database binding not available");
  }
  return drizzle(env$1.DB, { schema });
}
var define_process_env_default$2 = {};
const cfEnv$2 = define_process_env_default$2;
function getSessionDb() {
  return getDb();
}
const SESSION_COOKIE_NAME = "workos_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SESSION_COOKIE_PATH = "/";
const SESSION_COOKIE_SAME_SITE = "lax";
const SESSION_COOKIE_SECURE = cfEnv$2.NODE_ENV === "production";
function getSecret() {
  const secret = cfEnv$2.WORKER_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "WORKER_SESSION_SECRET must be at least 32 characters long"
    );
  }
  return secret;
}
async function sign(data) {
  const secret = getSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verify(data, signature) {
  const secret = getSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signatureBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(data)
  );
}
class SessionCookie {
  static async create(session2) {
    const sessionId = crypto.randomUUID();
    const accessTokenExpiresAt = session2.accessTokenExpiresAt ?? session2.expiresAt;
    const sessionExpiresAt = session2.sessionExpiresAt ?? accessTokenExpiresAt;
    if (typeof accessTokenExpiresAt !== "number" || typeof sessionExpiresAt !== "number") {
      throw new Error("Session expiry values must be numbers");
    }
    await getSessionDb().insert(sessions).values({
      id: sessionId,
      userId: session2.userId,
      organizationId: session2.organizationId,
      accessToken: session2.accessToken,
      refreshToken: session2.refreshToken,
      expiresAt: accessTokenExpiresAt,
      accessTokenExpiresAt,
      sessionExpiresAt
    });
    const signature = await sign(sessionId);
    const signedData = `${sessionId}.${signature}`;
    const cookieParts = [
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(signedData)}`,
      `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
      `Path=${SESSION_COOKIE_PATH}`,
      "HttpOnly",
      SESSION_COOKIE_SECURE ? "Secure" : "",
      `SameSite=${SESSION_COOKIE_SAME_SITE}`
    ].filter(Boolean);
    return cookieParts.join("; ");
  }
  static async get(request) {
    if (define_process_env_default$2["E2E_TESTING"] === "true") {
      return {
        userId: "e2e-test-user",
        accessToken: "e2e-test-token",
        refreshToken: null,
        accessTokenExpiresAt: Math.floor(Date.now() / 1e3) + 3600,
        sessionExpiresAt: Math.floor(Date.now() / 1e3) + 3600,
        expiresAt: Math.floor(Date.now() / 1e3) + 3600
      };
    }
    const cookies = request.headers.get("cookie");
    if (!cookies) return null;
    const cookieValue = this.extractCookieValue(cookies, SESSION_COOKIE_NAME);
    if (!cookieValue) return null;
    try {
      const decodedCookieValue = decodeURIComponent(cookieValue);
      const separatorIndex = decodedCookieValue.lastIndexOf(".");
      if (separatorIndex <= 0 || separatorIndex === decodedCookieValue.length - 1) {
        return null;
      }
      const sessionId = decodedCookieValue.slice(0, separatorIndex);
      const signature = decodedCookieValue.slice(separatorIndex + 1);
      const isValid = await verify(sessionId, signature);
      if (!isValid) return null;
      const [sessionData] = await getSessionDb().select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      if (!sessionData) return null;
      const nowSeconds = Math.floor(Date.now() / 1e3);
      const sessionExpiresAt = sessionData.sessionExpiresAt ?? sessionData.expiresAt;
      const accessTokenExpiresAt = sessionData.accessTokenExpiresAt ?? sessionData.expiresAt;
      if (typeof sessionExpiresAt !== "number" || typeof accessTokenExpiresAt !== "number" || sessionExpiresAt <= nowSeconds) {
        return null;
      }
      const result = {
        userId: sessionData.userId,
        accessToken: sessionData.accessToken,
        refreshToken: sessionData.refreshToken,
        accessTokenExpiresAt,
        sessionExpiresAt,
        expiresAt: accessTokenExpiresAt
      };
      if (sessionData.organizationId) {
        result.organizationId = sessionData.organizationId;
      }
      return result;
    } catch (_error) {
      return null;
    }
  }
  static async destroy(request) {
    try {
      const cookies = request.headers.get("cookie");
      if (cookies) {
        const cookieValue = this.extractCookieValue(
          cookies,
          SESSION_COOKIE_NAME
        );
        if (cookieValue) {
          const decodedCookieValue = decodeURIComponent(cookieValue);
          const separatorIndex = decodedCookieValue.lastIndexOf(".");
          if (separatorIndex > 0 && separatorIndex < decodedCookieValue.length - 1) {
            const sessionId = decodedCookieValue.slice(0, separatorIndex);
            const signature = decodedCookieValue.slice(separatorIndex + 1);
            if (await verify(sessionId, signature)) {
              await getSessionDb().delete(sessions).where(eq(sessions.id, sessionId));
            }
          }
        }
      }
    } catch (_error) {
    }
    return [
      `${SESSION_COOKIE_NAME}=`,
      `Max-Age=0`,
      `Path=${SESSION_COOKIE_PATH}`,
      "HttpOnly",
      SESSION_COOKIE_SECURE ? "Secure" : "",
      `SameSite=${SESSION_COOKIE_SAME_SITE}`
    ].filter(Boolean).join("; ");
  }
  static extractCookieValue(cookieString, name) {
    const cookies = cookieString.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${name}=`)) {
        return cookie.substring(`${name}=`.length);
      }
    }
    return null;
  }
  static async hasSession(request) {
    const session2 = await this.get(request);
    return session2 !== null;
  }
  static isExpired(session2) {
    const now = Math.floor(Date.now() / 1e3);
    const sessionExpiry = typeof session2.sessionExpiresAt === "number" ? session2.sessionExpiresAt : session2.expiresAt;
    return sessionExpiry <= now;
  }
  static async update(request, session2) {
    const cookies = request.headers.get("cookie");
    if (!cookies) return;
    const cookieValue = this.extractCookieValue(cookies, SESSION_COOKIE_NAME);
    if (!cookieValue) return;
    try {
      const decodedCookieValue = decodeURIComponent(cookieValue);
      const separatorIndex = decodedCookieValue.lastIndexOf(".");
      if (separatorIndex <= 0 || separatorIndex === decodedCookieValue.length - 1) {
        return;
      }
      const sessionId = decodedCookieValue.slice(0, separatorIndex);
      const accessTokenExpiresAt = session2.accessTokenExpiresAt ?? session2.expiresAt;
      const sessionExpiresAt = session2.sessionExpiresAt ?? accessTokenExpiresAt;
      await getSessionDb().update(sessions).set({
        accessToken: session2.accessToken,
        refreshToken: session2.refreshToken,
        expiresAt: accessTokenExpiresAt,
        accessTokenExpiresAt,
        sessionExpiresAt,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(sessions.id, sessionId));
    } catch (_error) {
    }
  }
}
async function getServerContext() {
  const request = getRequest();
  const requestId = crypto.randomUUID();
  const db = getDb();
  let user = null;
  let session2 = null;
  const cfEnvVars = env;
  const isE2ETest = cfEnvVars.E2E_TESTING === "true" || request?.headers.get("x-e2e-test") === "true";
  if (isE2ETest) {
    session2 = {
      userId: "e2e-test-user",
      accessToken: "e2e-test-token",
      refreshToken: null,
      accessTokenExpiresAt: Date.now() + 36e5,
      sessionExpiresAt: Date.now() + 36e5,
      expiresAt: Date.now() + 36e5
    };
    user = { id: session2.userId };
  } else if (request) {
    try {
      session2 = await SessionCookie.get(request);
      if (session2 && !SessionCookie.isExpired(session2)) {
        user = { id: session2.userId };
      }
    } catch (error) {
      console.error("Failed to get session:", error);
    }
  }
  return { db, user, session: session2, requestId };
}
const $$splitComponentImporter$1 = () => import("./_app-C31XU4fv.js");
const Route$5 = createFileRoute("/_app")({
  beforeLoad: async () => {
    const {
      user
    } = await getServerContext();
    if (!user) {
      throw redirect({
        to: "/sign-in"
      });
    }
    return {
      user
    };
  },
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./_app._index-Cdo9neNM.js");
const Route$4 = createFileRoute("/_app/_index")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const Route$3 = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        const { user, session: session2 } = await getServerContext();
        if (!user || !session2) {
          return Response.json({ user: null }, { status: 401 });
        }
        return Response.json({
          user: { id: user.id },
          expiresAt: session2.sessionExpiresAt
        });
      }
    }
  }
});
const Route$2 = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const destroyCookie = await SessionCookie.destroy(request);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/sign-in",
            "Set-Cookie": destroyCookie
          }
        });
      }
    }
  }
});
var define_process_env_default$1 = {};
const cfEnv$1 = define_process_env_default$1;
const Route$1 = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "GoogleOAuth";
        const redirectTo = url.searchParams.get("redirectTo") || "/";
        const workosClientId = cfEnv$1.WORKOS_CLIENT_ID;
        const siteUrl = cfEnv$1.SITE_URL || "http://localhost:8787";
        if (!workosClientId) {
          return new Response("WorkOS client ID not configured", {
            status: 500
          });
        }
        const authUrl = new URL(
          "https://api.workos.com/user_management/authentication/start"
        );
        authUrl.searchParams.set("client_id", workosClientId);
        authUrl.searchParams.set(
          "redirect_uri",
          `${siteUrl}/api/auth/callback`
        );
        authUrl.searchParams.set("provider", provider);
        authUrl.searchParams.set("state", redirectTo);
        return new Response(null, {
          status: 302,
          headers: {
            Location: authUrl.toString()
          }
        });
      }
    }
  }
});
var lib = {};
var nodeCryptoProvider = {};
var cryptoProvider = {};
var hasRequiredCryptoProvider;
function requireCryptoProvider() {
  if (hasRequiredCryptoProvider) return cryptoProvider;
  hasRequiredCryptoProvider = 1;
  Object.defineProperty(cryptoProvider, "__esModule", { value: true });
  cryptoProvider.CryptoProvider = void 0;
  class CryptoProvider {
    constructor() {
      this.encoder = new TextEncoder();
    }
  }
  cryptoProvider.CryptoProvider = CryptoProvider;
  return cryptoProvider;
}
var hasRequiredNodeCryptoProvider;
function requireNodeCryptoProvider() {
  if (hasRequiredNodeCryptoProvider) return nodeCryptoProvider;
  hasRequiredNodeCryptoProvider = 1;
  var __createBinding = nodeCryptoProvider && nodeCryptoProvider.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = nodeCryptoProvider && nodeCryptoProvider.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = nodeCryptoProvider && nodeCryptoProvider.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  var __awaiter = nodeCryptoProvider && nodeCryptoProvider.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(nodeCryptoProvider, "__esModule", { value: true });
  nodeCryptoProvider.NodeCryptoProvider = void 0;
  const crypto2 = __importStar(require$$0);
  const crypto_provider_1 = requireCryptoProvider();
  class NodeCryptoProvider extends crypto_provider_1.CryptoProvider {
    /** @override */
    computeHMACSignature(payload, secret) {
      return crypto2.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
    }
    /** @override */
    computeHMACSignatureAsync(payload, secret) {
      return __awaiter(this, void 0, void 0, function* () {
        const signature = this.computeHMACSignature(payload, secret);
        return signature;
      });
    }
    /** @override */
    secureCompare(stringA, stringB) {
      return __awaiter(this, void 0, void 0, function* () {
        const bufferA = this.encoder.encode(stringA);
        const bufferB = this.encoder.encode(stringB);
        if (bufferA.length !== bufferB.length) {
          return false;
        }
        const key = crypto2.randomBytes(32);
        const hmacA = crypto2.createHmac("sha256", key).update(bufferA).digest();
        const hmacB = crypto2.createHmac("sha256", key).update(bufferB).digest();
        return crypto2.timingSafeEqual(hmacA, hmacB);
      });
    }
    encrypt(plaintext, key, iv, aad) {
      return __awaiter(this, void 0, void 0, function* () {
        const actualIv = iv || crypto2.randomBytes(32);
        const cipher = crypto2.createCipheriv("aes-256-gcm", key, actualIv);
        if (aad) {
          cipher.setAAD(Buffer.from(aad));
        }
        const ciphertext = Buffer.concat([
          cipher.update(Buffer.from(plaintext)),
          cipher.final()
        ]);
        const tag = cipher.getAuthTag();
        return {
          ciphertext: new Uint8Array(ciphertext),
          iv: new Uint8Array(actualIv),
          tag: new Uint8Array(tag)
        };
      });
    }
    decrypt(ciphertext, key, iv, tag, aad) {
      return __awaiter(this, void 0, void 0, function* () {
        const decipher = crypto2.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(tag));
        if (aad) {
          decipher.setAAD(Buffer.from(aad));
        }
        const decrypted = Buffer.concat([
          decipher.update(Buffer.from(ciphertext)),
          decipher.final()
        ]);
        return new Uint8Array(decrypted);
      });
    }
    randomBytes(length) {
      return new Uint8Array(crypto2.randomBytes(length));
    }
  }
  nodeCryptoProvider.NodeCryptoProvider = NodeCryptoProvider;
  return nodeCryptoProvider;
}
var subtleCryptoProvider = {};
var hasRequiredSubtleCryptoProvider;
function requireSubtleCryptoProvider() {
  if (hasRequiredSubtleCryptoProvider) return subtleCryptoProvider;
  hasRequiredSubtleCryptoProvider = 1;
  var __awaiter = subtleCryptoProvider && subtleCryptoProvider.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(subtleCryptoProvider, "__esModule", { value: true });
  subtleCryptoProvider.SubtleCryptoProvider = void 0;
  const crypto_provider_1 = requireCryptoProvider();
  class SubtleCryptoProvider extends crypto_provider_1.CryptoProvider {
    constructor(subtleCrypto) {
      super();
      this.subtleCrypto = subtleCrypto || crypto.subtle;
    }
    computeHMACSignature(_payload, _secret) {
      throw new Error("SubleCryptoProvider cannot be used in a synchronous context.");
    }
    /** @override */
    computeHMACSignatureAsync(payload, secret) {
      return __awaiter(this, void 0, void 0, function* () {
        const encoder = new TextEncoder();
        const key = yield this.subtleCrypto.importKey("raw", encoder.encode(secret), {
          name: "HMAC",
          hash: { name: "SHA-256" }
        }, false, ["sign"]);
        const signatureBuffer = yield this.subtleCrypto.sign("hmac", key, encoder.encode(payload));
        const signatureBytes = new Uint8Array(signatureBuffer);
        const signatureHexCodes = new Array(signatureBytes.length);
        for (let i = 0; i < signatureBytes.length; i++) {
          signatureHexCodes[i] = byteHexMapping[signatureBytes[i]];
        }
        return signatureHexCodes.join("");
      });
    }
    /** @override */
    secureCompare(stringA, stringB) {
      return __awaiter(this, void 0, void 0, function* () {
        const bufferA = this.encoder.encode(stringA);
        const bufferB = this.encoder.encode(stringB);
        if (bufferA.length !== bufferB.length) {
          return false;
        }
        const algorithm = { name: "HMAC", hash: "SHA-256" };
        const key = yield crypto.subtle.generateKey(algorithm, false, [
          "sign",
          "verify"
        ]);
        const hmac = yield crypto.subtle.sign(algorithm, key, bufferA);
        const equal = yield crypto.subtle.verify(algorithm, key, hmac, bufferB);
        return equal;
      });
    }
    encrypt(plaintext, key, iv, aad) {
      return __awaiter(this, void 0, void 0, function* () {
        const actualIv = iv || crypto.getRandomValues(new Uint8Array(32));
        const cryptoKey = yield this.subtleCrypto.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
        const encryptParams = {
          name: "AES-GCM",
          iv: actualIv
        };
        if (aad) {
          encryptParams.additionalData = aad;
        }
        const encryptedData = yield this.subtleCrypto.encrypt(encryptParams, cryptoKey, plaintext);
        const encryptedBytes = new Uint8Array(encryptedData);
        const tagSize = 16;
        const tagStart = encryptedBytes.length - tagSize;
        const tag = encryptedBytes.slice(tagStart);
        const ciphertext = encryptedBytes.slice(0, tagStart);
        return {
          ciphertext,
          iv: actualIv,
          tag
        };
      });
    }
    decrypt(ciphertext, key, iv, tag, aad) {
      return __awaiter(this, void 0, void 0, function* () {
        const combinedData = new Uint8Array(ciphertext.length + tag.length);
        combinedData.set(ciphertext, 0);
        combinedData.set(tag, ciphertext.length);
        const cryptoKey = yield this.subtleCrypto.importKey("raw", key, { name: "AES-GCM" }, false, ["decrypt"]);
        const decryptParams = {
          name: "AES-GCM",
          iv
        };
        if (aad) {
          decryptParams.additionalData = aad;
        }
        const decryptedData = yield this.subtleCrypto.decrypt(decryptParams, cryptoKey, combinedData);
        return new Uint8Array(decryptedData);
      });
    }
    randomBytes(length) {
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      return bytes;
    }
  }
  subtleCryptoProvider.SubtleCryptoProvider = SubtleCryptoProvider;
  const byteHexMapping = new Array(256);
  for (let i = 0; i < byteHexMapping.length; i++) {
    byteHexMapping[i] = i.toString(16).padStart(2, "0");
  }
  return subtleCryptoProvider;
}
var fetchClient = {};
var httpClient = {};
var hasRequiredHttpClient;
function requireHttpClient() {
  if (hasRequiredHttpClient) return httpClient;
  hasRequiredHttpClient = 1;
  Object.defineProperty(httpClient, "__esModule", { value: true });
  httpClient.HttpClientError = httpClient.HttpClientResponse = httpClient.HttpClient = void 0;
  class HttpClient {
    constructor(baseURL, options) {
      this.baseURL = baseURL;
      this.options = options;
      this.MAX_RETRY_ATTEMPTS = 3;
      this.BACKOFF_MULTIPLIER = 1.5;
      this.MINIMUM_SLEEP_TIME_IN_MILLISECONDS = 500;
      this.RETRY_STATUS_CODES = [500, 502, 504];
      this.sleep = (retryAttempt) => new Promise((resolve) => setTimeout(resolve, this.getSleepTimeInMilliseconds(retryAttempt)));
    }
    /** The HTTP client name used for diagnostics */
    getClientName() {
      throw new Error("getClientName not implemented");
    }
    addClientToUserAgent(userAgent) {
      if (userAgent.indexOf(" ") > -1) {
        return userAgent.replace(/\b\s/, `/${this.getClientName()} `);
      } else {
        return userAgent += `/${this.getClientName()}`;
      }
    }
    static getResourceURL(baseURL, path, params) {
      const queryString = HttpClient.getQueryString(params);
      const url = new URL([path, queryString].filter(Boolean).join("?"), baseURL);
      return url.toString();
    }
    static getQueryString(queryObj) {
      if (!queryObj)
        return void 0;
      const sanitizedQueryObj = {};
      Object.entries(queryObj).forEach(([param, value]) => {
        if (value !== "" && value !== void 0)
          sanitizedQueryObj[param] = value;
      });
      return new URLSearchParams(sanitizedQueryObj).toString();
    }
    static getContentTypeHeader(entity) {
      if (entity instanceof URLSearchParams) {
        return {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        };
      }
      return void 0;
    }
    static getBody(entity) {
      if (entity === null || entity instanceof URLSearchParams) {
        return entity;
      }
      return JSON.stringify(entity);
    }
    getSleepTimeInMilliseconds(retryAttempt) {
      const sleepTime = this.MINIMUM_SLEEP_TIME_IN_MILLISECONDS * Math.pow(this.BACKOFF_MULTIPLIER, retryAttempt);
      const jitter = Math.random() + 0.5;
      return sleepTime * jitter;
    }
  }
  httpClient.HttpClient = HttpClient;
  class HttpClientResponse {
    constructor(statusCode, headers) {
      this._statusCode = statusCode;
      this._headers = headers;
    }
    getStatusCode() {
      return this._statusCode;
    }
    getHeaders() {
      return this._headers;
    }
  }
  httpClient.HttpClientResponse = HttpClientResponse;
  class HttpClientError extends Error {
    constructor({ message, response }) {
      super(message);
      this.name = "HttpClientError";
      this.message = "The request could not be completed.";
      this.message = message;
      this.response = response;
    }
  }
  httpClient.HttpClientError = HttpClientError;
  return httpClient;
}
var parseError = {};
var hasRequiredParseError;
function requireParseError() {
  if (hasRequiredParseError) return parseError;
  hasRequiredParseError = 1;
  Object.defineProperty(parseError, "__esModule", { value: true });
  parseError.ParseError = void 0;
  class ParseError extends Error {
    constructor({ message, rawBody, rawStatus, requestID }) {
      super(message);
      this.name = "ParseError";
      this.status = 500;
      this.rawBody = rawBody;
      this.rawStatus = rawStatus;
      this.requestID = requestID;
    }
  }
  parseError.ParseError = ParseError;
  return parseError;
}
var hasRequiredFetchClient;
function requireFetchClient() {
  if (hasRequiredFetchClient) return fetchClient;
  hasRequiredFetchClient = 1;
  var __awaiter = fetchClient && fetchClient.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(fetchClient, "__esModule", { value: true });
  fetchClient.FetchHttpClientResponse = fetchClient.FetchHttpClient = void 0;
  const http_client_1 = requireHttpClient();
  const parse_error_1 = requireParseError();
  const DEFAULT_FETCH_TIMEOUT = 6e4;
  class FetchHttpClient extends http_client_1.HttpClient {
    constructor(baseURL, options, fetchFn) {
      super(baseURL, options);
      this.baseURL = baseURL;
      this.options = options;
      if (!fetchFn) {
        if (!globalThis.fetch) {
          throw new Error("Fetch function not defined in the global scope and no replacement was provided.");
        }
        fetchFn = globalThis.fetch;
      }
      this._fetchFn = fetchFn.bind(globalThis);
    }
    /** @override */
    getClientName() {
      return "fetch";
    }
    get(path, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.fetchRequestWithRetry(resourceURL, "GET", null, options.headers);
        } else {
          return yield this.fetchRequest(resourceURL, "GET", null, options.headers);
        }
      });
    }
    post(path, entity, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.fetchRequestWithRetry(resourceURL, "POST", http_client_1.HttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        } else {
          return yield this.fetchRequest(resourceURL, "POST", http_client_1.HttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        }
      });
    }
    put(path, entity, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.fetchRequestWithRetry(resourceURL, "PUT", http_client_1.HttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        } else {
          return yield this.fetchRequest(resourceURL, "PUT", http_client_1.HttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        }
      });
    }
    delete(path, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.fetchRequestWithRetry(resourceURL, "DELETE", null, options.headers);
        } else {
          return yield this.fetchRequest(resourceURL, "DELETE", null, options.headers);
        }
      });
    }
    fetchRequest(url, method, body, headers) {
      var _a, _b, _c, _d, _e;
      return __awaiter(this, void 0, void 0, function* () {
        const methodHasPayload = method === "POST" || method === "PUT" || method === "PATCH";
        const requestBody = body || (methodHasPayload ? "" : void 0);
        const { "User-Agent": userAgent } = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.headers) || {};
        let abortController;
        let timeoutId;
        const timeout = (_c = (_b = this.options) === null || _b === void 0 ? void 0 : _b.timeout) !== null && _c !== void 0 ? _c : DEFAULT_FETCH_TIMEOUT;
        abortController = new AbortController();
        timeoutId = setTimeout(() => {
          abortController === null || abortController === void 0 ? void 0 : abortController.abort();
        }, timeout);
        try {
          const res = yield this._fetchFn(url, {
            method,
            headers: Object.assign(Object.assign(Object.assign({ Accept: "application/json, text/plain, */*", "Content-Type": "application/json" }, (_d = this.options) === null || _d === void 0 ? void 0 : _d.headers), headers), { "User-Agent": this.addClientToUserAgent((userAgent || "workos-node").toString()) }),
            body: requestBody,
            signal: abortController === null || abortController === void 0 ? void 0 : abortController.signal
          });
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          if (!res.ok) {
            const requestID = (_e = res.headers.get("X-Request-ID")) !== null && _e !== void 0 ? _e : "";
            const rawBody = yield res.text();
            let responseJson;
            try {
              responseJson = JSON.parse(rawBody);
            } catch (error) {
              if (error instanceof SyntaxError) {
                throw new parse_error_1.ParseError({
                  message: error.message,
                  rawBody,
                  requestID,
                  rawStatus: res.status
                });
              }
              throw error;
            }
            throw new http_client_1.HttpClientError({
              message: res.statusText,
              response: {
                status: res.status,
                headers: res.headers,
                data: responseJson
              }
            });
          }
          return new FetchHttpClientResponse(res);
        } catch (error) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          if (error instanceof Error && error.name === "AbortError") {
            throw new http_client_1.HttpClientError({
              message: `Request timeout after ${timeout}ms`,
              response: {
                status: 408,
                headers: {},
                data: { error: "Request timeout" }
              }
            });
          }
          throw error;
        }
      });
    }
    fetchRequestWithRetry(url, method, body, headers) {
      return __awaiter(this, void 0, void 0, function* () {
        let response;
        let retryAttempts = 1;
        const makeRequest = () => __awaiter(this, void 0, void 0, function* () {
          let requestError = null;
          try {
            response = yield this.fetchRequest(url, method, body, headers);
          } catch (e) {
            requestError = e;
          }
          if (this.shouldRetryRequest(requestError, retryAttempts)) {
            retryAttempts++;
            yield this.sleep(retryAttempts);
            return makeRequest();
          }
          if (requestError != null) {
            throw requestError;
          }
          return response;
        });
        return makeRequest();
      });
    }
    shouldRetryRequest(requestError, retryAttempt) {
      if (retryAttempt > this.MAX_RETRY_ATTEMPTS) {
        return false;
      }
      if (requestError != null) {
        if (requestError instanceof TypeError) {
          return true;
        }
        if (requestError instanceof http_client_1.HttpClientError && this.RETRY_STATUS_CODES.includes(requestError.response.status)) {
          return true;
        }
      }
      return false;
    }
  }
  fetchClient.FetchHttpClient = FetchHttpClient;
  class FetchHttpClientResponse extends http_client_1.HttpClientResponse {
    constructor(res) {
      super(res.status, FetchHttpClientResponse._transformHeadersToObject(res.headers));
      this._res = res;
    }
    getRawResponse() {
      return this._res;
    }
    toJSON() {
      const contentType = this._res.headers.get("content-type");
      const isJsonResponse = contentType === null || contentType === void 0 ? void 0 : contentType.includes("application/json");
      return isJsonResponse ? this._res.json() : null;
    }
    static _transformHeadersToObject(headers) {
      const headersObj = {};
      for (const entry of Object.entries(headers)) {
        if (!Array.isArray(entry) || entry.length !== 2) {
          throw new Error("Response objects produced by the fetch function given to FetchHttpClient do not have an iterable headers map. Response#headers should be an iterable object.");
        }
        headersObj[entry[0]] = entry[1];
      }
      return headersObj;
    }
  }
  fetchClient.FetchHttpClientResponse = FetchHttpClientResponse;
  return fetchClient;
}
var nodeClient = {};
var hasRequiredNodeClient;
function requireNodeClient() {
  if (hasRequiredNodeClient) return nodeClient;
  hasRequiredNodeClient = 1;
  var __createBinding = nodeClient && nodeClient.__createBinding || (Object.create ? (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  }) : (function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  }));
  var __setModuleDefault = nodeClient && nodeClient.__setModuleDefault || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
    o["default"] = v;
  });
  var __importStar = nodeClient && nodeClient.__importStar || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) {
      for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    }
    __setModuleDefault(result, mod);
    return result;
  };
  var __awaiter = nodeClient && nodeClient.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(nodeClient, "__esModule", { value: true });
  nodeClient.NodeHttpClientResponse = nodeClient.NodeHttpClient = void 0;
  const http_client_1 = requireHttpClient();
  const http_ = __importStar(require$$1);
  const https_ = __importStar(require$$2);
  const http = http_.default || http_;
  const https = https_.default || https_;
  class NodeHttpClient extends http_client_1.HttpClient {
    constructor(baseURL, options) {
      super(baseURL, options);
      this.baseURL = baseURL;
      this.options = options;
      this.httpAgent = new http.Agent({ keepAlive: true });
      this.httpsAgent = new https.Agent({ keepAlive: true });
    }
    getClientName() {
      return "node";
    }
    static getBody(entity) {
      if (entity === null || entity === void 0) {
        return null;
      }
      if (entity instanceof URLSearchParams) {
        return entity.toString();
      }
      return JSON.stringify(entity);
    }
    get(path, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.nodeRequestWithRetry(resourceURL, "GET", null, options.headers);
        } else {
          return yield this.nodeRequest(resourceURL, "GET", null, options.headers);
        }
      });
    }
    post(path, entity, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.nodeRequestWithRetry(resourceURL, "POST", NodeHttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        } else {
          return yield this.nodeRequest(resourceURL, "POST", NodeHttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        }
      });
    }
    put(path, entity, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.nodeRequestWithRetry(resourceURL, "PUT", NodeHttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        } else {
          return yield this.nodeRequest(resourceURL, "PUT", NodeHttpClient.getBody(entity), Object.assign(Object.assign({}, http_client_1.HttpClient.getContentTypeHeader(entity)), options.headers));
        }
      });
    }
    delete(path, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceURL = http_client_1.HttpClient.getResourceURL(this.baseURL, path, options.params);
        if (path.startsWith("/fga/")) {
          return yield this.nodeRequestWithRetry(resourceURL, "DELETE", null, options.headers);
        } else {
          return yield this.nodeRequest(resourceURL, "DELETE", null, options.headers);
        }
      });
    }
    nodeRequest(url, method, body, headers) {
      return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
          var _a, _b;
          const isSecureConnection = url.startsWith("https");
          const agent = isSecureConnection ? this.httpsAgent : this.httpAgent;
          const lib2 = isSecureConnection ? https : http;
          const { "User-Agent": userAgent } = (_a = this.options) === null || _a === void 0 ? void 0 : _a.headers;
          const options = {
            method,
            headers: Object.assign(Object.assign(Object.assign({ Accept: "application/json, text/plain, */*", "Content-Type": "application/json" }, (_b = this.options) === null || _b === void 0 ? void 0 : _b.headers), headers), { "User-Agent": this.addClientToUserAgent(userAgent.toString()) }),
            agent
          };
          const req = lib2.request(url, options, (res) => __awaiter(this, void 0, void 0, function* () {
            const clientResponse = new NodeHttpClientResponse(res);
            if (res.statusCode && (res.statusCode < 200 || res.statusCode > 299)) {
              reject(new http_client_1.HttpClientError({
                message: res.statusMessage,
                response: {
                  status: res.statusCode,
                  headers: res.headers,
                  data: yield clientResponse.toJSON()
                }
              }));
            }
            resolve(clientResponse);
          }));
          req.on("error", (err) => {
            reject(new Error(err.message));
          });
          if (body) {
            req.setHeader("Content-Length", Buffer.byteLength(body));
            req.write(body);
          }
          req.end();
        });
      });
    }
    nodeRequestWithRetry(url, method, body, headers) {
      var _a, _b;
      return __awaiter(this, void 0, void 0, function* () {
        const isSecureConnection = url.startsWith("https");
        const agent = isSecureConnection ? this.httpsAgent : this.httpAgent;
        const lib2 = isSecureConnection ? https : http;
        const { "User-Agent": userAgent } = (_a = this.options) === null || _a === void 0 ? void 0 : _a.headers;
        const options = {
          method,
          headers: Object.assign(Object.assign(Object.assign({ Accept: "application/json, text/plain, */*", "Content-Type": "application/json" }, (_b = this.options) === null || _b === void 0 ? void 0 : _b.headers), headers), { "User-Agent": this.addClientToUserAgent(userAgent.toString()) }),
          agent
        };
        let retryAttempts = 1;
        const makeRequest = () => __awaiter(this, void 0, void 0, function* () {
          return new Promise((resolve, reject) => {
            const req = lib2.request(url, options, (res) => __awaiter(this, void 0, void 0, function* () {
              const clientResponse = new NodeHttpClientResponse(res);
              if (this.shouldRetryRequest(res, retryAttempts)) {
                retryAttempts++;
                yield this.sleep(retryAttempts);
                return makeRequest().then(resolve).catch(reject);
              }
              if (res.statusCode && (res.statusCode < 200 || res.statusCode > 299)) {
                reject(new http_client_1.HttpClientError({
                  message: res.statusMessage,
                  response: {
                    status: res.statusCode,
                    headers: res.headers,
                    data: yield clientResponse.toJSON()
                  }
                }));
              }
              resolve(new NodeHttpClientResponse(res));
            }));
            req.on("error", (err) => __awaiter(this, void 0, void 0, function* () {
              if (err != null && err instanceof TypeError) {
                retryAttempts++;
                yield this.sleep(retryAttempts);
                return makeRequest().then(resolve).catch(reject);
              }
              reject(new Error(err.message));
            }));
            if (body) {
              req.setHeader("Content-Length", Buffer.byteLength(body));
              req.write(body);
            }
            req.end();
          });
        });
        return makeRequest();
      });
    }
    shouldRetryRequest(response, retryAttempt) {
      if (retryAttempt > this.MAX_RETRY_ATTEMPTS) {
        return false;
      }
      if (response != null && this.RETRY_STATUS_CODES.includes(response.statusCode)) {
        return true;
      }
      return false;
    }
  }
  nodeClient.NodeHttpClient = NodeHttpClient;
  class NodeHttpClientResponse extends http_client_1.HttpClientResponse {
    constructor(res) {
      super(res.statusCode, res.headers || {});
      this._res = res;
    }
    getRawResponse() {
      return this._res;
    }
    toJSON() {
      return new Promise((resolve, reject) => {
        const contentType = this._res.headers["content-type"];
        const isJsonResponse = contentType === null || contentType === void 0 ? void 0 : contentType.includes("application/json");
        if (!isJsonResponse) {
          resolve(null);
        }
        let response = "";
        this._res.setEncoding("utf8");
        this._res.on("data", (chunk) => {
          response += chunk;
        });
        this._res.once("end", () => {
          try {
            resolve(JSON.parse(response));
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  }
  nodeClient.NodeHttpClientResponse = NodeHttpClientResponse;
  return nodeClient;
}
var actions = {};
var signatureProvider = {};
var exceptions = {};
var genericServer_exception = {};
var hasRequiredGenericServer_exception;
function requireGenericServer_exception() {
  if (hasRequiredGenericServer_exception) return genericServer_exception;
  hasRequiredGenericServer_exception = 1;
  Object.defineProperty(genericServer_exception, "__esModule", { value: true });
  genericServer_exception.GenericServerException = void 0;
  class GenericServerException extends Error {
    constructor(status, message, rawData, requestID) {
      super();
      this.status = status;
      this.rawData = rawData;
      this.requestID = requestID;
      this.name = "GenericServerException";
      this.message = "The request could not be completed.";
      if (message) {
        this.message = message;
      }
    }
  }
  genericServer_exception.GenericServerException = GenericServerException;
  return genericServer_exception;
}
var badRequest_exception = {};
var hasRequiredBadRequest_exception;
function requireBadRequest_exception() {
  if (hasRequiredBadRequest_exception) return badRequest_exception;
  hasRequiredBadRequest_exception = 1;
  Object.defineProperty(badRequest_exception, "__esModule", { value: true });
  badRequest_exception.BadRequestException = void 0;
  class BadRequestException extends Error {
    constructor({ code, errors, message, requestID }) {
      super();
      this.status = 400;
      this.name = "BadRequestException";
      this.message = "Bad request";
      this.requestID = requestID;
      if (message) {
        this.message = message;
      }
      if (code) {
        this.code = code;
      }
      if (errors) {
        this.errors = errors;
      }
    }
  }
  badRequest_exception.BadRequestException = BadRequestException;
  return badRequest_exception;
}
var noApiKeyProvided_exception = {};
var hasRequiredNoApiKeyProvided_exception;
function requireNoApiKeyProvided_exception() {
  if (hasRequiredNoApiKeyProvided_exception) return noApiKeyProvided_exception;
  hasRequiredNoApiKeyProvided_exception = 1;
  Object.defineProperty(noApiKeyProvided_exception, "__esModule", { value: true });
  noApiKeyProvided_exception.NoApiKeyProvidedException = void 0;
  class NoApiKeyProvidedException extends Error {
    constructor() {
      super(...arguments);
      this.status = 500;
      this.name = "NoApiKeyProvidedException";
      this.message = `Missing API key. Pass it to the constructor (new WorkOS("sk_test_Sz3IQjepeSWaI4cMS4ms4sMuU")) or define it in the WORKOS_API_KEY environment variable.`;
    }
  }
  noApiKeyProvided_exception.NoApiKeyProvidedException = NoApiKeyProvidedException;
  return noApiKeyProvided_exception;
}
var notFound_exception = {};
var hasRequiredNotFound_exception;
function requireNotFound_exception() {
  if (hasRequiredNotFound_exception) return notFound_exception;
  hasRequiredNotFound_exception = 1;
  Object.defineProperty(notFound_exception, "__esModule", { value: true });
  notFound_exception.NotFoundException = void 0;
  class NotFoundException extends Error {
    constructor({ code, message, path, requestID }) {
      super();
      this.status = 404;
      this.name = "NotFoundException";
      this.code = code;
      this.message = message !== null && message !== void 0 ? message : `The requested path '${path}' could not be found.`;
      this.requestID = requestID;
    }
  }
  notFound_exception.NotFoundException = NotFoundException;
  return notFound_exception;
}
var oauth_exception = {};
var hasRequiredOauth_exception;
function requireOauth_exception() {
  if (hasRequiredOauth_exception) return oauth_exception;
  hasRequiredOauth_exception = 1;
  Object.defineProperty(oauth_exception, "__esModule", { value: true });
  oauth_exception.OauthException = void 0;
  class OauthException extends Error {
    constructor(status, requestID, error, errorDescription, rawData) {
      super();
      this.status = status;
      this.requestID = requestID;
      this.error = error;
      this.errorDescription = errorDescription;
      this.rawData = rawData;
      this.name = "OauthException";
      if (error && errorDescription) {
        this.message = `Error: ${error}
Error Description: ${errorDescription}`;
      } else if (error) {
        this.message = `Error: ${error}`;
      } else {
        this.message = `An error has occurred.`;
      }
    }
  }
  oauth_exception.OauthException = OauthException;
  return oauth_exception;
}
var rateLimitExceeded_exception = {};
var hasRequiredRateLimitExceeded_exception;
function requireRateLimitExceeded_exception() {
  if (hasRequiredRateLimitExceeded_exception) return rateLimitExceeded_exception;
  hasRequiredRateLimitExceeded_exception = 1;
  Object.defineProperty(rateLimitExceeded_exception, "__esModule", { value: true });
  rateLimitExceeded_exception.RateLimitExceededException = void 0;
  const generic_server_exception_1 = requireGenericServer_exception();
  class RateLimitExceededException extends generic_server_exception_1.GenericServerException {
    constructor(message, requestID, retryAfter) {
      super(429, message, {}, requestID);
      this.retryAfter = retryAfter;
      this.name = "RateLimitExceededException";
    }
  }
  rateLimitExceeded_exception.RateLimitExceededException = RateLimitExceededException;
  return rateLimitExceeded_exception;
}
var signatureVerification_exception = {};
var hasRequiredSignatureVerification_exception;
function requireSignatureVerification_exception() {
  if (hasRequiredSignatureVerification_exception) return signatureVerification_exception;
  hasRequiredSignatureVerification_exception = 1;
  Object.defineProperty(signatureVerification_exception, "__esModule", { value: true });
  signatureVerification_exception.SignatureVerificationException = void 0;
  class SignatureVerificationException extends Error {
    constructor(message) {
      super(message || "Signature verification failed.");
      this.name = "SignatureVerificationException";
    }
  }
  signatureVerification_exception.SignatureVerificationException = SignatureVerificationException;
  return signatureVerification_exception;
}
var unauthorized_exception = {};
var hasRequiredUnauthorized_exception;
function requireUnauthorized_exception() {
  if (hasRequiredUnauthorized_exception) return unauthorized_exception;
  hasRequiredUnauthorized_exception = 1;
  Object.defineProperty(unauthorized_exception, "__esModule", { value: true });
  unauthorized_exception.UnauthorizedException = void 0;
  class UnauthorizedException extends Error {
    constructor(requestID) {
      super();
      this.requestID = requestID;
      this.status = 401;
      this.name = "UnauthorizedException";
      this.message = `Could not authorize the request. Maybe your API key is invalid?`;
    }
  }
  unauthorized_exception.UnauthorizedException = UnauthorizedException;
  return unauthorized_exception;
}
var unprocessableEntity_exception = {};
var hasRequiredUnprocessableEntity_exception;
function requireUnprocessableEntity_exception() {
  if (hasRequiredUnprocessableEntity_exception) return unprocessableEntity_exception;
  hasRequiredUnprocessableEntity_exception = 1;
  var __importDefault = unprocessableEntity_exception && unprocessableEntity_exception.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(unprocessableEntity_exception, "__esModule", { value: true });
  unprocessableEntity_exception.UnprocessableEntityException = void 0;
  const pluralize_1 = __importDefault(require$$0$1);
  class UnprocessableEntityException extends Error {
    constructor({ code, errors, message, requestID }) {
      super();
      this.status = 422;
      this.name = "UnprocessableEntityException";
      this.message = "Unprocessable entity";
      this.requestID = requestID;
      if (message) {
        this.message = message;
      }
      if (code) {
        this.code = code;
      }
      if (errors) {
        const requirement = (0, pluralize_1.default)("requirement", errors.length);
        this.message = `The following ${requirement} must be met:
`;
        for (const { code: code2 } of errors) {
          this.message = this.message.concat(`	${code2}
`);
        }
      }
    }
  }
  unprocessableEntity_exception.UnprocessableEntityException = UnprocessableEntityException;
  return unprocessableEntity_exception;
}
var hasRequiredExceptions;
function requireExceptions() {
  if (hasRequiredExceptions) return exceptions;
  hasRequiredExceptions = 1;
  (function(exports) {
    var __createBinding = exceptions && exceptions.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exceptions && exceptions.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireGenericServer_exception(), exports);
    __exportStar(requireBadRequest_exception(), exports);
    __exportStar(requireNoApiKeyProvided_exception(), exports);
    __exportStar(requireNotFound_exception(), exports);
    __exportStar(requireOauth_exception(), exports);
    __exportStar(requireRateLimitExceeded_exception(), exports);
    __exportStar(requireSignatureVerification_exception(), exports);
    __exportStar(requireUnauthorized_exception(), exports);
    __exportStar(requireUnprocessableEntity_exception(), exports);
  })(exceptions);
  return exceptions;
}
var hasRequiredSignatureProvider;
function requireSignatureProvider() {
  if (hasRequiredSignatureProvider) return signatureProvider;
  hasRequiredSignatureProvider = 1;
  var __awaiter = signatureProvider && signatureProvider.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(signatureProvider, "__esModule", { value: true });
  signatureProvider.SignatureProvider = void 0;
  const exceptions_1 = requireExceptions();
  class SignatureProvider {
    constructor(cryptoProvider2) {
      this.cryptoProvider = cryptoProvider2;
    }
    verifyHeader({ payload, sigHeader, secret, tolerance = 18e4 }) {
      return __awaiter(this, void 0, void 0, function* () {
        const [timestamp, signatureHash] = this.getTimestampAndSignatureHash(sigHeader);
        if (!signatureHash || Object.keys(signatureHash).length === 0) {
          throw new exceptions_1.SignatureVerificationException("No signature hash found with expected scheme v1");
        }
        if (parseInt(timestamp, 10) < Date.now() - tolerance) {
          throw new exceptions_1.SignatureVerificationException("Timestamp outside the tolerance zone");
        }
        const expectedSig = yield this.computeSignature(timestamp, payload, secret);
        if ((yield this.cryptoProvider.secureCompare(expectedSig, signatureHash)) === false) {
          throw new exceptions_1.SignatureVerificationException("Signature hash does not match the expected signature hash for payload");
        }
        return true;
      });
    }
    getTimestampAndSignatureHash(sigHeader) {
      const signature = sigHeader;
      const [t, v1] = signature.split(",");
      if (typeof t === "undefined" || typeof v1 === "undefined") {
        throw new exceptions_1.SignatureVerificationException("Signature or timestamp missing");
      }
      const { 1: timestamp } = t.split("=");
      const { 1: signatureHash } = v1.split("=");
      return [timestamp, signatureHash];
    }
    computeSignature(timestamp, payload, secret) {
      return __awaiter(this, void 0, void 0, function* () {
        payload = JSON.stringify(payload);
        const signedPayload = `${timestamp}.${payload}`;
        return yield this.cryptoProvider.computeHMACSignatureAsync(signedPayload, secret);
      });
    }
  }
  signatureProvider.SignatureProvider = SignatureProvider;
  return signatureProvider;
}
var unreachable = {};
var hasRequiredUnreachable;
function requireUnreachable() {
  if (hasRequiredUnreachable) return unreachable;
  hasRequiredUnreachable = 1;
  Object.defineProperty(unreachable, "__esModule", { value: true });
  unreachable.unreachable = void 0;
  const unreachable$1 = (condition, message = `Entered unreachable code. Received '${condition}'.`) => {
    throw new TypeError(message);
  };
  unreachable.unreachable = unreachable$1;
  return unreachable;
}
var action_serializer = {};
var organization_serializer = {};
var organizationDomain_serializer = {};
var hasRequiredOrganizationDomain_serializer;
function requireOrganizationDomain_serializer() {
  if (hasRequiredOrganizationDomain_serializer) return organizationDomain_serializer;
  hasRequiredOrganizationDomain_serializer = 1;
  Object.defineProperty(organizationDomain_serializer, "__esModule", { value: true });
  organizationDomain_serializer.deserializeOrganizationDomain = void 0;
  const deserializeOrganizationDomain = (organizationDomain) => ({
    object: organizationDomain.object,
    id: organizationDomain.id,
    domain: organizationDomain.domain,
    organizationId: organizationDomain.organization_id,
    state: organizationDomain.state,
    verificationToken: organizationDomain.verification_token,
    verificationStrategy: organizationDomain.verification_strategy,
    createdAt: organizationDomain.created_at,
    updatedAt: organizationDomain.updated_at
  });
  organizationDomain_serializer.deserializeOrganizationDomain = deserializeOrganizationDomain;
  return organizationDomain_serializer;
}
var hasRequiredOrganization_serializer;
function requireOrganization_serializer() {
  if (hasRequiredOrganization_serializer) return organization_serializer;
  hasRequiredOrganization_serializer = 1;
  Object.defineProperty(organization_serializer, "__esModule", { value: true });
  organization_serializer.deserializeOrganization = void 0;
  const organization_domain_serializer_1 = requireOrganizationDomain_serializer();
  const deserializeOrganization = (organization) => {
    var _a, _b;
    return Object.assign(Object.assign({ object: organization.object, id: organization.id, name: organization.name, allowProfilesOutsideOrganization: organization.allow_profiles_outside_organization, domains: organization.domains.map(organization_domain_serializer_1.deserializeOrganizationDomain) }, typeof organization.stripe_customer_id === "undefined" ? void 0 : { stripeCustomerId: organization.stripe_customer_id }), { createdAt: organization.created_at, updatedAt: organization.updated_at, externalId: (_a = organization.external_id) !== null && _a !== void 0 ? _a : null, metadata: (_b = organization.metadata) !== null && _b !== void 0 ? _b : {} });
  };
  organization_serializer.deserializeOrganization = deserializeOrganization;
  return organization_serializer;
}
var serializers$8 = {};
var authenticateWithCodeOptions_serializer = {};
var hasRequiredAuthenticateWithCodeOptions_serializer;
function requireAuthenticateWithCodeOptions_serializer() {
  if (hasRequiredAuthenticateWithCodeOptions_serializer) return authenticateWithCodeOptions_serializer;
  hasRequiredAuthenticateWithCodeOptions_serializer = 1;
  Object.defineProperty(authenticateWithCodeOptions_serializer, "__esModule", { value: true });
  authenticateWithCodeOptions_serializer.serializeAuthenticateWithCodeOptions = void 0;
  const serializeAuthenticateWithCodeOptions = (options) => ({
    grant_type: "authorization_code",
    client_id: options.clientId,
    client_secret: options.clientSecret,
    code: options.code,
    code_verifier: options.codeVerifier,
    invitation_token: options.invitationToken,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithCodeOptions_serializer.serializeAuthenticateWithCodeOptions = serializeAuthenticateWithCodeOptions;
  return authenticateWithCodeOptions_serializer;
}
var authenticateWithCodeAndVerifierOptions_serializer = {};
var hasRequiredAuthenticateWithCodeAndVerifierOptions_serializer;
function requireAuthenticateWithCodeAndVerifierOptions_serializer() {
  if (hasRequiredAuthenticateWithCodeAndVerifierOptions_serializer) return authenticateWithCodeAndVerifierOptions_serializer;
  hasRequiredAuthenticateWithCodeAndVerifierOptions_serializer = 1;
  Object.defineProperty(authenticateWithCodeAndVerifierOptions_serializer, "__esModule", { value: true });
  authenticateWithCodeAndVerifierOptions_serializer.serializeAuthenticateWithCodeAndVerifierOptions = void 0;
  const serializeAuthenticateWithCodeAndVerifierOptions = (options) => ({
    grant_type: "authorization_code",
    client_id: options.clientId,
    code: options.code,
    code_verifier: options.codeVerifier,
    invitation_token: options.invitationToken,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithCodeAndVerifierOptions_serializer.serializeAuthenticateWithCodeAndVerifierOptions = serializeAuthenticateWithCodeAndVerifierOptions;
  return authenticateWithCodeAndVerifierOptions_serializer;
}
var authenticateWithMagicAuthOptions_serializer = {};
var hasRequiredAuthenticateWithMagicAuthOptions_serializer;
function requireAuthenticateWithMagicAuthOptions_serializer() {
  if (hasRequiredAuthenticateWithMagicAuthOptions_serializer) return authenticateWithMagicAuthOptions_serializer;
  hasRequiredAuthenticateWithMagicAuthOptions_serializer = 1;
  Object.defineProperty(authenticateWithMagicAuthOptions_serializer, "__esModule", { value: true });
  authenticateWithMagicAuthOptions_serializer.serializeAuthenticateWithMagicAuthOptions = void 0;
  const serializeAuthenticateWithMagicAuthOptions = (options) => ({
    grant_type: "urn:workos:oauth:grant-type:magic-auth:code",
    client_id: options.clientId,
    client_secret: options.clientSecret,
    code: options.code,
    email: options.email,
    invitation_token: options.invitationToken,
    link_authorization_code: options.linkAuthorizationCode,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithMagicAuthOptions_serializer.serializeAuthenticateWithMagicAuthOptions = serializeAuthenticateWithMagicAuthOptions;
  return authenticateWithMagicAuthOptions_serializer;
}
var authenticateWithPasswordOptions_serializer = {};
var hasRequiredAuthenticateWithPasswordOptions_serializer;
function requireAuthenticateWithPasswordOptions_serializer() {
  if (hasRequiredAuthenticateWithPasswordOptions_serializer) return authenticateWithPasswordOptions_serializer;
  hasRequiredAuthenticateWithPasswordOptions_serializer = 1;
  Object.defineProperty(authenticateWithPasswordOptions_serializer, "__esModule", { value: true });
  authenticateWithPasswordOptions_serializer.serializeAuthenticateWithPasswordOptions = void 0;
  const serializeAuthenticateWithPasswordOptions = (options) => ({
    grant_type: "password",
    client_id: options.clientId,
    client_secret: options.clientSecret,
    email: options.email,
    password: options.password,
    invitation_token: options.invitationToken,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithPasswordOptions_serializer.serializeAuthenticateWithPasswordOptions = serializeAuthenticateWithPasswordOptions;
  return authenticateWithPasswordOptions_serializer;
}
var authenticateWithRefreshToken_options_serializer = {};
var hasRequiredAuthenticateWithRefreshToken_options_serializer;
function requireAuthenticateWithRefreshToken_options_serializer() {
  if (hasRequiredAuthenticateWithRefreshToken_options_serializer) return authenticateWithRefreshToken_options_serializer;
  hasRequiredAuthenticateWithRefreshToken_options_serializer = 1;
  Object.defineProperty(authenticateWithRefreshToken_options_serializer, "__esModule", { value: true });
  authenticateWithRefreshToken_options_serializer.serializeAuthenticateWithRefreshTokenOptions = void 0;
  const serializeAuthenticateWithRefreshTokenOptions = (options) => ({
    grant_type: "refresh_token",
    client_id: options.clientId,
    client_secret: options.clientSecret,
    refresh_token: options.refreshToken,
    organization_id: options.organizationId,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithRefreshToken_options_serializer.serializeAuthenticateWithRefreshTokenOptions = serializeAuthenticateWithRefreshTokenOptions;
  return authenticateWithRefreshToken_options_serializer;
}
var authenticateWithTotpOptions_serializer = {};
var hasRequiredAuthenticateWithTotpOptions_serializer;
function requireAuthenticateWithTotpOptions_serializer() {
  if (hasRequiredAuthenticateWithTotpOptions_serializer) return authenticateWithTotpOptions_serializer;
  hasRequiredAuthenticateWithTotpOptions_serializer = 1;
  Object.defineProperty(authenticateWithTotpOptions_serializer, "__esModule", { value: true });
  authenticateWithTotpOptions_serializer.serializeAuthenticateWithTotpOptions = void 0;
  const serializeAuthenticateWithTotpOptions = (options) => ({
    grant_type: "urn:workos:oauth:grant-type:mfa-totp",
    client_id: options.clientId,
    client_secret: options.clientSecret,
    code: options.code,
    authentication_challenge_id: options.authenticationChallengeId,
    pending_authentication_token: options.pendingAuthenticationToken,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithTotpOptions_serializer.serializeAuthenticateWithTotpOptions = serializeAuthenticateWithTotpOptions;
  return authenticateWithTotpOptions_serializer;
}
var authenticationEvent_serializer = {};
var hasRequiredAuthenticationEvent_serializer;
function requireAuthenticationEvent_serializer() {
  if (hasRequiredAuthenticationEvent_serializer) return authenticationEvent_serializer;
  hasRequiredAuthenticationEvent_serializer = 1;
  Object.defineProperty(authenticationEvent_serializer, "__esModule", { value: true });
  authenticationEvent_serializer.deserializeAuthenticationEvent = void 0;
  const deserializeAuthenticationEvent = (authenticationEvent) => ({
    email: authenticationEvent.email,
    error: authenticationEvent.error,
    ipAddress: authenticationEvent.ip_address,
    status: authenticationEvent.status,
    type: authenticationEvent.type,
    userAgent: authenticationEvent.user_agent,
    userId: authenticationEvent.user_id
  });
  authenticationEvent_serializer.deserializeAuthenticationEvent = deserializeAuthenticationEvent;
  return authenticationEvent_serializer;
}
var authenticationResponse_serializer = {};
var oauthTokens_serializer = {};
var hasRequiredOauthTokens_serializer;
function requireOauthTokens_serializer() {
  if (hasRequiredOauthTokens_serializer) return oauthTokens_serializer;
  hasRequiredOauthTokens_serializer = 1;
  Object.defineProperty(oauthTokens_serializer, "__esModule", { value: true });
  oauthTokens_serializer.deserializeOauthTokens = void 0;
  const deserializeOauthTokens = (oauthTokens) => oauthTokens ? {
    accessToken: oauthTokens.access_token,
    refreshToken: oauthTokens.refresh_token,
    expiresAt: oauthTokens.expires_at,
    scopes: oauthTokens.scopes
  } : void 0;
  oauthTokens_serializer.deserializeOauthTokens = deserializeOauthTokens;
  return oauthTokens_serializer;
}
var user_serializer = {};
var hasRequiredUser_serializer;
function requireUser_serializer() {
  if (hasRequiredUser_serializer) return user_serializer;
  hasRequiredUser_serializer = 1;
  Object.defineProperty(user_serializer, "__esModule", { value: true });
  user_serializer.deserializeUser = void 0;
  const deserializeUser = (user) => {
    var _a, _b;
    return {
      object: user.object,
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified,
      firstName: user.first_name,
      profilePictureUrl: user.profile_picture_url,
      lastName: user.last_name,
      lastSignInAt: user.last_sign_in_at,
      locale: user.locale,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      externalId: (_a = user.external_id) !== null && _a !== void 0 ? _a : null,
      metadata: (_b = user.metadata) !== null && _b !== void 0 ? _b : {}
    };
  };
  user_serializer.deserializeUser = deserializeUser;
  return user_serializer;
}
var hasRequiredAuthenticationResponse_serializer;
function requireAuthenticationResponse_serializer() {
  if (hasRequiredAuthenticationResponse_serializer) return authenticationResponse_serializer;
  hasRequiredAuthenticationResponse_serializer = 1;
  var __rest = authenticationResponse_serializer && authenticationResponse_serializer.__rest || function(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  };
  Object.defineProperty(authenticationResponse_serializer, "__esModule", { value: true });
  authenticationResponse_serializer.deserializeAuthenticationResponse = void 0;
  const oauth_tokens_serializer_1 = requireOauthTokens_serializer();
  const user_serializer_1 = requireUser_serializer();
  const deserializeAuthenticationResponse = (authenticationResponse) => {
    const { user, organization_id, access_token, refresh_token, authentication_method, impersonator, oauth_tokens } = authenticationResponse, rest = __rest(authenticationResponse, ["user", "organization_id", "access_token", "refresh_token", "authentication_method", "impersonator", "oauth_tokens"]);
    return Object.assign({ user: (0, user_serializer_1.deserializeUser)(user), organizationId: organization_id, accessToken: access_token, refreshToken: refresh_token, impersonator, authenticationMethod: authentication_method, oauthTokens: (0, oauth_tokens_serializer_1.deserializeOauthTokens)(oauth_tokens) }, rest);
  };
  authenticationResponse_serializer.deserializeAuthenticationResponse = deserializeAuthenticationResponse;
  return authenticationResponse_serializer;
}
var createMagicAuthOptions_serializer = {};
var hasRequiredCreateMagicAuthOptions_serializer;
function requireCreateMagicAuthOptions_serializer() {
  if (hasRequiredCreateMagicAuthOptions_serializer) return createMagicAuthOptions_serializer;
  hasRequiredCreateMagicAuthOptions_serializer = 1;
  Object.defineProperty(createMagicAuthOptions_serializer, "__esModule", { value: true });
  createMagicAuthOptions_serializer.serializeCreateMagicAuthOptions = void 0;
  const serializeCreateMagicAuthOptions = (options) => ({
    email: options.email,
    invitation_token: options.invitationToken
  });
  createMagicAuthOptions_serializer.serializeCreateMagicAuthOptions = serializeCreateMagicAuthOptions;
  return createMagicAuthOptions_serializer;
}
var createPasswordResetOptions_serializer = {};
var hasRequiredCreatePasswordResetOptions_serializer;
function requireCreatePasswordResetOptions_serializer() {
  if (hasRequiredCreatePasswordResetOptions_serializer) return createPasswordResetOptions_serializer;
  hasRequiredCreatePasswordResetOptions_serializer = 1;
  Object.defineProperty(createPasswordResetOptions_serializer, "__esModule", { value: true });
  createPasswordResetOptions_serializer.serializeCreatePasswordResetOptions = void 0;
  const serializeCreatePasswordResetOptions = (options) => ({
    email: options.email
  });
  createPasswordResetOptions_serializer.serializeCreatePasswordResetOptions = serializeCreatePasswordResetOptions;
  return createPasswordResetOptions_serializer;
}
var emailVerification_serializer = {};
var hasRequiredEmailVerification_serializer;
function requireEmailVerification_serializer() {
  if (hasRequiredEmailVerification_serializer) return emailVerification_serializer;
  hasRequiredEmailVerification_serializer = 1;
  Object.defineProperty(emailVerification_serializer, "__esModule", { value: true });
  emailVerification_serializer.deserializeEmailVerificationEvent = emailVerification_serializer.deserializeEmailVerification = void 0;
  const deserializeEmailVerification = (emailVerification) => ({
    object: emailVerification.object,
    id: emailVerification.id,
    userId: emailVerification.user_id,
    email: emailVerification.email,
    expiresAt: emailVerification.expires_at,
    code: emailVerification.code,
    createdAt: emailVerification.created_at,
    updatedAt: emailVerification.updated_at
  });
  emailVerification_serializer.deserializeEmailVerification = deserializeEmailVerification;
  const deserializeEmailVerificationEvent = (emailVerification) => ({
    object: emailVerification.object,
    id: emailVerification.id,
    userId: emailVerification.user_id,
    email: emailVerification.email,
    expiresAt: emailVerification.expires_at,
    createdAt: emailVerification.created_at,
    updatedAt: emailVerification.updated_at
  });
  emailVerification_serializer.deserializeEmailVerificationEvent = deserializeEmailVerificationEvent;
  return emailVerification_serializer;
}
var enrollAuthFactorOptions_serializer = {};
var hasRequiredEnrollAuthFactorOptions_serializer;
function requireEnrollAuthFactorOptions_serializer() {
  if (hasRequiredEnrollAuthFactorOptions_serializer) return enrollAuthFactorOptions_serializer;
  hasRequiredEnrollAuthFactorOptions_serializer = 1;
  Object.defineProperty(enrollAuthFactorOptions_serializer, "__esModule", { value: true });
  enrollAuthFactorOptions_serializer.serializeEnrollAuthFactorOptions = void 0;
  const serializeEnrollAuthFactorOptions = (options) => ({
    type: options.type,
    totp_issuer: options.totpIssuer,
    totp_user: options.totpUser,
    totp_secret: options.totpSecret
  });
  enrollAuthFactorOptions_serializer.serializeEnrollAuthFactorOptions = serializeEnrollAuthFactorOptions;
  return enrollAuthFactorOptions_serializer;
}
var factor_serializer$1 = {};
var totp_serializer = {};
var hasRequiredTotp_serializer;
function requireTotp_serializer() {
  if (hasRequiredTotp_serializer) return totp_serializer;
  hasRequiredTotp_serializer = 1;
  Object.defineProperty(totp_serializer, "__esModule", { value: true });
  totp_serializer.deserializeTotpWithSecrets = totp_serializer.deserializeTotp = void 0;
  const deserializeTotp = (totp) => {
    return {
      issuer: totp.issuer,
      user: totp.user
    };
  };
  totp_serializer.deserializeTotp = deserializeTotp;
  const deserializeTotpWithSecrets = (totp) => {
    return {
      issuer: totp.issuer,
      user: totp.user,
      qrCode: totp.qr_code,
      secret: totp.secret,
      uri: totp.uri
    };
  };
  totp_serializer.deserializeTotpWithSecrets = deserializeTotpWithSecrets;
  return totp_serializer;
}
var hasRequiredFactor_serializer$1;
function requireFactor_serializer$1() {
  if (hasRequiredFactor_serializer$1) return factor_serializer$1;
  hasRequiredFactor_serializer$1 = 1;
  Object.defineProperty(factor_serializer$1, "__esModule", { value: true });
  factor_serializer$1.deserializeFactorWithSecrets = factor_serializer$1.deserializeFactor = void 0;
  const totp_serializer_1 = requireTotp_serializer();
  const deserializeFactor = (factor) => ({
    object: factor.object,
    id: factor.id,
    createdAt: factor.created_at,
    updatedAt: factor.updated_at,
    type: factor.type,
    totp: (0, totp_serializer_1.deserializeTotp)(factor.totp),
    userId: factor.user_id
  });
  factor_serializer$1.deserializeFactor = deserializeFactor;
  const deserializeFactorWithSecrets = (factor) => ({
    object: factor.object,
    id: factor.id,
    createdAt: factor.created_at,
    updatedAt: factor.updated_at,
    type: factor.type,
    totp: (0, totp_serializer_1.deserializeTotpWithSecrets)(factor.totp),
    userId: factor.user_id
  });
  factor_serializer$1.deserializeFactorWithSecrets = deserializeFactorWithSecrets;
  return factor_serializer$1;
}
var invitation_serializer = {};
var hasRequiredInvitation_serializer;
function requireInvitation_serializer() {
  if (hasRequiredInvitation_serializer) return invitation_serializer;
  hasRequiredInvitation_serializer = 1;
  Object.defineProperty(invitation_serializer, "__esModule", { value: true });
  invitation_serializer.deserializeInvitationEvent = invitation_serializer.deserializeInvitation = void 0;
  const deserializeInvitation = (invitation) => ({
    object: invitation.object,
    id: invitation.id,
    email: invitation.email,
    state: invitation.state,
    acceptedAt: invitation.accepted_at,
    revokedAt: invitation.revoked_at,
    expiresAt: invitation.expires_at,
    organizationId: invitation.organization_id,
    inviterUserId: invitation.inviter_user_id,
    acceptedUserId: invitation.accepted_user_id,
    token: invitation.token,
    acceptInvitationUrl: invitation.accept_invitation_url,
    createdAt: invitation.created_at,
    updatedAt: invitation.updated_at
  });
  invitation_serializer.deserializeInvitation = deserializeInvitation;
  const deserializeInvitationEvent = (invitation) => ({
    object: invitation.object,
    id: invitation.id,
    email: invitation.email,
    state: invitation.state,
    acceptedAt: invitation.accepted_at,
    revokedAt: invitation.revoked_at,
    expiresAt: invitation.expires_at,
    organizationId: invitation.organization_id,
    inviterUserId: invitation.inviter_user_id,
    acceptedUserId: invitation.accepted_user_id,
    createdAt: invitation.created_at,
    updatedAt: invitation.updated_at
  });
  invitation_serializer.deserializeInvitationEvent = deserializeInvitationEvent;
  return invitation_serializer;
}
var listSessionsOptions_serializer = {};
var hasRequiredListSessionsOptions_serializer;
function requireListSessionsOptions_serializer() {
  if (hasRequiredListSessionsOptions_serializer) return listSessionsOptions_serializer;
  hasRequiredListSessionsOptions_serializer = 1;
  Object.defineProperty(listSessionsOptions_serializer, "__esModule", { value: true });
  listSessionsOptions_serializer.serializeListSessionsOptions = void 0;
  const serializeListSessionsOptions = (options) => Object.assign({}, options);
  listSessionsOptions_serializer.serializeListSessionsOptions = serializeListSessionsOptions;
  return listSessionsOptions_serializer;
}
var magicAuth_serializer = {};
var hasRequiredMagicAuth_serializer;
function requireMagicAuth_serializer() {
  if (hasRequiredMagicAuth_serializer) return magicAuth_serializer;
  hasRequiredMagicAuth_serializer = 1;
  Object.defineProperty(magicAuth_serializer, "__esModule", { value: true });
  magicAuth_serializer.deserializeMagicAuthEvent = magicAuth_serializer.deserializeMagicAuth = void 0;
  const deserializeMagicAuth = (magicAuth) => ({
    object: magicAuth.object,
    id: magicAuth.id,
    userId: magicAuth.user_id,
    email: magicAuth.email,
    expiresAt: magicAuth.expires_at,
    code: magicAuth.code,
    createdAt: magicAuth.created_at,
    updatedAt: magicAuth.updated_at
  });
  magicAuth_serializer.deserializeMagicAuth = deserializeMagicAuth;
  const deserializeMagicAuthEvent = (magicAuth) => ({
    object: magicAuth.object,
    id: magicAuth.id,
    userId: magicAuth.user_id,
    email: magicAuth.email,
    expiresAt: magicAuth.expires_at,
    createdAt: magicAuth.created_at,
    updatedAt: magicAuth.updated_at
  });
  magicAuth_serializer.deserializeMagicAuthEvent = deserializeMagicAuthEvent;
  return magicAuth_serializer;
}
var passwordReset_serializer = {};
var hasRequiredPasswordReset_serializer;
function requirePasswordReset_serializer() {
  if (hasRequiredPasswordReset_serializer) return passwordReset_serializer;
  hasRequiredPasswordReset_serializer = 1;
  Object.defineProperty(passwordReset_serializer, "__esModule", { value: true });
  passwordReset_serializer.deserializePasswordResetEvent = passwordReset_serializer.deserializePasswordReset = void 0;
  const deserializePasswordReset = (passwordReset) => ({
    object: passwordReset.object,
    id: passwordReset.id,
    userId: passwordReset.user_id,
    email: passwordReset.email,
    passwordResetToken: passwordReset.password_reset_token,
    passwordResetUrl: passwordReset.password_reset_url,
    expiresAt: passwordReset.expires_at,
    createdAt: passwordReset.created_at
  });
  passwordReset_serializer.deserializePasswordReset = deserializePasswordReset;
  const deserializePasswordResetEvent = (passwordReset) => ({
    object: passwordReset.object,
    id: passwordReset.id,
    userId: passwordReset.user_id,
    email: passwordReset.email,
    expiresAt: passwordReset.expires_at,
    createdAt: passwordReset.created_at
  });
  passwordReset_serializer.deserializePasswordResetEvent = deserializePasswordResetEvent;
  return passwordReset_serializer;
}
var resetPasswordOptions_serializer = {};
var hasRequiredResetPasswordOptions_serializer;
function requireResetPasswordOptions_serializer() {
  if (hasRequiredResetPasswordOptions_serializer) return resetPasswordOptions_serializer;
  hasRequiredResetPasswordOptions_serializer = 1;
  Object.defineProperty(resetPasswordOptions_serializer, "__esModule", { value: true });
  resetPasswordOptions_serializer.serializeResetPasswordOptions = void 0;
  const serializeResetPasswordOptions = (options) => ({
    token: options.token,
    new_password: options.newPassword
  });
  resetPasswordOptions_serializer.serializeResetPasswordOptions = serializeResetPasswordOptions;
  return resetPasswordOptions_serializer;
}
var sendPasswordResetEmail_serializer = {};
var hasRequiredSendPasswordResetEmail_serializer;
function requireSendPasswordResetEmail_serializer() {
  if (hasRequiredSendPasswordResetEmail_serializer) return sendPasswordResetEmail_serializer;
  hasRequiredSendPasswordResetEmail_serializer = 1;
  Object.defineProperty(sendPasswordResetEmail_serializer, "__esModule", { value: true });
  sendPasswordResetEmail_serializer.serializeSendPasswordResetEmailOptions = void 0;
  const serializeSendPasswordResetEmailOptions = (options) => ({
    email: options.email,
    password_reset_url: options.passwordResetUrl
  });
  sendPasswordResetEmail_serializer.serializeSendPasswordResetEmailOptions = serializeSendPasswordResetEmailOptions;
  return sendPasswordResetEmail_serializer;
}
var session_serializer = {};
var hasRequiredSession_serializer;
function requireSession_serializer() {
  if (hasRequiredSession_serializer) return session_serializer;
  hasRequiredSession_serializer = 1;
  Object.defineProperty(session_serializer, "__esModule", { value: true });
  session_serializer.deserializeSession = void 0;
  const deserializeSession = (session2) => ({
    object: "session",
    id: session2.id,
    userId: session2.user_id,
    ipAddress: session2.ip_address,
    userAgent: session2.user_agent,
    organizationId: session2.organization_id,
    impersonator: session2.impersonator,
    authMethod: session2.auth_method,
    status: session2.status,
    expiresAt: session2.expires_at,
    endedAt: session2.ended_at,
    createdAt: session2.created_at,
    updatedAt: session2.updated_at
  });
  session_serializer.deserializeSession = deserializeSession;
  return session_serializer;
}
var createUserOptions_serializer = {};
var hasRequiredCreateUserOptions_serializer;
function requireCreateUserOptions_serializer() {
  if (hasRequiredCreateUserOptions_serializer) return createUserOptions_serializer;
  hasRequiredCreateUserOptions_serializer = 1;
  Object.defineProperty(createUserOptions_serializer, "__esModule", { value: true });
  createUserOptions_serializer.serializeCreateUserOptions = void 0;
  const serializeCreateUserOptions = (options) => ({
    email: options.email,
    password: options.password,
    password_hash: options.passwordHash,
    password_hash_type: options.passwordHashType,
    first_name: options.firstName,
    last_name: options.lastName,
    email_verified: options.emailVerified,
    external_id: options.externalId,
    metadata: options.metadata
  });
  createUserOptions_serializer.serializeCreateUserOptions = serializeCreateUserOptions;
  return createUserOptions_serializer;
}
var sendMagicAuthCodeOptions_serializer = {};
var hasRequiredSendMagicAuthCodeOptions_serializer;
function requireSendMagicAuthCodeOptions_serializer() {
  if (hasRequiredSendMagicAuthCodeOptions_serializer) return sendMagicAuthCodeOptions_serializer;
  hasRequiredSendMagicAuthCodeOptions_serializer = 1;
  Object.defineProperty(sendMagicAuthCodeOptions_serializer, "__esModule", { value: true });
  sendMagicAuthCodeOptions_serializer.serializeSendMagicAuthCodeOptions = void 0;
  const serializeSendMagicAuthCodeOptions = (options) => ({
    email: options.email
  });
  sendMagicAuthCodeOptions_serializer.serializeSendMagicAuthCodeOptions = serializeSendMagicAuthCodeOptions;
  return sendMagicAuthCodeOptions_serializer;
}
var updateUserOptions_serializer = {};
var hasRequiredUpdateUserOptions_serializer;
function requireUpdateUserOptions_serializer() {
  if (hasRequiredUpdateUserOptions_serializer) return updateUserOptions_serializer;
  hasRequiredUpdateUserOptions_serializer = 1;
  Object.defineProperty(updateUserOptions_serializer, "__esModule", { value: true });
  updateUserOptions_serializer.serializeUpdateUserOptions = void 0;
  const serializeUpdateUserOptions = (options) => ({
    email: options.email,
    email_verified: options.emailVerified,
    first_name: options.firstName,
    last_name: options.lastName,
    password: options.password,
    password_hash: options.passwordHash,
    password_hash_type: options.passwordHashType,
    external_id: options.externalId,
    locale: options.locale,
    metadata: options.metadata
  });
  updateUserOptions_serializer.serializeUpdateUserOptions = serializeUpdateUserOptions;
  return updateUserOptions_serializer;
}
var updateUserPasswordOptions_serializer = {};
var hasRequiredUpdateUserPasswordOptions_serializer;
function requireUpdateUserPasswordOptions_serializer() {
  if (hasRequiredUpdateUserPasswordOptions_serializer) return updateUserPasswordOptions_serializer;
  hasRequiredUpdateUserPasswordOptions_serializer = 1;
  Object.defineProperty(updateUserPasswordOptions_serializer, "__esModule", { value: true });
  updateUserPasswordOptions_serializer.serializeUpdateUserPasswordOptions = void 0;
  const serializeUpdateUserPasswordOptions = (options) => ({
    password: options.password
  });
  updateUserPasswordOptions_serializer.serializeUpdateUserPasswordOptions = serializeUpdateUserPasswordOptions;
  return updateUserPasswordOptions_serializer;
}
var hasRequiredSerializers$8;
function requireSerializers$8() {
  if (hasRequiredSerializers$8) return serializers$8;
  hasRequiredSerializers$8 = 1;
  (function(exports) {
    var __createBinding = serializers$8 && serializers$8.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$8 && serializers$8.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireAuthenticateWithCodeOptions_serializer(), exports);
    __exportStar(requireAuthenticateWithCodeAndVerifierOptions_serializer(), exports);
    __exportStar(requireAuthenticateWithMagicAuthOptions_serializer(), exports);
    __exportStar(requireAuthenticateWithPasswordOptions_serializer(), exports);
    __exportStar(requireAuthenticateWithRefreshToken_options_serializer(), exports);
    __exportStar(requireAuthenticateWithTotpOptions_serializer(), exports);
    __exportStar(requireAuthenticationEvent_serializer(), exports);
    __exportStar(requireAuthenticationResponse_serializer(), exports);
    __exportStar(requireCreateMagicAuthOptions_serializer(), exports);
    __exportStar(requireCreatePasswordResetOptions_serializer(), exports);
    __exportStar(requireEmailVerification_serializer(), exports);
    __exportStar(requireEnrollAuthFactorOptions_serializer(), exports);
    __exportStar(requireFactor_serializer$1(), exports);
    __exportStar(requireInvitation_serializer(), exports);
    __exportStar(requireListSessionsOptions_serializer(), exports);
    __exportStar(requireMagicAuth_serializer(), exports);
    __exportStar(requirePasswordReset_serializer(), exports);
    __exportStar(requireResetPasswordOptions_serializer(), exports);
    __exportStar(requireSendPasswordResetEmail_serializer(), exports);
    __exportStar(requireSession_serializer(), exports);
    __exportStar(requireCreateUserOptions_serializer(), exports);
    __exportStar(requireSendMagicAuthCodeOptions_serializer(), exports);
    __exportStar(requireUpdateUserOptions_serializer(), exports);
    __exportStar(requireUpdateUserPasswordOptions_serializer(), exports);
    __exportStar(requireUser_serializer(), exports);
  })(serializers$8);
  return serializers$8;
}
var organizationMembership_serializer = {};
var hasRequiredOrganizationMembership_serializer;
function requireOrganizationMembership_serializer() {
  if (hasRequiredOrganizationMembership_serializer) return organizationMembership_serializer;
  hasRequiredOrganizationMembership_serializer = 1;
  Object.defineProperty(organizationMembership_serializer, "__esModule", { value: true });
  organizationMembership_serializer.deserializeOrganizationMembership = void 0;
  const deserializeOrganizationMembership = (organizationMembership) => Object.assign({ object: organizationMembership.object, id: organizationMembership.id, userId: organizationMembership.user_id, organizationId: organizationMembership.organization_id, organizationName: organizationMembership.organization_name, status: organizationMembership.status, createdAt: organizationMembership.created_at, updatedAt: organizationMembership.updated_at, role: organizationMembership.role }, organizationMembership.roles && { roles: organizationMembership.roles });
  organizationMembership_serializer.deserializeOrganizationMembership = deserializeOrganizationMembership;
  return organizationMembership_serializer;
}
var hasRequiredAction_serializer;
function requireAction_serializer() {
  if (hasRequiredAction_serializer) return action_serializer;
  hasRequiredAction_serializer = 1;
  Object.defineProperty(action_serializer, "__esModule", { value: true });
  action_serializer.deserializeAction = void 0;
  const organization_serializer_1 = requireOrganization_serializer();
  const serializers_1 = requireSerializers$8();
  const organization_membership_serializer_1 = requireOrganizationMembership_serializer();
  const deserializeUserData = (userData) => {
    return {
      object: userData.object,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name
    };
  };
  const deserializeAction = (actionPayload) => {
    switch (actionPayload.object) {
      case "user_registration_action_context":
        return {
          id: actionPayload.id,
          object: actionPayload.object,
          userData: deserializeUserData(actionPayload.user_data),
          invitation: actionPayload.invitation ? (0, serializers_1.deserializeInvitation)(actionPayload.invitation) : void 0,
          ipAddress: actionPayload.ip_address,
          userAgent: actionPayload.user_agent,
          deviceFingerprint: actionPayload.device_fingerprint
        };
      case "authentication_action_context":
        return {
          id: actionPayload.id,
          object: actionPayload.object,
          user: (0, serializers_1.deserializeUser)(actionPayload.user),
          organization: actionPayload.organization ? (0, organization_serializer_1.deserializeOrganization)(actionPayload.organization) : void 0,
          organizationMembership: actionPayload.organization_membership ? (0, organization_membership_serializer_1.deserializeOrganizationMembership)(actionPayload.organization_membership) : void 0,
          ipAddress: actionPayload.ip_address,
          userAgent: actionPayload.user_agent,
          deviceFingerprint: actionPayload.device_fingerprint,
          issuer: actionPayload.issuer
        };
    }
  };
  action_serializer.deserializeAction = deserializeAction;
  return action_serializer;
}
var hasRequiredActions;
function requireActions() {
  if (hasRequiredActions) return actions;
  hasRequiredActions = 1;
  var __awaiter = actions && actions.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(actions, "__esModule", { value: true });
  actions.Actions = void 0;
  const signature_provider_1 = requireSignatureProvider();
  const unreachable_1 = requireUnreachable();
  const action_serializer_1 = requireAction_serializer();
  class Actions {
    constructor(cryptoProvider2) {
      this.signatureProvider = new signature_provider_1.SignatureProvider(cryptoProvider2);
    }
    get computeSignature() {
      return this.signatureProvider.computeSignature.bind(this.signatureProvider);
    }
    get verifyHeader() {
      return this.signatureProvider.verifyHeader.bind(this.signatureProvider);
    }
    serializeType(type) {
      switch (type) {
        case "authentication":
          return "authentication_action_response";
        case "user_registration":
          return "user_registration_action_response";
        default:
          return (0, unreachable_1.unreachable)(type);
      }
    }
    signResponse(data, secret) {
      return __awaiter(this, void 0, void 0, function* () {
        let errorMessage;
        const { verdict, type } = data;
        if (verdict === "Deny" && data.errorMessage) {
          errorMessage = data.errorMessage;
        }
        const responsePayload = Object.assign({ timestamp: Date.now(), verdict }, verdict === "Deny" && data.errorMessage && { error_message: errorMessage });
        const response = {
          object: this.serializeType(type),
          payload: responsePayload,
          signature: yield this.computeSignature(responsePayload.timestamp, responsePayload, secret)
        };
        return response;
      });
    }
    constructAction({ payload, sigHeader, secret, tolerance = 3e4 }) {
      return __awaiter(this, void 0, void 0, function* () {
        const options = { payload, sigHeader, secret, tolerance };
        yield this.verifyHeader(options);
        return (0, action_serializer_1.deserializeAction)(payload);
      });
    }
  }
  actions.Actions = Actions;
  return actions;
}
var webhooks = {};
var serializers$7 = {};
var event_serializer = {};
var serializers$6 = {};
var directoryGroup_serializer = {};
var hasRequiredDirectoryGroup_serializer;
function requireDirectoryGroup_serializer() {
  if (hasRequiredDirectoryGroup_serializer) return directoryGroup_serializer;
  hasRequiredDirectoryGroup_serializer = 1;
  Object.defineProperty(directoryGroup_serializer, "__esModule", { value: true });
  directoryGroup_serializer.deserializeUpdatedEventDirectoryGroup = directoryGroup_serializer.deserializeDirectoryGroup = void 0;
  const deserializeDirectoryGroup = (directoryGroup) => ({
    id: directoryGroup.id,
    idpId: directoryGroup.idp_id,
    directoryId: directoryGroup.directory_id,
    organizationId: directoryGroup.organization_id,
    name: directoryGroup.name,
    createdAt: directoryGroup.created_at,
    updatedAt: directoryGroup.updated_at,
    rawAttributes: directoryGroup.raw_attributes
  });
  directoryGroup_serializer.deserializeDirectoryGroup = deserializeDirectoryGroup;
  const deserializeUpdatedEventDirectoryGroup = (directoryGroup) => ({
    id: directoryGroup.id,
    idpId: directoryGroup.idp_id,
    directoryId: directoryGroup.directory_id,
    organizationId: directoryGroup.organization_id,
    name: directoryGroup.name,
    createdAt: directoryGroup.created_at,
    updatedAt: directoryGroup.updated_at,
    rawAttributes: directoryGroup.raw_attributes,
    previousAttributes: directoryGroup.previous_attributes
  });
  directoryGroup_serializer.deserializeUpdatedEventDirectoryGroup = deserializeUpdatedEventDirectoryGroup;
  return directoryGroup_serializer;
}
var directoryUser_serializer = {};
var hasRequiredDirectoryUser_serializer;
function requireDirectoryUser_serializer() {
  if (hasRequiredDirectoryUser_serializer) return directoryUser_serializer;
  hasRequiredDirectoryUser_serializer = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.deserializeUpdatedEventDirectoryUser = exports.deserializeDirectoryUserWithGroups = exports.deserializeDirectoryUser = void 0;
    const directory_group_serializer_1 = requireDirectoryGroup_serializer();
    const deserializeDirectoryUser = (directoryUser) => ({
      object: directoryUser.object,
      id: directoryUser.id,
      directoryId: directoryUser.directory_id,
      organizationId: directoryUser.organization_id,
      rawAttributes: directoryUser.raw_attributes,
      customAttributes: directoryUser.custom_attributes,
      idpId: directoryUser.idp_id,
      firstName: directoryUser.first_name,
      email: directoryUser.email,
      emails: directoryUser.emails,
      username: directoryUser.username,
      lastName: directoryUser.last_name,
      jobTitle: directoryUser.job_title,
      state: directoryUser.state,
      role: directoryUser.role,
      createdAt: directoryUser.created_at,
      updatedAt: directoryUser.updated_at
    });
    exports.deserializeDirectoryUser = deserializeDirectoryUser;
    const deserializeDirectoryUserWithGroups = (directoryUserWithGroups) => Object.assign(Object.assign({}, (0, exports.deserializeDirectoryUser)(directoryUserWithGroups)), { groups: directoryUserWithGroups.groups.map(directory_group_serializer_1.deserializeDirectoryGroup) });
    exports.deserializeDirectoryUserWithGroups = deserializeDirectoryUserWithGroups;
    const deserializeUpdatedEventDirectoryUser = (directoryUser) => ({
      object: "directory_user",
      id: directoryUser.id,
      directoryId: directoryUser.directory_id,
      organizationId: directoryUser.organization_id,
      rawAttributes: directoryUser.raw_attributes,
      customAttributes: directoryUser.custom_attributes,
      idpId: directoryUser.idp_id,
      firstName: directoryUser.first_name,
      email: directoryUser.email,
      emails: directoryUser.emails,
      username: directoryUser.username,
      lastName: directoryUser.last_name,
      jobTitle: directoryUser.job_title,
      state: directoryUser.state,
      role: directoryUser.role,
      createdAt: directoryUser.created_at,
      updatedAt: directoryUser.updated_at,
      previousAttributes: directoryUser.previous_attributes
    });
    exports.deserializeUpdatedEventDirectoryUser = deserializeUpdatedEventDirectoryUser;
  })(directoryUser_serializer);
  return directoryUser_serializer;
}
var directory_serializer = {};
var hasRequiredDirectory_serializer;
function requireDirectory_serializer() {
  if (hasRequiredDirectory_serializer) return directory_serializer;
  hasRequiredDirectory_serializer = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.deserializeDeletedEventDirectory = exports.deserializeEventDirectory = exports.deserializeDirectoryState = exports.deserializeDirectory = void 0;
    const deserializeDirectory = (directory) => ({
      object: directory.object,
      id: directory.id,
      domain: directory.domain,
      externalKey: directory.external_key,
      name: directory.name,
      organizationId: directory.organization_id,
      state: (0, exports.deserializeDirectoryState)(directory.state),
      type: directory.type,
      createdAt: directory.created_at,
      updatedAt: directory.updated_at
    });
    exports.deserializeDirectory = deserializeDirectory;
    const deserializeDirectoryState = (state) => {
      if (state === "linked") {
        return "active";
      }
      if (state === "unlinked") {
        return "inactive";
      }
      return state;
    };
    exports.deserializeDirectoryState = deserializeDirectoryState;
    const deserializeEventDirectory = (directory) => ({
      object: directory.object,
      id: directory.id,
      externalKey: directory.external_key,
      type: directory.type,
      state: directory.state,
      name: directory.name,
      organizationId: directory.organization_id,
      domains: directory.domains,
      createdAt: directory.created_at,
      updatedAt: directory.updated_at
    });
    exports.deserializeEventDirectory = deserializeEventDirectory;
    const deserializeDeletedEventDirectory = (directory) => ({
      object: directory.object,
      id: directory.id,
      type: directory.type,
      state: directory.state,
      name: directory.name,
      organizationId: directory.organization_id,
      createdAt: directory.created_at,
      updatedAt: directory.updated_at
    });
    exports.deserializeDeletedEventDirectory = deserializeDeletedEventDirectory;
  })(directory_serializer);
  return directory_serializer;
}
var listDirectoriesOptions_serializer = {};
var hasRequiredListDirectoriesOptions_serializer;
function requireListDirectoriesOptions_serializer() {
  if (hasRequiredListDirectoriesOptions_serializer) return listDirectoriesOptions_serializer;
  hasRequiredListDirectoriesOptions_serializer = 1;
  Object.defineProperty(listDirectoriesOptions_serializer, "__esModule", { value: true });
  listDirectoriesOptions_serializer.serializeListDirectoriesOptions = void 0;
  const serializeListDirectoriesOptions = (options) => ({
    organization_id: options.organizationId,
    search: options.search,
    limit: options.limit,
    before: options.before,
    after: options.after,
    order: options.order
  });
  listDirectoriesOptions_serializer.serializeListDirectoriesOptions = serializeListDirectoriesOptions;
  return listDirectoriesOptions_serializer;
}
var hasRequiredSerializers$7;
function requireSerializers$7() {
  if (hasRequiredSerializers$7) return serializers$6;
  hasRequiredSerializers$7 = 1;
  (function(exports) {
    var __createBinding = serializers$6 && serializers$6.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$6 && serializers$6.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireDirectoryGroup_serializer(), exports);
    __exportStar(requireDirectoryUser_serializer(), exports);
    __exportStar(requireDirectory_serializer(), exports);
    __exportStar(requireListDirectoriesOptions_serializer(), exports);
  })(serializers$6);
  return serializers$6;
}
var serializers$5 = {};
var createOrganizationOptions_serializer = {};
var hasRequiredCreateOrganizationOptions_serializer;
function requireCreateOrganizationOptions_serializer() {
  if (hasRequiredCreateOrganizationOptions_serializer) return createOrganizationOptions_serializer;
  hasRequiredCreateOrganizationOptions_serializer = 1;
  Object.defineProperty(createOrganizationOptions_serializer, "__esModule", { value: true });
  createOrganizationOptions_serializer.serializeCreateOrganizationOptions = void 0;
  const serializeCreateOrganizationOptions = (options) => ({
    name: options.name,
    allow_profiles_outside_organization: options.allowProfilesOutsideOrganization,
    domain_data: options.domainData,
    domains: options.domains,
    external_id: options.externalId,
    metadata: options.metadata
  });
  createOrganizationOptions_serializer.serializeCreateOrganizationOptions = serializeCreateOrganizationOptions;
  return createOrganizationOptions_serializer;
}
var updateOrganizationOptions_serializer = {};
var hasRequiredUpdateOrganizationOptions_serializer;
function requireUpdateOrganizationOptions_serializer() {
  if (hasRequiredUpdateOrganizationOptions_serializer) return updateOrganizationOptions_serializer;
  hasRequiredUpdateOrganizationOptions_serializer = 1;
  Object.defineProperty(updateOrganizationOptions_serializer, "__esModule", { value: true });
  updateOrganizationOptions_serializer.serializeUpdateOrganizationOptions = void 0;
  const serializeUpdateOrganizationOptions = (options) => ({
    name: options.name,
    allow_profiles_outside_organization: options.allowProfilesOutsideOrganization,
    domain_data: options.domainData,
    domains: options.domains,
    stripe_customer_id: options.stripeCustomerId,
    external_id: options.externalId,
    metadata: options.metadata
  });
  updateOrganizationOptions_serializer.serializeUpdateOrganizationOptions = serializeUpdateOrganizationOptions;
  return updateOrganizationOptions_serializer;
}
var hasRequiredSerializers$6;
function requireSerializers$6() {
  if (hasRequiredSerializers$6) return serializers$5;
  hasRequiredSerializers$6 = 1;
  (function(exports) {
    var __createBinding = serializers$5 && serializers$5.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$5 && serializers$5.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireCreateOrganizationOptions_serializer(), exports);
    __exportStar(requireOrganization_serializer(), exports);
    __exportStar(requireUpdateOrganizationOptions_serializer(), exports);
  })(serializers$5);
  return serializers$5;
}
var serializers$4 = {};
var connection_serializer = {};
var hasRequiredConnection_serializer;
function requireConnection_serializer() {
  if (hasRequiredConnection_serializer) return connection_serializer;
  hasRequiredConnection_serializer = 1;
  Object.defineProperty(connection_serializer, "__esModule", { value: true });
  connection_serializer.deserializeConnection = void 0;
  const deserializeConnection = (connection) => ({
    object: connection.object,
    id: connection.id,
    organizationId: connection.organization_id,
    name: connection.name,
    connectionType: connection.connection_type,
    type: connection.connection_type,
    state: connection.state,
    domains: connection.domains,
    createdAt: connection.created_at,
    updatedAt: connection.updated_at
  });
  connection_serializer.deserializeConnection = deserializeConnection;
  return connection_serializer;
}
var listConnectionsOptions_serializer = {};
var hasRequiredListConnectionsOptions_serializer;
function requireListConnectionsOptions_serializer() {
  if (hasRequiredListConnectionsOptions_serializer) return listConnectionsOptions_serializer;
  hasRequiredListConnectionsOptions_serializer = 1;
  Object.defineProperty(listConnectionsOptions_serializer, "__esModule", { value: true });
  listConnectionsOptions_serializer.serializeListConnectionsOptions = void 0;
  const serializeListConnectionsOptions = (options) => ({
    connection_type: options.connectionType,
    domain: options.domain,
    organization_id: options.organizationId,
    limit: options.limit,
    before: options.before,
    after: options.after,
    order: options.order
  });
  listConnectionsOptions_serializer.serializeListConnectionsOptions = serializeListConnectionsOptions;
  return listConnectionsOptions_serializer;
}
var profileAndToken_serializer = {};
var profile_serializer = {};
var hasRequiredProfile_serializer;
function requireProfile_serializer() {
  if (hasRequiredProfile_serializer) return profile_serializer;
  hasRequiredProfile_serializer = 1;
  Object.defineProperty(profile_serializer, "__esModule", { value: true });
  profile_serializer.deserializeProfile = void 0;
  const deserializeProfile = (profile) => ({
    id: profile.id,
    idpId: profile.idp_id,
    organizationId: profile.organization_id,
    connectionId: profile.connection_id,
    connectionType: profile.connection_type,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    groups: profile.groups,
    customAttributes: profile.custom_attributes,
    rawAttributes: profile.raw_attributes
  });
  profile_serializer.deserializeProfile = deserializeProfile;
  return profile_serializer;
}
var hasRequiredProfileAndToken_serializer;
function requireProfileAndToken_serializer() {
  if (hasRequiredProfileAndToken_serializer) return profileAndToken_serializer;
  hasRequiredProfileAndToken_serializer = 1;
  Object.defineProperty(profileAndToken_serializer, "__esModule", { value: true });
  profileAndToken_serializer.deserializeProfileAndToken = void 0;
  const oauth_tokens_serializer_1 = requireOauthTokens_serializer();
  const profile_serializer_1 = requireProfile_serializer();
  const deserializeProfileAndToken = (profileAndToken) => ({
    accessToken: profileAndToken.access_token,
    profile: (0, profile_serializer_1.deserializeProfile)(profileAndToken.profile),
    oauthTokens: (0, oauth_tokens_serializer_1.deserializeOauthTokens)(profileAndToken.oauth_tokens)
  });
  profileAndToken_serializer.deserializeProfileAndToken = deserializeProfileAndToken;
  return profileAndToken_serializer;
}
var hasRequiredSerializers$5;
function requireSerializers$5() {
  if (hasRequiredSerializers$5) return serializers$4;
  hasRequiredSerializers$5 = 1;
  (function(exports) {
    var __createBinding = serializers$4 && serializers$4.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$4 && serializers$4.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireConnection_serializer(), exports);
    __exportStar(requireListConnectionsOptions_serializer(), exports);
    __exportStar(requireProfileAndToken_serializer(), exports);
    __exportStar(requireProfile_serializer(), exports);
  })(serializers$4);
  return serializers$4;
}
var role_serializer$1 = {};
var hasRequiredRole_serializer$1;
function requireRole_serializer$1() {
  if (hasRequiredRole_serializer$1) return role_serializer$1;
  hasRequiredRole_serializer$1 = 1;
  Object.defineProperty(role_serializer$1, "__esModule", { value: true });
  role_serializer$1.deserializeRoleEvent = void 0;
  const deserializeRoleEvent = (role) => ({
    object: "role",
    slug: role.slug,
    permissions: role.permissions,
    createdAt: role.created_at,
    updatedAt: role.updated_at
  });
  role_serializer$1.deserializeRoleEvent = deserializeRoleEvent;
  return role_serializer$1;
}
var authenticationRadarRiskEventSerializer = {};
var hasRequiredAuthenticationRadarRiskEventSerializer;
function requireAuthenticationRadarRiskEventSerializer() {
  if (hasRequiredAuthenticationRadarRiskEventSerializer) return authenticationRadarRiskEventSerializer;
  hasRequiredAuthenticationRadarRiskEventSerializer = 1;
  Object.defineProperty(authenticationRadarRiskEventSerializer, "__esModule", { value: true });
  authenticationRadarRiskEventSerializer.deserializeAuthenticationRadarRiskDetectedEvent = void 0;
  const deserializeAuthenticationRadarRiskDetectedEvent = (authenticationRadarRiskDetectedEvent) => ({
    authMethod: authenticationRadarRiskDetectedEvent.auth_method,
    action: authenticationRadarRiskDetectedEvent.action,
    control: authenticationRadarRiskDetectedEvent.control,
    blocklistType: authenticationRadarRiskDetectedEvent.blocklist_type,
    ipAddress: authenticationRadarRiskDetectedEvent.ip_address,
    userAgent: authenticationRadarRiskDetectedEvent.user_agent,
    userId: authenticationRadarRiskDetectedEvent.user_id,
    email: authenticationRadarRiskDetectedEvent.email
  });
  authenticationRadarRiskEventSerializer.deserializeAuthenticationRadarRiskDetectedEvent = deserializeAuthenticationRadarRiskDetectedEvent;
  return authenticationRadarRiskEventSerializer;
}
var hasRequiredEvent_serializer;
function requireEvent_serializer() {
  if (hasRequiredEvent_serializer) return event_serializer;
  hasRequiredEvent_serializer = 1;
  Object.defineProperty(event_serializer, "__esModule", { value: true });
  event_serializer.deserializeEvent = void 0;
  const serializers_1 = requireSerializers$7();
  const serializers_2 = requireSerializers$6();
  const serializers_3 = requireSerializers$5();
  const serializers_4 = requireSerializers$8();
  const organization_domain_serializer_1 = requireOrganizationDomain_serializer();
  const organization_membership_serializer_1 = requireOrganizationMembership_serializer();
  const role_serializer_1 = requireRole_serializer$1();
  const session_serializer_1 = requireSession_serializer();
  const authentication_radar_risk_event_serializer_1 = requireAuthenticationRadarRiskEventSerializer();
  const deserializeEvent = (event) => {
    const eventBase = {
      id: event.id,
      createdAt: event.created_at
    };
    switch (event.event) {
      case "authentication.email_verification_succeeded":
      case "authentication.magic_auth_failed":
      case "authentication.magic_auth_succeeded":
      case "authentication.mfa_succeeded":
      case "authentication.oauth_failed":
      case "authentication.oauth_succeeded":
      case "authentication.password_failed":
      case "authentication.password_succeeded":
      case "authentication.sso_failed":
      case "authentication.sso_succeeded":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_4.deserializeAuthenticationEvent)(event.data) });
      case "authentication.radar_risk_detected":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, authentication_radar_risk_event_serializer_1.deserializeAuthenticationRadarRiskDetectedEvent)(event.data) });
      case "connection.activated":
      case "connection.deactivated":
      case "connection.deleted":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_3.deserializeConnection)(event.data) });
      case "dsync.activated":
      case "dsync.deactivated":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_1.deserializeEventDirectory)(event.data) });
      case "dsync.deleted":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_1.deserializeDeletedEventDirectory)(event.data) });
      case "dsync.group.created":
      case "dsync.group.deleted":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_1.deserializeDirectoryGroup)(event.data) });
      case "dsync.group.updated":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_1.deserializeUpdatedEventDirectoryGroup)(event.data) });
      case "dsync.group.user_added":
      case "dsync.group.user_removed":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: {
          directoryId: event.data.directory_id,
          user: (0, serializers_1.deserializeDirectoryUser)(event.data.user),
          group: (0, serializers_1.deserializeDirectoryGroup)(event.data.group)
        } });
      case "dsync.user.created":
      case "dsync.user.deleted":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_1.deserializeDirectoryUser)(event.data) });
      case "dsync.user.updated":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_1.deserializeUpdatedEventDirectoryUser)(event.data) });
      case "email_verification.created":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_4.deserializeEmailVerificationEvent)(event.data) });
      case "invitation.accepted":
      case "invitation.created":
      case "invitation.revoked":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_4.deserializeInvitationEvent)(event.data) });
      case "magic_auth.created":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_4.deserializeMagicAuthEvent)(event.data) });
      case "password_reset.created":
      case "password_reset.succeeded":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_4.deserializePasswordResetEvent)(event.data) });
      case "user.created":
      case "user.updated":
      case "user.deleted":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_4.deserializeUser)(event.data) });
      case "organization_membership.added":
      case "organization_membership.created":
      case "organization_membership.deleted":
      case "organization_membership.updated":
      case "organization_membership.removed":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, organization_membership_serializer_1.deserializeOrganizationMembership)(event.data) });
      case "role.created":
      case "role.deleted":
      case "role.updated":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, role_serializer_1.deserializeRoleEvent)(event.data) });
      case "session.created":
      case "session.revoked":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, session_serializer_1.deserializeSession)(event.data) });
      case "organization.created":
      case "organization.updated":
      case "organization.deleted":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, serializers_2.deserializeOrganization)(event.data) });
      case "organization_domain.verified":
      case "organization_domain.verification_failed":
      case "organization_domain.created":
      case "organization_domain.updated":
      case "organization_domain.deleted":
        return Object.assign(Object.assign({}, eventBase), { event: event.event, data: (0, organization_domain_serializer_1.deserializeOrganizationDomain)(event.data) });
    }
  };
  event_serializer.deserializeEvent = deserializeEvent;
  return event_serializer;
}
var list_serializer$1 = {};
var hasRequiredList_serializer$1;
function requireList_serializer$1() {
  if (hasRequiredList_serializer$1) return list_serializer$1;
  hasRequiredList_serializer$1 = 1;
  Object.defineProperty(list_serializer$1, "__esModule", { value: true });
  list_serializer$1.deserializeList = void 0;
  const deserializeList = (list, deserializer) => ({
    object: "list",
    data: list.data.map(deserializer),
    listMetadata: list.list_metadata
  });
  list_serializer$1.deserializeList = deserializeList;
  return list_serializer$1;
}
var hasRequiredSerializers$4;
function requireSerializers$4() {
  if (hasRequiredSerializers$4) return serializers$7;
  hasRequiredSerializers$4 = 1;
  (function(exports) {
    var __createBinding = serializers$7 && serializers$7.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$7 && serializers$7.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireEvent_serializer(), exports);
    __exportStar(requireList_serializer$1(), exports);
  })(serializers$7);
  return serializers$7;
}
var hasRequiredWebhooks;
function requireWebhooks() {
  if (hasRequiredWebhooks) return webhooks;
  hasRequiredWebhooks = 1;
  var __awaiter = webhooks && webhooks.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(webhooks, "__esModule", { value: true });
  webhooks.Webhooks = void 0;
  const serializers_1 = requireSerializers$4();
  const signature_provider_1 = requireSignatureProvider();
  class Webhooks {
    constructor(cryptoProvider2) {
      this.signatureProvider = new signature_provider_1.SignatureProvider(cryptoProvider2);
    }
    get verifyHeader() {
      return this.signatureProvider.verifyHeader.bind(this.signatureProvider);
    }
    get computeSignature() {
      return this.signatureProvider.computeSignature.bind(this.signatureProvider);
    }
    get getTimestampAndSignatureHash() {
      return this.signatureProvider.getTimestampAndSignatureHash.bind(this.signatureProvider);
    }
    constructEvent({ payload, sigHeader, secret, tolerance = 18e4 }) {
      return __awaiter(this, void 0, void 0, function* () {
        const options = { payload, sigHeader, secret, tolerance };
        yield this.verifyHeader(options);
        const webhookPayload = payload;
        return (0, serializers_1.deserializeEvent)(webhookPayload);
      });
    }
  }
  webhooks.Webhooks = Webhooks;
  return webhooks;
}
var workos = {};
var directorySync = {};
var pagination = {};
var hasRequiredPagination;
function requirePagination() {
  if (hasRequiredPagination) return pagination;
  hasRequiredPagination = 1;
  var __awaiter = pagination && pagination.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __await = pagination && pagination.__await || function(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
  };
  var __asyncValues = pagination && pagination.__asyncValues || function(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i);
    function verb(n) {
      i[n] = o[n] && function(v) {
        return new Promise(function(resolve, reject) {
          v = o[n](v), settle(resolve, reject, v.done, v.value);
        });
      };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function(v2) {
        resolve({ value: v2, done: d });
      }, reject);
    }
  };
  var __asyncDelegator = pagination && pagination.__asyncDelegator || function(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function(e) {
      throw e;
    }), verb("return"), i[Symbol.iterator] = function() {
      return this;
    }, i;
    function verb(n, f) {
      i[n] = o[n] ? function(v) {
        return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v;
      } : f;
    }
  };
  var __asyncGenerator = pagination && pagination.__asyncGenerator || function(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i;
    function verb(n) {
      if (g[n]) i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
    }
  };
  Object.defineProperty(pagination, "__esModule", { value: true });
  pagination.AutoPaginatable = void 0;
  class AutoPaginatable {
    constructor(list, apiCall, options) {
      this.list = list;
      this.apiCall = apiCall;
      this.object = "list";
      this.options = Object.assign({}, options);
    }
    get data() {
      return this.list.data;
    }
    get listMetadata() {
      return this.list.listMetadata;
    }
    generatePages(params) {
      return __asyncGenerator(this, arguments, function* generatePages_1() {
        const result = yield __await(this.apiCall(Object.assign(Object.assign({}, this.options), { limit: 100, after: params.after })));
        yield yield __await(result.data);
        if (result.listMetadata.after) {
          yield __await(new Promise((resolve) => setTimeout(resolve, 350)));
          yield __await(yield* __asyncDelegator(__asyncValues(this.generatePages({ after: result.listMetadata.after }))));
        }
      });
    }
    /**
     * Automatically paginates over the list of results, returning the complete data set.
     * Returns the first result if `options.limit` is passed to the first request.
     */
    autoPagination() {
      var _a, e_1, _b, _c;
      return __awaiter(this, void 0, void 0, function* () {
        if (this.options.limit) {
          return this.data;
        }
        const results = [];
        try {
          for (var _d = true, _e = __asyncValues(this.generatePages({
            after: this.options.after
          })), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
            _c = _f.value;
            _d = false;
            const page = _c;
            results.push(...page);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return results;
      });
    }
  }
  pagination.AutoPaginatable = AutoPaginatable;
  return pagination;
}
var fetchAndDeserialize = {};
var hasRequiredFetchAndDeserialize;
function requireFetchAndDeserialize() {
  if (hasRequiredFetchAndDeserialize) return fetchAndDeserialize;
  hasRequiredFetchAndDeserialize = 1;
  var __awaiter = fetchAndDeserialize && fetchAndDeserialize.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(fetchAndDeserialize, "__esModule", { value: true });
  fetchAndDeserialize.fetchAndDeserialize = void 0;
  const serializers_1 = requireSerializers$4();
  const setDefaultOptions = (options) => {
    return Object.assign(Object.assign({}, options), { order: (options === null || options === void 0 ? void 0 : options.order) || "desc" });
  };
  const fetchAndDeserialize$1 = (workos2, endpoint, deserializeFn, options, requestOptions) => __awaiter(void 0, void 0, void 0, function* () {
    const { data } = yield workos2.get(endpoint, Object.assign({ query: setDefaultOptions(options) }, requestOptions));
    return (0, serializers_1.deserializeList)(data, deserializeFn);
  });
  fetchAndDeserialize.fetchAndDeserialize = fetchAndDeserialize$1;
  return fetchAndDeserialize;
}
var hasRequiredDirectorySync;
function requireDirectorySync() {
  if (hasRequiredDirectorySync) return directorySync;
  hasRequiredDirectorySync = 1;
  var __awaiter = directorySync && directorySync.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(directorySync, "__esModule", { value: true });
  directorySync.DirectorySync = void 0;
  const pagination_1 = requirePagination();
  const serializers_1 = requireSerializers$7();
  const fetch_and_deserialize_1 = requireFetchAndDeserialize();
  class DirectorySync {
    constructor(workos2) {
      this.workos = workos2;
    }
    listDirectories(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/directories", serializers_1.deserializeDirectory, options ? (0, serializers_1.serializeListDirectoriesOptions)(options) : void 0), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/directories", serializers_1.deserializeDirectory, params), options ? (0, serializers_1.serializeListDirectoriesOptions)(options) : void 0);
      });
    }
    getDirectory(id) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/directories/${id}`);
        return (0, serializers_1.deserializeDirectory)(data);
      });
    }
    deleteDirectory(id) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.delete(`/directories/${id}`);
      });
    }
    listGroups(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/directory_groups", serializers_1.deserializeDirectoryGroup, options), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/directory_groups", serializers_1.deserializeDirectoryGroup, params), options);
      });
    }
    listUsers(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/directory_users", serializers_1.deserializeDirectoryUserWithGroups, options), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/directory_users", serializers_1.deserializeDirectoryUserWithGroups, params), options);
      });
    }
    getUser(user) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/directory_users/${user}`);
        return (0, serializers_1.deserializeDirectoryUserWithGroups)(data);
      });
    }
    getGroup(group) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/directory_groups/${group}`);
        return (0, serializers_1.deserializeDirectoryGroup)(data);
      });
    }
  }
  directorySync.DirectorySync = DirectorySync;
  return directorySync;
}
var events = {};
var serializers$3 = {};
var listEventOptions_serializer = {};
var hasRequiredListEventOptions_serializer;
function requireListEventOptions_serializer() {
  if (hasRequiredListEventOptions_serializer) return listEventOptions_serializer;
  hasRequiredListEventOptions_serializer = 1;
  Object.defineProperty(listEventOptions_serializer, "__esModule", { value: true });
  listEventOptions_serializer.serializeListEventOptions = void 0;
  const serializeListEventOptions = (options) => ({
    events: options.events,
    organization_id: options.organizationId,
    range_start: options.rangeStart,
    range_end: options.rangeEnd,
    limit: options.limit,
    after: options.after
  });
  listEventOptions_serializer.serializeListEventOptions = serializeListEventOptions;
  return listEventOptions_serializer;
}
var hasRequiredSerializers$3;
function requireSerializers$3() {
  if (hasRequiredSerializers$3) return serializers$3;
  hasRequiredSerializers$3 = 1;
  (function(exports) {
    var __createBinding = serializers$3 && serializers$3.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$3 && serializers$3.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireListEventOptions_serializer(), exports);
  })(serializers$3);
  return serializers$3;
}
var hasRequiredEvents;
function requireEvents() {
  if (hasRequiredEvents) return events;
  hasRequiredEvents = 1;
  var __awaiter = events && events.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(events, "__esModule", { value: true });
  events.Events = void 0;
  const serializers_1 = requireSerializers$4();
  const serializers_2 = requireSerializers$3();
  class Events {
    constructor(workos2) {
      this.workos = workos2;
    }
    listEvents(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/events`, {
          query: options ? (0, serializers_2.serializeListEventOptions)(options) : void 0
        });
        return (0, serializers_1.deserializeList)(data, serializers_1.deserializeEvent);
      });
    }
  }
  events.Events = Events;
  return events;
}
var organizations = {};
var role_serializer = {};
var hasRequiredRole_serializer;
function requireRole_serializer() {
  if (hasRequiredRole_serializer) return role_serializer;
  hasRequiredRole_serializer = 1;
  Object.defineProperty(role_serializer, "__esModule", { value: true });
  role_serializer.deserializeRole = void 0;
  const deserializeRole = (role) => ({
    object: role.object,
    id: role.id,
    name: role.name,
    slug: role.slug,
    description: role.description,
    permissions: role.permissions,
    type: role.type,
    createdAt: role.created_at,
    updatedAt: role.updated_at
  });
  role_serializer.deserializeRole = deserializeRole;
  return role_serializer;
}
var featureFlag_serializer = {};
var hasRequiredFeatureFlag_serializer;
function requireFeatureFlag_serializer() {
  if (hasRequiredFeatureFlag_serializer) return featureFlag_serializer;
  hasRequiredFeatureFlag_serializer = 1;
  Object.defineProperty(featureFlag_serializer, "__esModule", { value: true });
  featureFlag_serializer.deserializeFeatureFlag = void 0;
  const deserializeFeatureFlag = (featureFlag) => ({
    object: featureFlag.object,
    id: featureFlag.id,
    name: featureFlag.name,
    slug: featureFlag.slug,
    description: featureFlag.description,
    createdAt: featureFlag.created_at,
    updatedAt: featureFlag.updated_at
  });
  featureFlag_serializer.deserializeFeatureFlag = deserializeFeatureFlag;
  return featureFlag_serializer;
}
var hasRequiredOrganizations;
function requireOrganizations() {
  if (hasRequiredOrganizations) return organizations;
  hasRequiredOrganizations = 1;
  var __awaiter = organizations && organizations.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __rest = organizations && organizations.__rest || function(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  };
  Object.defineProperty(organizations, "__esModule", { value: true });
  organizations.Organizations = void 0;
  const pagination_1 = requirePagination();
  const serializers_1 = requireSerializers$6();
  const fetch_and_deserialize_1 = requireFetchAndDeserialize();
  const role_serializer_1 = requireRole_serializer();
  const feature_flag_serializer_1 = requireFeatureFlag_serializer();
  class Organizations {
    constructor(workos2) {
      this.workos = workos2;
    }
    listOrganizations(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/organizations", serializers_1.deserializeOrganization, options), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/organizations", serializers_1.deserializeOrganization, params), options);
      });
    }
    createOrganization(payload, requestOptions = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/organizations", (0, serializers_1.serializeCreateOrganizationOptions)(payload), requestOptions);
        return (0, serializers_1.deserializeOrganization)(data);
      });
    }
    deleteOrganization(id) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.delete(`/organizations/${id}`);
      });
    }
    getOrganization(id) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/organizations/${id}`);
        return (0, serializers_1.deserializeOrganization)(data);
      });
    }
    getOrganizationByExternalId(externalId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/organizations/external_id/${externalId}`);
        return (0, serializers_1.deserializeOrganization)(data);
      });
    }
    updateOrganization(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { organization: organizationId } = options, payload = __rest(options, ["organization"]);
        const { data } = yield this.workos.put(`/organizations/${organizationId}`, (0, serializers_1.serializeUpdateOrganizationOptions)(payload));
        return (0, serializers_1.deserializeOrganization)(data);
      });
    }
    listOrganizationRoles(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { organizationId } = options;
        const { data: response } = yield this.workos.get(`/organizations/${organizationId}/roles`);
        return {
          object: "list",
          data: response.data.map((role) => (0, role_serializer_1.deserializeRole)(role))
        };
      });
    }
    listOrganizationFeatureFlags(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { organizationId } = options, paginationOptions = __rest(options, ["organizationId"]);
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/organizations/${organizationId}/feature-flags`, feature_flag_serializer_1.deserializeFeatureFlag, paginationOptions), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/organizations/${organizationId}/feature-flags`, feature_flag_serializer_1.deserializeFeatureFlag, params), paginationOptions);
      });
    }
  }
  organizations.Organizations = Organizations;
  return organizations;
}
var organizationDomains = {};
var createOrganizationDomainOptions_serializer = {};
var hasRequiredCreateOrganizationDomainOptions_serializer;
function requireCreateOrganizationDomainOptions_serializer() {
  if (hasRequiredCreateOrganizationDomainOptions_serializer) return createOrganizationDomainOptions_serializer;
  hasRequiredCreateOrganizationDomainOptions_serializer = 1;
  Object.defineProperty(createOrganizationDomainOptions_serializer, "__esModule", { value: true });
  createOrganizationDomainOptions_serializer.serializeCreateOrganizationDomainOptions = void 0;
  const serializeCreateOrganizationDomainOptions = (options) => ({
    domain: options.domain,
    organization_id: options.organizationId
  });
  createOrganizationDomainOptions_serializer.serializeCreateOrganizationDomainOptions = serializeCreateOrganizationDomainOptions;
  return createOrganizationDomainOptions_serializer;
}
var hasRequiredOrganizationDomains;
function requireOrganizationDomains() {
  if (hasRequiredOrganizationDomains) return organizationDomains;
  hasRequiredOrganizationDomains = 1;
  var __awaiter = organizationDomains && organizationDomains.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(organizationDomains, "__esModule", { value: true });
  organizationDomains.OrganizationDomains = void 0;
  const create_organization_domain_options_serializer_1 = requireCreateOrganizationDomainOptions_serializer();
  const organization_domain_serializer_1 = requireOrganizationDomain_serializer();
  class OrganizationDomains {
    constructor(workos2) {
      this.workos = workos2;
    }
    get(id) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/organization_domains/${id}`);
        return (0, organization_domain_serializer_1.deserializeOrganizationDomain)(data);
      });
    }
    verify(id) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/organization_domains/${id}/verify`, {});
        return (0, organization_domain_serializer_1.deserializeOrganizationDomain)(data);
      });
    }
    create(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/organization_domains`, (0, create_organization_domain_options_serializer_1.serializeCreateOrganizationDomainOptions)(payload));
        return (0, organization_domain_serializer_1.deserializeOrganizationDomain)(data);
      });
    }
    delete(id) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.delete(`/organization_domains/${id}`);
      });
    }
  }
  organizationDomains.OrganizationDomains = OrganizationDomains;
  return organizationDomains;
}
var passwordless = {};
var passwordlessSession_serializer = {};
var hasRequiredPasswordlessSession_serializer;
function requirePasswordlessSession_serializer() {
  if (hasRequiredPasswordlessSession_serializer) return passwordlessSession_serializer;
  hasRequiredPasswordlessSession_serializer = 1;
  Object.defineProperty(passwordlessSession_serializer, "__esModule", { value: true });
  passwordlessSession_serializer.deserializePasswordlessSession = void 0;
  const deserializePasswordlessSession = (passwordlessSession) => ({
    id: passwordlessSession.id,
    email: passwordlessSession.email,
    expiresAt: passwordlessSession.expires_at,
    link: passwordlessSession.link,
    object: passwordlessSession.object
  });
  passwordlessSession_serializer.deserializePasswordlessSession = deserializePasswordlessSession;
  return passwordlessSession_serializer;
}
var hasRequiredPasswordless;
function requirePasswordless() {
  if (hasRequiredPasswordless) return passwordless;
  hasRequiredPasswordless = 1;
  var __awaiter = passwordless && passwordless.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __rest = passwordless && passwordless.__rest || function(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  };
  Object.defineProperty(passwordless, "__esModule", { value: true });
  passwordless.Passwordless = void 0;
  const passwordless_session_serializer_1 = requirePasswordlessSession_serializer();
  class Passwordless {
    constructor(workos2) {
      this.workos = workos2;
    }
    createSession(_a) {
      var { redirectURI, expiresIn } = _a, options = __rest(_a, ["redirectURI", "expiresIn"]);
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/passwordless/sessions", Object.assign(Object.assign({}, options), { redirect_uri: redirectURI, expires_in: expiresIn }));
        return (0, passwordless_session_serializer_1.deserializePasswordlessSession)(data);
      });
    }
    sendSession(sessionId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/passwordless/sessions/${sessionId}/send`, {});
        return data;
      });
    }
  }
  passwordless.Passwordless = Passwordless;
  return passwordless;
}
var portal = {};
var hasRequiredPortal;
function requirePortal() {
  if (hasRequiredPortal) return portal;
  hasRequiredPortal = 1;
  var __awaiter = portal && portal.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(portal, "__esModule", { value: true });
  portal.Portal = void 0;
  class Portal {
    constructor(workos2) {
      this.workos = workos2;
    }
    generateLink({ intent, organization, returnUrl, successUrl }) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/portal/generate_link", {
          intent,
          organization,
          return_url: returnUrl,
          success_url: successUrl
        });
        return data;
      });
    }
  }
  portal.Portal = Portal;
  return portal;
}
var sso = {};
var hasRequiredSso;
function requireSso() {
  if (hasRequiredSso) return sso;
  hasRequiredSso = 1;
  var __awaiter = sso && sso.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __importDefault = sso && sso.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(sso, "__esModule", { value: true });
  sso.SSO = void 0;
  const qs_1 = __importDefault(require$$0$2);
  const fetch_and_deserialize_1 = requireFetchAndDeserialize();
  const pagination_1 = requirePagination();
  const serializers_1 = requireSerializers$5();
  const toQueryString = (options) => {
    return qs_1.default.stringify(options, {
      arrayFormat: "repeat",
      // sorts the keys alphabetically to maintain backwards compatibility
      sort: (a, b) => a.localeCompare(b),
      // encodes space as + instead of %20 to maintain backwards compatibility
      format: "RFC1738"
    });
  };
  class SSO {
    constructor(workos2) {
      this.workos = workos2;
    }
    listConnections(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/connections", serializers_1.deserializeConnection, options ? (0, serializers_1.serializeListConnectionsOptions)(options) : void 0), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/connections", serializers_1.deserializeConnection, params), options ? (0, serializers_1.serializeListConnectionsOptions)(options) : void 0);
      });
    }
    deleteConnection(id) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.delete(`/connections/${id}`);
      });
    }
    getAuthorizationUrl({ connection, clientId, domain, domainHint, loginHint, organization, provider, providerQueryParams, providerScopes, redirectUri, state }) {
      if (!domain && !provider && !connection && !organization) {
        throw new Error(`Incomplete arguments. Need to specify either a 'connection', 'organization', 'domain', or 'provider'.`);
      }
      if (domain) {
        this.workos.emitWarning("The `domain` parameter for `getAuthorizationURL` is deprecated. Please use `organization` instead.");
      }
      const query = toQueryString({
        connection,
        organization,
        domain,
        domain_hint: domainHint,
        login_hint: loginHint,
        provider,
        provider_query_params: providerQueryParams,
        provider_scopes: providerScopes,
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state
      });
      return `${this.workos.baseURL}/sso/authorize?${query}`;
    }
    getConnection(id) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/connections/${id}`);
        return (0, serializers_1.deserializeConnection)(data);
      });
    }
    getProfileAndToken({ code, clientId }) {
      return __awaiter(this, void 0, void 0, function* () {
        const form = new URLSearchParams({
          client_id: clientId,
          client_secret: this.workos.key,
          grant_type: "authorization_code",
          code
        });
        const { data } = yield this.workos.post("/sso/token", form);
        return (0, serializers_1.deserializeProfileAndToken)(data);
      });
    }
    getProfile({ accessToken }) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get("/sso/profile", {
          accessToken
        });
        return (0, serializers_1.deserializeProfile)(data);
      });
    }
  }
  sso.SSO = SSO;
  return sso;
}
var mfa = {};
var serializers$2 = {};
var challenge_serializer = {};
var hasRequiredChallenge_serializer;
function requireChallenge_serializer() {
  if (hasRequiredChallenge_serializer) return challenge_serializer;
  hasRequiredChallenge_serializer = 1;
  Object.defineProperty(challenge_serializer, "__esModule", { value: true });
  challenge_serializer.deserializeChallenge = void 0;
  const deserializeChallenge = (challenge) => ({
    object: challenge.object,
    id: challenge.id,
    createdAt: challenge.created_at,
    updatedAt: challenge.updated_at,
    expiresAt: challenge.expires_at,
    code: challenge.code,
    authenticationFactorId: challenge.authentication_factor_id
  });
  challenge_serializer.deserializeChallenge = deserializeChallenge;
  return challenge_serializer;
}
var factor_serializer = {};
var sms_serializer = {};
var hasRequiredSms_serializer;
function requireSms_serializer() {
  if (hasRequiredSms_serializer) return sms_serializer;
  hasRequiredSms_serializer = 1;
  Object.defineProperty(sms_serializer, "__esModule", { value: true });
  sms_serializer.deserializeSms = void 0;
  const deserializeSms = (sms) => ({
    phoneNumber: sms.phone_number
  });
  sms_serializer.deserializeSms = deserializeSms;
  return sms_serializer;
}
var hasRequiredFactor_serializer;
function requireFactor_serializer() {
  if (hasRequiredFactor_serializer) return factor_serializer;
  hasRequiredFactor_serializer = 1;
  Object.defineProperty(factor_serializer, "__esModule", { value: true });
  factor_serializer.deserializeFactorWithSecrets = factor_serializer.deserializeFactor = void 0;
  const sms_serializer_1 = requireSms_serializer();
  const totp_serializer_1 = requireTotp_serializer();
  const deserializeFactor = (factor) => Object.assign(Object.assign({ object: factor.object, id: factor.id, createdAt: factor.created_at, updatedAt: factor.updated_at, type: factor.type }, factor.sms ? { sms: (0, sms_serializer_1.deserializeSms)(factor.sms) } : {}), factor.totp ? { totp: (0, totp_serializer_1.deserializeTotp)(factor.totp) } : {});
  factor_serializer.deserializeFactor = deserializeFactor;
  const deserializeFactorWithSecrets = (factor) => Object.assign(Object.assign({ object: factor.object, id: factor.id, createdAt: factor.created_at, updatedAt: factor.updated_at, type: factor.type }, factor.sms ? { sms: (0, sms_serializer_1.deserializeSms)(factor.sms) } : {}), factor.totp ? { totp: (0, totp_serializer_1.deserializeTotpWithSecrets)(factor.totp) } : {});
  factor_serializer.deserializeFactorWithSecrets = deserializeFactorWithSecrets;
  return factor_serializer;
}
var verifyResponse_serializer = {};
var hasRequiredVerifyResponse_serializer;
function requireVerifyResponse_serializer() {
  if (hasRequiredVerifyResponse_serializer) return verifyResponse_serializer;
  hasRequiredVerifyResponse_serializer = 1;
  Object.defineProperty(verifyResponse_serializer, "__esModule", { value: true });
  verifyResponse_serializer.deserializeVerifyResponse = void 0;
  const challenge_serializer_1 = requireChallenge_serializer();
  const deserializeVerifyResponse = (verifyResponse) => ({
    challenge: (0, challenge_serializer_1.deserializeChallenge)(verifyResponse.challenge),
    valid: verifyResponse.valid
  });
  verifyResponse_serializer.deserializeVerifyResponse = deserializeVerifyResponse;
  return verifyResponse_serializer;
}
var hasRequiredSerializers$2;
function requireSerializers$2() {
  if (hasRequiredSerializers$2) return serializers$2;
  hasRequiredSerializers$2 = 1;
  (function(exports) {
    var __createBinding = serializers$2 && serializers$2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$2 && serializers$2.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireChallenge_serializer(), exports);
    __exportStar(requireFactor_serializer(), exports);
    __exportStar(requireVerifyResponse_serializer(), exports);
  })(serializers$2);
  return serializers$2;
}
var hasRequiredMfa;
function requireMfa() {
  if (hasRequiredMfa) return mfa;
  hasRequiredMfa = 1;
  var __awaiter = mfa && mfa.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(mfa, "__esModule", { value: true });
  mfa.Mfa = void 0;
  const serializers_1 = requireSerializers$2();
  class Mfa {
    constructor(workos2) {
      this.workos = workos2;
    }
    deleteFactor(id) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.delete(`/auth/factors/${id}`);
      });
    }
    getFactor(id) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/auth/factors/${id}`);
        return (0, serializers_1.deserializeFactor)(data);
      });
    }
    enrollFactor(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/auth/factors/enroll", Object.assign({ type: options.type }, (() => {
          switch (options.type) {
            case "sms":
              return {
                phone_number: options.phoneNumber
              };
            case "totp":
              return {
                totp_issuer: options.issuer,
                totp_user: options.user
              };
            default:
              return {};
          }
        })()));
        return (0, serializers_1.deserializeFactorWithSecrets)(data);
      });
    }
    challengeFactor(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/auth/factors/${options.authenticationFactorId}/challenge`, {
          sms_template: "smsTemplate" in options ? options.smsTemplate : void 0
        });
        return (0, serializers_1.deserializeChallenge)(data);
      });
    }
    /**
     * @deprecated Please use `verifyChallenge` instead.
     */
    verifyFactor(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return this.verifyChallenge(options);
      });
    }
    verifyChallenge(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/auth/challenges/${options.authenticationChallengeId}/verify`, {
          code: options.code
        });
        return (0, serializers_1.deserializeVerifyResponse)(data);
      });
    }
  }
  mfa.Mfa = Mfa;
  return mfa;
}
var auditLogs = {};
var serializers$1 = {};
var auditLogExport_serializer = {};
var hasRequiredAuditLogExport_serializer;
function requireAuditLogExport_serializer() {
  if (hasRequiredAuditLogExport_serializer) return auditLogExport_serializer;
  hasRequiredAuditLogExport_serializer = 1;
  Object.defineProperty(auditLogExport_serializer, "__esModule", { value: true });
  auditLogExport_serializer.deserializeAuditLogExport = void 0;
  const deserializeAuditLogExport = (auditLogExport) => ({
    object: auditLogExport.object,
    id: auditLogExport.id,
    state: auditLogExport.state,
    url: auditLogExport.url,
    createdAt: auditLogExport.created_at,
    updatedAt: auditLogExport.updated_at
  });
  auditLogExport_serializer.deserializeAuditLogExport = deserializeAuditLogExport;
  return auditLogExport_serializer;
}
var auditLogExportOptions_serializer = {};
var hasRequiredAuditLogExportOptions_serializer;
function requireAuditLogExportOptions_serializer() {
  if (hasRequiredAuditLogExportOptions_serializer) return auditLogExportOptions_serializer;
  hasRequiredAuditLogExportOptions_serializer = 1;
  Object.defineProperty(auditLogExportOptions_serializer, "__esModule", { value: true });
  auditLogExportOptions_serializer.serializeAuditLogExportOptions = void 0;
  const serializeAuditLogExportOptions = (options) => ({
    actions: options.actions,
    actors: options.actors,
    actor_names: options.actorNames,
    actor_ids: options.actorIds,
    organization_id: options.organizationId,
    range_end: options.rangeEnd.toISOString(),
    range_start: options.rangeStart.toISOString(),
    targets: options.targets
  });
  auditLogExportOptions_serializer.serializeAuditLogExportOptions = serializeAuditLogExportOptions;
  return auditLogExportOptions_serializer;
}
var createAuditLogEventOptions_serializer = {};
var hasRequiredCreateAuditLogEventOptions_serializer;
function requireCreateAuditLogEventOptions_serializer() {
  if (hasRequiredCreateAuditLogEventOptions_serializer) return createAuditLogEventOptions_serializer;
  hasRequiredCreateAuditLogEventOptions_serializer = 1;
  Object.defineProperty(createAuditLogEventOptions_serializer, "__esModule", { value: true });
  createAuditLogEventOptions_serializer.serializeCreateAuditLogEventOptions = void 0;
  const serializeCreateAuditLogEventOptions = (event) => ({
    action: event.action,
    version: event.version,
    occurred_at: event.occurredAt.toISOString(),
    actor: event.actor,
    targets: event.targets,
    context: {
      location: event.context.location,
      user_agent: event.context.userAgent
    },
    metadata: event.metadata
  });
  createAuditLogEventOptions_serializer.serializeCreateAuditLogEventOptions = serializeCreateAuditLogEventOptions;
  return createAuditLogEventOptions_serializer;
}
var createAuditLogSchemaOptions_serializer = {};
var hasRequiredCreateAuditLogSchemaOptions_serializer;
function requireCreateAuditLogSchemaOptions_serializer() {
  if (hasRequiredCreateAuditLogSchemaOptions_serializer) return createAuditLogSchemaOptions_serializer;
  hasRequiredCreateAuditLogSchemaOptions_serializer = 1;
  Object.defineProperty(createAuditLogSchemaOptions_serializer, "__esModule", { value: true });
  createAuditLogSchemaOptions_serializer.serializeCreateAuditLogSchemaOptions = void 0;
  function serializeMetadata(metadata) {
    if (!metadata) {
      return {};
    }
    const serializedMetadata = {};
    Object.keys(metadata).forEach((key) => {
      serializedMetadata[key] = {
        type: metadata[key]
      };
    });
    return serializedMetadata;
  }
  const serializeCreateAuditLogSchemaOptions = (schema2) => {
    var _a;
    return {
      actor: {
        metadata: {
          type: "object",
          properties: serializeMetadata((_a = schema2.actor) === null || _a === void 0 ? void 0 : _a.metadata)
        }
      },
      targets: schema2.targets.map((target) => {
        return {
          type: target.type,
          metadata: target.metadata ? {
            type: "object",
            properties: serializeMetadata(target.metadata)
          } : void 0
        };
      }),
      metadata: schema2.metadata ? {
        type: "object",
        properties: serializeMetadata(schema2.metadata)
      } : void 0
    };
  };
  createAuditLogSchemaOptions_serializer.serializeCreateAuditLogSchemaOptions = serializeCreateAuditLogSchemaOptions;
  return createAuditLogSchemaOptions_serializer;
}
var createAuditLogSchema_serializer = {};
var hasRequiredCreateAuditLogSchema_serializer;
function requireCreateAuditLogSchema_serializer() {
  if (hasRequiredCreateAuditLogSchema_serializer) return createAuditLogSchema_serializer;
  hasRequiredCreateAuditLogSchema_serializer = 1;
  Object.defineProperty(createAuditLogSchema_serializer, "__esModule", { value: true });
  createAuditLogSchema_serializer.deserializeAuditLogSchema = void 0;
  function deserializeMetadata(metadata) {
    if (!metadata || !metadata.properties) {
      return {};
    }
    const deserializedMetadata = {};
    Object.keys(metadata.properties).forEach((key) => {
      if (metadata.properties) {
        deserializedMetadata[key] = metadata.properties[key].type;
      }
    });
    return deserializedMetadata;
  }
  const deserializeAuditLogSchema = (auditLogSchema) => {
    var _a;
    return {
      object: auditLogSchema.object,
      version: auditLogSchema.version,
      targets: auditLogSchema.targets.map((target) => {
        return {
          type: target.type,
          metadata: target.metadata ? deserializeMetadata(target.metadata) : void 0
        };
      }),
      actor: {
        metadata: deserializeMetadata((_a = auditLogSchema.actor) === null || _a === void 0 ? void 0 : _a.metadata)
      },
      metadata: auditLogSchema.metadata ? deserializeMetadata(auditLogSchema.metadata) : void 0,
      createdAt: auditLogSchema.created_at
    };
  };
  createAuditLogSchema_serializer.deserializeAuditLogSchema = deserializeAuditLogSchema;
  return createAuditLogSchema_serializer;
}
var hasRequiredSerializers$1;
function requireSerializers$1() {
  if (hasRequiredSerializers$1) return serializers$1;
  hasRequiredSerializers$1 = 1;
  (function(exports) {
    var __createBinding = serializers$1 && serializers$1.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers$1 && serializers$1.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireAuditLogExport_serializer(), exports);
    __exportStar(requireAuditLogExportOptions_serializer(), exports);
    __exportStar(requireCreateAuditLogEventOptions_serializer(), exports);
    __exportStar(requireCreateAuditLogSchemaOptions_serializer(), exports);
    __exportStar(requireCreateAuditLogSchema_serializer(), exports);
  })(serializers$1);
  return serializers$1;
}
var hasRequiredAuditLogs;
function requireAuditLogs() {
  if (hasRequiredAuditLogs) return auditLogs;
  hasRequiredAuditLogs = 1;
  var __awaiter = auditLogs && auditLogs.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(auditLogs, "__esModule", { value: true });
  auditLogs.AuditLogs = void 0;
  const serializers_1 = requireSerializers$1();
  class AuditLogs {
    constructor(workos2) {
      this.workos = workos2;
    }
    createEvent(organization, event, options = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.post("/audit_logs/events", {
          event: (0, serializers_1.serializeCreateAuditLogEventOptions)(event),
          organization_id: organization
        }, options);
      });
    }
    createExport(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/audit_logs/exports", (0, serializers_1.serializeAuditLogExportOptions)(options));
        return (0, serializers_1.deserializeAuditLogExport)(data);
      });
    }
    getExport(auditLogExportId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/audit_logs/exports/${auditLogExportId}`);
        return (0, serializers_1.deserializeAuditLogExport)(data);
      });
    }
    createSchema(schema2, options = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/audit_logs/actions/${schema2.action}/schemas`, (0, serializers_1.serializeCreateAuditLogSchemaOptions)(schema2), options);
        return (0, serializers_1.deserializeAuditLogSchema)(data);
      });
    }
  }
  auditLogs.AuditLogs = AuditLogs;
  return auditLogs;
}
var userManagement = {};
var authenticateWithSessionCookie_interface = {};
var hasRequiredAuthenticateWithSessionCookie_interface;
function requireAuthenticateWithSessionCookie_interface() {
  if (hasRequiredAuthenticateWithSessionCookie_interface) return authenticateWithSessionCookie_interface;
  hasRequiredAuthenticateWithSessionCookie_interface = 1;
  Object.defineProperty(authenticateWithSessionCookie_interface, "__esModule", { value: true });
  authenticateWithSessionCookie_interface.AuthenticateWithSessionCookieFailureReason = void 0;
  var AuthenticateWithSessionCookieFailureReason;
  (function(AuthenticateWithSessionCookieFailureReason2) {
    AuthenticateWithSessionCookieFailureReason2["INVALID_JWT"] = "invalid_jwt";
    AuthenticateWithSessionCookieFailureReason2["INVALID_SESSION_COOKIE"] = "invalid_session_cookie";
    AuthenticateWithSessionCookieFailureReason2["NO_SESSION_COOKIE_PROVIDED"] = "no_session_cookie_provided";
  })(AuthenticateWithSessionCookieFailureReason || (authenticateWithSessionCookie_interface.AuthenticateWithSessionCookieFailureReason = AuthenticateWithSessionCookieFailureReason = {}));
  return authenticateWithSessionCookie_interface;
}
var refreshAndSealSessionData_interface = {};
var hasRequiredRefreshAndSealSessionData_interface;
function requireRefreshAndSealSessionData_interface() {
  if (hasRequiredRefreshAndSealSessionData_interface) return refreshAndSealSessionData_interface;
  hasRequiredRefreshAndSealSessionData_interface = 1;
  Object.defineProperty(refreshAndSealSessionData_interface, "__esModule", { value: true });
  refreshAndSealSessionData_interface.RefreshAndSealSessionDataFailureReason = void 0;
  var RefreshAndSealSessionDataFailureReason;
  (function(RefreshAndSealSessionDataFailureReason2) {
    RefreshAndSealSessionDataFailureReason2["INVALID_SESSION_COOKE"] = "invalid_session_cookie";
    RefreshAndSealSessionDataFailureReason2["INVALID_SESSION_COOKIE"] = "invalid_session_cookie";
    RefreshAndSealSessionDataFailureReason2["NO_SESSION_COOKIE_PROVIDED"] = "no_session_cookie_provided";
    RefreshAndSealSessionDataFailureReason2["INVALID_GRANT"] = "invalid_grant";
    RefreshAndSealSessionDataFailureReason2["MFA_ENROLLMENT"] = "mfa_enrollment";
    RefreshAndSealSessionDataFailureReason2["SSO_REQUIRED"] = "sso_required";
    RefreshAndSealSessionDataFailureReason2["ORGANIZATION_NOT_AUTHORIZED"] = "organization_not_authorized";
  })(RefreshAndSealSessionDataFailureReason || (refreshAndSealSessionData_interface.RefreshAndSealSessionDataFailureReason = RefreshAndSealSessionDataFailureReason = {}));
  return refreshAndSealSessionData_interface;
}
var revokeSessionOptions_interface = {};
var hasRequiredRevokeSessionOptions_interface;
function requireRevokeSessionOptions_interface() {
  if (hasRequiredRevokeSessionOptions_interface) return revokeSessionOptions_interface;
  hasRequiredRevokeSessionOptions_interface = 1;
  Object.defineProperty(revokeSessionOptions_interface, "__esModule", { value: true });
  revokeSessionOptions_interface.serializeRevokeSessionOptions = void 0;
  const serializeRevokeSessionOptions = (options) => ({
    session_id: options.sessionId
  });
  revokeSessionOptions_interface.serializeRevokeSessionOptions = serializeRevokeSessionOptions;
  return revokeSessionOptions_interface;
}
var authenticateWithEmailVerification_serializer = {};
var hasRequiredAuthenticateWithEmailVerification_serializer;
function requireAuthenticateWithEmailVerification_serializer() {
  if (hasRequiredAuthenticateWithEmailVerification_serializer) return authenticateWithEmailVerification_serializer;
  hasRequiredAuthenticateWithEmailVerification_serializer = 1;
  Object.defineProperty(authenticateWithEmailVerification_serializer, "__esModule", { value: true });
  authenticateWithEmailVerification_serializer.serializeAuthenticateWithEmailVerificationOptions = void 0;
  const serializeAuthenticateWithEmailVerificationOptions = (options) => ({
    grant_type: "urn:workos:oauth:grant-type:email-verification:code",
    client_id: options.clientId,
    client_secret: options.clientSecret,
    pending_authentication_token: options.pendingAuthenticationToken,
    code: options.code,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithEmailVerification_serializer.serializeAuthenticateWithEmailVerificationOptions = serializeAuthenticateWithEmailVerificationOptions;
  return authenticateWithEmailVerification_serializer;
}
var authenticateWithOrganizationSelectionOptions_serializer = {};
var hasRequiredAuthenticateWithOrganizationSelectionOptions_serializer;
function requireAuthenticateWithOrganizationSelectionOptions_serializer() {
  if (hasRequiredAuthenticateWithOrganizationSelectionOptions_serializer) return authenticateWithOrganizationSelectionOptions_serializer;
  hasRequiredAuthenticateWithOrganizationSelectionOptions_serializer = 1;
  Object.defineProperty(authenticateWithOrganizationSelectionOptions_serializer, "__esModule", { value: true });
  authenticateWithOrganizationSelectionOptions_serializer.serializeAuthenticateWithOrganizationSelectionOptions = void 0;
  const serializeAuthenticateWithOrganizationSelectionOptions = (options) => ({
    grant_type: "urn:workos:oauth:grant-type:organization-selection",
    client_id: options.clientId,
    client_secret: options.clientSecret,
    pending_authentication_token: options.pendingAuthenticationToken,
    organization_id: options.organizationId,
    ip_address: options.ipAddress,
    user_agent: options.userAgent
  });
  authenticateWithOrganizationSelectionOptions_serializer.serializeAuthenticateWithOrganizationSelectionOptions = serializeAuthenticateWithOrganizationSelectionOptions;
  return authenticateWithOrganizationSelectionOptions_serializer;
}
var createOrganizationMembershipOptions_serializer = {};
var hasRequiredCreateOrganizationMembershipOptions_serializer;
function requireCreateOrganizationMembershipOptions_serializer() {
  if (hasRequiredCreateOrganizationMembershipOptions_serializer) return createOrganizationMembershipOptions_serializer;
  hasRequiredCreateOrganizationMembershipOptions_serializer = 1;
  Object.defineProperty(createOrganizationMembershipOptions_serializer, "__esModule", { value: true });
  createOrganizationMembershipOptions_serializer.serializeCreateOrganizationMembershipOptions = void 0;
  const serializeCreateOrganizationMembershipOptions = (options) => ({
    organization_id: options.organizationId,
    user_id: options.userId,
    role_slug: options.roleSlug,
    role_slugs: options.roleSlugs
  });
  createOrganizationMembershipOptions_serializer.serializeCreateOrganizationMembershipOptions = serializeCreateOrganizationMembershipOptions;
  return createOrganizationMembershipOptions_serializer;
}
var identity_serializer = {};
var hasRequiredIdentity_serializer;
function requireIdentity_serializer() {
  if (hasRequiredIdentity_serializer) return identity_serializer;
  hasRequiredIdentity_serializer = 1;
  Object.defineProperty(identity_serializer, "__esModule", { value: true });
  identity_serializer.deserializeIdentities = void 0;
  const deserializeIdentities = (identities) => {
    return identities.map((identity) => {
      return {
        idpId: identity.idp_id,
        type: identity.type,
        provider: identity.provider
      };
    });
  };
  identity_serializer.deserializeIdentities = deserializeIdentities;
  return identity_serializer;
}
var listInvitationsOptions_serializer = {};
var hasRequiredListInvitationsOptions_serializer;
function requireListInvitationsOptions_serializer() {
  if (hasRequiredListInvitationsOptions_serializer) return listInvitationsOptions_serializer;
  hasRequiredListInvitationsOptions_serializer = 1;
  Object.defineProperty(listInvitationsOptions_serializer, "__esModule", { value: true });
  listInvitationsOptions_serializer.serializeListInvitationsOptions = void 0;
  const serializeListInvitationsOptions = (options) => ({
    email: options.email,
    organization_id: options.organizationId,
    limit: options.limit,
    before: options.before,
    after: options.after,
    order: options.order
  });
  listInvitationsOptions_serializer.serializeListInvitationsOptions = serializeListInvitationsOptions;
  return listInvitationsOptions_serializer;
}
var listOrganizationMembershipsOptions_serializer = {};
var hasRequiredListOrganizationMembershipsOptions_serializer;
function requireListOrganizationMembershipsOptions_serializer() {
  if (hasRequiredListOrganizationMembershipsOptions_serializer) return listOrganizationMembershipsOptions_serializer;
  hasRequiredListOrganizationMembershipsOptions_serializer = 1;
  Object.defineProperty(listOrganizationMembershipsOptions_serializer, "__esModule", { value: true });
  listOrganizationMembershipsOptions_serializer.serializeListOrganizationMembershipsOptions = void 0;
  const serializeListOrganizationMembershipsOptions = (options) => {
    var _a;
    return {
      user_id: options.userId,
      organization_id: options.organizationId,
      statuses: (_a = options.statuses) === null || _a === void 0 ? void 0 : _a.join(","),
      limit: options.limit,
      before: options.before,
      after: options.after,
      order: options.order
    };
  };
  listOrganizationMembershipsOptions_serializer.serializeListOrganizationMembershipsOptions = serializeListOrganizationMembershipsOptions;
  return listOrganizationMembershipsOptions_serializer;
}
var listUsersOptions_serializer = {};
var hasRequiredListUsersOptions_serializer;
function requireListUsersOptions_serializer() {
  if (hasRequiredListUsersOptions_serializer) return listUsersOptions_serializer;
  hasRequiredListUsersOptions_serializer = 1;
  Object.defineProperty(listUsersOptions_serializer, "__esModule", { value: true });
  listUsersOptions_serializer.serializeListUsersOptions = void 0;
  const serializeListUsersOptions = (options) => ({
    email: options.email,
    organization_id: options.organizationId,
    limit: options.limit,
    before: options.before,
    after: options.after,
    order: options.order
  });
  listUsersOptions_serializer.serializeListUsersOptions = serializeListUsersOptions;
  return listUsersOptions_serializer;
}
var sendInvitationOptions_serializer = {};
var hasRequiredSendInvitationOptions_serializer;
function requireSendInvitationOptions_serializer() {
  if (hasRequiredSendInvitationOptions_serializer) return sendInvitationOptions_serializer;
  hasRequiredSendInvitationOptions_serializer = 1;
  Object.defineProperty(sendInvitationOptions_serializer, "__esModule", { value: true });
  sendInvitationOptions_serializer.serializeSendInvitationOptions = void 0;
  const serializeSendInvitationOptions = (options) => ({
    email: options.email,
    organization_id: options.organizationId,
    expires_in_days: options.expiresInDays,
    inviter_user_id: options.inviterUserId,
    role_slug: options.roleSlug
  });
  sendInvitationOptions_serializer.serializeSendInvitationOptions = serializeSendInvitationOptions;
  return sendInvitationOptions_serializer;
}
var updateOrganizationMembershipOptions_serializer = {};
var hasRequiredUpdateOrganizationMembershipOptions_serializer;
function requireUpdateOrganizationMembershipOptions_serializer() {
  if (hasRequiredUpdateOrganizationMembershipOptions_serializer) return updateOrganizationMembershipOptions_serializer;
  hasRequiredUpdateOrganizationMembershipOptions_serializer = 1;
  Object.defineProperty(updateOrganizationMembershipOptions_serializer, "__esModule", { value: true });
  updateOrganizationMembershipOptions_serializer.serializeUpdateOrganizationMembershipOptions = void 0;
  const serializeUpdateOrganizationMembershipOptions = (options) => ({
    role_slug: options.roleSlug,
    role_slugs: options.roleSlugs
  });
  updateOrganizationMembershipOptions_serializer.serializeUpdateOrganizationMembershipOptions = serializeUpdateOrganizationMembershipOptions;
  return updateOrganizationMembershipOptions_serializer;
}
var session = {};
var interfaces$c = {};
var authenticateWithCodeOptions_interface = {};
var hasRequiredAuthenticateWithCodeOptions_interface;
function requireAuthenticateWithCodeOptions_interface() {
  if (hasRequiredAuthenticateWithCodeOptions_interface) return authenticateWithCodeOptions_interface;
  hasRequiredAuthenticateWithCodeOptions_interface = 1;
  Object.defineProperty(authenticateWithCodeOptions_interface, "__esModule", { value: true });
  return authenticateWithCodeOptions_interface;
}
var authenticateWithCodeAndVerifierOptions_interface = {};
var hasRequiredAuthenticateWithCodeAndVerifierOptions_interface;
function requireAuthenticateWithCodeAndVerifierOptions_interface() {
  if (hasRequiredAuthenticateWithCodeAndVerifierOptions_interface) return authenticateWithCodeAndVerifierOptions_interface;
  hasRequiredAuthenticateWithCodeAndVerifierOptions_interface = 1;
  Object.defineProperty(authenticateWithCodeAndVerifierOptions_interface, "__esModule", { value: true });
  return authenticateWithCodeAndVerifierOptions_interface;
}
var authenticateWithEmailVerificationOptions_interface = {};
var hasRequiredAuthenticateWithEmailVerificationOptions_interface;
function requireAuthenticateWithEmailVerificationOptions_interface() {
  if (hasRequiredAuthenticateWithEmailVerificationOptions_interface) return authenticateWithEmailVerificationOptions_interface;
  hasRequiredAuthenticateWithEmailVerificationOptions_interface = 1;
  Object.defineProperty(authenticateWithEmailVerificationOptions_interface, "__esModule", { value: true });
  return authenticateWithEmailVerificationOptions_interface;
}
var authenticateWithMagicAuthOptions_interface = {};
var hasRequiredAuthenticateWithMagicAuthOptions_interface;
function requireAuthenticateWithMagicAuthOptions_interface() {
  if (hasRequiredAuthenticateWithMagicAuthOptions_interface) return authenticateWithMagicAuthOptions_interface;
  hasRequiredAuthenticateWithMagicAuthOptions_interface = 1;
  Object.defineProperty(authenticateWithMagicAuthOptions_interface, "__esModule", { value: true });
  return authenticateWithMagicAuthOptions_interface;
}
var authenticateWithOptionsBase_interface = {};
var hasRequiredAuthenticateWithOptionsBase_interface;
function requireAuthenticateWithOptionsBase_interface() {
  if (hasRequiredAuthenticateWithOptionsBase_interface) return authenticateWithOptionsBase_interface;
  hasRequiredAuthenticateWithOptionsBase_interface = 1;
  Object.defineProperty(authenticateWithOptionsBase_interface, "__esModule", { value: true });
  return authenticateWithOptionsBase_interface;
}
var authenticateWithOrganizationSelection_interface = {};
var hasRequiredAuthenticateWithOrganizationSelection_interface;
function requireAuthenticateWithOrganizationSelection_interface() {
  if (hasRequiredAuthenticateWithOrganizationSelection_interface) return authenticateWithOrganizationSelection_interface;
  hasRequiredAuthenticateWithOrganizationSelection_interface = 1;
  Object.defineProperty(authenticateWithOrganizationSelection_interface, "__esModule", { value: true });
  return authenticateWithOrganizationSelection_interface;
}
var authenticateWithPasswordOptions_interface = {};
var hasRequiredAuthenticateWithPasswordOptions_interface;
function requireAuthenticateWithPasswordOptions_interface() {
  if (hasRequiredAuthenticateWithPasswordOptions_interface) return authenticateWithPasswordOptions_interface;
  hasRequiredAuthenticateWithPasswordOptions_interface = 1;
  Object.defineProperty(authenticateWithPasswordOptions_interface, "__esModule", { value: true });
  return authenticateWithPasswordOptions_interface;
}
var authenticateWithRefreshTokenOptions_interface = {};
var hasRequiredAuthenticateWithRefreshTokenOptions_interface;
function requireAuthenticateWithRefreshTokenOptions_interface() {
  if (hasRequiredAuthenticateWithRefreshTokenOptions_interface) return authenticateWithRefreshTokenOptions_interface;
  hasRequiredAuthenticateWithRefreshTokenOptions_interface = 1;
  Object.defineProperty(authenticateWithRefreshTokenOptions_interface, "__esModule", { value: true });
  return authenticateWithRefreshTokenOptions_interface;
}
var authenticateWithTotpOptions_interface = {};
var hasRequiredAuthenticateWithTotpOptions_interface;
function requireAuthenticateWithTotpOptions_interface() {
  if (hasRequiredAuthenticateWithTotpOptions_interface) return authenticateWithTotpOptions_interface;
  hasRequiredAuthenticateWithTotpOptions_interface = 1;
  Object.defineProperty(authenticateWithTotpOptions_interface, "__esModule", { value: true });
  return authenticateWithTotpOptions_interface;
}
var authenticationEvent_interface = {};
var hasRequiredAuthenticationEvent_interface;
function requireAuthenticationEvent_interface() {
  if (hasRequiredAuthenticationEvent_interface) return authenticationEvent_interface;
  hasRequiredAuthenticationEvent_interface = 1;
  Object.defineProperty(authenticationEvent_interface, "__esModule", { value: true });
  return authenticationEvent_interface;
}
var authenticationRadarRiskDetectedEvent_interface = {};
var hasRequiredAuthenticationRadarRiskDetectedEvent_interface;
function requireAuthenticationRadarRiskDetectedEvent_interface() {
  if (hasRequiredAuthenticationRadarRiskDetectedEvent_interface) return authenticationRadarRiskDetectedEvent_interface;
  hasRequiredAuthenticationRadarRiskDetectedEvent_interface = 1;
  Object.defineProperty(authenticationRadarRiskDetectedEvent_interface, "__esModule", { value: true });
  return authenticationRadarRiskDetectedEvent_interface;
}
var authenticationResponse_interface = {};
var hasRequiredAuthenticationResponse_interface;
function requireAuthenticationResponse_interface() {
  if (hasRequiredAuthenticationResponse_interface) return authenticationResponse_interface;
  hasRequiredAuthenticationResponse_interface = 1;
  Object.defineProperty(authenticationResponse_interface, "__esModule", { value: true });
  return authenticationResponse_interface;
}
var authorizationUrlOptions_interface$1 = {};
var hasRequiredAuthorizationUrlOptions_interface$1;
function requireAuthorizationUrlOptions_interface$1() {
  if (hasRequiredAuthorizationUrlOptions_interface$1) return authorizationUrlOptions_interface$1;
  hasRequiredAuthorizationUrlOptions_interface$1 = 1;
  Object.defineProperty(authorizationUrlOptions_interface$1, "__esModule", { value: true });
  return authorizationUrlOptions_interface$1;
}
var createMagicAuthOptions_interface = {};
var hasRequiredCreateMagicAuthOptions_interface;
function requireCreateMagicAuthOptions_interface() {
  if (hasRequiredCreateMagicAuthOptions_interface) return createMagicAuthOptions_interface;
  hasRequiredCreateMagicAuthOptions_interface = 1;
  Object.defineProperty(createMagicAuthOptions_interface, "__esModule", { value: true });
  return createMagicAuthOptions_interface;
}
var createOrganizationMembershipOptions_interface = {};
var hasRequiredCreateOrganizationMembershipOptions_interface;
function requireCreateOrganizationMembershipOptions_interface() {
  if (hasRequiredCreateOrganizationMembershipOptions_interface) return createOrganizationMembershipOptions_interface;
  hasRequiredCreateOrganizationMembershipOptions_interface = 1;
  Object.defineProperty(createOrganizationMembershipOptions_interface, "__esModule", { value: true });
  return createOrganizationMembershipOptions_interface;
}
var createPasswordResetOptions_interface = {};
var hasRequiredCreatePasswordResetOptions_interface;
function requireCreatePasswordResetOptions_interface() {
  if (hasRequiredCreatePasswordResetOptions_interface) return createPasswordResetOptions_interface;
  hasRequiredCreatePasswordResetOptions_interface = 1;
  Object.defineProperty(createPasswordResetOptions_interface, "__esModule", { value: true });
  return createPasswordResetOptions_interface;
}
var createUserOptions_interface = {};
var hasRequiredCreateUserOptions_interface;
function requireCreateUserOptions_interface() {
  if (hasRequiredCreateUserOptions_interface) return createUserOptions_interface;
  hasRequiredCreateUserOptions_interface = 1;
  Object.defineProperty(createUserOptions_interface, "__esModule", { value: true });
  return createUserOptions_interface;
}
var emailVerification_interface = {};
var hasRequiredEmailVerification_interface;
function requireEmailVerification_interface() {
  if (hasRequiredEmailVerification_interface) return emailVerification_interface;
  hasRequiredEmailVerification_interface = 1;
  Object.defineProperty(emailVerification_interface, "__esModule", { value: true });
  return emailVerification_interface;
}
var enrollAuthFactor_interface = {};
var hasRequiredEnrollAuthFactor_interface;
function requireEnrollAuthFactor_interface() {
  if (hasRequiredEnrollAuthFactor_interface) return enrollAuthFactor_interface;
  hasRequiredEnrollAuthFactor_interface = 1;
  Object.defineProperty(enrollAuthFactor_interface, "__esModule", { value: true });
  return enrollAuthFactor_interface;
}
var factor_interface = {};
var hasRequiredFactor_interface;
function requireFactor_interface() {
  if (hasRequiredFactor_interface) return factor_interface;
  hasRequiredFactor_interface = 1;
  Object.defineProperty(factor_interface, "__esModule", { value: true });
  return factor_interface;
}
var identity_interface = {};
var hasRequiredIdentity_interface;
function requireIdentity_interface() {
  if (hasRequiredIdentity_interface) return identity_interface;
  hasRequiredIdentity_interface = 1;
  Object.defineProperty(identity_interface, "__esModule", { value: true });
  return identity_interface;
}
var impersonator_interface = {};
var hasRequiredImpersonator_interface;
function requireImpersonator_interface() {
  if (hasRequiredImpersonator_interface) return impersonator_interface;
  hasRequiredImpersonator_interface = 1;
  Object.defineProperty(impersonator_interface, "__esModule", { value: true });
  return impersonator_interface;
}
var invitation_interface = {};
var hasRequiredInvitation_interface;
function requireInvitation_interface() {
  if (hasRequiredInvitation_interface) return invitation_interface;
  hasRequiredInvitation_interface = 1;
  Object.defineProperty(invitation_interface, "__esModule", { value: true });
  return invitation_interface;
}
var listAuthFactorsOptions_interface = {};
var hasRequiredListAuthFactorsOptions_interface;
function requireListAuthFactorsOptions_interface() {
  if (hasRequiredListAuthFactorsOptions_interface) return listAuthFactorsOptions_interface;
  hasRequiredListAuthFactorsOptions_interface = 1;
  Object.defineProperty(listAuthFactorsOptions_interface, "__esModule", { value: true });
  return listAuthFactorsOptions_interface;
}
var listInvitationsOptions_interface = {};
var hasRequiredListInvitationsOptions_interface;
function requireListInvitationsOptions_interface() {
  if (hasRequiredListInvitationsOptions_interface) return listInvitationsOptions_interface;
  hasRequiredListInvitationsOptions_interface = 1;
  Object.defineProperty(listInvitationsOptions_interface, "__esModule", { value: true });
  return listInvitationsOptions_interface;
}
var listOrganizationMembershipsOptions_interface = {};
var hasRequiredListOrganizationMembershipsOptions_interface;
function requireListOrganizationMembershipsOptions_interface() {
  if (hasRequiredListOrganizationMembershipsOptions_interface) return listOrganizationMembershipsOptions_interface;
  hasRequiredListOrganizationMembershipsOptions_interface = 1;
  Object.defineProperty(listOrganizationMembershipsOptions_interface, "__esModule", { value: true });
  return listOrganizationMembershipsOptions_interface;
}
var listSessionsOptions_interface = {};
var hasRequiredListSessionsOptions_interface;
function requireListSessionsOptions_interface() {
  if (hasRequiredListSessionsOptions_interface) return listSessionsOptions_interface;
  hasRequiredListSessionsOptions_interface = 1;
  Object.defineProperty(listSessionsOptions_interface, "__esModule", { value: true });
  return listSessionsOptions_interface;
}
var listUserFeatureFlagsOptions_interface = {};
var hasRequiredListUserFeatureFlagsOptions_interface;
function requireListUserFeatureFlagsOptions_interface() {
  if (hasRequiredListUserFeatureFlagsOptions_interface) return listUserFeatureFlagsOptions_interface;
  hasRequiredListUserFeatureFlagsOptions_interface = 1;
  Object.defineProperty(listUserFeatureFlagsOptions_interface, "__esModule", { value: true });
  return listUserFeatureFlagsOptions_interface;
}
var listUsersOptions_interface = {};
var hasRequiredListUsersOptions_interface;
function requireListUsersOptions_interface() {
  if (hasRequiredListUsersOptions_interface) return listUsersOptions_interface;
  hasRequiredListUsersOptions_interface = 1;
  Object.defineProperty(listUsersOptions_interface, "__esModule", { value: true });
  return listUsersOptions_interface;
}
var magicAuth_interface = {};
var hasRequiredMagicAuth_interface;
function requireMagicAuth_interface() {
  if (hasRequiredMagicAuth_interface) return magicAuth_interface;
  hasRequiredMagicAuth_interface = 1;
  Object.defineProperty(magicAuth_interface, "__esModule", { value: true });
  return magicAuth_interface;
}
var oauthTokens_interface = {};
var hasRequiredOauthTokens_interface;
function requireOauthTokens_interface() {
  if (hasRequiredOauthTokens_interface) return oauthTokens_interface;
  hasRequiredOauthTokens_interface = 1;
  Object.defineProperty(oauthTokens_interface, "__esModule", { value: true });
  return oauthTokens_interface;
}
var organizationMembership_interface = {};
var hasRequiredOrganizationMembership_interface;
function requireOrganizationMembership_interface() {
  if (hasRequiredOrganizationMembership_interface) return organizationMembership_interface;
  hasRequiredOrganizationMembership_interface = 1;
  Object.defineProperty(organizationMembership_interface, "__esModule", { value: true });
  return organizationMembership_interface;
}
var passwordReset_interface = {};
var hasRequiredPasswordReset_interface;
function requirePasswordReset_interface() {
  if (hasRequiredPasswordReset_interface) return passwordReset_interface;
  hasRequiredPasswordReset_interface = 1;
  Object.defineProperty(passwordReset_interface, "__esModule", { value: true });
  return passwordReset_interface;
}
var resetPasswordOptions_interface = {};
var hasRequiredResetPasswordOptions_interface;
function requireResetPasswordOptions_interface() {
  if (hasRequiredResetPasswordOptions_interface) return resetPasswordOptions_interface;
  hasRequiredResetPasswordOptions_interface = 1;
  Object.defineProperty(resetPasswordOptions_interface, "__esModule", { value: true });
  return resetPasswordOptions_interface;
}
var sendInvitationOptions_interface = {};
var hasRequiredSendInvitationOptions_interface;
function requireSendInvitationOptions_interface() {
  if (hasRequiredSendInvitationOptions_interface) return sendInvitationOptions_interface;
  hasRequiredSendInvitationOptions_interface = 1;
  Object.defineProperty(sendInvitationOptions_interface, "__esModule", { value: true });
  return sendInvitationOptions_interface;
}
var sendMagicAuthCodeOptions_interface = {};
var hasRequiredSendMagicAuthCodeOptions_interface;
function requireSendMagicAuthCodeOptions_interface() {
  if (hasRequiredSendMagicAuthCodeOptions_interface) return sendMagicAuthCodeOptions_interface;
  hasRequiredSendMagicAuthCodeOptions_interface = 1;
  Object.defineProperty(sendMagicAuthCodeOptions_interface, "__esModule", { value: true });
  return sendMagicAuthCodeOptions_interface;
}
var sendPasswordResetEmailOptions_interface = {};
var hasRequiredSendPasswordResetEmailOptions_interface;
function requireSendPasswordResetEmailOptions_interface() {
  if (hasRequiredSendPasswordResetEmailOptions_interface) return sendPasswordResetEmailOptions_interface;
  hasRequiredSendPasswordResetEmailOptions_interface = 1;
  Object.defineProperty(sendPasswordResetEmailOptions_interface, "__esModule", { value: true });
  return sendPasswordResetEmailOptions_interface;
}
var sendVerificationEmailOptions_interface = {};
var hasRequiredSendVerificationEmailOptions_interface;
function requireSendVerificationEmailOptions_interface() {
  if (hasRequiredSendVerificationEmailOptions_interface) return sendVerificationEmailOptions_interface;
  hasRequiredSendVerificationEmailOptions_interface = 1;
  Object.defineProperty(sendVerificationEmailOptions_interface, "__esModule", { value: true });
  return sendVerificationEmailOptions_interface;
}
var session_interface = {};
var hasRequiredSession_interface;
function requireSession_interface() {
  if (hasRequiredSession_interface) return session_interface;
  hasRequiredSession_interface = 1;
  Object.defineProperty(session_interface, "__esModule", { value: true });
  return session_interface;
}
var updateOrganizationMembershipOptions_interface = {};
var hasRequiredUpdateOrganizationMembershipOptions_interface;
function requireUpdateOrganizationMembershipOptions_interface() {
  if (hasRequiredUpdateOrganizationMembershipOptions_interface) return updateOrganizationMembershipOptions_interface;
  hasRequiredUpdateOrganizationMembershipOptions_interface = 1;
  Object.defineProperty(updateOrganizationMembershipOptions_interface, "__esModule", { value: true });
  return updateOrganizationMembershipOptions_interface;
}
var updateUserOptions_interface = {};
var hasRequiredUpdateUserOptions_interface;
function requireUpdateUserOptions_interface() {
  if (hasRequiredUpdateUserOptions_interface) return updateUserOptions_interface;
  hasRequiredUpdateUserOptions_interface = 1;
  Object.defineProperty(updateUserOptions_interface, "__esModule", { value: true });
  return updateUserOptions_interface;
}
var updateUserPasswordOptions_interface = {};
var hasRequiredUpdateUserPasswordOptions_interface;
function requireUpdateUserPasswordOptions_interface() {
  if (hasRequiredUpdateUserPasswordOptions_interface) return updateUserPasswordOptions_interface;
  hasRequiredUpdateUserPasswordOptions_interface = 1;
  Object.defineProperty(updateUserPasswordOptions_interface, "__esModule", { value: true });
  return updateUserPasswordOptions_interface;
}
var user_interface = {};
var hasRequiredUser_interface;
function requireUser_interface() {
  if (hasRequiredUser_interface) return user_interface;
  hasRequiredUser_interface = 1;
  Object.defineProperty(user_interface, "__esModule", { value: true });
  return user_interface;
}
var verifyEmailOptions_interface = {};
var hasRequiredVerifyEmailOptions_interface;
function requireVerifyEmailOptions_interface() {
  if (hasRequiredVerifyEmailOptions_interface) return verifyEmailOptions_interface;
  hasRequiredVerifyEmailOptions_interface = 1;
  Object.defineProperty(verifyEmailOptions_interface, "__esModule", { value: true });
  return verifyEmailOptions_interface;
}
var hasRequiredInterfaces$c;
function requireInterfaces$c() {
  if (hasRequiredInterfaces$c) return interfaces$c;
  hasRequiredInterfaces$c = 1;
  (function(exports) {
    var __createBinding = interfaces$c && interfaces$c.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$c && interfaces$c.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireAuthenticateWithCodeOptions_interface(), exports);
    __exportStar(requireAuthenticateWithCodeAndVerifierOptions_interface(), exports);
    __exportStar(requireAuthenticateWithEmailVerificationOptions_interface(), exports);
    __exportStar(requireAuthenticateWithMagicAuthOptions_interface(), exports);
    __exportStar(requireAuthenticateWithOptionsBase_interface(), exports);
    __exportStar(requireAuthenticateWithOrganizationSelection_interface(), exports);
    __exportStar(requireAuthenticateWithPasswordOptions_interface(), exports);
    __exportStar(requireAuthenticateWithRefreshTokenOptions_interface(), exports);
    __exportStar(requireAuthenticateWithSessionCookie_interface(), exports);
    __exportStar(requireAuthenticateWithTotpOptions_interface(), exports);
    __exportStar(requireAuthenticationEvent_interface(), exports);
    __exportStar(requireAuthenticationRadarRiskDetectedEvent_interface(), exports);
    __exportStar(requireAuthenticationResponse_interface(), exports);
    __exportStar(requireAuthorizationUrlOptions_interface$1(), exports);
    __exportStar(requireCreateMagicAuthOptions_interface(), exports);
    __exportStar(requireCreateOrganizationMembershipOptions_interface(), exports);
    __exportStar(requireCreatePasswordResetOptions_interface(), exports);
    __exportStar(requireCreateUserOptions_interface(), exports);
    __exportStar(requireEmailVerification_interface(), exports);
    __exportStar(requireEnrollAuthFactor_interface(), exports);
    __exportStar(requireFactor_interface(), exports);
    __exportStar(requireIdentity_interface(), exports);
    __exportStar(requireImpersonator_interface(), exports);
    __exportStar(requireInvitation_interface(), exports);
    __exportStar(requireListAuthFactorsOptions_interface(), exports);
    __exportStar(requireListInvitationsOptions_interface(), exports);
    __exportStar(requireListOrganizationMembershipsOptions_interface(), exports);
    __exportStar(requireListSessionsOptions_interface(), exports);
    __exportStar(requireListUserFeatureFlagsOptions_interface(), exports);
    __exportStar(requireListUsersOptions_interface(), exports);
    __exportStar(requireMagicAuth_interface(), exports);
    __exportStar(requireOauthTokens_interface(), exports);
    __exportStar(requireOrganizationMembership_interface(), exports);
    __exportStar(requirePasswordReset_interface(), exports);
    __exportStar(requireRefreshAndSealSessionData_interface(), exports);
    __exportStar(requireResetPasswordOptions_interface(), exports);
    __exportStar(requireRevokeSessionOptions_interface(), exports);
    __exportStar(requireSendInvitationOptions_interface(), exports);
    __exportStar(requireSendMagicAuthCodeOptions_interface(), exports);
    __exportStar(requireSendPasswordResetEmailOptions_interface(), exports);
    __exportStar(requireSendVerificationEmailOptions_interface(), exports);
    __exportStar(requireSession_interface(), exports);
    __exportStar(requireUpdateOrganizationMembershipOptions_interface(), exports);
    __exportStar(requireUpdateUserOptions_interface(), exports);
    __exportStar(requireUpdateUserPasswordOptions_interface(), exports);
    __exportStar(requireUser_interface(), exports);
    __exportStar(requireVerifyEmailOptions_interface(), exports);
  })(interfaces$c);
  return interfaces$c;
}
var hasRequiredSession;
function requireSession() {
  if (hasRequiredSession) return session;
  hasRequiredSession = 1;
  var __awaiter = session && session.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(session, "__esModule", { value: true });
  session.CookieSession = void 0;
  const jose_1 = require$$0$3;
  const oauth_exception_1 = requireOauth_exception();
  const interfaces_1 = requireInterfaces$c();
  class CookieSession {
    constructor(userManagement2, sessionData, cookiePassword) {
      if (!cookiePassword) {
        throw new Error("cookiePassword is required");
      }
      this.userManagement = userManagement2;
      this.ironSessionProvider = userManagement2.ironSessionProvider;
      this.cookiePassword = cookiePassword;
      this.sessionData = sessionData;
      this.jwks = this.userManagement.jwks;
    }
    /**
     * Authenticates a user with a session cookie.
     *
     * @returns An object indicating whether the authentication was successful or not. If successful, it will include the user's session data.
     */
    authenticate() {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.sessionData) {
          return {
            authenticated: false,
            reason: interfaces_1.AuthenticateWithSessionCookieFailureReason.NO_SESSION_COOKIE_PROVIDED
          };
        }
        let session2;
        try {
          session2 = yield this.ironSessionProvider.unsealData(this.sessionData, {
            password: this.cookiePassword
          });
        } catch (e) {
          return {
            authenticated: false,
            reason: interfaces_1.AuthenticateWithSessionCookieFailureReason.INVALID_SESSION_COOKIE
          };
        }
        if (!session2.accessToken) {
          return {
            authenticated: false,
            reason: interfaces_1.AuthenticateWithSessionCookieFailureReason.INVALID_SESSION_COOKIE
          };
        }
        if (!(yield this.isValidJwt(session2.accessToken))) {
          return {
            authenticated: false,
            reason: interfaces_1.AuthenticateWithSessionCookieFailureReason.INVALID_JWT
          };
        }
        const { sid: sessionId, org_id: organizationId, role, roles, permissions, entitlements, feature_flags: featureFlags } = (0, jose_1.decodeJwt)(session2.accessToken);
        return {
          authenticated: true,
          sessionId,
          organizationId,
          role,
          roles,
          permissions,
          entitlements,
          featureFlags,
          user: session2.user,
          impersonator: session2.impersonator,
          accessToken: session2.accessToken
        };
      });
    }
    /**
     * Refreshes the user's session.
     *
     * @param options - Optional options for refreshing the session.
     * @param options.cookiePassword - The password to use for the new session cookie.
     * @param options.organizationId - The organization ID to use for the new session cookie.
     * @returns An object indicating whether the refresh was successful or not. If successful, it will include the new sealed session data.
     */
    refresh(options = {}) {
      var _a, _b;
      return __awaiter(this, void 0, void 0, function* () {
        const session2 = yield this.ironSessionProvider.unsealData(this.sessionData, {
          password: this.cookiePassword
        });
        if (!session2.refreshToken || !session2.user) {
          return {
            authenticated: false,
            reason: interfaces_1.RefreshAndSealSessionDataFailureReason.INVALID_SESSION_COOKIE
          };
        }
        const { org_id: organizationIdFromAccessToken } = (0, jose_1.decodeJwt)(session2.accessToken);
        try {
          const cookiePassword = (_a = options.cookiePassword) !== null && _a !== void 0 ? _a : this.cookiePassword;
          const authenticationResponse = yield this.userManagement.authenticateWithRefreshToken({
            clientId: this.userManagement.clientId,
            refreshToken: session2.refreshToken,
            organizationId: (_b = options.organizationId) !== null && _b !== void 0 ? _b : organizationIdFromAccessToken,
            session: {
              // We want to store the new sealed session in this class instance, so this always needs to be true
              sealSession: true,
              cookiePassword
            }
          });
          if (options.cookiePassword) {
            this.cookiePassword = options.cookiePassword;
          }
          this.sessionData = authenticationResponse.sealedSession;
          const { sid: sessionId, org_id: organizationId, role, roles, permissions, entitlements, feature_flags: featureFlags } = (0, jose_1.decodeJwt)(authenticationResponse.accessToken);
          return {
            authenticated: true,
            sealedSession: authenticationResponse.sealedSession,
            session: authenticationResponse,
            sessionId,
            organizationId,
            role,
            roles,
            permissions,
            entitlements,
            featureFlags,
            user: session2.user,
            impersonator: session2.impersonator
          };
        } catch (error) {
          if (error instanceof oauth_exception_1.OauthException && // TODO: Add additional known errors and remove re-throw
          (error.error === interfaces_1.RefreshAndSealSessionDataFailureReason.INVALID_GRANT || error.error === interfaces_1.RefreshAndSealSessionDataFailureReason.MFA_ENROLLMENT || error.error === interfaces_1.RefreshAndSealSessionDataFailureReason.SSO_REQUIRED)) {
            return {
              authenticated: false,
              reason: error.error
            };
          }
          throw error;
        }
      });
    }
    /**
     * Gets the URL to redirect the user to for logging out.
     *
     * @returns The URL to redirect the user to for logging out.
     */
    getLogoutUrl({ returnTo } = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const authenticationResponse = yield this.authenticate();
        if (!authenticationResponse.authenticated) {
          const { reason } = authenticationResponse;
          throw new Error(`Failed to extract session ID for logout URL: ${reason}`);
        }
        return this.userManagement.getLogoutUrl({
          sessionId: authenticationResponse.sessionId,
          returnTo
        });
      });
    }
    isValidJwt(accessToken) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.jwks) {
          throw new Error("Missing client ID. Did you provide it when initializing WorkOS?");
        }
        try {
          yield (0, jose_1.jwtVerify)(accessToken, this.jwks);
          return true;
        } catch (e) {
          return false;
        }
      });
    }
  }
  session.CookieSession = CookieSession;
  return session;
}
var hasRequiredUserManagement;
function requireUserManagement() {
  if (hasRequiredUserManagement) return userManagement;
  hasRequiredUserManagement = 1;
  var define_process_env_default2 = {};
  var __awaiter = userManagement && userManagement.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __rest = userManagement && userManagement.__rest || function(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  };
  var __importDefault = userManagement && userManagement.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(userManagement, "__esModule", { value: true });
  userManagement.UserManagement = void 0;
  const jose_1 = require$$0$3;
  const qs_1 = __importDefault(require$$0$2);
  const oauth_exception_1 = requireOauth_exception();
  const fetch_and_deserialize_1 = requireFetchAndDeserialize();
  const pagination_1 = requirePagination();
  const serializers_1 = requireSerializers$2();
  const feature_flag_serializer_1 = requireFeatureFlag_serializer();
  const authenticate_with_session_cookie_interface_1 = requireAuthenticateWithSessionCookie_interface();
  const refresh_and_seal_session_data_interface_1 = requireRefreshAndSealSessionData_interface();
  const revoke_session_options_interface_1 = requireRevokeSessionOptions_interface();
  const serializers_2 = requireSerializers$8();
  const authenticate_with_email_verification_serializer_1 = requireAuthenticateWithEmailVerification_serializer();
  const authenticate_with_organization_selection_options_serializer_1 = requireAuthenticateWithOrganizationSelectionOptions_serializer();
  const create_organization_membership_options_serializer_1 = requireCreateOrganizationMembershipOptions_serializer();
  const factor_serializer_1 = requireFactor_serializer$1();
  const identity_serializer_1 = requireIdentity_serializer();
  const invitation_serializer_1 = requireInvitation_serializer();
  const list_invitations_options_serializer_1 = requireListInvitationsOptions_serializer();
  const list_organization_memberships_options_serializer_1 = requireListOrganizationMembershipsOptions_serializer();
  const list_users_options_serializer_1 = requireListUsersOptions_serializer();
  const organization_membership_serializer_1 = requireOrganizationMembership_serializer();
  const send_invitation_options_serializer_1 = requireSendInvitationOptions_serializer();
  const update_organization_membership_options_serializer_1 = requireUpdateOrganizationMembershipOptions_serializer();
  const session_1 = requireSession();
  const toQueryString = (options) => {
    return qs_1.default.stringify(options, {
      arrayFormat: "repeat",
      // sorts the keys alphabetically to maintain backwards compatibility
      sort: (a, b) => a.localeCompare(b),
      // encodes space as + instead of %20 to maintain backwards compatibility
      format: "RFC1738"
    });
  };
  class UserManagement {
    constructor(workos2, ironSessionProvider2) {
      this.workos = workos2;
      const { clientId } = workos2.options;
      this.clientId = clientId;
      this.ironSessionProvider = ironSessionProvider2;
    }
    get jwks() {
      var _a;
      if (!this.clientId) {
        return;
      }
      (_a = this._jwks) !== null && _a !== void 0 ? _a : this._jwks = (0, jose_1.createRemoteJWKSet)(new URL(this.getJwksUrl(this.clientId)), {
        cooldownDuration: 1e3 * 60 * 5
      });
      return this._jwks;
    }
    /**
     * Loads a sealed session using the provided session data and cookie password.
     *
     * @param options - The options for loading the sealed session.
     * @param options.sessionData - The sealed session data.
     * @param options.cookiePassword - The password used to encrypt the session data.
     * @returns The session class.
     */
    loadSealedSession(options) {
      return new session_1.CookieSession(this, options.sessionData, options.cookiePassword);
    }
    getUser(userId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/users/${userId}`);
        return (0, serializers_2.deserializeUser)(data);
      });
    }
    getUserByExternalId(externalId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/users/external_id/${externalId}`);
        return (0, serializers_2.deserializeUser)(data);
      });
    }
    listUsers(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/user_management/users", serializers_2.deserializeUser, options ? (0, list_users_options_serializer_1.serializeListUsersOptions)(options) : void 0), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/user_management/users", serializers_2.deserializeUser, params), options ? (0, list_users_options_serializer_1.serializeListUsersOptions)(options) : void 0);
      });
    }
    createUser(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/user_management/users", (0, serializers_2.serializeCreateUserOptions)(payload));
        return (0, serializers_2.deserializeUser)(data);
      });
    }
    authenticateWithMagicAuth(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, serializers_2.serializeAuthenticateWithMagicAuthOptions)(Object.assign(Object.assign({}, remainingPayload), { clientSecret: this.workos.key })));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithPassword(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, serializers_2.serializeAuthenticateWithPasswordOptions)(Object.assign(Object.assign({}, remainingPayload), { clientSecret: this.workos.key })));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithCode(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, serializers_2.serializeAuthenticateWithCodeOptions)(Object.assign(Object.assign({}, remainingPayload), { clientSecret: this.workos.key })));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithCodeAndVerifier(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, serializers_2.serializeAuthenticateWithCodeAndVerifierOptions)(remainingPayload));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithRefreshToken(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, serializers_2.serializeAuthenticateWithRefreshTokenOptions)(Object.assign(Object.assign({}, remainingPayload), { clientSecret: this.workos.key })));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithTotp(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, serializers_2.serializeAuthenticateWithTotpOptions)(Object.assign(Object.assign({}, remainingPayload), { clientSecret: this.workos.key })));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithEmailVerification(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, authenticate_with_email_verification_serializer_1.serializeAuthenticateWithEmailVerificationOptions)(Object.assign(Object.assign({}, remainingPayload), { clientSecret: this.workos.key })));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithOrganizationSelection(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { session: session2 } = payload, remainingPayload = __rest(payload, ["session"]);
        const { data } = yield this.workos.post("/user_management/authenticate", (0, authenticate_with_organization_selection_options_serializer_1.serializeAuthenticateWithOrganizationSelectionOptions)(Object.assign(Object.assign({}, remainingPayload), { clientSecret: this.workos.key })));
        return this.prepareAuthenticationResponse({
          authenticationResponse: (0, serializers_2.deserializeAuthenticationResponse)(data),
          session: session2
        });
      });
    }
    authenticateWithSessionCookie({ sessionData, cookiePassword = define_process_env_default2.WORKOS_COOKIE_PASSWORD }) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!cookiePassword) {
          throw new Error("Cookie password is required");
        }
        if (!this.jwks) {
          throw new Error("Must provide clientId to initialize JWKS");
        }
        if (!sessionData) {
          return {
            authenticated: false,
            reason: authenticate_with_session_cookie_interface_1.AuthenticateWithSessionCookieFailureReason.NO_SESSION_COOKIE_PROVIDED
          };
        }
        const session2 = yield this.ironSessionProvider.unsealData(sessionData, {
          password: cookiePassword
        });
        if (!session2.accessToken) {
          return {
            authenticated: false,
            reason: authenticate_with_session_cookie_interface_1.AuthenticateWithSessionCookieFailureReason.INVALID_SESSION_COOKIE
          };
        }
        if (!(yield this.isValidJwt(session2.accessToken))) {
          return {
            authenticated: false,
            reason: authenticate_with_session_cookie_interface_1.AuthenticateWithSessionCookieFailureReason.INVALID_JWT
          };
        }
        const { sid: sessionId, org_id: organizationId, role, roles, permissions, entitlements, feature_flags: featureFlags } = (0, jose_1.decodeJwt)(session2.accessToken);
        return {
          authenticated: true,
          sessionId,
          organizationId,
          role,
          roles,
          user: session2.user,
          permissions,
          entitlements,
          featureFlags,
          accessToken: session2.accessToken
        };
      });
    }
    isValidJwt(accessToken) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!this.jwks) {
          throw new Error("Must provide clientId to initialize JWKS");
        }
        try {
          yield (0, jose_1.jwtVerify)(accessToken, this.jwks);
          return true;
        } catch (e) {
          return false;
        }
      });
    }
    /**
     * @deprecated This method is deprecated and will be removed in a future major version.
     * Please use the new `loadSealedSession` helper and its corresponding methods instead.
     */
    refreshAndSealSessionData({ sessionData, organizationId, cookiePassword = define_process_env_default2.WORKOS_COOKIE_PASSWORD }) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!cookiePassword) {
          throw new Error("Cookie password is required");
        }
        if (!sessionData) {
          return {
            authenticated: false,
            reason: refresh_and_seal_session_data_interface_1.RefreshAndSealSessionDataFailureReason.NO_SESSION_COOKIE_PROVIDED
          };
        }
        const session2 = yield this.ironSessionProvider.unsealData(sessionData, {
          password: cookiePassword
        });
        if (!session2.refreshToken || !session2.user) {
          return {
            authenticated: false,
            reason: refresh_and_seal_session_data_interface_1.RefreshAndSealSessionDataFailureReason.INVALID_SESSION_COOKIE
          };
        }
        const { org_id: organizationIdFromAccessToken } = (0, jose_1.decodeJwt)(session2.accessToken);
        try {
          const { sealedSession } = yield this.authenticateWithRefreshToken({
            clientId: this.workos.clientId,
            refreshToken: session2.refreshToken,
            organizationId: organizationId !== null && organizationId !== void 0 ? organizationId : organizationIdFromAccessToken,
            session: { sealSession: true, cookiePassword }
          });
          if (!sealedSession) {
            return {
              authenticated: false,
              reason: refresh_and_seal_session_data_interface_1.RefreshAndSealSessionDataFailureReason.INVALID_SESSION_COOKIE
            };
          }
          return {
            authenticated: true,
            sealedSession
          };
        } catch (error) {
          if (error instanceof oauth_exception_1.OauthException && // TODO: Add additional known errors and remove re-throw
          (error.error === refresh_and_seal_session_data_interface_1.RefreshAndSealSessionDataFailureReason.INVALID_GRANT || error.error === refresh_and_seal_session_data_interface_1.RefreshAndSealSessionDataFailureReason.MFA_ENROLLMENT || error.error === refresh_and_seal_session_data_interface_1.RefreshAndSealSessionDataFailureReason.SSO_REQUIRED)) {
            return {
              authenticated: false,
              reason: error.error
            };
          }
          throw error;
        }
      });
    }
    prepareAuthenticationResponse({ authenticationResponse, session: session2 }) {
      return __awaiter(this, void 0, void 0, function* () {
        if (session2 === null || session2 === void 0 ? void 0 : session2.sealSession) {
          return Object.assign(Object.assign({}, authenticationResponse), { sealedSession: yield this.sealSessionDataFromAuthenticationResponse({
            authenticationResponse,
            cookiePassword: session2.cookiePassword
          }) });
        }
        return authenticationResponse;
      });
    }
    sealSessionDataFromAuthenticationResponse({ authenticationResponse, cookiePassword }) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!cookiePassword) {
          throw new Error("Cookie password is required");
        }
        const { org_id: organizationIdFromAccessToken } = (0, jose_1.decodeJwt)(authenticationResponse.accessToken);
        const sessionData = {
          organizationId: organizationIdFromAccessToken,
          user: authenticationResponse.user,
          accessToken: authenticationResponse.accessToken,
          refreshToken: authenticationResponse.refreshToken,
          impersonator: authenticationResponse.impersonator
        };
        return this.ironSessionProvider.sealData(sessionData, {
          password: cookiePassword
        });
      });
    }
    getSessionFromCookie({ sessionData, cookiePassword = define_process_env_default2.WORKOS_COOKIE_PASSWORD }) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!cookiePassword) {
          throw new Error("Cookie password is required");
        }
        if (sessionData) {
          return this.ironSessionProvider.unsealData(sessionData, {
            password: cookiePassword
          });
        }
        return void 0;
      });
    }
    getEmailVerification(emailVerificationId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/email_verification/${emailVerificationId}`);
        return (0, serializers_2.deserializeEmailVerification)(data);
      });
    }
    sendVerificationEmail({ userId }) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/user_management/users/${userId}/email_verification/send`, {});
        return { user: (0, serializers_2.deserializeUser)(data.user) };
      });
    }
    getMagicAuth(magicAuthId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/magic_auth/${magicAuthId}`);
        return (0, serializers_2.deserializeMagicAuth)(data);
      });
    }
    createMagicAuth(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/user_management/magic_auth", (0, serializers_2.serializeCreateMagicAuthOptions)(Object.assign({}, options)));
        return (0, serializers_2.deserializeMagicAuth)(data);
      });
    }
    /**
     * @deprecated Please use `createMagicAuth` instead.
     * This method will be removed in a future major version.
     */
    sendMagicAuthCode(options) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.post("/user_management/magic_auth/send", (0, serializers_2.serializeSendMagicAuthCodeOptions)(options));
      });
    }
    verifyEmail({ code, userId }) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/user_management/users/${userId}/email_verification/confirm`, {
          code
        });
        return { user: (0, serializers_2.deserializeUser)(data.user) };
      });
    }
    getPasswordReset(passwordResetId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/password_reset/${passwordResetId}`);
        return (0, serializers_2.deserializePasswordReset)(data);
      });
    }
    createPasswordReset(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/user_management/password_reset", (0, serializers_2.serializeCreatePasswordResetOptions)(Object.assign({}, options)));
        return (0, serializers_2.deserializePasswordReset)(data);
      });
    }
    /**
     * @deprecated Please use `createPasswordReset` instead. This method will be removed in a future major version.
     */
    sendPasswordResetEmail(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.post("/user_management/password_reset/send", (0, serializers_2.serializeSendPasswordResetEmailOptions)(payload));
      });
    }
    resetPassword(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/user_management/password_reset/confirm", (0, serializers_2.serializeResetPasswordOptions)(payload));
        return { user: (0, serializers_2.deserializeUser)(data.user) };
      });
    }
    updateUser(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.put(`/user_management/users/${payload.userId}`, (0, serializers_2.serializeUpdateUserOptions)(payload));
        return (0, serializers_2.deserializeUser)(data);
      });
    }
    enrollAuthFactor(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/user_management/users/${payload.userId}/auth_factors`, (0, serializers_2.serializeEnrollAuthFactorOptions)(payload));
        return {
          authenticationFactor: (0, serializers_2.deserializeFactorWithSecrets)(data.authentication_factor),
          authenticationChallenge: (0, serializers_1.deserializeChallenge)(data.authentication_challenge)
        };
      });
    }
    listAuthFactors(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { userId } = options, restOfOptions = __rest(options, ["userId"]);
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/user_management/users/${userId}/auth_factors`, factor_serializer_1.deserializeFactor, restOfOptions), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/user_management/users/${userId}/auth_factors`, factor_serializer_1.deserializeFactor, params), restOfOptions);
      });
    }
    listUserFeatureFlags(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { userId } = options, paginationOptions = __rest(options, ["userId"]);
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/user_management/users/${userId}/feature-flags`, feature_flag_serializer_1.deserializeFeatureFlag, paginationOptions), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/user_management/users/${userId}/feature-flags`, feature_flag_serializer_1.deserializeFeatureFlag, params), paginationOptions);
      });
    }
    listSessions(userId, options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/user_management/users/${userId}/sessions`, serializers_2.deserializeSession, options ? (0, serializers_2.serializeListSessionsOptions)(options) : void 0), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, `/user_management/users/${userId}/sessions`, serializers_2.deserializeSession, params), options ? (0, serializers_2.serializeListSessionsOptions)(options) : void 0);
      });
    }
    deleteUser(userId) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.delete(`/user_management/users/${userId}`);
      });
    }
    getUserIdentities(userId) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!userId) {
          throw new TypeError(`Incomplete arguments. Need to specify 'userId'.`);
        }
        const { data } = yield this.workos.get(`/user_management/users/${userId}/identities`);
        return (0, identity_serializer_1.deserializeIdentities)(data);
      });
    }
    getOrganizationMembership(organizationMembershipId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/organization_memberships/${organizationMembershipId}`);
        return (0, organization_membership_serializer_1.deserializeOrganizationMembership)(data);
      });
    }
    listOrganizationMemberships(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/user_management/organization_memberships", organization_membership_serializer_1.deserializeOrganizationMembership, options ? (0, list_organization_memberships_options_serializer_1.serializeListOrganizationMembershipsOptions)(options) : void 0), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/user_management/organization_memberships", organization_membership_serializer_1.deserializeOrganizationMembership, params), options ? (0, list_organization_memberships_options_serializer_1.serializeListOrganizationMembershipsOptions)(options) : void 0);
      });
    }
    createOrganizationMembership(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/user_management/organization_memberships", (0, create_organization_membership_options_serializer_1.serializeCreateOrganizationMembershipOptions)(options));
        return (0, organization_membership_serializer_1.deserializeOrganizationMembership)(data);
      });
    }
    updateOrganizationMembership(organizationMembershipId, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.put(`/user_management/organization_memberships/${organizationMembershipId}`, (0, update_organization_membership_options_serializer_1.serializeUpdateOrganizationMembershipOptions)(options));
        return (0, organization_membership_serializer_1.deserializeOrganizationMembership)(data);
      });
    }
    deleteOrganizationMembership(organizationMembershipId) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.delete(`/user_management/organization_memberships/${organizationMembershipId}`);
      });
    }
    deactivateOrganizationMembership(organizationMembershipId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.put(`/user_management/organization_memberships/${organizationMembershipId}/deactivate`, {});
        return (0, organization_membership_serializer_1.deserializeOrganizationMembership)(data);
      });
    }
    reactivateOrganizationMembership(organizationMembershipId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.put(`/user_management/organization_memberships/${organizationMembershipId}/reactivate`, {});
        return (0, organization_membership_serializer_1.deserializeOrganizationMembership)(data);
      });
    }
    getInvitation(invitationId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/invitations/${invitationId}`);
        return (0, invitation_serializer_1.deserializeInvitation)(data);
      });
    }
    findInvitationByToken(invitationToken) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/user_management/invitations/by_token/${invitationToken}`);
        return (0, invitation_serializer_1.deserializeInvitation)(data);
      });
    }
    listInvitations(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/user_management/invitations", invitation_serializer_1.deserializeInvitation, options ? (0, list_invitations_options_serializer_1.serializeListInvitationsOptions)(options) : void 0), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/user_management/invitations", invitation_serializer_1.deserializeInvitation, params), options ? (0, list_invitations_options_serializer_1.serializeListInvitationsOptions)(options) : void 0);
      });
    }
    sendInvitation(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/user_management/invitations", (0, send_invitation_options_serializer_1.serializeSendInvitationOptions)(Object.assign({}, payload)));
        return (0, invitation_serializer_1.deserializeInvitation)(data);
      });
    }
    acceptInvitation(invitationId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/user_management/invitations/${invitationId}/accept`, null);
        return (0, invitation_serializer_1.deserializeInvitation)(data);
      });
    }
    revokeInvitation(invitationId) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/user_management/invitations/${invitationId}/revoke`, null);
        return (0, invitation_serializer_1.deserializeInvitation)(data);
      });
    }
    revokeSession(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        yield this.workos.post("/user_management/sessions/revoke", (0, revoke_session_options_interface_1.serializeRevokeSessionOptions)(payload));
      });
    }
    getAuthorizationUrl({ connectionId, codeChallenge, codeChallengeMethod, context, clientId, domainHint, loginHint, organizationId, provider, providerQueryParams, providerScopes, prompt, redirectUri, state, screenHint }) {
      if (!provider && !connectionId && !organizationId) {
        throw new TypeError(`Incomplete arguments. Need to specify either a 'connectionId', 'organizationId', or 'provider'.`);
      }
      if (provider !== "authkit" && screenHint) {
        throw new TypeError(`'screenHint' is only supported for 'authkit' provider`);
      }
      if (context) {
        this.workos.emitWarning(`\`context\` is deprecated. We previously required initiate login endpoints to return the
\`context\` query parameter when getting the authorization URL. This is no longer necessary.`);
      }
      const query = toQueryString({
        connection_id: connectionId,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        context,
        organization_id: organizationId,
        domain_hint: domainHint,
        login_hint: loginHint,
        provider,
        provider_query_params: providerQueryParams,
        provider_scopes: providerScopes,
        prompt,
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
        screen_hint: screenHint
      });
      return `${this.workos.baseURL}/user_management/authorize?${query}`;
    }
    getLogoutUrl({ sessionId, returnTo }) {
      if (!sessionId) {
        throw new TypeError(`Incomplete arguments. Need to specify 'sessionId'.`);
      }
      const url = new URL("/user_management/sessions/logout", this.workos.baseURL);
      url.searchParams.set("session_id", sessionId);
      if (returnTo) {
        url.searchParams.set("return_to", returnTo);
      }
      return url.toString();
    }
    /**
     * @deprecated This method is deprecated and will be removed in a future major version.
     * Please use the `loadSealedSession` helper and its `getLogoutUrl` method instead.
     *
     * getLogoutUrlFromSessionCookie takes in session cookie data, unseals the cookie, decodes the JWT claims,
     * and uses the session ID to generate the logout URL.
     *
     * Use this over `getLogoutUrl` if you'd like to the SDK to handle session cookies for you.
     */
    getLogoutUrlFromSessionCookie({ sessionData, cookiePassword = define_process_env_default2.WORKOS_COOKIE_PASSWORD }) {
      return __awaiter(this, void 0, void 0, function* () {
        const authenticationResponse = yield this.authenticateWithSessionCookie({
          sessionData,
          cookiePassword
        });
        if (!authenticationResponse.authenticated) {
          const { reason } = authenticationResponse;
          throw new Error(`Failed to extract session ID for logout URL: ${reason}`);
        }
        return this.getLogoutUrl({ sessionId: authenticationResponse.sessionId });
      });
    }
    getJwksUrl(clientId) {
      if (!clientId) {
        throw TypeError("clientId must be a valid clientId");
      }
      return `${this.workos.baseURL}/sso/jwks/${clientId}`;
    }
  }
  userManagement.UserManagement = UserManagement;
  return userManagement;
}
var fga = {};
var interfaces$b = {};
var checkOp_enum = {};
var hasRequiredCheckOp_enum;
function requireCheckOp_enum() {
  if (hasRequiredCheckOp_enum) return checkOp_enum;
  hasRequiredCheckOp_enum = 1;
  Object.defineProperty(checkOp_enum, "__esModule", { value: true });
  checkOp_enum.CheckOp = void 0;
  var CheckOp;
  (function(CheckOp2) {
    CheckOp2["AllOf"] = "all_of";
    CheckOp2["AnyOf"] = "any_of";
  })(CheckOp || (checkOp_enum.CheckOp = CheckOp = {}));
  return checkOp_enum;
}
var check_interface = {};
var checkOptions_serializer = {};
var interfaceCheck = {};
var hasRequiredInterfaceCheck;
function requireInterfaceCheck() {
  if (hasRequiredInterfaceCheck) return interfaceCheck;
  hasRequiredInterfaceCheck = 1;
  Object.defineProperty(interfaceCheck, "__esModule", { value: true });
  interfaceCheck.isResourceInterface = interfaceCheck.isSubject = void 0;
  function isSubject(resource) {
    return Object.prototype.hasOwnProperty.call(resource, "resourceType") && Object.prototype.hasOwnProperty.call(resource, "resourceId");
  }
  interfaceCheck.isSubject = isSubject;
  function isResourceInterface(resource) {
    return !!resource && typeof resource === "object" && "getResouceType" in resource && "getResourceId" in resource;
  }
  interfaceCheck.isResourceInterface = isResourceInterface;
  return interfaceCheck;
}
var hasRequiredCheckOptions_serializer;
function requireCheckOptions_serializer() {
  if (hasRequiredCheckOptions_serializer) return checkOptions_serializer;
  hasRequiredCheckOptions_serializer = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.deserializeDecisionTreeNode = exports.serializeCheckBatchOptions = exports.serializeCheckOptions = void 0;
    const interface_check_1 = requireInterfaceCheck();
    const serializeCheckOptions = (options) => ({
      op: options.op,
      checks: options.checks.map(serializeCheckWarrantOptions),
      debug: options.debug
    });
    exports.serializeCheckOptions = serializeCheckOptions;
    const serializeCheckBatchOptions = (options) => ({
      op: "batch",
      checks: options.checks.map(serializeCheckWarrantOptions),
      debug: options.debug
    });
    exports.serializeCheckBatchOptions = serializeCheckBatchOptions;
    const serializeCheckWarrantOptions = (warrant) => {
      var _a;
      return {
        resource_type: (0, interface_check_1.isResourceInterface)(warrant.resource) ? warrant.resource.getResourceType() : warrant.resource.resourceType,
        resource_id: (0, interface_check_1.isResourceInterface)(warrant.resource) ? warrant.resource.getResourceId() : warrant.resource.resourceId ? warrant.resource.resourceId : "",
        relation: warrant.relation,
        subject: (0, interface_check_1.isSubject)(warrant.subject) ? {
          resource_type: warrant.subject.resourceType,
          resource_id: warrant.subject.resourceId
        } : {
          resource_type: warrant.subject.getResourceType(),
          resource_id: warrant.subject.getResourceId()
        },
        context: (_a = warrant.context) !== null && _a !== void 0 ? _a : {}
      };
    };
    const deserializeDecisionTreeNode = (response) => {
      return {
        check: {
          resource: {
            resourceType: response.check.resource_type,
            resourceId: response.check.resource_id
          },
          relation: response.check.relation,
          subject: {
            resourceType: response.check.subject.resource_type,
            resourceId: response.check.subject.resource_id
          },
          context: response.check.context
        },
        policy: response.policy,
        decision: response.decision,
        processingTime: response.processing_time,
        children: response.children.map(exports.deserializeDecisionTreeNode)
      };
    };
    exports.deserializeDecisionTreeNode = deserializeDecisionTreeNode;
  })(checkOptions_serializer);
  return checkOptions_serializer;
}
var hasRequiredCheck_interface;
function requireCheck_interface() {
  if (hasRequiredCheck_interface) return check_interface;
  hasRequiredCheck_interface = 1;
  Object.defineProperty(check_interface, "__esModule", { value: true });
  check_interface.CheckResult = void 0;
  const check_options_serializer_1 = requireCheckOptions_serializer();
  const CHECK_RESULT_AUTHORIZED = "authorized";
  class CheckResult {
    constructor(json) {
      this.result = json.result;
      this.isImplicit = json.is_implicit;
      this.warrantToken = json.warrant_token;
      this.debugInfo = json.debug_info ? {
        processingTime: json.debug_info.processing_time,
        decisionTree: (0, check_options_serializer_1.deserializeDecisionTreeNode)(json.debug_info.decision_tree)
      } : void 0;
      this.warnings = json.warnings;
    }
    isAuthorized() {
      return this.result === CHECK_RESULT_AUTHORIZED;
    }
  }
  check_interface.CheckResult = CheckResult;
  return check_interface;
}
var query_interface = {};
var hasRequiredQuery_interface;
function requireQuery_interface() {
  if (hasRequiredQuery_interface) return query_interface;
  hasRequiredQuery_interface = 1;
  Object.defineProperty(query_interface, "__esModule", { value: true });
  return query_interface;
}
var resourceOp_enum = {};
var hasRequiredResourceOp_enum;
function requireResourceOp_enum() {
  if (hasRequiredResourceOp_enum) return resourceOp_enum;
  hasRequiredResourceOp_enum = 1;
  Object.defineProperty(resourceOp_enum, "__esModule", { value: true });
  resourceOp_enum.ResourceOp = void 0;
  var ResourceOp;
  (function(ResourceOp2) {
    ResourceOp2["Create"] = "create";
    ResourceOp2["Delete"] = "delete";
  })(ResourceOp || (resourceOp_enum.ResourceOp = ResourceOp = {}));
  return resourceOp_enum;
}
var resource_interface = {};
var hasRequiredResource_interface;
function requireResource_interface() {
  if (hasRequiredResource_interface) return resource_interface;
  hasRequiredResource_interface = 1;
  Object.defineProperty(resource_interface, "__esModule", { value: true });
  return resource_interface;
}
var warrantOp_enum = {};
var hasRequiredWarrantOp_enum;
function requireWarrantOp_enum() {
  if (hasRequiredWarrantOp_enum) return warrantOp_enum;
  hasRequiredWarrantOp_enum = 1;
  Object.defineProperty(warrantOp_enum, "__esModule", { value: true });
  warrantOp_enum.WarrantOp = void 0;
  var WarrantOp;
  (function(WarrantOp2) {
    WarrantOp2["Create"] = "create";
    WarrantOp2["Delete"] = "delete";
  })(WarrantOp || (warrantOp_enum.WarrantOp = WarrantOp = {}));
  return warrantOp_enum;
}
var warrantToken_interface = {};
var hasRequiredWarrantToken_interface;
function requireWarrantToken_interface() {
  if (hasRequiredWarrantToken_interface) return warrantToken_interface;
  hasRequiredWarrantToken_interface = 1;
  Object.defineProperty(warrantToken_interface, "__esModule", { value: true });
  return warrantToken_interface;
}
var warrant_interface = {};
var hasRequiredWarrant_interface;
function requireWarrant_interface() {
  if (hasRequiredWarrant_interface) return warrant_interface;
  hasRequiredWarrant_interface = 1;
  Object.defineProperty(warrant_interface, "__esModule", { value: true });
  return warrant_interface;
}
var hasRequiredInterfaces$b;
function requireInterfaces$b() {
  if (hasRequiredInterfaces$b) return interfaces$b;
  hasRequiredInterfaces$b = 1;
  (function(exports) {
    var __createBinding = interfaces$b && interfaces$b.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$b && interfaces$b.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireCheckOp_enum(), exports);
    __exportStar(requireCheck_interface(), exports);
    __exportStar(requireQuery_interface(), exports);
    __exportStar(requireResourceOp_enum(), exports);
    __exportStar(requireResource_interface(), exports);
    __exportStar(requireWarrantOp_enum(), exports);
    __exportStar(requireWarrantToken_interface(), exports);
    __exportStar(requireWarrant_interface(), exports);
  })(interfaces$b);
  return interfaces$b;
}
var serializers = {};
var batchWriteResourcesOptions_serializer = {};
var createResourceOptions_serializer = {};
var hasRequiredCreateResourceOptions_serializer;
function requireCreateResourceOptions_serializer() {
  if (hasRequiredCreateResourceOptions_serializer) return createResourceOptions_serializer;
  hasRequiredCreateResourceOptions_serializer = 1;
  Object.defineProperty(createResourceOptions_serializer, "__esModule", { value: true });
  createResourceOptions_serializer.serializeCreateResourceOptions = void 0;
  const interface_check_1 = requireInterfaceCheck();
  const serializeCreateResourceOptions = (options) => ({
    resource_type: (0, interface_check_1.isResourceInterface)(options.resource) ? options.resource.getResourceType() : options.resource.resourceType,
    resource_id: (0, interface_check_1.isResourceInterface)(options.resource) ? options.resource.getResourceId() : options.resource.resourceId ? options.resource.resourceId : "",
    meta: options.meta
  });
  createResourceOptions_serializer.serializeCreateResourceOptions = serializeCreateResourceOptions;
  return createResourceOptions_serializer;
}
var deleteResourceOptions_serializer = {};
var hasRequiredDeleteResourceOptions_serializer;
function requireDeleteResourceOptions_serializer() {
  if (hasRequiredDeleteResourceOptions_serializer) return deleteResourceOptions_serializer;
  hasRequiredDeleteResourceOptions_serializer = 1;
  Object.defineProperty(deleteResourceOptions_serializer, "__esModule", { value: true });
  deleteResourceOptions_serializer.serializeDeleteResourceOptions = void 0;
  const interface_check_1 = requireInterfaceCheck();
  const serializeDeleteResourceOptions = (options) => ({
    resource_type: (0, interface_check_1.isResourceInterface)(options) ? options.getResourceType() : options.resourceType,
    resource_id: (0, interface_check_1.isResourceInterface)(options) ? options.getResourceId() : options.resourceId ? options.resourceId : ""
  });
  deleteResourceOptions_serializer.serializeDeleteResourceOptions = serializeDeleteResourceOptions;
  return deleteResourceOptions_serializer;
}
var hasRequiredBatchWriteResourcesOptions_serializer;
function requireBatchWriteResourcesOptions_serializer() {
  if (hasRequiredBatchWriteResourcesOptions_serializer) return batchWriteResourcesOptions_serializer;
  hasRequiredBatchWriteResourcesOptions_serializer = 1;
  Object.defineProperty(batchWriteResourcesOptions_serializer, "__esModule", { value: true });
  batchWriteResourcesOptions_serializer.serializeBatchWriteResourcesOptions = void 0;
  const interfaces_1 = requireInterfaces$b();
  const create_resource_options_serializer_1 = requireCreateResourceOptions_serializer();
  const delete_resource_options_serializer_1 = requireDeleteResourceOptions_serializer();
  const serializeBatchWriteResourcesOptions = (options) => {
    let serializedResources = [];
    if (options.op === interfaces_1.ResourceOp.Create) {
      const resources = options.resources;
      serializedResources = resources.map((options2) => (0, create_resource_options_serializer_1.serializeCreateResourceOptions)(options2));
    } else if (options.op === interfaces_1.ResourceOp.Delete) {
      const resources = options.resources;
      serializedResources = resources.map((options2) => (0, delete_resource_options_serializer_1.serializeDeleteResourceOptions)(options2));
    }
    return {
      op: options.op,
      resources: serializedResources
    };
  };
  batchWriteResourcesOptions_serializer.serializeBatchWriteResourcesOptions = serializeBatchWriteResourcesOptions;
  return batchWriteResourcesOptions_serializer;
}
var listResourcesOptions_serializer = {};
var hasRequiredListResourcesOptions_serializer;
function requireListResourcesOptions_serializer() {
  if (hasRequiredListResourcesOptions_serializer) return listResourcesOptions_serializer;
  hasRequiredListResourcesOptions_serializer = 1;
  Object.defineProperty(listResourcesOptions_serializer, "__esModule", { value: true });
  listResourcesOptions_serializer.serializeListResourceOptions = void 0;
  const serializeListResourceOptions = (options) => ({
    resource_type: options.resourceType,
    search: options.search,
    limit: options.limit,
    before: options.before,
    after: options.after,
    order: options.order
  });
  listResourcesOptions_serializer.serializeListResourceOptions = serializeListResourceOptions;
  return listResourcesOptions_serializer;
}
var listWarrantsOptions_serializer = {};
var hasRequiredListWarrantsOptions_serializer;
function requireListWarrantsOptions_serializer() {
  if (hasRequiredListWarrantsOptions_serializer) return listWarrantsOptions_serializer;
  hasRequiredListWarrantsOptions_serializer = 1;
  Object.defineProperty(listWarrantsOptions_serializer, "__esModule", { value: true });
  listWarrantsOptions_serializer.serializeListWarrantsOptions = void 0;
  const serializeListWarrantsOptions = (options) => ({
    resource_type: options.resourceType,
    resource_id: options.resourceId,
    relation: options.relation,
    subject_type: options.subjectType,
    subject_id: options.subjectId,
    subject_relation: options.subjectRelation,
    limit: options.limit,
    after: options.after
  });
  listWarrantsOptions_serializer.serializeListWarrantsOptions = serializeListWarrantsOptions;
  return listWarrantsOptions_serializer;
}
var queryOptions_serializer = {};
var hasRequiredQueryOptions_serializer;
function requireQueryOptions_serializer() {
  if (hasRequiredQueryOptions_serializer) return queryOptions_serializer;
  hasRequiredQueryOptions_serializer = 1;
  Object.defineProperty(queryOptions_serializer, "__esModule", { value: true });
  queryOptions_serializer.serializeQueryOptions = void 0;
  const serializeQueryOptions = (options) => ({
    q: options.q,
    context: JSON.stringify(options.context),
    limit: options.limit,
    before: options.before,
    after: options.after,
    order: options.order
  });
  queryOptions_serializer.serializeQueryOptions = serializeQueryOptions;
  return queryOptions_serializer;
}
var queryResult_serializer = {};
var hasRequiredQueryResult_serializer;
function requireQueryResult_serializer() {
  if (hasRequiredQueryResult_serializer) return queryResult_serializer;
  hasRequiredQueryResult_serializer = 1;
  Object.defineProperty(queryResult_serializer, "__esModule", { value: true });
  queryResult_serializer.deserializeQueryResult = void 0;
  const deserializeQueryResult = (queryResult) => ({
    resourceType: queryResult.resource_type,
    resourceId: queryResult.resource_id,
    relation: queryResult.relation,
    warrant: {
      resourceType: queryResult.warrant.resource_type,
      resourceId: queryResult.warrant.resource_id,
      relation: queryResult.warrant.relation,
      subject: {
        resourceType: queryResult.warrant.subject.resource_type,
        resourceId: queryResult.warrant.subject.resource_id,
        relation: queryResult.warrant.subject.relation
      }
    },
    isImplicit: queryResult.is_implicit,
    meta: queryResult.meta
  });
  queryResult_serializer.deserializeQueryResult = deserializeQueryResult;
  return queryResult_serializer;
}
var resource_serializer = {};
var hasRequiredResource_serializer;
function requireResource_serializer() {
  if (hasRequiredResource_serializer) return resource_serializer;
  hasRequiredResource_serializer = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.deserializeBatchWriteResourcesResponse = exports.deserializeResource = void 0;
    const deserializeResource = (response) => ({
      resourceType: response.resource_type,
      resourceId: response.resource_id,
      meta: response.meta
    });
    exports.deserializeResource = deserializeResource;
    const deserializeBatchWriteResourcesResponse = (response) => {
      return response.data.map((resource) => (0, exports.deserializeResource)(resource));
    };
    exports.deserializeBatchWriteResourcesResponse = deserializeBatchWriteResourcesResponse;
  })(resource_serializer);
  return resource_serializer;
}
var warrantToken_serializer = {};
var hasRequiredWarrantToken_serializer;
function requireWarrantToken_serializer() {
  if (hasRequiredWarrantToken_serializer) return warrantToken_serializer;
  hasRequiredWarrantToken_serializer = 1;
  Object.defineProperty(warrantToken_serializer, "__esModule", { value: true });
  warrantToken_serializer.deserializeWarrantToken = void 0;
  const deserializeWarrantToken = (warrantToken) => ({
    warrantToken: warrantToken.warrant_token
  });
  warrantToken_serializer.deserializeWarrantToken = deserializeWarrantToken;
  return warrantToken_serializer;
}
var warrant_serializer = {};
var hasRequiredWarrant_serializer;
function requireWarrant_serializer() {
  if (hasRequiredWarrant_serializer) return warrant_serializer;
  hasRequiredWarrant_serializer = 1;
  Object.defineProperty(warrant_serializer, "__esModule", { value: true });
  warrant_serializer.deserializeWarrant = void 0;
  const deserializeWarrant = (warrant) => ({
    resourceType: warrant.resource_type,
    resourceId: warrant.resource_id,
    relation: warrant.relation,
    subject: {
      resourceType: warrant.subject.resource_type,
      resourceId: warrant.subject.resource_id,
      relation: warrant.subject.relation
    },
    policy: warrant.policy
  });
  warrant_serializer.deserializeWarrant = deserializeWarrant;
  return warrant_serializer;
}
var writeWarrantOptions_serializer = {};
var hasRequiredWriteWarrantOptions_serializer;
function requireWriteWarrantOptions_serializer() {
  if (hasRequiredWriteWarrantOptions_serializer) return writeWarrantOptions_serializer;
  hasRequiredWriteWarrantOptions_serializer = 1;
  Object.defineProperty(writeWarrantOptions_serializer, "__esModule", { value: true });
  writeWarrantOptions_serializer.serializeWriteWarrantOptions = void 0;
  const interface_check_1 = requireInterfaceCheck();
  const serializeWriteWarrantOptions = (warrant) => ({
    op: warrant.op,
    resource_type: (0, interface_check_1.isResourceInterface)(warrant.resource) ? warrant.resource.getResourceType() : warrant.resource.resourceType,
    resource_id: (0, interface_check_1.isResourceInterface)(warrant.resource) ? warrant.resource.getResourceId() : warrant.resource.resourceId ? warrant.resource.resourceId : "",
    relation: warrant.relation,
    subject: (0, interface_check_1.isSubject)(warrant.subject) ? {
      resource_type: warrant.subject.resourceType,
      resource_id: warrant.subject.resourceId
    } : {
      resource_type: warrant.subject.getResourceType(),
      resource_id: warrant.subject.getResourceId()
    },
    policy: warrant.policy
  });
  writeWarrantOptions_serializer.serializeWriteWarrantOptions = serializeWriteWarrantOptions;
  return writeWarrantOptions_serializer;
}
var list_serializer = {};
var hasRequiredList_serializer;
function requireList_serializer() {
  if (hasRequiredList_serializer) return list_serializer;
  hasRequiredList_serializer = 1;
  Object.defineProperty(list_serializer, "__esModule", { value: true });
  list_serializer.deserializeFGAList = void 0;
  const deserializeFGAList = (response, deserializeFn) => ({
    object: "list",
    data: response.data.map(deserializeFn),
    listMetadata: response.list_metadata,
    warnings: response.warnings
  });
  list_serializer.deserializeFGAList = deserializeFGAList;
  return list_serializer;
}
var hasRequiredSerializers;
function requireSerializers() {
  if (hasRequiredSerializers) return serializers;
  hasRequiredSerializers = 1;
  (function(exports) {
    var __createBinding = serializers && serializers.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = serializers && serializers.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireCheckOptions_serializer(), exports);
    __exportStar(requireBatchWriteResourcesOptions_serializer(), exports);
    __exportStar(requireCreateResourceOptions_serializer(), exports);
    __exportStar(requireDeleteResourceOptions_serializer(), exports);
    __exportStar(requireListResourcesOptions_serializer(), exports);
    __exportStar(requireListWarrantsOptions_serializer(), exports);
    __exportStar(requireQueryOptions_serializer(), exports);
    __exportStar(requireQueryResult_serializer(), exports);
    __exportStar(requireResource_serializer(), exports);
    __exportStar(requireWarrantToken_serializer(), exports);
    __exportStar(requireWarrant_serializer(), exports);
    __exportStar(requireWriteWarrantOptions_serializer(), exports);
    __exportStar(requireList_serializer(), exports);
  })(serializers);
  return serializers;
}
var fgaPaginatable = {};
var hasRequiredFgaPaginatable;
function requireFgaPaginatable() {
  if (hasRequiredFgaPaginatable) return fgaPaginatable;
  hasRequiredFgaPaginatable = 1;
  Object.defineProperty(fgaPaginatable, "__esModule", { value: true });
  fgaPaginatable.FgaPaginatable = void 0;
  const pagination_1 = requirePagination();
  class FgaPaginatable extends pagination_1.AutoPaginatable {
    constructor(list, apiCall, options) {
      super(list, apiCall, options);
    }
    get warnings() {
      return this.list.warnings;
    }
  }
  fgaPaginatable.FgaPaginatable = FgaPaginatable;
  return fgaPaginatable;
}
var fetchAndDeserializeList = {};
var hasRequiredFetchAndDeserializeList;
function requireFetchAndDeserializeList() {
  if (hasRequiredFetchAndDeserializeList) return fetchAndDeserializeList;
  hasRequiredFetchAndDeserializeList = 1;
  var __awaiter = fetchAndDeserializeList && fetchAndDeserializeList.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(fetchAndDeserializeList, "__esModule", { value: true });
  fetchAndDeserializeList.fetchAndDeserializeFGAList = void 0;
  const list_serializer_1 = requireList_serializer();
  const fetchAndDeserializeFGAList = (workos2, endpoint, deserializeFn, options, requestOptions) => __awaiter(void 0, void 0, void 0, function* () {
    const { data: response } = yield workos2.get(endpoint, Object.assign({ query: options }, requestOptions));
    return (0, list_serializer_1.deserializeFGAList)(response, deserializeFn);
  });
  fetchAndDeserializeList.fetchAndDeserializeFGAList = fetchAndDeserializeFGAList;
  return fetchAndDeserializeList;
}
var hasRequiredFga;
function requireFga() {
  if (hasRequiredFga) return fga;
  hasRequiredFga = 1;
  var __awaiter = fga && fga.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(fga, "__esModule", { value: true });
  fga.FGA = void 0;
  const interfaces_1 = requireInterfaces$b();
  const serializers_1 = requireSerializers();
  const interface_check_1 = requireInterfaceCheck();
  const pagination_1 = requirePagination();
  const fetch_and_deserialize_1 = requireFetchAndDeserialize();
  const fga_paginatable_1 = requireFgaPaginatable();
  const fetch_and_deserialize_list_1 = requireFetchAndDeserializeList();
  class FGA {
    constructor(workos2) {
      this.workos = workos2;
    }
    check(checkOptions, options = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/fga/v1/check`, (0, serializers_1.serializeCheckOptions)(checkOptions), options);
        return new interfaces_1.CheckResult(data);
      });
    }
    checkBatch(checkOptions, options = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/fga/v1/check`, (0, serializers_1.serializeCheckBatchOptions)(checkOptions), options);
        return data.map((checkResult) => new interfaces_1.CheckResult(checkResult));
      });
    }
    createResource(resource) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/fga/v1/resources", (0, serializers_1.serializeCreateResourceOptions)(resource));
        return (0, serializers_1.deserializeResource)(data);
      });
    }
    getResource(resource) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceType = (0, interface_check_1.isResourceInterface)(resource) ? resource.getResourceType() : resource.resourceType;
        const resourceId = (0, interface_check_1.isResourceInterface)(resource) ? resource.getResourceId() : resource.resourceId;
        const { data } = yield this.workos.get(`/fga/v1/resources/${resourceType}/${resourceId}`);
        return (0, serializers_1.deserializeResource)(data);
      });
    }
    listResources(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/fga/v1/resources", serializers_1.deserializeResource, options ? (0, serializers_1.serializeListResourceOptions)(options) : void 0), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/fga/v1/resources", serializers_1.deserializeResource, params), options ? (0, serializers_1.serializeListResourceOptions)(options) : void 0);
      });
    }
    updateResource(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceType = (0, interface_check_1.isResourceInterface)(options.resource) ? options.resource.getResourceType() : options.resource.resourceType;
        const resourceId = (0, interface_check_1.isResourceInterface)(options.resource) ? options.resource.getResourceId() : options.resource.resourceId;
        const { data } = yield this.workos.put(`/fga/v1/resources/${resourceType}/${resourceId}`, {
          meta: options.meta
        });
        return (0, serializers_1.deserializeResource)(data);
      });
    }
    deleteResource(resource) {
      return __awaiter(this, void 0, void 0, function* () {
        const resourceType = (0, interface_check_1.isResourceInterface)(resource) ? resource.getResourceType() : resource.resourceType;
        const resourceId = (0, interface_check_1.isResourceInterface)(resource) ? resource.getResourceId() : resource.resourceId;
        yield this.workos.delete(`/fga/v1/resources/${resourceType}/${resourceId}`);
      });
    }
    batchWriteResources(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/fga/v1/resources/batch", (0, serializers_1.serializeBatchWriteResourcesOptions)(options));
        return (0, serializers_1.deserializeBatchWriteResourcesResponse)(data);
      });
    }
    writeWarrant(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/fga/v1/warrants", (0, serializers_1.serializeWriteWarrantOptions)(options));
        return (0, serializers_1.deserializeWarrantToken)(data);
      });
    }
    batchWriteWarrants(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data: warrantToken } = yield this.workos.post("/fga/v1/warrants", options.map(serializers_1.serializeWriteWarrantOptions));
        return (0, serializers_1.deserializeWarrantToken)(warrantToken);
      });
    }
    listWarrants(options, requestOptions) {
      return __awaiter(this, void 0, void 0, function* () {
        return new pagination_1.AutoPaginatable(yield (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/fga/v1/warrants", serializers_1.deserializeWarrant, options ? (0, serializers_1.serializeListWarrantsOptions)(options) : void 0, requestOptions), (params) => (0, fetch_and_deserialize_1.fetchAndDeserialize)(this.workos, "/fga/v1/warrants", serializers_1.deserializeWarrant, params, requestOptions), options ? (0, serializers_1.serializeListWarrantsOptions)(options) : void 0);
      });
    }
    query(options, requestOptions = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        return new fga_paginatable_1.FgaPaginatable(yield (0, fetch_and_deserialize_list_1.fetchAndDeserializeFGAList)(this.workos, "/fga/v1/query", serializers_1.deserializeQueryResult, (0, serializers_1.serializeQueryOptions)(options), requestOptions), (params) => (0, fetch_and_deserialize_list_1.fetchAndDeserializeFGAList)(this.workos, "/fga/v1/query", serializers_1.deserializeQueryResult, params, requestOptions), (0, serializers_1.serializeQueryOptions)(options));
      });
    }
  }
  fga.FGA = FGA;
  return fga;
}
var widgets = {};
var getToken = {};
var hasRequiredGetToken;
function requireGetToken() {
  if (hasRequiredGetToken) return getToken;
  hasRequiredGetToken = 1;
  Object.defineProperty(getToken, "__esModule", { value: true });
  getToken.deserializeGetTokenResponse = getToken.serializeGetTokenOptions = void 0;
  const serializeGetTokenOptions = (options) => ({
    organization_id: options.organizationId,
    user_id: options.userId,
    scopes: options.scopes
  });
  getToken.serializeGetTokenOptions = serializeGetTokenOptions;
  const deserializeGetTokenResponse = (data) => ({
    token: data.token
  });
  getToken.deserializeGetTokenResponse = deserializeGetTokenResponse;
  return getToken;
}
var hasRequiredWidgets;
function requireWidgets() {
  if (hasRequiredWidgets) return widgets;
  hasRequiredWidgets = 1;
  var __awaiter = widgets && widgets.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(widgets, "__esModule", { value: true });
  widgets.Widgets = void 0;
  const get_token_1 = requireGetToken();
  class Widgets {
    constructor(workos2) {
      this.workos = workos2;
    }
    getToken(payload) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post("/widgets/token", (0, get_token_1.serializeGetTokenOptions)(payload));
        return (0, get_token_1.deserializeGetTokenResponse)(data).token;
      });
    }
  }
  widgets.Widgets = Widgets;
  return widgets;
}
var vault = {};
var base64 = {};
var hasRequiredBase64;
function requireBase64() {
  if (hasRequiredBase64) return base64;
  hasRequiredBase64 = 1;
  Object.defineProperty(base64, "__esModule", { value: true });
  base64.uint8ArrayToBase64 = base64.base64ToUint8Array = void 0;
  function base64ToUint8Array(base642) {
    if (typeof atob === "function") {
      const binary = atob(base642);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } else if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(base642, "base64"));
    } else {
      throw new Error("No base64 decoding implementation available");
    }
  }
  base64.base64ToUint8Array = base64ToUint8Array;
  function uint8ArrayToBase64(bytes) {
    if (typeof btoa === "function") {
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } else if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("base64");
    } else {
      throw new Error("No base64 encoding implementation available");
    }
  }
  base64.uint8ArrayToBase64 = uint8ArrayToBase64;
  return base64;
}
var vaultKey_serializer = {};
var hasRequiredVaultKey_serializer;
function requireVaultKey_serializer() {
  if (hasRequiredVaultKey_serializer) return vaultKey_serializer;
  hasRequiredVaultKey_serializer = 1;
  Object.defineProperty(vaultKey_serializer, "__esModule", { value: true });
  vaultKey_serializer.deserializeDecryptDataKeyResponse = vaultKey_serializer.deserializeCreateDataKeyResponse = void 0;
  const deserializeCreateDataKeyResponse = (key) => ({
    context: key.context,
    dataKey: {
      key: key.data_key,
      id: key.id
    },
    encryptedKeys: key.encrypted_keys
  });
  vaultKey_serializer.deserializeCreateDataKeyResponse = deserializeCreateDataKeyResponse;
  const deserializeDecryptDataKeyResponse = (key) => ({
    key: key.data_key,
    id: key.id
  });
  vaultKey_serializer.deserializeDecryptDataKeyResponse = deserializeDecryptDataKeyResponse;
  return vaultKey_serializer;
}
var vaultObject_serializer = {};
var hasRequiredVaultObject_serializer;
function requireVaultObject_serializer() {
  if (hasRequiredVaultObject_serializer) return vaultObject_serializer;
  hasRequiredVaultObject_serializer = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serializeUpdateObjectEntity = exports.serializeCreateObjectEntity = exports.desrializeListObjectVersions = exports.deserializeListObjects = exports.deserializeObject = exports.deserializeObjectMetadata = void 0;
    const deserializeObjectMetadata = (metadata) => ({
      context: metadata.context,
      environmentId: metadata.environment_id,
      id: metadata.id,
      keyId: metadata.key_id,
      updatedAt: new Date(Date.parse(metadata.updated_at)),
      updatedBy: metadata.updated_by,
      versionId: metadata.version_id
    });
    exports.deserializeObjectMetadata = deserializeObjectMetadata;
    const deserializeObject = (object) => ({
      id: object.id,
      name: object.name,
      value: object.value,
      metadata: (0, exports.deserializeObjectMetadata)(object.metadata)
    });
    exports.deserializeObject = deserializeObject;
    const deserializeObjectDigest = (digest) => ({
      id: digest.id,
      name: digest.name,
      updatedAt: new Date(Date.parse(digest.updated_at))
    });
    const deserializeListObjects = (list) => {
      var _a, _b;
      return {
        object: "list",
        data: list.data.map(deserializeObjectDigest),
        listMetadata: {
          after: (_a = list.list_metadata.after) !== null && _a !== void 0 ? _a : void 0,
          before: (_b = list.list_metadata.before) !== null && _b !== void 0 ? _b : void 0
        }
      };
    };
    exports.deserializeListObjects = deserializeListObjects;
    const desrializeListObjectVersions = (list) => list.data.map(deserializeObjectVersion);
    exports.desrializeListObjectVersions = desrializeListObjectVersions;
    const deserializeObjectVersion = (version) => ({
      createdAt: new Date(Date.parse(version.created_at)),
      currentVersion: version.current_version,
      id: version.id
    });
    const serializeCreateObjectEntity = (options) => ({
      name: options.name,
      value: options.value,
      key_context: options.context
    });
    exports.serializeCreateObjectEntity = serializeCreateObjectEntity;
    const serializeUpdateObjectEntity = (options) => ({
      value: options.value,
      version_check: options.versionCheck
    });
    exports.serializeUpdateObjectEntity = serializeUpdateObjectEntity;
  })(vaultObject_serializer);
  return vaultObject_serializer;
}
var hasRequiredVault;
function requireVault() {
  if (hasRequiredVault) return vault;
  hasRequiredVault = 1;
  var __awaiter = vault && vault.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(vault, "__esModule", { value: true });
  vault.Vault = void 0;
  const leb_1 = require$$0$4;
  const base64_1 = requireBase64();
  const vault_key_serializer_1 = requireVaultKey_serializer();
  const vault_object_serializer_1 = requireVaultObject_serializer();
  class Vault {
    constructor(workos2) {
      this.workos = workos2;
      this.createSecret = this.createObject;
      this.listSecrets = this.listObjects;
      this.listSecretVersions = this.listObjectVersions;
      this.readSecret = this.readObject;
      this.describeSecret = this.describeObject;
      this.updateSecret = this.updateObject;
      this.deleteSecret = this.deleteObject;
      this.cryptoProvider = workos2.getCryptoProvider();
    }
    decode(payload) {
      const inputData = (0, base64_1.base64ToUint8Array)(payload);
      const iv = new Uint8Array(inputData.subarray(0, 12));
      const tag = new Uint8Array(inputData.subarray(12, 28));
      const { value: keyLen, nextIndex } = (0, leb_1.decodeUInt32)(inputData, 28);
      const keysBuffer = inputData.subarray(nextIndex, nextIndex + keyLen);
      const keys = (0, base64_1.uint8ArrayToBase64)(keysBuffer);
      const ciphertext = new Uint8Array(inputData.subarray(nextIndex + keyLen));
      return {
        iv,
        tag,
        keys,
        ciphertext
      };
    }
    createObject(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/vault/v1/kv`, (0, vault_object_serializer_1.serializeCreateObjectEntity)(options));
        return (0, vault_object_serializer_1.deserializeObjectMetadata)(data);
      });
    }
    listObjects(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const url = new URL("/vault/v1/kv", this.workos.baseURL);
        if (options === null || options === void 0 ? void 0 : options.after) {
          url.searchParams.set("after", options.after);
        }
        if (options === null || options === void 0 ? void 0 : options.limit) {
          url.searchParams.set("limit", options.limit.toString());
        }
        const { data } = yield this.workos.get(url.toString());
        return (0, vault_object_serializer_1.deserializeListObjects)(data);
      });
    }
    listObjectVersions(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/vault/v1/kv/${encodeURIComponent(options.id)}/versions`);
        return (0, vault_object_serializer_1.desrializeListObjectVersions)(data);
      });
    }
    readObject(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/vault/v1/kv/${encodeURIComponent(options.id)}`);
        return (0, vault_object_serializer_1.deserializeObject)(data);
      });
    }
    describeObject(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.get(`/vault/v1/kv/${encodeURIComponent(options.id)}/metadata`);
        return (0, vault_object_serializer_1.deserializeObject)(data);
      });
    }
    updateObject(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.put(`/vault/v1/kv/${encodeURIComponent(options.id)}`, (0, vault_object_serializer_1.serializeUpdateObjectEntity)(options));
        return (0, vault_object_serializer_1.deserializeObject)(data);
      });
    }
    deleteObject(options) {
      return __awaiter(this, void 0, void 0, function* () {
        return this.workos.delete(`/vault/v1/kv/${encodeURIComponent(options.id)}`);
      });
    }
    createDataKey(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/vault/v1/keys/data-key`, options);
        return (0, vault_key_serializer_1.deserializeCreateDataKeyResponse)(data);
      });
    }
    decryptDataKey(options) {
      return __awaiter(this, void 0, void 0, function* () {
        const { data } = yield this.workos.post(`/vault/v1/keys/decrypt`, options);
        return (0, vault_key_serializer_1.deserializeDecryptDataKeyResponse)(data);
      });
    }
    encrypt(data, context, associatedData) {
      return __awaiter(this, void 0, void 0, function* () {
        const keyPair = yield this.createDataKey({
          context
        });
        const encoder = new TextEncoder();
        const key = (0, base64_1.base64ToUint8Array)(keyPair.dataKey.key);
        const keyBlob = (0, base64_1.base64ToUint8Array)(keyPair.encryptedKeys);
        const prefixLenBuffer = (0, leb_1.encodeUInt32)(keyBlob.length);
        const aadBuffer = associatedData ? encoder.encode(associatedData) : void 0;
        const iv = this.cryptoProvider.randomBytes(12);
        const { ciphertext, iv: resultIv, tag } = yield this.cryptoProvider.encrypt(encoder.encode(data), key, iv, aadBuffer);
        const resultArray = new Uint8Array(resultIv.length + tag.length + prefixLenBuffer.length + keyBlob.length + ciphertext.length);
        let offset = 0;
        resultArray.set(resultIv, offset);
        offset += resultIv.length;
        resultArray.set(tag, offset);
        offset += tag.length;
        resultArray.set(new Uint8Array(prefixLenBuffer), offset);
        offset += prefixLenBuffer.length;
        resultArray.set(keyBlob, offset);
        offset += keyBlob.length;
        resultArray.set(ciphertext, offset);
        return (0, base64_1.uint8ArrayToBase64)(resultArray);
      });
    }
    decrypt(encryptedData, associatedData) {
      return __awaiter(this, void 0, void 0, function* () {
        const decoded = this.decode(encryptedData);
        const dataKey = yield this.decryptDataKey({ keys: decoded.keys });
        const key = (0, base64_1.base64ToUint8Array)(dataKey.key);
        const encoder = new TextEncoder();
        const aadBuffer = associatedData ? encoder.encode(associatedData) : void 0;
        const decrypted = yield this.cryptoProvider.decrypt(decoded.ciphertext, key, decoded.iv, decoded.tag, aadBuffer);
        return new TextDecoder().decode(decrypted);
      });
    }
  }
  vault.Vault = Vault;
  return vault;
}
var conflict_exception = {};
var hasRequiredConflict_exception;
function requireConflict_exception() {
  if (hasRequiredConflict_exception) return conflict_exception;
  hasRequiredConflict_exception = 1;
  Object.defineProperty(conflict_exception, "__esModule", { value: true });
  conflict_exception.ConflictException = void 0;
  class ConflictException extends Error {
    constructor({ error, message, requestID }) {
      super();
      this.status = 409;
      this.name = "ConflictException";
      this.requestID = requestID;
      if (message) {
        this.message = message;
      } else if (error) {
        this.message = `Error: ${error}`;
      } else {
        this.message = `An conflict has occurred on the server.`;
      }
    }
  }
  conflict_exception.ConflictException = ConflictException;
  return conflict_exception;
}
var hasRequiredWorkos;
function requireWorkos() {
  if (hasRequiredWorkos) return workos;
  hasRequiredWorkos = 1;
  var define_process_env_default2 = {};
  var __awaiter = workos && workos.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(workos, "__esModule", { value: true });
  workos.WorkOS = void 0;
  const exceptions_1 = requireExceptions();
  const directory_sync_1 = requireDirectorySync();
  const events_1 = requireEvents();
  const organizations_1 = requireOrganizations();
  const organization_domains_1 = requireOrganizationDomains();
  const passwordless_1 = requirePasswordless();
  const portal_1 = requirePortal();
  const sso_1 = requireSso();
  const webhooks_1 = requireWebhooks();
  const mfa_1 = requireMfa();
  const audit_logs_1 = requireAuditLogs();
  const user_management_1 = requireUserManagement();
  const fga_1 = requireFga();
  const bad_request_exception_1 = requireBadRequest_exception();
  const http_client_1 = requireHttpClient();
  const subtle_crypto_provider_1 = requireSubtleCryptoProvider();
  const fetch_client_1 = requireFetchClient();
  const widgets_1 = requireWidgets();
  const actions_1 = requireActions();
  const vault_1 = requireVault();
  const conflict_exception_1 = requireConflict_exception();
  const parse_error_1 = requireParseError();
  const VERSION = "7.71.0";
  const DEFAULT_HOSTNAME = "api.workos.com";
  const HEADER_AUTHORIZATION = "Authorization";
  const HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";
  const HEADER_WARRANT_TOKEN = "Warrant-Token";
  class WorkOS {
    constructor(key, options = {}) {
      this.key = key;
      this.options = options;
      this.auditLogs = new audit_logs_1.AuditLogs(this);
      this.directorySync = new directory_sync_1.DirectorySync(this);
      this.organizations = new organizations_1.Organizations(this);
      this.organizationDomains = new organization_domains_1.OrganizationDomains(this);
      this.passwordless = new passwordless_1.Passwordless(this);
      this.portal = new portal_1.Portal(this);
      this.sso = new sso_1.SSO(this);
      this.mfa = new mfa_1.Mfa(this);
      this.events = new events_1.Events(this);
      this.fga = new fga_1.FGA(this);
      this.widgets = new widgets_1.Widgets(this);
      this.vault = new vault_1.Vault(this);
      if (!key) {
        this.key = typeof process !== "undefined" ? process === null || process === void 0 ? void 0 : define_process_env_default2.WORKOS_API_KEY : void 0;
        if (!this.key) {
          throw new exceptions_1.NoApiKeyProvidedException();
        }
      }
      if (this.options.https === void 0) {
        this.options.https = true;
      }
      this.clientId = this.options.clientId;
      if (!this.clientId && typeof process !== "undefined") {
        this.clientId = process === null || process === void 0 ? void 0 : define_process_env_default2.WORKOS_CLIENT_ID;
      }
      const protocol = this.options.https ? "https" : "http";
      const apiHostname = this.options.apiHostname || DEFAULT_HOSTNAME;
      const port = this.options.port;
      this.baseURL = `${protocol}://${apiHostname}`;
      if (port) {
        this.baseURL = this.baseURL + `:${port}`;
      }
      let userAgent = `workos-node/${VERSION}`;
      if (options.appInfo) {
        const { name, version } = options.appInfo;
        userAgent += ` ${name}: ${version}`;
      }
      this.webhooks = this.createWebhookClient();
      this.actions = this.createActionsClient();
      this.userManagement = new user_management_1.UserManagement(this, this.createIronSessionProvider());
      this.client = this.createHttpClient(options, userAgent);
    }
    createWebhookClient() {
      return new webhooks_1.Webhooks(this.getCryptoProvider());
    }
    createActionsClient() {
      return new actions_1.Actions(this.getCryptoProvider());
    }
    getCryptoProvider() {
      return new subtle_crypto_provider_1.SubtleCryptoProvider();
    }
    createHttpClient(options, userAgent) {
      var _a;
      return new fetch_client_1.FetchHttpClient(this.baseURL, Object.assign(Object.assign({}, options.config), { timeout: options.timeout, headers: Object.assign(Object.assign({}, (_a = options.config) === null || _a === void 0 ? void 0 : _a.headers), { Authorization: `Bearer ${this.key}`, "User-Agent": userAgent }) }));
    }
    createIronSessionProvider() {
      throw new Error("IronSessionProvider not implemented. Use WorkOSNode or WorkOSWorker instead.");
    }
    get version() {
      return VERSION;
    }
    post(path, entity, options = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const requestHeaders = {};
        if (options.idempotencyKey) {
          requestHeaders[HEADER_IDEMPOTENCY_KEY] = options.idempotencyKey;
        }
        if (options.warrantToken) {
          requestHeaders[HEADER_WARRANT_TOKEN] = options.warrantToken;
        }
        let res;
        try {
          res = yield this.client.post(path, entity, {
            params: options.query,
            headers: requestHeaders
          });
        } catch (error) {
          this.handleHttpError({ path, error });
          throw error;
        }
        try {
          return { data: yield res.toJSON() };
        } catch (error) {
          yield this.handleParseError(error, res);
          throw error;
        }
      });
    }
    get(path, options = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const requestHeaders = {};
        if (options.accessToken) {
          requestHeaders[HEADER_AUTHORIZATION] = `Bearer ${options.accessToken}`;
        }
        if (options.warrantToken) {
          requestHeaders[HEADER_WARRANT_TOKEN] = options.warrantToken;
        }
        let res;
        try {
          res = yield this.client.get(path, {
            params: options.query,
            headers: requestHeaders
          });
        } catch (error) {
          this.handleHttpError({ path, error });
          throw error;
        }
        try {
          return { data: yield res.toJSON() };
        } catch (error) {
          yield this.handleParseError(error, res);
          throw error;
        }
      });
    }
    put(path, entity, options = {}) {
      return __awaiter(this, void 0, void 0, function* () {
        const requestHeaders = {};
        if (options.idempotencyKey) {
          requestHeaders[HEADER_IDEMPOTENCY_KEY] = options.idempotencyKey;
        }
        let res;
        try {
          res = yield this.client.put(path, entity, {
            params: options.query,
            headers: requestHeaders
          });
        } catch (error) {
          this.handleHttpError({ path, error });
          throw error;
        }
        try {
          return { data: yield res.toJSON() };
        } catch (error) {
          yield this.handleParseError(error, res);
          throw error;
        }
      });
    }
    delete(path, query) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          yield this.client.delete(path, {
            params: query
          });
        } catch (error) {
          this.handleHttpError({ path, error });
          throw error;
        }
      });
    }
    emitWarning(warning) {
      console.warn(`WorkOS: ${warning}`);
    }
    handleParseError(error, res) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        if (error instanceof SyntaxError) {
          const rawResponse = res.getRawResponse();
          const requestID = (_a = rawResponse.headers.get("X-Request-ID")) !== null && _a !== void 0 ? _a : "";
          const rawStatus = rawResponse.status;
          const rawBody = yield rawResponse.text();
          throw new parse_error_1.ParseError({
            message: error.message,
            rawBody,
            rawStatus,
            requestID
          });
        }
      });
    }
    handleHttpError({ path, error }) {
      var _a;
      if (!(error instanceof http_client_1.HttpClientError)) {
        throw new Error(`Unexpected error: ${error}`, { cause: error });
      }
      const { response } = error;
      if (response) {
        const { status, data, headers } = response;
        const requestID = (_a = headers["X-Request-ID"]) !== null && _a !== void 0 ? _a : "";
        const { code, error_description: errorDescription, error: error2, errors, message } = data;
        switch (status) {
          case 401: {
            throw new exceptions_1.UnauthorizedException(requestID);
          }
          case 409: {
            throw new conflict_exception_1.ConflictException({ requestID, message, error: error2 });
          }
          case 422: {
            throw new exceptions_1.UnprocessableEntityException({
              code,
              errors,
              message,
              requestID
            });
          }
          case 404: {
            throw new exceptions_1.NotFoundException({
              code,
              message,
              path,
              requestID
            });
          }
          case 429: {
            const retryAfter = headers.get("Retry-After");
            throw new exceptions_1.RateLimitExceededException(data.message, requestID, retryAfter ? Number(retryAfter) : null);
          }
          default: {
            if (error2 || errorDescription) {
              throw new exceptions_1.OauthException(status, requestID, error2, errorDescription, data);
            } else if (code && errors) {
              throw new bad_request_exception_1.BadRequestException({
                code,
                errors,
                message,
                requestID
              });
            } else {
              throw new exceptions_1.GenericServerException(status, data.message, data, requestID);
            }
          }
        }
      }
    }
  }
  workos.WorkOS = WorkOS;
  return workos;
}
var webIronSessionProvider = {};
var ironSessionProvider = {};
var hasRequiredIronSessionProvider;
function requireIronSessionProvider() {
  if (hasRequiredIronSessionProvider) return ironSessionProvider;
  hasRequiredIronSessionProvider = 1;
  Object.defineProperty(ironSessionProvider, "__esModule", { value: true });
  ironSessionProvider.IronSessionProvider = void 0;
  class IronSessionProvider {
  }
  ironSessionProvider.IronSessionProvider = IronSessionProvider;
  return ironSessionProvider;
}
var hasRequiredWebIronSessionProvider;
function requireWebIronSessionProvider() {
  if (hasRequiredWebIronSessionProvider) return webIronSessionProvider;
  hasRequiredWebIronSessionProvider = 1;
  var __awaiter = webIronSessionProvider && webIronSessionProvider.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  Object.defineProperty(webIronSessionProvider, "__esModule", { value: true });
  webIronSessionProvider.WebIronSessionProvider = void 0;
  const iron_session_1 = require$$0$5;
  const iron_session_provider_1 = requireIronSessionProvider();
  class WebIronSessionProvider extends iron_session_provider_1.IronSessionProvider {
    /** @override */
    sealData(data, options) {
      return __awaiter(this, void 0, void 0, function* () {
        const sealOptions = Object.assign(Object.assign({}, options), { ttl: 0 });
        return (0, iron_session_1.sealData)(data, sealOptions);
      });
    }
    /** @override */
    unsealData(seal, options) {
      return __awaiter(this, void 0, void 0, function* () {
        return (0, iron_session_1.unsealData)(seal, options);
      });
    }
  }
  webIronSessionProvider.WebIronSessionProvider = WebIronSessionProvider;
  return webIronSessionProvider;
}
var interfaces$a = {};
var action_interface = {};
var hasRequiredAction_interface;
function requireAction_interface() {
  if (hasRequiredAction_interface) return action_interface;
  hasRequiredAction_interface = 1;
  Object.defineProperty(action_interface, "__esModule", { value: true });
  return action_interface;
}
var responsePayload_interface = {};
var hasRequiredResponsePayload_interface;
function requireResponsePayload_interface() {
  if (hasRequiredResponsePayload_interface) return responsePayload_interface;
  hasRequiredResponsePayload_interface = 1;
  Object.defineProperty(responsePayload_interface, "__esModule", { value: true });
  return responsePayload_interface;
}
var hasRequiredInterfaces$a;
function requireInterfaces$a() {
  if (hasRequiredInterfaces$a) return interfaces$a;
  hasRequiredInterfaces$a = 1;
  (function(exports) {
    var __createBinding = interfaces$a && interfaces$a.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$a && interfaces$a.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireAction_interface(), exports);
    __exportStar(requireResponsePayload_interface(), exports);
  })(interfaces$a);
  return interfaces$a;
}
var interfaces$9 = {};
var auditLogExportOptions_interface = {};
var hasRequiredAuditLogExportOptions_interface;
function requireAuditLogExportOptions_interface() {
  if (hasRequiredAuditLogExportOptions_interface) return auditLogExportOptions_interface;
  hasRequiredAuditLogExportOptions_interface = 1;
  Object.defineProperty(auditLogExportOptions_interface, "__esModule", { value: true });
  return auditLogExportOptions_interface;
}
var auditLogExport_interface = {};
var hasRequiredAuditLogExport_interface;
function requireAuditLogExport_interface() {
  if (hasRequiredAuditLogExport_interface) return auditLogExport_interface;
  hasRequiredAuditLogExport_interface = 1;
  Object.defineProperty(auditLogExport_interface, "__esModule", { value: true });
  return auditLogExport_interface;
}
var createAuditLogEventOptions_interface = {};
var hasRequiredCreateAuditLogEventOptions_interface;
function requireCreateAuditLogEventOptions_interface() {
  if (hasRequiredCreateAuditLogEventOptions_interface) return createAuditLogEventOptions_interface;
  hasRequiredCreateAuditLogEventOptions_interface = 1;
  Object.defineProperty(createAuditLogEventOptions_interface, "__esModule", { value: true });
  return createAuditLogEventOptions_interface;
}
var createAuditLogSchemaOptions_interface = {};
var hasRequiredCreateAuditLogSchemaOptions_interface;
function requireCreateAuditLogSchemaOptions_interface() {
  if (hasRequiredCreateAuditLogSchemaOptions_interface) return createAuditLogSchemaOptions_interface;
  hasRequiredCreateAuditLogSchemaOptions_interface = 1;
  Object.defineProperty(createAuditLogSchemaOptions_interface, "__esModule", { value: true });
  return createAuditLogSchemaOptions_interface;
}
var hasRequiredInterfaces$9;
function requireInterfaces$9() {
  if (hasRequiredInterfaces$9) return interfaces$9;
  hasRequiredInterfaces$9 = 1;
  (function(exports) {
    var __createBinding = interfaces$9 && interfaces$9.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$9 && interfaces$9.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireAuditLogExportOptions_interface(), exports);
    __exportStar(requireAuditLogExport_interface(), exports);
    __exportStar(requireCreateAuditLogEventOptions_interface(), exports);
    __exportStar(requireCreateAuditLogSchemaOptions_interface(), exports);
  })(interfaces$9);
  return interfaces$9;
}
var interfaces$8 = {};
var event_interface = {};
var hasRequiredEvent_interface;
function requireEvent_interface() {
  if (hasRequiredEvent_interface) return event_interface;
  hasRequiredEvent_interface = 1;
  Object.defineProperty(event_interface, "__esModule", { value: true });
  return event_interface;
}
var getOptions_interface = {};
var hasRequiredGetOptions_interface;
function requireGetOptions_interface() {
  if (hasRequiredGetOptions_interface) return getOptions_interface;
  hasRequiredGetOptions_interface = 1;
  Object.defineProperty(getOptions_interface, "__esModule", { value: true });
  return getOptions_interface;
}
var list_interface = {};
var hasRequiredList_interface;
function requireList_interface() {
  if (hasRequiredList_interface) return list_interface;
  hasRequiredList_interface = 1;
  Object.defineProperty(list_interface, "__esModule", { value: true });
  return list_interface;
}
var postOptions_interface = {};
var hasRequiredPostOptions_interface;
function requirePostOptions_interface() {
  if (hasRequiredPostOptions_interface) return postOptions_interface;
  hasRequiredPostOptions_interface = 1;
  Object.defineProperty(postOptions_interface, "__esModule", { value: true });
  return postOptions_interface;
}
var putOptions_interface = {};
var hasRequiredPutOptions_interface;
function requirePutOptions_interface() {
  if (hasRequiredPutOptions_interface) return putOptions_interface;
  hasRequiredPutOptions_interface = 1;
  Object.defineProperty(putOptions_interface, "__esModule", { value: true });
  return putOptions_interface;
}
var unprocessableEntityError_interface = {};
var hasRequiredUnprocessableEntityError_interface;
function requireUnprocessableEntityError_interface() {
  if (hasRequiredUnprocessableEntityError_interface) return unprocessableEntityError_interface;
  hasRequiredUnprocessableEntityError_interface = 1;
  Object.defineProperty(unprocessableEntityError_interface, "__esModule", { value: true });
  return unprocessableEntityError_interface;
}
var workosOptions_interface = {};
var hasRequiredWorkosOptions_interface;
function requireWorkosOptions_interface() {
  if (hasRequiredWorkosOptions_interface) return workosOptions_interface;
  hasRequiredWorkosOptions_interface = 1;
  Object.defineProperty(workosOptions_interface, "__esModule", { value: true });
  return workosOptions_interface;
}
var workosResponseError_interface = {};
var hasRequiredWorkosResponseError_interface;
function requireWorkosResponseError_interface() {
  if (hasRequiredWorkosResponseError_interface) return workosResponseError_interface;
  hasRequiredWorkosResponseError_interface = 1;
  Object.defineProperty(workosResponseError_interface, "__esModule", { value: true });
  return workosResponseError_interface;
}
var paginationOptions_interface = {};
var hasRequiredPaginationOptions_interface;
function requirePaginationOptions_interface() {
  if (hasRequiredPaginationOptions_interface) return paginationOptions_interface;
  hasRequiredPaginationOptions_interface = 1;
  Object.defineProperty(paginationOptions_interface, "__esModule", { value: true });
  return paginationOptions_interface;
}
var httpClient_interface = {};
var hasRequiredHttpClient_interface;
function requireHttpClient_interface() {
  if (hasRequiredHttpClient_interface) return httpClient_interface;
  hasRequiredHttpClient_interface = 1;
  Object.defineProperty(httpClient_interface, "__esModule", { value: true });
  return httpClient_interface;
}
var hasRequiredInterfaces$8;
function requireInterfaces$8() {
  if (hasRequiredInterfaces$8) return interfaces$8;
  hasRequiredInterfaces$8 = 1;
  (function(exports) {
    var __createBinding = interfaces$8 && interfaces$8.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$8 && interfaces$8.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireEvent_interface(), exports);
    __exportStar(requireGetOptions_interface(), exports);
    __exportStar(requireList_interface(), exports);
    __exportStar(requirePostOptions_interface(), exports);
    __exportStar(requirePutOptions_interface(), exports);
    __exportStar(requireUnprocessableEntityError_interface(), exports);
    __exportStar(requireWorkosOptions_interface(), exports);
    __exportStar(requireWorkosResponseError_interface(), exports);
    __exportStar(requirePaginationOptions_interface(), exports);
    __exportStar(requireHttpClient_interface(), exports);
  })(interfaces$8);
  return interfaces$8;
}
var interfaces$7 = {};
var directory_interface = {};
var hasRequiredDirectory_interface;
function requireDirectory_interface() {
  if (hasRequiredDirectory_interface) return directory_interface;
  hasRequiredDirectory_interface = 1;
  Object.defineProperty(directory_interface, "__esModule", { value: true });
  return directory_interface;
}
var directoryGroup_interface = {};
var hasRequiredDirectoryGroup_interface;
function requireDirectoryGroup_interface() {
  if (hasRequiredDirectoryGroup_interface) return directoryGroup_interface;
  hasRequiredDirectoryGroup_interface = 1;
  Object.defineProperty(directoryGroup_interface, "__esModule", { value: true });
  return directoryGroup_interface;
}
var listDirectoriesOptions_interface = {};
var hasRequiredListDirectoriesOptions_interface;
function requireListDirectoriesOptions_interface() {
  if (hasRequiredListDirectoriesOptions_interface) return listDirectoriesOptions_interface;
  hasRequiredListDirectoriesOptions_interface = 1;
  Object.defineProperty(listDirectoriesOptions_interface, "__esModule", { value: true });
  return listDirectoriesOptions_interface;
}
var listGroupsOptions_interface = {};
var hasRequiredListGroupsOptions_interface;
function requireListGroupsOptions_interface() {
  if (hasRequiredListGroupsOptions_interface) return listGroupsOptions_interface;
  hasRequiredListGroupsOptions_interface = 1;
  Object.defineProperty(listGroupsOptions_interface, "__esModule", { value: true });
  return listGroupsOptions_interface;
}
var listDirectoryUsersOptions_interface = {};
var hasRequiredListDirectoryUsersOptions_interface;
function requireListDirectoryUsersOptions_interface() {
  if (hasRequiredListDirectoryUsersOptions_interface) return listDirectoryUsersOptions_interface;
  hasRequiredListDirectoryUsersOptions_interface = 1;
  Object.defineProperty(listDirectoryUsersOptions_interface, "__esModule", { value: true });
  return listDirectoryUsersOptions_interface;
}
var directoryUser_interface = {};
var hasRequiredDirectoryUser_interface;
function requireDirectoryUser_interface() {
  if (hasRequiredDirectoryUser_interface) return directoryUser_interface;
  hasRequiredDirectoryUser_interface = 1;
  Object.defineProperty(directoryUser_interface, "__esModule", { value: true });
  return directoryUser_interface;
}
var hasRequiredInterfaces$7;
function requireInterfaces$7() {
  if (hasRequiredInterfaces$7) return interfaces$7;
  hasRequiredInterfaces$7 = 1;
  (function(exports) {
    var __createBinding = interfaces$7 && interfaces$7.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$7 && interfaces$7.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireDirectory_interface(), exports);
    __exportStar(requireDirectoryGroup_interface(), exports);
    __exportStar(requireListDirectoriesOptions_interface(), exports);
    __exportStar(requireListGroupsOptions_interface(), exports);
    __exportStar(requireListDirectoryUsersOptions_interface(), exports);
    __exportStar(requireDirectoryUser_interface(), exports);
  })(interfaces$7);
  return interfaces$7;
}
var getPrimaryEmail = {};
var hasRequiredGetPrimaryEmail;
function requireGetPrimaryEmail() {
  if (hasRequiredGetPrimaryEmail) return getPrimaryEmail;
  hasRequiredGetPrimaryEmail = 1;
  Object.defineProperty(getPrimaryEmail, "__esModule", { value: true });
  getPrimaryEmail.getPrimaryEmail = void 0;
  function getPrimaryEmail$1(user) {
    var _a;
    const primaryEmail = (_a = user.emails) === null || _a === void 0 ? void 0 : _a.find((email) => email.primary);
    return primaryEmail === null || primaryEmail === void 0 ? void 0 : primaryEmail.value;
  }
  getPrimaryEmail.getPrimaryEmail = getPrimaryEmail$1;
  return getPrimaryEmail;
}
var interfaces$6 = {};
var listEventsOptions_interface = {};
var hasRequiredListEventsOptions_interface;
function requireListEventsOptions_interface() {
  if (hasRequiredListEventsOptions_interface) return listEventsOptions_interface;
  hasRequiredListEventsOptions_interface = 1;
  Object.defineProperty(listEventsOptions_interface, "__esModule", { value: true });
  return listEventsOptions_interface;
}
var hasRequiredInterfaces$6;
function requireInterfaces$6() {
  if (hasRequiredInterfaces$6) return interfaces$6;
  hasRequiredInterfaces$6 = 1;
  (function(exports) {
    var __createBinding = interfaces$6 && interfaces$6.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$6 && interfaces$6.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireListEventsOptions_interface(), exports);
  })(interfaces$6);
  return interfaces$6;
}
var interfaces$5 = {};
var createOrganizationOptions_interface = {};
var hasRequiredCreateOrganizationOptions_interface;
function requireCreateOrganizationOptions_interface() {
  if (hasRequiredCreateOrganizationOptions_interface) return createOrganizationOptions_interface;
  hasRequiredCreateOrganizationOptions_interface = 1;
  Object.defineProperty(createOrganizationOptions_interface, "__esModule", { value: true });
  return createOrganizationOptions_interface;
}
var domainData_interface = {};
var hasRequiredDomainData_interface;
function requireDomainData_interface() {
  if (hasRequiredDomainData_interface) return domainData_interface;
  hasRequiredDomainData_interface = 1;
  Object.defineProperty(domainData_interface, "__esModule", { value: true });
  domainData_interface.DomainDataState = void 0;
  var DomainDataState;
  (function(DomainDataState2) {
    DomainDataState2["Verified"] = "verified";
    DomainDataState2["Pending"] = "pending";
  })(DomainDataState || (domainData_interface.DomainDataState = DomainDataState = {}));
  return domainData_interface;
}
var listOrganizationFeatureFlagsOptions_interface = {};
var hasRequiredListOrganizationFeatureFlagsOptions_interface;
function requireListOrganizationFeatureFlagsOptions_interface() {
  if (hasRequiredListOrganizationFeatureFlagsOptions_interface) return listOrganizationFeatureFlagsOptions_interface;
  hasRequiredListOrganizationFeatureFlagsOptions_interface = 1;
  Object.defineProperty(listOrganizationFeatureFlagsOptions_interface, "__esModule", { value: true });
  return listOrganizationFeatureFlagsOptions_interface;
}
var listOrganizationsOptions_interface = {};
var hasRequiredListOrganizationsOptions_interface;
function requireListOrganizationsOptions_interface() {
  if (hasRequiredListOrganizationsOptions_interface) return listOrganizationsOptions_interface;
  hasRequiredListOrganizationsOptions_interface = 1;
  Object.defineProperty(listOrganizationsOptions_interface, "__esModule", { value: true });
  return listOrganizationsOptions_interface;
}
var organization_interface = {};
var hasRequiredOrganization_interface;
function requireOrganization_interface() {
  if (hasRequiredOrganization_interface) return organization_interface;
  hasRequiredOrganization_interface = 1;
  Object.defineProperty(organization_interface, "__esModule", { value: true });
  return organization_interface;
}
var updateOrganizationOptions_interface = {};
var hasRequiredUpdateOrganizationOptions_interface;
function requireUpdateOrganizationOptions_interface() {
  if (hasRequiredUpdateOrganizationOptions_interface) return updateOrganizationOptions_interface;
  hasRequiredUpdateOrganizationOptions_interface = 1;
  Object.defineProperty(updateOrganizationOptions_interface, "__esModule", { value: true });
  return updateOrganizationOptions_interface;
}
var hasRequiredInterfaces$5;
function requireInterfaces$5() {
  if (hasRequiredInterfaces$5) return interfaces$5;
  hasRequiredInterfaces$5 = 1;
  (function(exports) {
    var __createBinding = interfaces$5 && interfaces$5.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$5 && interfaces$5.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireCreateOrganizationOptions_interface(), exports);
    __exportStar(requireDomainData_interface(), exports);
    __exportStar(requireListOrganizationFeatureFlagsOptions_interface(), exports);
    __exportStar(requireListOrganizationsOptions_interface(), exports);
    __exportStar(requireOrganization_interface(), exports);
    __exportStar(requireUpdateOrganizationOptions_interface(), exports);
  })(interfaces$5);
  return interfaces$5;
}
var interfaces$4 = {};
var createOrganizationDomainOptions_interface = {};
var hasRequiredCreateOrganizationDomainOptions_interface;
function requireCreateOrganizationDomainOptions_interface() {
  if (hasRequiredCreateOrganizationDomainOptions_interface) return createOrganizationDomainOptions_interface;
  hasRequiredCreateOrganizationDomainOptions_interface = 1;
  Object.defineProperty(createOrganizationDomainOptions_interface, "__esModule", { value: true });
  return createOrganizationDomainOptions_interface;
}
var organizationDomain_interface = {};
var hasRequiredOrganizationDomain_interface;
function requireOrganizationDomain_interface() {
  if (hasRequiredOrganizationDomain_interface) return organizationDomain_interface;
  hasRequiredOrganizationDomain_interface = 1;
  Object.defineProperty(organizationDomain_interface, "__esModule", { value: true });
  organizationDomain_interface.OrganizationDomainVerificationStrategy = organizationDomain_interface.OrganizationDomainState = void 0;
  var OrganizationDomainState;
  (function(OrganizationDomainState2) {
    OrganizationDomainState2["LegacyVerified"] = "legacy_verified";
    OrganizationDomainState2["Verified"] = "verified";
    OrganizationDomainState2["Pending"] = "pending";
    OrganizationDomainState2["Failed"] = "failed";
  })(OrganizationDomainState || (organizationDomain_interface.OrganizationDomainState = OrganizationDomainState = {}));
  var OrganizationDomainVerificationStrategy;
  (function(OrganizationDomainVerificationStrategy2) {
    OrganizationDomainVerificationStrategy2["Dns"] = "dns";
    OrganizationDomainVerificationStrategy2["Manual"] = "manual";
  })(OrganizationDomainVerificationStrategy || (organizationDomain_interface.OrganizationDomainVerificationStrategy = OrganizationDomainVerificationStrategy = {}));
  return organizationDomain_interface;
}
var hasRequiredInterfaces$4;
function requireInterfaces$4() {
  if (hasRequiredInterfaces$4) return interfaces$4;
  hasRequiredInterfaces$4 = 1;
  (function(exports) {
    var __createBinding = interfaces$4 && interfaces$4.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$4 && interfaces$4.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireCreateOrganizationDomainOptions_interface(), exports);
    __exportStar(requireOrganizationDomain_interface(), exports);
  })(interfaces$4);
  return interfaces$4;
}
var interfaces$3 = {};
var passwordlessSession_interface = {};
var hasRequiredPasswordlessSession_interface;
function requirePasswordlessSession_interface() {
  if (hasRequiredPasswordlessSession_interface) return passwordlessSession_interface;
  hasRequiredPasswordlessSession_interface = 1;
  Object.defineProperty(passwordlessSession_interface, "__esModule", { value: true });
  return passwordlessSession_interface;
}
var createPasswordlessSessionOptions_interface = {};
var hasRequiredCreatePasswordlessSessionOptions_interface;
function requireCreatePasswordlessSessionOptions_interface() {
  if (hasRequiredCreatePasswordlessSessionOptions_interface) return createPasswordlessSessionOptions_interface;
  hasRequiredCreatePasswordlessSessionOptions_interface = 1;
  Object.defineProperty(createPasswordlessSessionOptions_interface, "__esModule", { value: true });
  return createPasswordlessSessionOptions_interface;
}
var sendSessionResponse_interface = {};
var hasRequiredSendSessionResponse_interface;
function requireSendSessionResponse_interface() {
  if (hasRequiredSendSessionResponse_interface) return sendSessionResponse_interface;
  hasRequiredSendSessionResponse_interface = 1;
  Object.defineProperty(sendSessionResponse_interface, "__esModule", { value: true });
  return sendSessionResponse_interface;
}
var hasRequiredInterfaces$3;
function requireInterfaces$3() {
  if (hasRequiredInterfaces$3) return interfaces$3;
  hasRequiredInterfaces$3 = 1;
  (function(exports) {
    var __createBinding = interfaces$3 && interfaces$3.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$3 && interfaces$3.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requirePasswordlessSession_interface(), exports);
    __exportStar(requireCreatePasswordlessSessionOptions_interface(), exports);
    __exportStar(requireSendSessionResponse_interface(), exports);
  })(interfaces$3);
  return interfaces$3;
}
var interfaces$2 = {};
var generatePortalLinkIntent_interface = {};
var hasRequiredGeneratePortalLinkIntent_interface;
function requireGeneratePortalLinkIntent_interface() {
  if (hasRequiredGeneratePortalLinkIntent_interface) return generatePortalLinkIntent_interface;
  hasRequiredGeneratePortalLinkIntent_interface = 1;
  Object.defineProperty(generatePortalLinkIntent_interface, "__esModule", { value: true });
  generatePortalLinkIntent_interface.GeneratePortalLinkIntent = void 0;
  var GeneratePortalLinkIntent;
  (function(GeneratePortalLinkIntent2) {
    GeneratePortalLinkIntent2["AuditLogs"] = "audit_logs";
    GeneratePortalLinkIntent2["DomainVerification"] = "domain_verification";
    GeneratePortalLinkIntent2["DSync"] = "dsync";
    GeneratePortalLinkIntent2["LogStreams"] = "log_streams";
    GeneratePortalLinkIntent2["SSO"] = "sso";
    GeneratePortalLinkIntent2["CertificateRenewal"] = "certificate_renewal";
  })(GeneratePortalLinkIntent || (generatePortalLinkIntent_interface.GeneratePortalLinkIntent = GeneratePortalLinkIntent = {}));
  return generatePortalLinkIntent_interface;
}
var hasRequiredInterfaces$2;
function requireInterfaces$2() {
  if (hasRequiredInterfaces$2) return interfaces$2;
  hasRequiredInterfaces$2 = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GeneratePortalLinkIntent = void 0;
    var generate_portal_link_intent_interface_1 = requireGeneratePortalLinkIntent_interface();
    Object.defineProperty(exports, "GeneratePortalLinkIntent", { enumerable: true, get: function() {
      return generate_portal_link_intent_interface_1.GeneratePortalLinkIntent;
    } });
  })(interfaces$2);
  return interfaces$2;
}
var interfaces$1 = {};
var authorizationUrlOptions_interface = {};
var hasRequiredAuthorizationUrlOptions_interface;
function requireAuthorizationUrlOptions_interface() {
  if (hasRequiredAuthorizationUrlOptions_interface) return authorizationUrlOptions_interface;
  hasRequiredAuthorizationUrlOptions_interface = 1;
  Object.defineProperty(authorizationUrlOptions_interface, "__esModule", { value: true });
  return authorizationUrlOptions_interface;
}
var connectionType_enum = {};
var hasRequiredConnectionType_enum;
function requireConnectionType_enum() {
  if (hasRequiredConnectionType_enum) return connectionType_enum;
  hasRequiredConnectionType_enum = 1;
  Object.defineProperty(connectionType_enum, "__esModule", { value: true });
  connectionType_enum.ConnectionType = void 0;
  var ConnectionType;
  (function(ConnectionType2) {
    ConnectionType2["ADFSSAML"] = "ADFSSAML";
    ConnectionType2["AdpOidc"] = "AdpOidc";
    ConnectionType2["AppleOAuth"] = "AppleOAuth";
    ConnectionType2["Auth0SAML"] = "Auth0SAML";
    ConnectionType2["AzureSAML"] = "AzureSAML";
    ConnectionType2["CasSAML"] = "CasSAML";
    ConnectionType2["ClassLinkSAML"] = "ClassLinkSAML";
    ConnectionType2["CloudflareSAML"] = "CloudflareSAML";
    ConnectionType2["CyberArkSAML"] = "CyberArkSAML";
    ConnectionType2["DuoSAML"] = "DuoSAML";
    ConnectionType2["GenericOIDC"] = "GenericOIDC";
    ConnectionType2["GenericSAML"] = "GenericSAML";
    ConnectionType2["GitHubOAuth"] = "GitHubOAuth";
    ConnectionType2["GoogleOAuth"] = "GoogleOAuth";
    ConnectionType2["GoogleSAML"] = "GoogleSAML";
    ConnectionType2["JumpCloudSAML"] = "JumpCloudSAML";
    ConnectionType2["KeycloakSAML"] = "KeycloakSAML";
    ConnectionType2["LastPassSAML"] = "LastPassSAML";
    ConnectionType2["LoginGovOidc"] = "LoginGovOidc";
    ConnectionType2["MagicLink"] = "MagicLink";
    ConnectionType2["MicrosoftOAuth"] = "MicrosoftOAuth";
    ConnectionType2["MiniOrangeSAML"] = "MiniOrangeSAML";
    ConnectionType2["NetIqSAML"] = "NetIqSAML";
    ConnectionType2["OktaSAML"] = "OktaSAML";
    ConnectionType2["OneLoginSAML"] = "OneLoginSAML";
    ConnectionType2["OracleSAML"] = "OracleSAML";
    ConnectionType2["PingFederateSAML"] = "PingFederateSAML";
    ConnectionType2["PingOneSAML"] = "PingOneSAML";
    ConnectionType2["RipplingSAML"] = "RipplingSAML";
    ConnectionType2["SalesforceOAuth"] = "SalesforceOAuth";
    ConnectionType2["SalesforceSAML"] = "SalesforceSAML";
    ConnectionType2["ShibbolethGenericSAML"] = "ShibbolethGenericSAML";
    ConnectionType2["ShibbolethSAML"] = "ShibbolethSAML";
    ConnectionType2["SimpleSamlPhpSAML"] = "SimpleSamlPhpSAML";
    ConnectionType2["VMwareSAML"] = "VMwareSAML";
  })(ConnectionType || (connectionType_enum.ConnectionType = ConnectionType = {}));
  return connectionType_enum;
}
var connection_interface = {};
var hasRequiredConnection_interface;
function requireConnection_interface() {
  if (hasRequiredConnection_interface) return connection_interface;
  hasRequiredConnection_interface = 1;
  Object.defineProperty(connection_interface, "__esModule", { value: true });
  return connection_interface;
}
var getProfileOptions_interface = {};
var hasRequiredGetProfileOptions_interface;
function requireGetProfileOptions_interface() {
  if (hasRequiredGetProfileOptions_interface) return getProfileOptions_interface;
  hasRequiredGetProfileOptions_interface = 1;
  Object.defineProperty(getProfileOptions_interface, "__esModule", { value: true });
  return getProfileOptions_interface;
}
var getProfileAndTokenOptions_interface = {};
var hasRequiredGetProfileAndTokenOptions_interface;
function requireGetProfileAndTokenOptions_interface() {
  if (hasRequiredGetProfileAndTokenOptions_interface) return getProfileAndTokenOptions_interface;
  hasRequiredGetProfileAndTokenOptions_interface = 1;
  Object.defineProperty(getProfileAndTokenOptions_interface, "__esModule", { value: true });
  return getProfileAndTokenOptions_interface;
}
var listConnectionsOptions_interface = {};
var hasRequiredListConnectionsOptions_interface;
function requireListConnectionsOptions_interface() {
  if (hasRequiredListConnectionsOptions_interface) return listConnectionsOptions_interface;
  hasRequiredListConnectionsOptions_interface = 1;
  Object.defineProperty(listConnectionsOptions_interface, "__esModule", { value: true });
  return listConnectionsOptions_interface;
}
var profileAndToken_interface = {};
var hasRequiredProfileAndToken_interface;
function requireProfileAndToken_interface() {
  if (hasRequiredProfileAndToken_interface) return profileAndToken_interface;
  hasRequiredProfileAndToken_interface = 1;
  Object.defineProperty(profileAndToken_interface, "__esModule", { value: true });
  return profileAndToken_interface;
}
var profile_interface = {};
var hasRequiredProfile_interface;
function requireProfile_interface() {
  if (hasRequiredProfile_interface) return profile_interface;
  hasRequiredProfile_interface = 1;
  Object.defineProperty(profile_interface, "__esModule", { value: true });
  return profile_interface;
}
var hasRequiredInterfaces$1;
function requireInterfaces$1() {
  if (hasRequiredInterfaces$1) return interfaces$1;
  hasRequiredInterfaces$1 = 1;
  (function(exports) {
    var __createBinding = interfaces$1 && interfaces$1.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces$1 && interfaces$1.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireAuthorizationUrlOptions_interface(), exports);
    __exportStar(requireConnectionType_enum(), exports);
    __exportStar(requireConnection_interface(), exports);
    __exportStar(requireGetProfileOptions_interface(), exports);
    __exportStar(requireGetProfileAndTokenOptions_interface(), exports);
    __exportStar(requireListConnectionsOptions_interface(), exports);
    __exportStar(requireProfileAndToken_interface(), exports);
    __exportStar(requireProfile_interface(), exports);
  })(interfaces$1);
  return interfaces$1;
}
var interfaces = {};
var role_interface = {};
var hasRequiredRole_interface;
function requireRole_interface() {
  if (hasRequiredRole_interface) return role_interface;
  hasRequiredRole_interface = 1;
  Object.defineProperty(role_interface, "__esModule", { value: true });
  return role_interface;
}
var hasRequiredInterfaces;
function requireInterfaces() {
  if (hasRequiredInterfaces) return interfaces;
  hasRequiredInterfaces = 1;
  (function(exports) {
    var __createBinding = interfaces && interfaces.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = interfaces && interfaces.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(requireRole_interface(), exports);
  })(interfaces);
  return interfaces;
}
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib;
  hasRequiredLib = 1;
  (function(exports) {
    var __createBinding = lib && lib.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = lib && lib.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WorkOS = void 0;
    const node_crypto_provider_1 = requireNodeCryptoProvider();
    const subtle_crypto_provider_1 = requireSubtleCryptoProvider();
    const fetch_client_1 = requireFetchClient();
    const node_client_1 = requireNodeClient();
    const actions_1 = requireActions();
    const webhooks_1 = requireWebhooks();
    const workos_1 = requireWorkos();
    const web_iron_session_provider_1 = requireWebIronSessionProvider();
    __exportStar(requireInterfaces$a(), exports);
    __exportStar(requireInterfaces$9(), exports);
    __exportStar(requireExceptions(), exports);
    __exportStar(requireInterfaces$8(), exports);
    __exportStar(requirePagination(), exports);
    __exportStar(requireInterfaces$7(), exports);
    __exportStar(requireGetPrimaryEmail(), exports);
    __exportStar(requireInterfaces$6(), exports);
    __exportStar(requireInterfaces$b(), exports);
    __exportStar(requireInterfaces$5(), exports);
    __exportStar(requireInterfaces$4(), exports);
    __exportStar(requireInterfaces$3(), exports);
    __exportStar(requireInterfaces$2(), exports);
    __exportStar(requireInterfaces$1(), exports);
    __exportStar(requireInterfaces$c(), exports);
    __exportStar(requireInterfaces(), exports);
    class WorkOSNode extends workos_1.WorkOS {
      /** @override */
      createHttpClient(options, userAgent) {
        var _a;
        const opts = Object.assign(Object.assign({}, options.config), { timeout: options.timeout, headers: Object.assign(Object.assign({}, (_a = options.config) === null || _a === void 0 ? void 0 : _a.headers), { Authorization: `Bearer ${this.key}`, "User-Agent": userAgent }) });
        if (typeof fetch !== "undefined" || typeof options.fetchFn !== "undefined") {
          return new fetch_client_1.FetchHttpClient(this.baseURL, opts, options.fetchFn);
        } else {
          return new node_client_1.NodeHttpClient(this.baseURL, opts);
        }
      }
      /** @override */
      createWebhookClient() {
        return new webhooks_1.Webhooks(this.getCryptoProvider());
      }
      getCryptoProvider() {
        let cryptoProvider2;
        if (typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined") {
          cryptoProvider2 = new subtle_crypto_provider_1.SubtleCryptoProvider();
        } else {
          cryptoProvider2 = new node_crypto_provider_1.NodeCryptoProvider();
        }
        return cryptoProvider2;
      }
      /** @override */
      createActionsClient() {
        return new actions_1.Actions(this.getCryptoProvider());
      }
      /** @override */
      createIronSessionProvider() {
        return new web_iron_session_provider_1.WebIronSessionProvider();
      }
      /** @override */
      emitWarning(warning) {
        return process.emitWarning(warning, "WorkOS");
      }
    }
    exports.WorkOS = WorkOSNode;
  })(lib);
  return lib;
}
var libExports = requireLib();
var define_process_env_default = {};
const cfEnv = define_process_env_default;
const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state") || "/";
        if (!code) {
          return new Response("Missing authorization code", { status: 400 });
        }
        const workosApiKey = cfEnv.WORKOS_API_KEY;
        const workosClientId = cfEnv.WORKOS_CLIENT_ID;
        if (!workosApiKey || !workosClientId) {
          return new Response("WorkOS not configured", { status: 500 });
        }
        const workos2 = new libExports.WorkOS(workosApiKey);
        try {
          const authResponse = await workos2.userManagement.authenticateWithCode({
            clientId: workosClientId,
            code
          });
          const expiresAt = authResponse.expiresAt ?? Math.floor(Date.now() / 1e3) + 3600;
          const sessionCookie = await SessionCookie.create({
            userId: authResponse.user.id,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken ?? null,
            accessTokenExpiresAt: expiresAt,
            sessionExpiresAt: expiresAt + 60 * 60 * 24 * 30,
            expiresAt
          });
          return new Response(null, {
            status: 302,
            headers: {
              Location: state,
              "Set-Cookie": sessionCookie
            }
          });
        } catch (error) {
          console.error("WorkOS authentication error:", error);
          return new Response("Authentication failed", { status: 500 });
        }
      }
    }
  }
});
const SignInRoute = Route$6.update({
  id: "/sign-in",
  path: "/sign-in",
  getParentRoute: () => Route$7
});
const AppRoute = Route$5.update({
  id: "/_app",
  getParentRoute: () => Route$7
});
const AppIndexRoute = Route$4.update({
  id: "/_index",
  getParentRoute: () => AppRoute
});
const ApiAuthSessionRoute = Route$3.update({
  id: "/api/auth/session",
  path: "/api/auth/session",
  getParentRoute: () => Route$7
});
const ApiAuthLogoutRoute = Route$2.update({
  id: "/api/auth/logout",
  path: "/api/auth/logout",
  getParentRoute: () => Route$7
});
const ApiAuthLoginRoute = Route$1.update({
  id: "/api/auth/login",
  path: "/api/auth/login",
  getParentRoute: () => Route$7
});
const ApiAuthCallbackRoute = Route.update({
  id: "/api/auth/callback",
  path: "/api/auth/callback",
  getParentRoute: () => Route$7
});
const AppRouteChildren = {
  AppIndexRoute
};
const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren);
const rootRouteChildren = {
  AppRoute: AppRouteWithChildren,
  SignInRoute,
  ApiAuthCallbackRoute,
  ApiAuthLoginRoute,
  ApiAuthLogoutRoute,
  ApiAuthSessionRoute
};
const routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1e3 * 60 * 5,
        gcTime: 1e3 * 60 * 60 * 24
      }
    },
    mutationCache: new MutationCache({
      onSettled: () => {
        if (queryClient.isMutating() === 1) {
          return queryClient.invalidateQueries();
        }
      }
    })
  });
  return routerWithQueryClient(
    createRouter({
      routeTree,
      context: { queryClient },
      scrollRestoration: true,
      defaultPreload: "intent"
    }),
    queryClient
  );
}
export {
  getRouter
};
