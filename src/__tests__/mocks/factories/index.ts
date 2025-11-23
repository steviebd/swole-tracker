import { createId } from "~/lib/utils";

export const createMockUser = (overrides = {}) => ({
  id: "test-user",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockWorkout = (overrides = {}) => ({
  id: createId(),
  userId: "test-user",
  name: "Test Workout",
  startedAt: new Date(),
  completedAt: new Date(),
  exercises: [],
  ...overrides,
});

export const createMockExercise = (overrides = {}) => ({
  id: createId(),
  name: "Test Exercise",
  category: "strength",
  muscleGroups: ["chest"],
  ...overrides,
});

export const createMockSet = (overrides = {}) => ({
  id: createId(),
  workoutId: createId(),
  exerciseId: createId(),
  setNumber: 1,
  weight: 80,
  reps: 8,
  unit: "kg",
  ...overrides,
});

export const createMockTemplate = (overrides = {}) => ({
  id: createId(),
  userId: "test-user",
  name: "Test Template",
  exercises: [],
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockWorkoutSession = (overrides = {}) => ({
  id: createId(),
  workoutId: createId(),
  userId: "test-user",
  startedAt: new Date(),
  status: "active" as const,
  exercises: [],
  ...overrides,
});

// D1-specific helpers for testing chunking
export const createLargeWorkoutArray = (count: number) => 
  Array.from({ length: count }, (_, i) => 
    createMockWorkout({ 
      id: `workout-${i}`,
      name: `Workout ${i}` 
    })
  );

export const createLargeExerciseArray = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createMockExercise({
      id: `exercise-${i}`,
      name: `Exercise ${i}`
    })
  );