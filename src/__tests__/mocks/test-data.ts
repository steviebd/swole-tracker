// Test data factories for consistent test data
import type {
  users,
  workoutTemplates,
  workoutSessions,
  templateExercises,
  sessionExercises,
  userPreferences,
  userIntegrations,
  externalWorkoutsWhoop,
  rateLimits,
  masterExercises,
  exerciseLinks,
  healthAdvice,
  sessionDebriefs,
  webhookEvents,
  wellnessData,
  whoopRecovery,
  whoopCycles,
  whoopSleep,
  whoopProfile,
  whoopBodyMeasurement,
  oauthStates,
  sessions,
  aiSuggestionHistory,
  exerciseDailySummary,
  exerciseWeeklySummary,
  exerciseMonthlySummary,
} from "../../server/db/schema";

type User = typeof users.$inferSelect;
type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
type WorkoutSession = typeof workoutSessions.$inferSelect;
type TemplateExercise = typeof templateExercises.$inferSelect;
type SessionExercise = typeof sessionExercises.$inferSelect;
type UserPreference = typeof userPreferences.$inferSelect;
type UserIntegration = typeof userIntegrations.$inferSelect;
type ExternalWorkoutWhoop = typeof externalWorkoutsWhoop.$inferSelect;
type RateLimit = typeof rateLimits.$inferSelect;
type MasterExercise = typeof masterExercises.$inferSelect;
type ExerciseLink = typeof exerciseLinks.$inferSelect;
type HealthAdvice = typeof healthAdvice.$inferSelect;
type SessionDebrief = typeof sessionDebriefs.$inferSelect;
type WebhookEvent = typeof webhookEvents.$inferSelect;
type WellnessData = typeof wellnessData.$inferSelect;
type WhoopRecovery = typeof whoopRecovery.$inferSelect;
type WhoopCycle = typeof whoopCycles.$inferSelect;
type WhoopSleep = typeof whoopSleep.$inferSelect;
type WhoopProfile = typeof whoopProfile.$inferSelect;
type WhoopBodyMeasurement = typeof whoopBodyMeasurement.$inferSelect;
type OAuthState = typeof oauthStates.$inferSelect;
type Session = typeof sessions.$inferSelect;
type AISuggestionHistory = typeof aiSuggestionHistory.$inferSelect;
type ExerciseDailySummary = typeof exerciseDailySummary.$inferSelect;
type ExerciseWeeklySummary = typeof exerciseWeeklySummary.$inferSelect;
type ExerciseMonthlySummary = typeof exerciseMonthlySummary.$inferSelect;

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: "test-user-id",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  profilePictureUrl: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWorkoutTemplate = (
  overrides: Partial<WorkoutTemplate> = {},
): WorkoutTemplate => ({
  id: 1,
  name: "Push Day",
  user_id: "test-user-id",
  dedupeKey: null,
  warmupConfig: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWorkoutSession = (
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession => ({
  id: 1,
  user_id: "test-user-id",
  templateId: 1,
  workoutDate: new Date("2024-01-01T00:00:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockTemplateExercise = (
  overrides: Partial<TemplateExercise> = {},
): TemplateExercise => ({
  id: 1,
  user_id: "test-user-id",
  templateId: 1,
  exerciseName: "Bench Press",
  orderIndex: 0,
  linkingRejected: false,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

export const createMockSessionExercise = (
  overrides: Partial<SessionExercise> = {},
): SessionExercise => ({
  id: 1,
  user_id: "test-user-id",
  sessionId: 1,
  templateExerciseId: 1,
  exerciseName: "Bench Press",
  resolvedExerciseName: "Bench Press",
  setOrder: 0,
  weight: 185.0,
  reps: 10,
  sets: 3,
  unit: "kg",
  rpe: null,
  rest_seconds: null,
  is_estimate: false,
  is_default_applied: false,
  one_rm_estimate: 205.0,
  volume_load: 5550.0,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

export const createMockUserPreferences = (
  overrides: Partial<UserPreference> = {},
): UserPreference => ({
  id: 1,
  user_id: "test-user-id",
  defaultWeightUnit: "kg",
  predictive_defaults_enabled: false,
  right_swipe_action: "collapse_expand",
  enable_manual_wellness: false,
  progression_type: "adaptive",
  progression_type_enum: "adaptive",
  linear_progression_kg: 2.5,
  percentage_progression: 2.5,
  targetWorkoutsPerWeek: 3.0,
  warmupStrategy: "history",
  warmupSetsCount: 3,
  warmupPercentages: "[40, 60, 80]",
  warmup_percentages_array: "40,60,80",
  warmupRepsStrategy: "match_working",
  warmupFixedReps: 5,
  enableMovementPatternSharing: false,
  // Recovery-Guided Session Planner preferences
  enableRecoveryPlanner: false,
  recoveryPlannerStrategy: "adaptive",
  recoveryPlannerSensitivity: 5,
  autoAdjustIntensity: true,
  recoveryPlannerPreferences: null,
  // Plateau & Milestone preferences
  experienceLevel: "intermediate",
  bodyweight: null,
  bodyweightSource: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockUserIntegration = (
  overrides: Partial<UserIntegration> = {},
): UserIntegration => ({
  id: 1,
  user_id: "test-user-id",
  provider: "whoop",
  externalUserId: "whoop-user-123",
  accessToken: "access-token-123",
  refreshToken: "refresh-token-123",
  expiresAt: new Date("2024-12-31T00:00:00.000Z"),
  scope: "read:recovery,read:sleep",
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockExternalWorkoutWhoop = (
  overrides: Partial<ExternalWorkoutWhoop> = {},
): ExternalWorkoutWhoop => ({
  id: 1,
  user_id: "test-user-id",
  whoopWorkoutId: "workout-123",
  start: new Date("2024-01-01T10:00:00.000Z"),
  end: new Date("2024-01-01T11:00:00.000Z"),
  timezone_offset: "+00:00",
  sport_name: "weightlifting",
  score_state: "SCORED",
  score: '{"strain": 12.5}',
  during: '{"heart_rate": {"average": 140}}',
  zone_duration: '{"zone_one_duration": 3600}',
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockRateLimit = (
  overrides: Partial<RateLimit> = {},
): RateLimit => ({
  id: 1,
  user_id: "test-user-id",
  endpoint: "whoop_sync",
  requests: 5,
  windowStart: "2024-01-01T00:00:00.000Z",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockMasterExercise = (
  overrides: Partial<MasterExercise> = {},
): MasterExercise => ({
  id: 1,
  user_id: "test-user-id",
  name: "Bench Press",
  normalizedName: "bench press",
  tags: "chest,barbell,compound",
  muscleGroup: "chest",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockExerciseLink = (
  overrides: Partial<ExerciseLink> = {},
): ExerciseLink => ({
  id: 1,
  templateExerciseId: 1,
  masterExerciseId: 1,
  user_id: "test-user-id",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

export const createMockHealthAdvice = (
  overrides: Partial<HealthAdvice> = {},
): HealthAdvice => ({
  id: 1,
  user_id: "test-user-id",
  sessionId: 1,
  request: '{"readiness": 0.8}',
  response: '{"suggestions": []}',
  readiness_rho: 0.8,
  overload_multiplier: 1.0,
  session_predicted_chance: 0.9,
  user_accepted_suggestions: 2,
  total_suggestions: 3,
  response_time_ms: 150,
  model_used: "gpt-4",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

export const createMockSessionDebrief = (
  overrides: Partial<SessionDebrief> = {},
): SessionDebrief => ({
  id: 1,
  user_id: "test-user-id",
  sessionId: 1,
  version: 1,
  parentDebriefId: null,
  summary: "Great workout session with PRs in bench press",
  prHighlights:
    '[{"exerciseName":"Bench Press","metric":"weight","summary":"185lbs x 10","delta":5,"unit":"lbs","currentValue":185,"previousValue":180,"emoji":"🏋️"}]',
  adherenceScore: 0.95,
  focusAreas: "Increase volume on accessories",
  streakContext: "5th consecutive workout",
  overloadDigest: "Moderate overload detected",
  metadata: '{"duration": 3600}',
  isActive: true,
  viewedAt: null,
  dismissedAt: null,
  pinnedAt: null,
  regenerationCount: 0,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWebhookEvent = (
  overrides: Partial<WebhookEvent> = {},
): WebhookEvent => ({
  id: 1,
  provider: "whoop",
  eventType: "workout.updated",
  userId: "test-user-id",
  externalUserId: "whoop-user-123",
  externalEntityId: "workout-123",
  payload: '{"workout": {"id": "123"}}',
  headers: '{"content-type": "application/json"}',
  status: "processed",
  error: null,
  processingTime: 50,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  processedAt: new Date("2024-01-01T00:00:05.000Z"),
  ...overrides,
});

export const createMockWellnessData = (
  overrides: Partial<WellnessData> = {},
): WellnessData => ({
  id: 1,
  user_id: "test-user-id",
  sessionId: 1,
  date: new Date("2024-01-01T00:00:00.000Z"),
  energy_level: 8,
  sleep_quality: 7,
  device_timezone: "America/New_York",
  submitted_at: new Date("2024-01-01T08:00:00.000Z"),
  has_whoop_data: true,
  whoop_data: '{"recovery_score": 85}',
  notes: "Feeling strong today",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWhoopRecovery = (
  overrides: Partial<WhoopRecovery> = {},
): WhoopRecovery => ({
  id: 1,
  user_id: "test-user-id",
  whoop_recovery_id: "recovery-123",
  cycle_id: "cycle-123",
  date: new Date("2024-01-01T00:00:00.000Z"),
  recovery_score: 85,
  hrv_rmssd_milli: 45.5,
  hrv_rmssd_baseline: 42.0,
  resting_heart_rate: 55,
  resting_heart_rate_baseline: 58,
  respiratory_rate: 14.2,
  respiratory_rate_baseline: 14.5,
  raw_data: '{"recovery": {"score": 85}}',
  recovery_score_tier: "high",
  timezone_offset: "+00:00",
  webhook_received_at: new Date("2024-01-01T06:00:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWhoopCycle = (
  overrides: Partial<WhoopCycle> = {},
): WhoopCycle => ({
  id: 1,
  user_id: "test-user-id",
  whoop_cycle_id: "cycle-123",
  start: new Date("2024-01-01T00:00:00.000Z"),
  end: new Date("2024-01-02T00:00:00.000Z"),
  timezone_offset: "+00:00",
  day_strain: 15.5,
  average_heart_rate: 75,
  max_heart_rate: 180,
  kilojoule: 2500.0,
  percent_recorded: 95.0,
  distance_meter: 5000,
  altitude_gain_meter: 100,
  altitude_change_meter: 50,
  raw_data: '{"cycle": {"strain": 15.5}}',
  webhook_received_at: new Date("2024-01-02T06:00:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWhoopSleep = (
  overrides: Partial<WhoopSleep> = {},
): WhoopSleep => ({
  id: 1,
  user_id: "test-user-id",
  whoop_sleep_id: "sleep-123",
  start: new Date("2024-01-01T22:00:00.000Z"),
  end: new Date("2024-01-02T06:00:00.000Z"),
  timezone_offset: "+00:00",
  sleep_performance_percentage: 88,
  total_sleep_time_milli: 28800000,
  sleep_efficiency_percentage: 92.0,
  slow_wave_sleep_time_milli: 7200000,
  rem_sleep_time_milli: 5760000,
  light_sleep_time_milli: 11520000,
  wake_time_milli: 432000,
  arousal_time_milli: 180000,
  disturbance_count: 3,
  sleep_latency_milli: 900000,
  sleep_consistency_percentage: 85.0,
  sleep_need_baseline_milli: 28800000,
  sleep_need_from_sleep_debt_milli: 3600000,
  sleep_need_from_recent_strain_milli: 1800000,
  sleep_need_from_recent_nap_milli: 0,
  raw_data: '{"sleep": {"performance_percentage": 88}}',
  sleep_quality_tier: "excellent",
  webhook_received_at: new Date("2024-01-02T06:30:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWhoopProfile = (
  overrides: Partial<WhoopProfile> = {},
): WhoopProfile => ({
  id: 1,
  user_id: "test-user-id",
  whoop_user_id: "whoop-user-123",
  email: "user@whoop.com",
  first_name: "John",
  last_name: "Doe",
  raw_data: '{"profile": {"email": "user@whoop.com"}}',
  webhook_received_at: new Date("2024-01-01T00:00:00.000Z"),
  last_updated: new Date("2024-01-01T00:00:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockWhoopBodyMeasurement = (
  overrides: Partial<WhoopBodyMeasurement> = {},
): WhoopBodyMeasurement => ({
  id: 1,
  user_id: "test-user-id",
  whoop_measurement_id: "measurement-123",
  height_meter: 1.75,
  weight_kilogram: 75.5,
  max_heart_rate: 195,
  measurement_date: new Date("2024-01-01T00:00:00.000Z"),
  raw_data: '{"measurement": {"weight_kilogram": 75.5}}',
  webhook_received_at: new Date("2024-01-01T00:00:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockOAuthState = (
  overrides: Partial<OAuthState> = {},
): OAuthState => ({
  id: 1,
  state: "oauth-state-123",
  user_id: "test-user-id",
  provider: "whoop",
  redirect_uri: "https://app.example.com/auth/callback",
  client_ip: "192.168.1.1",
  user_agent_hash: "hash123",
  expiresAt: new Date("2024-01-01T00:10:00.000Z"),
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

export const createMockSession = (
  overrides: Partial<Session> = {},
): Session => ({
  id: "session-123",
  userId: "test-user-id",
  organizationId: null,
  accessToken: "access-token-123",
  refreshToken: "refresh-token-123",
  expiresAt: 1735689600, // 2025-01-01
  accessTokenExpiresAt: 1735686000,
  sessionExpiresAt: 1735689600,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

export const createMockAISuggestionHistory = (
  overrides: Partial<AISuggestionHistory> = {},
): AISuggestionHistory => ({
  id: 1,
  user_id: "test-user-id",
  sessionId: 1,
  exerciseName: "Bench Press",
  setId: "1_0",
  setIndex: 0,
  suggested_weight_kg: 190.0,
  suggested_reps: 8,
  suggested_rest_seconds: 180,
  suggestion_rationale: "Based on your progression pattern",
  action: "accepted",
  accepted_weight_kg: 190.0,
  accepted_reps: 8,
  progression_type: "adaptive",
  readiness_score: 0.85,
  plateau_detected: false,
  interaction_time_ms: 5000,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

export const createMockExerciseDailySummary = (
  overrides: Partial<ExerciseDailySummary> = {},
): ExerciseDailySummary => ({
  user_id: "test-user-id",
  exercise_name: "Bench Press",
  date: new Date("2024-01-01T00:00:00.000Z"),
  total_volume: 5550.0,
  max_weight: 185.0,
  max_one_rm: 205.0,
  session_count: 1,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockExerciseWeeklySummary = (
  overrides: Partial<ExerciseWeeklySummary> = {},
): ExerciseWeeklySummary => ({
  user_id: "test-user-id",
  exercise_name: "Bench Press",
  week_start: new Date("2023-12-25T00:00:00.000Z"), // Monday
  avg_volume: 5550.0,
  max_one_rm: 205.0,
  session_count: 1,
  trend_slope: 2.5,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

export const createMockExerciseMonthlySummary = (
  overrides: Partial<ExerciseMonthlySummary> = {},
): ExerciseMonthlySummary => ({
  user_id: "test-user-id",
  exercise_name: "Bench Press",
  month_start: new Date("2024-01-01T00:00:00.000Z"),
  total_volume: 5550.0,
  max_one_rm: 205.0,
  session_count: 1,
  consistency_score: 0.8,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: null,
  ...overrides,
});

// Array factories
export const createMockWorkoutTemplates = (count = 3) =>
  Array.from({ length: count }, (_, i) =>
    createMockWorkoutTemplate({
      id: i + 1,
      name: ["Push Day", "Pull Day", "Leg Day"][i % 3]!,
    }),
  );

export const createMockWorkoutSessions = (count = 3) =>
  Array.from({ length: count }, (_, i) =>
    createMockWorkoutSession({
      id: i + 1,
      workoutDate: new Date(`2024-01-0${i + 1}T00:00:00.000Z`),
    }),
  );

export const createMockSessionExercises = (count = 5, sessionId = 1) =>
  Array.from({ length: count }, (_, i) =>
    createMockSessionExercise({
      id: i + 1,
      sessionId,
      exerciseName: [
        "Bench Press",
        "Squat",
        "Deadlift",
        "Overhead Press",
        "Pull-ups",
      ][i % 5]!,
      weight: Math.floor(Math.random() * 200) + 45,
      reps: Math.floor(Math.random() * 12) + 1,
      sets: Math.floor(Math.random() * 5) + 1,
    }),
  );

// Legacy aliases for backward compatibility
export const createMockWorkout = createMockWorkoutTemplate;
export const createMockExercise = createMockSessionExercise;
export const createMockWorkouts = createMockWorkoutTemplates;
export const createMockExercises = createMockSessionExercises;
