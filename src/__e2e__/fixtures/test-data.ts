/**
 * Test data fixtures for e2e tests
 */

export interface TestTemplate {
  name: string;
  exercises: TestExercise[];
}

export interface TestExercise {
  name: string;
  sets?: number;
  reps?: string;
  rest?: number;
  notes?: string;
}

export interface TestWorkoutSet {
  weight: number;
  reps: number;
  rpe?: number;
}

export const TEST_TEMPLATES: TestTemplate[] = [
  {
    name: "Push Day",
    exercises: [
      {
        name: "Bench Press",
        sets: 4,
        reps: "6-8",
        rest: 180,
        notes: "Focus on controlled movement",
      },
      {
        name: "Overhead Press",
        sets: 3,
        reps: "8-10",
        rest: 120,
        notes: "Keep core tight",
      },
      {
        name: "Incline Dumbbell Press",
        sets: 3,
        reps: "10-12",
        rest: 90,
      },
      {
        name: "Tricep Dips",
        sets: 3,
        reps: "12-15",
        rest: 60,
      },
    ],
  },
  {
    name: "Pull Day",
    exercises: [
      {
        name: "Pull-ups",
        sets: 4,
        reps: "5-8",
        rest: 180,
        notes: "Add weight if needed",
      },
      {
        name: "Barbell Rows",
        sets: 4,
        reps: "6-8",
        rest: 150,
        notes: "Pull to chest",
      },
      {
        name: "Lat Pulldowns",
        sets: 3,
        reps: "10-12",
        rest: 90,
      },
      {
        name: "Bicep Curls",
        sets: 3,
        reps: "12-15",
        rest: 60,
      },
    ],
  },
  {
    name: "Leg Day",
    exercises: [
      {
        name: "Squats",
        sets: 4,
        reps: "6-8",
        rest: 240,
        notes: "Full depth, knees out",
      },
      {
        name: "Romanian Deadlifts",
        sets: 3,
        reps: "8-10",
        rest: 180,
        notes: "Feel the stretch",
      },
      {
        name: "Bulgarian Split Squats",
        sets: 3,
        reps: "10-12 each leg",
        rest: 90,
      },
      {
        name: "Calf Raises",
        sets: 4,
        reps: "15-20",
        rest: 45,
      },
    ],
  },
  {
    name: "Upper Body Circuit",
    exercises: [
      {
        name: "Push-ups",
        sets: 3,
        reps: "10-15",
        rest: 30,
      },
      {
        name: "Pike Push-ups",
        sets: 3,
        reps: "8-12",
        rest: 30,
      },
      {
        name: "Diamond Push-ups",
        sets: 2,
        reps: "5-10",
        rest: 45,
      },
    ],
  },
];

export const TEST_WORKOUT_SETS: Record<string, TestWorkoutSet[]> = {
  "Bench Press": [
    { weight: 135, reps: 10 },
    { weight: 155, reps: 8 },
    { weight: 175, reps: 6 },
    { weight: 155, reps: 8 },
  ],
  "Squats": [
    { weight: 185, reps: 12 },
    { weight: 205, reps: 10 },
    { weight: 225, reps: 8 },
    { weight: 245, reps: 6 },
  ],
  "Pull-ups": [
    { weight: 0, reps: 8 },
    { weight: 0, reps: 7 },
    { weight: 0, reps: 6 },
  ],
  "Overhead Press": [
    { weight: 95, reps: 10 },
    { weight: 115, reps: 8 },
    { weight: 125, reps: 6 },
  ],
};

export const TEST_USERS = {
  VALID_LOGIN: {
    email: "test@swole-tracker.com",
    password: "TestPassword123!",
  },
  INVALID_LOGIN: {
    email: "invalid@email.com",
    password: "wrongpassword",
  },
  NEW_REGISTRATION: {
    email: `new-user-${Date.now()}@swole-tracker.com`,
    password: "NewPassword123!",
  },
};

export const WORKOUT_PROGRESSION_EXAMPLES = {
  LINEAR: [
    { weight: 135, reps: 8 },
    { weight: 140, reps: 8 },
    { weight: 145, reps: 8 },
    { weight: 150, reps: 8 },
  ],
  PYRAMID: [
    { weight: 135, reps: 12 },
    { weight: 155, reps: 10 },
    { weight: 175, reps: 8 },
    { weight: 185, reps: 6 },
    { weight: 175, reps: 8 },
    { weight: 155, reps: 10 },
  ],
  DROP_SET: [
    { weight: 185, reps: 8 },
    { weight: 165, reps: 10 },
    { weight: 145, reps: 12 },
    { weight: 125, reps: 15 },
  ],
};

export function getRandomTemplate(): TestTemplate {
  return TEST_TEMPLATES[Math.floor(Math.random() * TEST_TEMPLATES.length)]!;
}

export function getRandomExercise(): TestExercise {
  const template = getRandomTemplate();
  return template.exercises[Math.floor(Math.random() * template.exercises.length)]!;
}

export function getTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@swole-tracker-e2e.com`;
}

export function getTestPassword(): string {
  return "TestPassword123!";
}