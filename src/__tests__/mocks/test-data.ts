// Test data factories for consistent test data

export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

export const createMockWorkout = (overrides = {}) => ({
  id: "test-workout-id",
  userId: "test-user-id",
  name: "Test Workout",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

export const createMockExercise = (overrides = {}) => ({
  id: "test-exercise-id",
  workoutId: "test-workout-id",
  name: "Bench Press",
  sets: 3,
  reps: 10,
  weight: 185,
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

export const createMockWorkoutSession = (overrides = {}) => ({
  id: "test-session-id",
  workoutId: "test-workout-id",
  startedAt: new Date("2024-01-01T10:00:00"),
  completedAt: new Date("2024-01-01T11:00:00"),
  exercises: [createMockExercise()],
  ...overrides,
});

// Array factories
export const createMockWorkouts = (count = 3) =>
  Array.from({ length: count }, (_, i) =>
    createMockWorkout({
      id: `workout-${i}`,
      name: `Workout ${i + 1}`,
    }),
  );

export const createMockExercises = (count = 5, workoutId = "test-workout-id") =>
  Array.from({ length: count }, (_, i) =>
    createMockExercise({
      id: `exercise-${i}`,
      workoutId,
      name: ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Pull-ups"][
        i % 5
      ],
      sets: Math.floor(Math.random() * 5) + 1,
      reps: Math.floor(Math.random() * 12) + 1,
      weight: Math.floor(Math.random() * 200) + 45,
    }),
  );
