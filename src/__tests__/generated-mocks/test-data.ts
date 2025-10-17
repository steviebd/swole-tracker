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
