// Auto-generated test data factories
// Generated on 2025-10-16T03:15:50.035Z

type Override<T> = Partial<T>;

interface UserData {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface WorkoutData {
  id: string;
  user_id: string;
  start: string;
  end: string;
  duration: number;
  createdAt: string;
}

interface ExerciseData {
  id: string;
  name: string;
  category: string;
  createdAt: string;
}

export const createUser = (overrides: Override<UserData> = {}) => ({
  ...{
  "id": "user-123",
  "email": "test@example.com",
  "name": "Test User",
  "createdAt": "2025-10-16T03:15:50.035Z"
},
  ...overrides,
});

export const createWorkout = (
  overrides: Override<WorkoutData> = {},
) => ({
  ...{
  "id": "workout-123",
  "user_id": "user-123",
  "start": "2025-10-16T03:15:50.035Z",
  "end": "2025-10-16T04:15:50.035Z",
  "duration": 3600,
  "createdAt": "2025-10-16T03:15:50.035Z"
},
  ...overrides,
});

export const createExercise = (
  overrides: Override<ExerciseData> = {},
) => ({
  ...{
  "id": "exercise-123",
  "name": "Bench Press",
  "category": "chest",
  "createdAt": "2025-10-16T03:15:50.035Z"
},
  ...overrides,
});

// WHOOP-specific data factories
interface WhoopIntegrationData {
  id: string;
  user_id: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  scope: string;
}

interface WhoopRecoveryData {
  id: string;
  user_id: string;
  recovery_score: number;
  hrv_rmssd_milli: string;
  hrv_rmssd_baseline: string;
  resting_heart_rate: number;
  resting_heart_rate_baseline: number;
  respiratory_rate: number;
  respiratory_rate_baseline: number;
  raw_data: Record<string, unknown>;
  date: string;
}

interface WhoopSleepData {
  id: string;
  user_id: string;
  sleep_performance_percentage: number;
  raw_data: Record<string, unknown>;
  start: string;
}

interface WhoopWorkoutData {
  id: number;
  user_id: string;
  whoopWorkoutId: string;
  start: string;
  end: string;
  sport_name: string;
  score_state: string;
  score: number;
  during: Record<string, unknown>;
  zone_duration: Record<string, unknown>;
  createdAt: string;
}

export const createWhoopIntegration = (
  overrides: Override<WhoopIntegrationData> = {},
) => ({
  id: "integration-123",
  user_id: "user-123",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  expiresAt: "2025-12-31T00:00:00.000Z",
  scope: "read:profile read:recovery",
  ...overrides,
});

export const createWhoopRecovery = (
  overrides: Override<WhoopRecoveryData> = {},
) => ({
  id: "recovery-123",
  user_id: "user-123",
  recovery_score: 85,
  hrv_rmssd_milli: "45.2",
  hrv_rmssd_baseline: "42.1",
  resting_heart_rate: 60,
  resting_heart_rate_baseline: 65,
  respiratory_rate: 14.2,
  respiratory_rate_baseline: 13.9,
  raw_data: { recovery: true },
  date: "2024-01-15T00:00:00.000Z",
  ...overrides,
});

export const createWhoopSleep = (
  overrides: Override<WhoopSleepData> = {},
) => ({
  id: "sleep-123",
  user_id: "user-123",
  sleep_performance_percentage: 92,
  raw_data: { sleep: true },
  start: "2024-01-15T00:00:00.000Z",
  ...overrides,
});

export const createWhoopWorkout = (
  overrides: Override<WhoopWorkoutData> = {},
) => ({
  id: 1,
  user_id: "user-123",
  whoopWorkoutId: "workout-123",
  start: "2024-01-01T10:00:00.000Z",
  end: "2024-01-01T11:00:00.000Z",
  sport_name: "Running",
  score_state: "SCORED",
  score: 15.5,
  during: { heart_rate: 150 },
  zone_duration: { zone_one_duration: 1800 },
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Health Advice data factories
interface HealthAdviceRequestData {
  session_id: string;
  user_profile: {
    experience_level: "beginner" | "intermediate" | "advanced";
    min_increment_kg?: number;
    preferred_rpe?: number;
  };
  whoop?: {
    recovery_score?: number;
    sleep_performance?: number;
    hrv_now_ms?: number;
    hrv_baseline_ms?: number;
    rhr_now_bpm?: number;
    rhr_baseline_bpm?: number;
    yesterday_strain?: number;
  };
  workout_plan: {
    exercises: Array<{
      exercise_id: string;
      name: string;
      tags: ("strength" | "hypertrophy" | "endurance")[];
      sets: Array<{
        set_id: string;
        target_reps?: number | null;
        target_weight_kg?: number | null;
        target_rpe?: number | null;
      }>;
    }>;
  };
  prior_bests: {
    by_exercise_id: Record<string, {
      best_total_volume_kg?: number | null;
      best_e1rm_kg?: number | null;
    }>;
  };
}

interface HealthAdviceResponseData {
  session_id: string;
  readiness: {
    rho: number;
    overload_multiplier: number;
    flags: string[];
  };
  per_exercise: Array<{
    exercise_id: string;
    name?: string;
    predicted_chance_to_beat_best: number;
    planned_volume_kg?: number | null;
    best_volume_kg?: number | null;
    sets: Array<{
      set_id: string;
      suggested_weight_kg?: number | null;
      suggested_reps?: number | null;
      suggested_rest_seconds?: number | null;
      rationale: string;
    }>;
  }>;
  session_predicted_chance: number;
  summary: string;
  warnings: string[];
  recovery_recommendations?: {
    recommended_rest_between_sets: string;
    recommended_rest_between_sessions: string;
    session_duration_estimate?: string | null;
    additional_recovery_notes: string[];
  } | null;
}

interface HealthAdviceRecordData {
  id: number;
  user_id: string;
  sessionId: number;
  request: HealthAdviceRequestData;
  response: HealthAdviceResponseData;
  readiness_rho: string;
  overload_multiplier: string;
  session_predicted_chance: string;
  user_accepted_suggestions: number;
  total_suggestions: number;
  response_time_ms: number;
  model_used: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export const createHealthAdviceRequest = (
  overrides: Override<HealthAdviceRequestData> = {},
) => ({
  session_id: "session-123",
  user_profile: {
    experience_level: "intermediate" as const,
    min_increment_kg: 2.5,
    preferred_rpe: 7,
  },
  whoop: {
    recovery_score: 85,
    sleep_performance: 90,
    hrv_now_ms: 45,
    hrv_baseline_ms: 42,
    rhr_now_bpm: 60,
    rhr_baseline_bpm: 65,
    yesterday_strain: 15,
  },
  workout_plan: {
    exercises: [
      {
        exercise_id: "bench-press-1",
        name: "Bench Press",
        tags: ["strength" as const],
        sets: [
          {
            set_id: "set-1",
            target_reps: 8,
            target_weight_kg: 80,
            target_rpe: 7,
          },
          {
            set_id: "set-2",
            target_reps: 6,
            target_weight_kg: 80,
            target_rpe: 8,
          },
        ],
      },
    ],
  },
  prior_bests: {
    by_exercise_id: {
      "bench-press-1": {
        best_total_volume_kg: 640,
        best_e1rm_kg: 95,
      },
    },
  },
  ...overrides,
});

export const createHealthAdviceResponse = (
  overrides: Override<HealthAdviceResponseData> = {},
) => ({
  session_id: "session-123",
  readiness: {
    rho: 0.85,
    overload_multiplier: 1.1,
    flags: ["good_recovery"],
  },
  session_predicted_chance: 0.75,
  per_exercise: [
    {
      exercise_id: "bench-press-1",
      name: "Bench Press",
      predicted_chance_to_beat_best: 0.7,
      planned_volume_kg: 640,
      best_volume_kg: 640,
      sets: [
        {
          set_id: "set-1",
          suggested_weight_kg: 82.5,
          suggested_reps: 8,
          suggested_rest_seconds: 180,
          rationale: "Linear progression",
        },
      ],
    },
  ],
  summary: "Good recovery state, moderate progression recommended",
  warnings: [],
  recovery_recommendations: {
    recommended_rest_between_sets: "2-3 minutes",
    recommended_rest_between_sessions: "48 hours",
    session_duration_estimate: "45 minutes",
    additional_recovery_notes: ["Maintain current sleep schedule"],
  },
  ...overrides,
});

export const createHealthAdviceRecord = (
  overrides: Override<HealthAdviceRecordData> = {},
) => ({
  id: 1,
  user_id: "user-123",
  sessionId: 1,
  request: createHealthAdviceRequest(),
  response: createHealthAdviceResponse(),
  readiness_rho: "0.85",
  overload_multiplier: "1.1",
  session_predicted_chance: "0.75",
  user_accepted_suggestions: 0,
  total_suggestions: 1,
  response_time_ms: 1500,
  model_used: "gpt-4o-mini",
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

// Bulk creation utilities
export const createUsers = (
  count: number,
  overrides: Override<UserData> = {},
) =>
  Array.from({ length: count }, (_, i) =>
    createUser({ id: "user-" + (i + 1), ...overrides }),
  );

export const createWorkouts = (
  count: number,
  userId = "user-123",
  overrides: Override<WorkoutData> = {},
) =>
  Array.from({ length: count }, (_, i) =>
    createWorkout({
      id: "workout-" + (i + 1),
      user_id: userId,
      ...overrides,
    }),
  );

export const createWhoopRecoveries = (
  count: number,
  userId = "user-123",
  overrides: Override<WhoopRecoveryData> = {},
) =>
  Array.from({ length: count }, (_, i) =>
    createWhoopRecovery({
      id: "recovery-" + (i + 1),
      user_id: userId,
      ...overrides,
    }),
  );

export const createWhoopSleeps = (
  count: number,
  userId = "user-123",
  overrides: Override<WhoopSleepData> = {},
) =>
  Array.from({ length: count }, (_, i) =>
    createWhoopSleep({
      id: "sleep-" + (i + 1),
      user_id: userId,
      ...overrides,
    }),
  );
