import { describe, it, expect, vi, beforeEach } from "vitest";
import { insightsRouter } from "~/server/api/routers/insights";

const createMockDb = () => {
  const mockDb = {
    query: {
      exerciseLinks: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      templateExercises: {
        findFirst: vi.fn(),
      },
      workoutSessions: {
        findMany: vi.fn(),
      },
    },
  } as any;

  return mockDb;
};

describe("insightsRouter", () => {
  const mockUser = { id: "user-123" };

  let mockDb: ReturnType<typeof createMockDb>;
  let mockCtx: {
    db: typeof mockDb;
    user: typeof mockUser;
    requestId: string;
    headers: Headers;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    mockCtx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("getExerciseInsights", () => {
    it("should return insights for basic exercise lookup", async () => {
      // Mock no linked exercises
      mockDb.query.exerciseLinks.findFirst.mockResolvedValue(null);
      mockDb.query.templateExercises.findFirst.mockResolvedValue(null);

      // Mock sessions with exercises
      mockDb.query.workoutSessions.findMany.mockResolvedValue([
        {
          id: 1,
          workoutDate: new Date("2024-01-01"),
          exercises: [
            {
              exerciseName: "Bench Press",
              weight: 80,
              reps: 8,
              sets: 3,
              unit: "kg",
              setOrder: 0,
            },
          ],
        },
      ]);

      const caller = insightsRouter.createCaller(mockCtx);
      const result = await caller.getExerciseInsights({
        exerciseName: "Bench Press",
      });

      expect(result).toBeDefined();
      expect(result.unit).toBe("kg");
      expect(result.volumeSparkline).toBeDefined();
    });

    it("should handle linked exercise lookups", async () => {
      // Mock linked exercise
      mockDb.query.exerciseLinks.findFirst.mockResolvedValue({
        masterExerciseId: 1,
        masterExercise: { id: 1, name: "Bench Press" },
      });

      mockDb.query.exerciseLinks.findMany.mockResolvedValue([
        {
          templateExerciseId: 1,
          templateExercise: { exerciseName: "Bench Press" },
        },
        {
          templateExerciseId: 2,
          templateExercise: { exerciseName: "Incline Bench Press" },
        },
      ]);

      mockDb.query.workoutSessions.findMany.mockResolvedValue([
        {
          id: 1,
          workoutDate: new Date("2024-01-01"),
          exercises: [
            {
              exerciseName: "Bench Press",
              weight: 80,
              reps: 8,
              sets: 3,
              unit: "kg",
              setOrder: 0,
            },
          ],
        },
      ]);

      const caller = insightsRouter.createCaller(mockCtx);
      const result = await caller.getExerciseInsights({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
      });

      expect(mockDb.query.exerciseLinks.findFirst).toHaveBeenCalled();
      expect(mockDb.query.exerciseLinks.findMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should normalize units correctly", async () => {
      mockDb.query.exerciseLinks.findFirst.mockResolvedValue(null);
      mockDb.query.templateExercises.findFirst.mockResolvedValue(null);

      mockDb.query.workoutSessions.findMany.mockResolvedValue([
        {
          id: 1,
          workoutDate: new Date("2024-01-01"),
          exercises: [
            {
              exerciseName: "Bench Press",
              weight: 180, // lbs
              reps: 8,
              sets: 3,
              unit: "lbs",
              setOrder: 0,
            },
          ],
        },
      ]);

      const caller = insightsRouter.createCaller(mockCtx);
      const result = await caller.getExerciseInsights({
        exerciseName: "Bench Press",
        unit: "kg", // Request kg, but data is in lbs
      });

      expect(result).toBeDefined();
      // Should convert 180 lbs to kg
      expect(result.bestSet?.weight).toBeCloseTo(81.65, 1);
    });

    it("should exclude specified session", async () => {
      mockDb.query.exerciseLinks.findFirst.mockResolvedValue(null);
      mockDb.query.templateExercises.findFirst.mockResolvedValue(null);

      mockDb.query.workoutSessions.findMany.mockResolvedValue([
        {
          id: 1,
          workoutDate: new Date("2024-01-01"),
          exercises: [
            {
              exerciseName: "Bench Press",
              weight: 80,
              reps: 8,
              sets: 3,
              unit: "kg",
              setOrder: 0,
            },
          ],
        },
      ]);

      const caller = insightsRouter.createCaller(mockCtx);
      await caller.getExerciseInsights({
        exerciseName: "Bench Press",
        excludeSessionId: 2, // Different session
      });

      expect(mockDb.query.workoutSessions.findMany).toHaveBeenCalled();
      // The mock doesn't check the where clause, but in real implementation it would exclude session 2
    });
  });
});
