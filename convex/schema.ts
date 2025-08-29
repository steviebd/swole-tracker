import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for WorkOS integration
  // Maps WorkOS identity.subject to internal user data
  users: defineTable({
    name: v.string(),
    email: v.string(),
    workosId: v.string(), // From WorkOS identity.subject
    // Convex automatically adds _id and _creationTime
  })
    .index("by_workosId", ["workosId"])
    .index("by_email", ["email"]),

  // User Preferences - settings and preferences
  userPreferences: defineTable({
    userId: v.id("users"),
    defaultWeightUnit: v.string(), // "kg" | "lbs"
    // Phase 2 additions
    predictiveDefaultsEnabled: v.boolean(),
    rightSwipeAction: v.string(), // "collapse_expand" etc.
    // Wellness feature
    enableManualWellness: v.boolean(),
    // AI Suggestions progression preferences
    progressionType: v.string(), // "linear" | "percentage" | "adaptive"
    linearProgressionKg: v.number(), // Default 2.5kg increment
    percentageProgression: v.number(), // Default 2.5% increment
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"]),

  // Workout Templates
  workoutTemplates: defineTable({
    name: v.string(),
    userId: v.id("users"),
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"]),

  // Template Exercises - exercises within templates
  templateExercises: defineTable({
    userId: v.id("users"),
    templateId: v.id("workoutTemplates"),
    exerciseName: v.string(),
    orderIndex: v.number(), // For ordering exercises in template
    linkingRejected: v.boolean(), // Track if user explicitly chose not to link
  })
    .index("by_userId", ["userId"])
    .index("by_templateId", ["templateId"])
    .index("by_template_order", ["templateId", "orderIndex"]),

  // Workout Sessions - actual workout instances
  workoutSessions: defineTable({
    userId: v.id("users"),
    templateId: v.id("workoutTemplates"),
    workoutDate: v.number(), // Timestamp in milliseconds
    // Phase 2 additions
    themeUsed: v.optional(v.string()), // 'dark' | 'light' | 'system'
    deviceType: v.optional(v.string()), // 'android' | 'ios' | 'desktop' | 'ipad' | 'other'
    perfMetrics: v.optional(v.any()), // Performance/telemetry blob
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_templateId", ["templateId"])
    .index("by_workoutDate", ["workoutDate"])
    .index("by_user_date", ["userId", "workoutDate"]),

  // Session Exercises - exercises within workout sessions with performance data
  sessionExercises: defineTable({
    userId: v.id("users"),
    sessionId: v.id("workoutSessions"),
    templateExerciseId: v.optional(v.id("templateExercises")), // Can be null
    exerciseName: v.string(),
    setOrder: v.number(),
    weight: v.optional(v.number()), // Store as number (will be in kg or converted)
    reps: v.optional(v.number()),
    sets: v.optional(v.number()),
    unit: v.string(), // "kg" | "lbs"
    // Phase 2 additions
    rpe: v.optional(v.number()), // Rate of Perceived Exertion (6-10)
    restSeconds: v.optional(v.number()), // Rest time in seconds
    isEstimate: v.boolean(),
    isDefaultApplied: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_templateExerciseId", ["templateExerciseId"])
    .index("by_exerciseName", ["exerciseName"]),

  // Daily Jokes - AI-generated jokes for users
  dailyJokes: defineTable({
    userId: v.id("users"),
    joke: v.string(),
    aiModel: v.string(),
    prompt: v.string(),
  })
    .index("by_userId", ["userId"]),

  // User Integrations - OAuth tokens for external services
  userIntegrations: defineTable({
    userId: v.id("users"),
    provider: v.string(), // 'whoop', 'strava', etc.
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()), // Timestamp in milliseconds
    scope: v.optional(v.string()), // OAuth scopes granted
    isActive: v.boolean(),
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_provider", ["provider"])
    .index("by_user_provider", ["userId", "provider"]),

  // External Workouts from Whoop
  externalWorkoutsWhoop: defineTable({
    userId: v.id("users"),
    whoopWorkoutId: v.string(), // Whoop's workout ID
    start: v.number(), // Timestamp in milliseconds
    end: v.number(), // Timestamp in milliseconds
    timezoneOffset: v.optional(v.string()),
    sportName: v.optional(v.string()),
    scoreState: v.optional(v.string()), // "SCORED", "PENDING_SCORE", etc.
    score: v.optional(v.any()), // Full score object from Whoop
    during: v.optional(v.any()), // During metrics object
    zoneDuration: v.optional(v.any()), // Zone duration object
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_whoopWorkoutId", ["whoopWorkoutId"])
    .index("by_start", ["start"])
    .index("by_user_start", ["userId", "start"])
    .index("by_user_workout_id", ["userId", "whoopWorkoutId"]),

  // Rate Limiting for API requests
  rateLimits: defineTable({
    userId: v.id("users"),
    endpoint: v.string(), // e.g., 'whoop_sync'
    requests: v.number(),
    windowStart: v.number(), // Timestamp in milliseconds
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_user_endpoint", ["userId", "endpoint"])
    .index("by_windowStart", ["windowStart"]),

  // Master Exercises - Shared exercises across templates
  masterExercises: defineTable({
    userId: v.id("users"),
    name: v.string(),
    normalizedName: v.string(), // Lowercased, trimmed name for fuzzy matching
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"])
    .index("by_normalizedName", ["normalizedName"])
    .index("by_user_normalized", ["userId", "normalizedName"]),

  // Exercise Links - Maps template exercises to master exercises
  exerciseLinks: defineTable({
    templateExerciseId: v.id("templateExercises"),
    masterExerciseId: v.id("masterExercises"),
    userId: v.id("users"),
  })
    .index("by_templateExerciseId", ["templateExerciseId"])
    .index("by_masterExerciseId", ["masterExerciseId"])
    .index("by_userId", ["userId"]),

  // AI Health Advice - Store AI advice responses for historical tracking
  healthAdvice: defineTable({
    userId: v.id("users"),
    sessionId: v.id("workoutSessions"),
    // Store the full request and response for historical tracking
    request: v.any(), // HealthAdviceRequest object
    response: v.any(), // HealthAdviceResponse object
    // Extract key metrics for easy querying
    readinessRho: v.optional(v.number()), // 0.00-1.00
    overloadMultiplier: v.optional(v.number()), // 0.90-1.10
    sessionPredictedChance: v.optional(v.number()), // 0.00-1.00
    // Track user interaction
    userAcceptedSuggestions: v.number(),
    totalSuggestions: v.number(),
    // Performance tracking
    responseTimeMs: v.optional(v.number()),
    modelUsed: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId", ["sessionId"]),

  // Webhook Events Log (for debugging and audit trail)
  webhookEvents: defineTable({
    provider: v.string(), // 'whoop', 'strava', etc.
    eventType: v.string(), // 'workout.updated', etc.
    userId: v.optional(v.id("users")), // May be null if user mapping fails
    externalUserId: v.optional(v.string()), // User ID from external provider
    externalEntityId: v.optional(v.string()), // Workout ID, etc.
    payload: v.optional(v.any()), // Full webhook payload
    headers: v.optional(v.any()), // Webhook headers for debugging
    status: v.string(), // 'received', 'processed', 'failed', 'ignored'
    error: v.optional(v.string()), // Error message if processing failed
    processingTime: v.optional(v.number()), // Processing time in ms
    processedAt: v.optional(v.number()), // Timestamp in milliseconds
  })
    .index("by_provider", ["provider"])
    .index("by_eventType", ["eventType"])
    .index("by_userId", ["userId"])
    .index("by_externalUserId", ["externalUserId"])
    .index("by_status", ["status"]),

  // Wellness Data - Manual wellness inputs for enhanced workout intelligence
  wellnessData: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("workoutSessions")), // Can be null for daily entries
    date: v.string(), // Store as YYYY-MM-DD string for date queries
    // Manual wellness inputs
    energyLevel: v.optional(v.number()), // 1-10 scale
    sleepQuality: v.optional(v.number()), // 1-10 scale
    // Metadata
    deviceTimezone: v.optional(v.string()), // Store device timezone for context
    submittedAt: v.number(), // Timestamp in milliseconds - prevent backfill
    // Context
    hasWhoopData: v.boolean(),
    whoopData: v.optional(v.any()), // Store actual Whoop metrics for comparison
    notes: v.optional(v.string()), // User notes
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_session", ["userId", "sessionId"])
    .index("by_submittedAt", ["userId", "submittedAt"]),

  // WHOOP Recovery Data (read:recovery)
  whoopRecovery: defineTable({
    userId: v.id("users"),
    whoopRecoveryId: v.string(), // WHOOP's recovery ID
    cycleId: v.optional(v.string()), // Link to cycle
    date: v.string(), // Store as YYYY-MM-DD string
    // Recovery metrics
    recoveryScore: v.optional(v.number()), // 0-100
    hrvRmssdMilli: v.optional(v.number()), // HRV in milliseconds
    hrvRmssdBaseline: v.optional(v.number()), // HRV baseline
    restingHeartRate: v.optional(v.number()), // BPM
    restingHeartRateBaseline: v.optional(v.number()), // BPM baseline
    // Full recovery data
    rawData: v.optional(v.any()), // Complete recovery payload from WHOOP
    // Metadata
    timezoneOffset: v.optional(v.string()),
    webhookReceivedAt: v.number(), // Timestamp in milliseconds
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_whoopRecoveryId", ["whoopRecoveryId"])
    .index("by_cycleId", ["cycleId"])
    .index("by_user_received", ["userId", "webhookReceivedAt"]),

  // WHOOP Cycles Data (read:cycles)
  whoopCycles: defineTable({
    userId: v.id("users"),
    whoopCycleId: v.string(), // WHOOP's cycle ID
    // Cycle timing
    start: v.number(), // Timestamp in milliseconds
    end: v.number(), // Timestamp in milliseconds
    timezoneOffset: v.optional(v.string()),
    // Cycle metrics
    dayStrain: v.optional(v.number()), // 0-21 strain scale
    averageHeartRate: v.optional(v.number()), // BPM
    maxHeartRate: v.optional(v.number()), // BPM
    kilojoule: v.optional(v.number()), // Energy expenditure
    // Full cycle data
    rawData: v.optional(v.any()), // Complete cycle payload from WHOOP
    // Metadata
    webhookReceivedAt: v.number(), // Timestamp in milliseconds
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_user_start", ["userId", "start"])
    .index("by_whoopCycleId", ["whoopCycleId"])
    .index("by_strain", ["userId", "dayStrain"]),

  // WHOOP Sleep Data (read:sleep)
  whoopSleep: defineTable({
    userId: v.id("users"),
    whoopSleepId: v.string(), // WHOOP's sleep ID
    // Sleep timing
    start: v.number(), // Timestamp in milliseconds
    end: v.number(), // Timestamp in milliseconds
    timezoneOffset: v.optional(v.string()),
    // Sleep metrics
    sleepPerformancePercentage: v.optional(v.number()), // 0-100
    totalSleepTimeMilli: v.optional(v.number()), // Milliseconds
    sleepEfficiencyPercentage: v.optional(v.number()),
    slowWaveSleepTimeMilli: v.optional(v.number()),
    remSleepTimeMilli: v.optional(v.number()),
    lightSleepTimeMilli: v.optional(v.number()),
    wakeTimeMilli: v.optional(v.number()),
    arousalTimeMilli: v.optional(v.number()),
    disturbanceCount: v.optional(v.number()),
    sleepLatencyMilli: v.optional(v.number()),
    // Full sleep data
    rawData: v.optional(v.any()), // Complete sleep payload from WHOOP
    // Metadata
    webhookReceivedAt: v.number(), // Timestamp in milliseconds
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_user_start", ["userId", "start"])
    .index("by_whoopSleepId", ["whoopSleepId"])
    .index("by_performance", ["userId", "sleepPerformancePercentage"]),

  // WHOOP Profile Data (read:profile)
  whoopProfile: defineTable({
    userId: v.id("users"),
    whoopUserId: v.string(), // WHOOP's user ID
    // Profile data
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    // Full profile data
    rawData: v.optional(v.any()), // Complete profile payload from WHOOP
    // Metadata
    webhookReceivedAt: v.number(), // Timestamp in milliseconds
    lastUpdated: v.number(), // Timestamp in milliseconds
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_whoopUserId", ["whoopUserId"]),

  // WHOOP Body Measurements (read:body_measurement)
  whoopBodyMeasurement: defineTable({
    userId: v.id("users"),
    whoopMeasurementId: v.string(), // WHOOP's measurement ID
    // Measurement data
    heightMeter: v.optional(v.number()), // Height in meters
    weightKilogram: v.optional(v.number()), // Weight in kg
    maxHeartRate: v.optional(v.number()), // BPM
    // Metadata
    measurementDate: v.optional(v.string()), // Store as YYYY-MM-DD string
    // Full measurement data
    rawData: v.optional(v.any()), // Complete measurement payload from WHOOP
    // Metadata
    webhookReceivedAt: v.number(), // Timestamp in milliseconds
    updatedAt: v.number(), // Timestamp in milliseconds
  })
    .index("by_userId", ["userId"])
    .index("by_user_date", ["userId", "measurementDate"])
    .index("by_whoopMeasurementId", ["whoopMeasurementId"]),

  // AI Suggestion History - Track user interactions with AI suggestions
  aiSuggestionHistory: defineTable({
    userId: v.id("users"),
    sessionId: v.id("workoutSessions"),
    exerciseName: v.string(),
    setId: v.string(), // Format: templateExerciseId_setIndex
    setIndex: v.number(), // 0-based set index
    // Suggestion details
    suggestedWeightKg: v.optional(v.number()),
    suggestedReps: v.optional(v.number()),
    suggestedRestSeconds: v.optional(v.number()),
    suggestionRationale: v.optional(v.string()),
    // User interaction
    action: v.string(), // 'accepted', 'rejected', 'modified'
    acceptedWeightKg: v.optional(v.number()), // What user actually used
    acceptedReps: v.optional(v.number()),
    // Context
    progressionType: v.optional(v.string()), // User's progression preference at time
    readinessScore: v.optional(v.number()), // Readiness at time of suggestion
    plateauDetected: v.boolean(),
    // Metadata
    interactionTimeMs: v.optional(v.number()), // Time from suggestion to interaction
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_exerciseName", ["exerciseName"])
    .index("by_action", ["action"]),
});