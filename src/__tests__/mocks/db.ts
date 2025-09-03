import { vi } from "vitest";

// Mock Drizzle database
export const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
};

// Mock database tables
export const mockTables = {
  users: {
    id: "id",
    email: "email",
    name: "name",
    createdAt: "created_at",
  },
  workouts: {
    id: "id",
    userId: "user_id",
    name: "name",
    createdAt: "created_at",
  },
  exercises: {
    id: "id",
    workoutId: "workout_id",
    name: "name",
    sets: "sets",
    reps: "reps",
    weight: "weight",
  },
};

// Mock database connection
export const createMockDb = () => mockDb;
