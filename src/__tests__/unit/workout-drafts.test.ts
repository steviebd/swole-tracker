import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";

import {
  getWorkoutDraft,
  removeWorkoutDraft,
  saveWorkoutDraft,
} from "~/lib/workout-drafts";
import type { ExerciseData } from "~/app/_components/exercise-card";

const STORAGE_KEY = "workoutDrafts.v1";

const storage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
};

describe("workout drafts", () => {
  let originalWindow: typeof window | undefined;

  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    originalWindow = globalThis.window;
    (globalThis as typeof globalThis & { window: typeof window }).window = {
      localStorage: mockLocalStorage,
    } as unknown as typeof window;
  });

  afterEach(() => {
    if (originalWindow) {
      (globalThis as typeof globalThis & { window: typeof window }).window =
        originalWindow;
    } else {
      (globalThis as any).window = undefined;
    }
  });

  test("persists sanitized draft and retrieves it", () => {
    const exercises: ExerciseData[] = [
      {
        exerciseName: "Bench Press",
        templateExerciseId: 1,
        unit: "kg",
        sets: [
          {
            id: "temp-1",
            weight: 100,
            reps: 5,
            sets: 0, // should default to 1 when sanitized
            unit: "kg",
          },
        ],
      },
    ];

    saveWorkoutDraft(42, exercises);

    const stored = getWorkoutDraft(42);
    expect(stored).not.toBeNull();
    expect(stored?.sessionId).toBe(42);
    expect(stored?.exercises).toHaveLength(1);
    expect(stored?.exercises[0]?.sets[0]?.sets).toBe(1);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String),
    );
  });

  test("ignores drafts that have only blank default sets", () => {
    const exercises: ExerciseData[] = [
      {
        exerciseName: "Deadlift",
        templateExerciseId: 9,
        unit: "lbs",
        sets: [
          {
            id: "default-1",
            sets: 1,
            unit: "lbs",
          },
        ],
      },
    ];

    saveWorkoutDraft(99, exercises);
    expect(getWorkoutDraft(99)).toBeNull();
    expect(storage[STORAGE_KEY]).toBeUndefined();
  });

  test("removes draft when save receives empty exercises", () => {
    const exercises: ExerciseData[] = [
      {
        exerciseName: "Row",
        templateExerciseId: 3,
        unit: "kg",
        sets: [
          {
            id: "row-1",
            weight: 60,
            reps: 10,
            sets: 3,
            unit: "kg",
          },
        ],
      },
    ];

    saveWorkoutDraft(10, exercises);
    expect(getWorkoutDraft(10)).not.toBeNull();

    saveWorkoutDraft(10, []);

    expect(getWorkoutDraft(10)).toBeNull();
  });

  test("removeWorkoutDraft clears only matching session", () => {
    const exercises: ExerciseData[] = [
      {
        exerciseName: "Squat",
        templateExerciseId: 2,
        unit: "kg",
        sets: [
          {
            id: "s1",
            weight: 200,
            reps: 3,
            sets: 3,
            unit: "kg",
          },
        ],
      },
    ];

    saveWorkoutDraft(1, exercises);
    saveWorkoutDraft(2, exercises);

    removeWorkoutDraft(1);

    const storedOne = getWorkoutDraft(1);
    const storedTwo = getWorkoutDraft(2);

    expect(storedOne).toBeNull();
    expect(storedTwo).not.toBeNull();
    expect(JSON.parse(storage[STORAGE_KEY] as string)).toHaveLength(1);
  });
});
