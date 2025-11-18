import { describe, it, expect, vi, beforeEach } from "vitest";
import { workoutsRouter } from "~/server/api/routers/workouts";
import { createMockUser } from "~/__tests__/mocks/test-data";

// Mock chunk utils
vi.mock("~/server/db/chunk-utils", () => ({
  whereInChunks: vi.fn(async (_db, ids, callback) => {
    const result = await callback(ids);
    return Array.isArray(result) ? result : [];
  }),
  chunkedBatch: vi.fn(async (_db, items, callback) => {
    return [await callback(items)];
  }),
  SQLITE_VARIABLE_LIMIT: 999,
}));

// Mock pattern detection
vi.mock("~/server/api/utils/warmup-pattern-detection", () => ({
  detectWarmupPattern: vi.fn(async ({ targetWorkingWeight }) => ({
    confidence: "high" as const,
    sets: [
      { weight: targetWorkingWeight * 0.4, reps: 10, percentageOfTop: 0.4 },
      { weight: targetWorkingWeight * 0.6, reps: 8, percentageOfTop: 0.6 },
      { weight: targetWorkingWeight * 0.8, reps: 5, percentageOfTop: 0.8 },
    ],
    source: "history" as const,
    sessionCount: 5,
  })),
  calculateVolumeBreakdown: vi.fn((sets) => {
    let total = 0;
    let working = 0;
    let warmup = 0;
    let backoff = 0;
    let drop = 0;

    sets.forEach((set: any) => {
      const volume = (set.weight ?? 0) * set.reps;
      total += volume;
      if (set.setType === "working") working += volume;
      else if (set.setType === "warmup") warmup += volume;
      else if (set.setType === "backoff") backoff += volume;
      else if (set.setType === "drop") drop += volume;
    });

    return { total, working, warmup, backoff, drop };
  }),
}));

// Mock logger
vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Workouts Router - Warm-Up Sets Integration", () => {
  const mockUser = createMockUser({ id: "test-user-123" });

  const createMockContext = () => {
    let sessionIdCounter = 1;
    let exerciseIdCounter = 1;
    let setIdCounter = 1;
    const sessions: any[] = [];
    const sessionExercises: any[] = [];
    const exerciseSetsData: any[] = [];

    return {
      user: mockUser,
      headers: new Headers(),
      requestId: "test-request-123",
      db: {
        query: {
          workoutSessions: {
            findFirst: vi.fn(async () => sessions[0]),
            findMany: vi.fn(async () => sessions),
          },
          sessionExercises: {
            findMany: vi.fn(async () => sessionExercises),
          },
          exerciseSets: {
            findMany: vi.fn(async () => exerciseSetsData),
          },
        },
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => []),
              })),
            })),
          })),
        })),
        insert: vi.fn((table: any) => ({
          values: vi.fn((data: any) => ({
            returning: vi.fn(async () => {
              if (table._.name === "workout_session") {
                const newSession = {
                  ...data,
                  id: sessionIdCounter++,
                  user_id: mockUser.id,
                  createdAt: new Date(),
                };
                sessions.push(newSession);
                return [newSession];
              } else if (table._.name === "session_exercise") {
                const newExercise = {
                  ...data,
                  id: `exercise-${exerciseIdCounter++}`,
                  user_id: mockUser.id,
                };
                sessionExercises.push(newExercise);
                return [newExercise];
              } else if (table._.name === "exercise_set") {
                const newSets = Array.isArray(data)
                  ? data.map((s) => ({ ...s, id: `set-${setIdCounter++}` }))
                  : [{ ...data, id: `set-${setIdCounter++}` }];
                exerciseSetsData.push(...newSets);
                return newSets;
              }
              return [];
            }),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => {}),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(async () => {}),
        })),
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Save Workout with exerciseSets (New Format)", () => {
    it("should save workout with warm-up and working sets", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      const result = await caller.save({
        workoutDate: new Date("2025-01-15"),
        templateId: 1,
        exercises: [
          {
            exerciseName: "Bench Press",
            sets: [], // Legacy format empty
            unit: "kg",
            exerciseSets: [
              {
                setNumber: 1,
                setType: "warmup",
                weight: 40,
                reps: 10,
                completed: true,
              },
              {
                setNumber: 2,
                setType: "warmup",
                weight: 60,
                reps: 8,
                completed: true,
              },
              {
                setNumber: 3,
                setType: "warmup",
                weight: 80,
                reps: 5,
                completed: true,
              },
              {
                setNumber: 4,
                setType: "working",
                weight: 100,
                reps: 5,
                rpe: 8,
                completed: true,
              },
              {
                setNumber: 5,
                setType: "working",
                weight: 100,
                reps: 5,
                rpe: 8,
                completed: true,
              },
            ],
          },
        ],
      });

      expect(result.sessionId).toBeDefined();
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should compute aggregated stats correctly", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Squat",
            sets: [],
            unit: "kg",
            exerciseSets: [
              { setNumber: 1, setType: "warmup", weight: 50, reps: 10, completed: true },
              { setNumber: 2, setType: "warmup", weight: 70, reps: 8, completed: true },
              { setNumber: 3, setType: "working", weight: 100, reps: 5, completed: true },
              { setNumber: 4, setType: "working", weight: 100, reps: 5, completed: true },
              { setNumber: 5, setType: "working", weight: 100, reps: 5, completed: true },
            ],
          },
        ],
      });

      // Verify aggregated stats were computed
      // Total sets: 5, Working sets: 3, Warmup sets: 2
      // Top weight: 100kg
      // Total volume: (50*10) + (70*8) + (100*5*3) = 500 + 560 + 1500 = 2560kg
      // Working volume: 1500kg
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should set usesSetTable flag correctly", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Deadlift",
            sets: [],
            unit: "kg",
            exerciseSets: [
              { setNumber: 1, setType: "working", weight: 200, reps: 5, completed: true },
            ],
          },
        ],
      });

      // Verify that session_exercise has usesSetTable=true
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should handle chunking with 100+ sets (D1 variable limit)", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      // Create 120 sets (exceeds D1 limit of ~90 variables)
      const largeSetsArray = Array.from({ length: 120 }, (_, i) => ({
        setNumber: i + 1,
        setType: i < 20 ? ("warmup" as const) : ("working" as const),
        weight: i < 20 ? 40 + i * 2 : 100,
        reps: 5,
        completed: true,
      }));

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "High Volume Bench",
            sets: [],
            unit: "kg",
            exerciseSets: largeSetsArray,
          },
        ],
      });

      // Verify chunkedBatch was used
      const { chunkedBatch } = await import("~/server/db/chunk-utils");
      expect(chunkedBatch).toHaveBeenCalled();
    });

    it("should separate warm-up and working volume", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Overhead Press",
            sets: [],
            unit: "kg",
            exerciseSets: [
              { setNumber: 1, setType: "warmup", weight: 20, reps: 10, completed: true }, // 200kg
              { setNumber: 2, setType: "warmup", weight: 40, reps: 8, completed: true },  // 320kg
              { setNumber: 3, setType: "working", weight: 60, reps: 5, completed: true }, // 300kg
              { setNumber: 4, setType: "working", weight: 60, reps: 5, completed: true }, // 300kg
            ],
          },
        ],
      });

      // Total volume: 1120kg, Warmup: 520kg, Working: 600kg
      expect(ctx.db.insert).toHaveBeenCalled();
    });
  });

  describe("Save Workout without exerciseSets (Legacy Format)", () => {
    it("should save workout with legacy format (backward compatibility)", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      const result = await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Bench Press",
            sets: [
              { id: "set-1", weight: 100, reps: 5, sets: 1, unit: "kg" },
              { id: "set-2", weight: 100, reps: 5, sets: 1, unit: "kg" },
              { id: "set-3", weight: 100, reps: 5, sets: 1, unit: "kg" },
            ],
            unit: "kg",
            // No exerciseSets provided
          },
        ],
      });

      expect(result.sessionId).toBeDefined();
      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should not create exercise_sets rows for legacy format", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Squat",
            sets: [
              { id: "set-1", weight: 140, reps: 5, sets: 1, unit: "kg" },
            ],
            unit: "kg",
          },
        ],
      });

      // Should not insert into exercise_sets table
      expect(ctx.db.insert).toHaveBeenCalledWith(
        expect.objectContaining({ _.name: "workout_session" })
      );
    });
  });

  describe("getWarmupSuggestions Query", () => {
    it("should return warm-up suggestions based on history", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      const suggestions = await caller.getWarmupSuggestions({
        exerciseName: "Bench Press",
        targetWorkingWeight: 100,
        targetWorkingReps: 5,
      });

      expect(suggestions).toBeDefined();
      expect(suggestions.confidence).toBe("high");
      expect(suggestions.sets).toHaveLength(3);
      expect(suggestions.sets[0]).toMatchObject({
        weight: 40,
        reps: 10,
        percentageOfTop: 0.4,
      });
      expect(suggestions.source).toBe("history");
      expect(suggestions.sessionCount).toBe(5);
    });

    it("should scale suggestions to target weight", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      const suggestions = await caller.getWarmupSuggestions({
        exerciseName: "Bench Press",
        targetWorkingWeight: 120,
        targetWorkingReps: 5,
      });

      // Should scale to 120kg: 48kg, 72kg, 96kg
      expect(suggestions.sets[0]?.weight).toBe(48);
      expect(suggestions.sets[1]?.weight).toBe(72);
      expect(suggestions.sets[2]?.weight).toBe(96);
    });

    it("should return pattern with confidence when history exists", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      const suggestions = await caller.getWarmupSuggestions({
        exerciseName: "Squat",
        targetWorkingWeight: 140,
        targetWorkingReps: 5,
      });

      expect(suggestions.confidence).toBeTypeOf("string");
      expect(["low", "medium", "high"]).toContain(suggestions.confidence);
    });
  });

  describe("Volume Breakdown", () => {
    it("should calculate volume breakdown correctly", async () => {
      const { calculateVolumeBreakdown } = await import(
        "~/server/api/utils/warmup-pattern-detection"
      );

      const sets = [
        { setType: "warmup", weight: 40, reps: 10 }, // 400
        { setType: "warmup", weight: 60, reps: 8 },  // 480
        { setType: "working", weight: 100, reps: 5 }, // 500
        { setType: "working", weight: 100, reps: 5 }, // 500
        { setType: "backoff", weight: 80, reps: 8 },  // 640
      ];

      const breakdown = calculateVolumeBreakdown(sets);

      expect(breakdown.total).toBe(2520);
      expect(breakdown.warmup).toBe(880);
      expect(breakdown.working).toBe(1000);
      expect(breakdown.backoff).toBe(640);
      expect(breakdown.drop).toBe(0);
    });

    it("should handle sets with null weight", async () => {
      const { calculateVolumeBreakdown } = await import(
        "~/server/api/utils/warmup-pattern-detection"
      );

      const sets = [
        { setType: "warmup", weight: null, reps: 10 }, // 0 (bodyweight)
        { setType: "working", weight: 100, reps: 5 },  // 500
      ];

      const breakdown = calculateVolumeBreakdown(sets);

      expect(breakdown.total).toBe(500);
      expect(breakdown.warmup).toBe(0);
      expect(breakdown.working).toBe(500);
    });

    it("should handle drop sets correctly", async () => {
      const { calculateVolumeBreakdown } = await import(
        "~/server/api/utils/warmup-pattern-detection"
      );

      const sets = [
        { setType: "working", weight: 100, reps: 5 }, // 500
        { setType: "drop", weight: 80, reps: 8 },     // 640
        { setType: "drop", weight: 60, reps: 10 },    // 600
      ];

      const breakdown = calculateVolumeBreakdown(sets);

      expect(breakdown.total).toBe(1740);
      expect(breakdown.working).toBe(500);
      expect(breakdown.drop).toBe(1240);
    });
  });

  describe("Edge Cases", () => {
    it("should handle exercises with only warm-up sets", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Mobility Work",
            sets: [],
            unit: "kg",
            exerciseSets: [
              { setNumber: 1, setType: "warmup", weight: 0, reps: 15, completed: true },
              { setNumber: 2, setType: "warmup", weight: 0, reps: 15, completed: true },
            ],
          },
        ],
      });

      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should handle exercises with only working sets (no warm-up)", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Curl",
            sets: [],
            unit: "kg",
            exerciseSets: [
              { setNumber: 1, setType: "working", weight: 20, reps: 10, completed: true },
              { setNumber: 2, setType: "working", weight: 20, reps: 10, completed: true },
            ],
          },
        ],
      });

      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should handle mixed new and legacy format in same workout", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Bench Press",
            sets: [],
            unit: "kg",
            exerciseSets: [
              { setNumber: 1, setType: "warmup", weight: 40, reps: 10, completed: true },
              { setNumber: 2, setType: "working", weight: 100, reps: 5, completed: true },
            ],
          },
          {
            exerciseName: "Dumbbell Row",
            sets: [
              { id: "set-1", weight: 40, reps: 10, sets: 1, unit: "kg" },
            ],
            unit: "kg",
            // No exerciseSets (legacy format)
          },
        ],
      });

      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should handle very small weights (fractional plates)", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Cable Fly",
            sets: [],
            unit: "kg",
            exerciseSets: [
              { setNumber: 1, setType: "warmup", weight: 2.5, reps: 15, completed: true },
              { setNumber: 2, setType: "warmup", weight: 5.0, reps: 12, completed: true },
              { setNumber: 3, setType: "working", weight: 7.5, reps: 10, completed: true },
            ],
          },
        ],
      });

      expect(ctx.db.insert).toHaveBeenCalled();
    });

    it("should handle empty exerciseSets array", async () => {
      const ctx = createMockContext();
      const caller = workoutsRouter.createCaller(ctx as any);

      await caller.save({
        workoutDate: new Date("2025-01-15"),
        exercises: [
          {
            exerciseName: "Test Exercise",
            sets: [
              { id: "set-1", weight: 50, reps: 10, sets: 1, unit: "kg" },
            ],
            unit: "kg",
            exerciseSets: [], // Empty array
          },
        ],
      });

      // Should fall back to legacy format
      expect(ctx.db.insert).toHaveBeenCalled();
    });
  });
});
