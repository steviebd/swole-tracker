import { describe, it, expect, vi, beforeEach } from "vitest";

// Import after mocking
import { workoutsRouter } from "~/server/api/routers/workouts";
import { db } from "~/server/db";

describe("workoutsRouter", () => {
  const mockUser = { id: "user-123" };
  const mockCtx = {
    db,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecent", () => {
    it("should return recent workouts for user", async () => {
      const mockWorkouts: Array<{
        id: number;
        user_id: string;
        templateId: number;
        workoutDate: string;
        createdAt: Date;
        updatedAt: Date | null;
        template: {
          id: number;
          name: string;
          exercises: Array<{
            id: number;
            exerciseName: string;
            orderIndex: number;
          }>;
        };
        exercises: Array<{
          id: number;
          exerciseName: string;
          weight: number;
          reps: number;
          sets: number;
          unit: string;
        }>;
      }> = [
        {
          id: 1,
          user_id: "user-123",
          templateId: 1,
          workoutDate: "2024-01-01",
          createdAt: new Date(),
          updatedAt: null,
          template: {
            id: 1,
            name: "Push Day",
            exercises: [],
          },
          exercises: [],
        },
      ];

      db.query.workoutSessions.findMany = vi
        .fn()
        .mockResolvedValue(mockWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getRecent({ limit: 5 });

      expect(db.query.workoutSessions.findMany).toHaveBeenCalledWith({
        where: expect.any(Function), // eq(workoutSessions.user_id, ctx.user.id)
        orderBy: [expect.any(Function)], // desc(workoutSessions.workoutDate)
        limit: 5,
        with: {
          template: {
            with: {
              exercises: true,
            },
          },
          exercises: true,
        },
      });
      expect(result).toEqual(mockWorkouts as any);
    });

    it("should use default limit of 10", async () => {
      const mockWorkouts: Array<{
        id: number;
        user_id: string;
        templateId: number;
        workoutDate: string;
        createdAt: Date;
        updatedAt: Date | null;
        template: {
          id: number;
          name: string;
          exercises: Array<{
            id: number;
            exerciseName: string;
            orderIndex: number;
          }>;
        };
        exercises: Array<{
          id: number;
          exerciseName: string;
          weight: number;
          reps: number;
          sets: number;
          unit: string;
        }>;
      }> = [];
      db.query.workoutSessions.findMany = vi
        .fn()
        .mockResolvedValue(mockWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      await caller.getRecent({});

      expect(db.query.workoutSessions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });
  });

  describe("getById", () => {
    it("should return workout by id for owner", async () => {
      const mockWorkout = {
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: "2024-01-01",
        createdAt: new Date(),
        updatedAt: null,
        template: {
          id: 1,
          name: "Push Day",
          exercises: [],
        },
        exercises: [],
      };

      db.query.workoutSessions.findFirst = vi
        .fn()
        .mockResolvedValue(mockWorkout);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(db.query.workoutSessions.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function), // eq(workoutSessions.id, input.id)
        with: {
          template: {
            with: {
              exercises: true,
            },
          },
          exercises: true,
        },
      });
      expect(result).toEqual(mockWorkout);
    });

    it("should throw error if workout not found", async () => {
      db.query.workoutSessions.findFirst = vi.fn().mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.getById({ id: 999 })).rejects.toThrow(
        "Workout not found",
      );
    });

    it("should throw error if workout belongs to different user", async () => {
      const mockWorkout = {
        id: 1,
        user_id: "different-user",
        templateId: 1,
        workoutDate: "2024-01-01",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutSessions.findFirst = vi
        .fn()
        .mockResolvedValue(mockWorkout);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.getById({ id: 1 })).rejects.toThrow(
        "Workout not found",
      );
    });
  });

  describe("getLastExerciseData", () => {
    it("should return last exercise data for simple exercise", async () => {
      const mockSessions = [
        {
          id: 1,
          exercises: [
            {
              id: 1,
              exerciseName: "Bench Press",
              weight: 80,
              reps: 8,
              sets: 3,
              unit: "kg",
            },
          ],
        },
      ];

      db.query.exerciseLinks.findFirst = vi.fn().mockResolvedValue(null);
      db.query.workoutSessions.findMany = vi
        .fn()
        .mockResolvedValue(mockSessions);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLastExerciseData({
        exerciseName: "Bench Press",
      });

      expect(result).toEqual({
        exerciseName: "Bench Press",
        lastWeight: 80,
        lastReps: 8,
        lastSets: 3,
        unit: "kg",
      });
    });

    it("should handle exercise links for linked exercises", async () => {
      const mockExerciseLink = {
        masterExerciseId: 1,
        masterExercise: { id: 1, name: "Bench Press" },
      };

      const mockLinkedExercises = [
        {
          templateExercise: {
            exerciseName: "Bench Press (Barbell)",
          },
        },
        {
          templateExercise: {
            exerciseName: "Bench Press (Dumbbell)",
          },
        },
      ];

      const mockSessions = [
        {
          id: 1,
          exercises: [
            {
              id: 1,
              exerciseName: "Bench Press (Barbell)",
              weight: 75,
              reps: 10,
              sets: 4,
              unit: "kg",
            },
          ],
        },
      ];

      db.query.exerciseLinks.findFirst = vi
        .fn()
        .mockResolvedValue(mockExerciseLink);
      db.query.exerciseLinks.findMany = vi
        .fn()
        .mockResolvedValue(mockLinkedExercises);
      db.query.workoutSessions.findMany = vi
        .fn()
        .mockResolvedValue(mockSessions);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLastExerciseData({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
      });

      expect(result).toEqual({
        exerciseName: "Bench Press (Barbell)",
        lastWeight: 75,
        lastReps: 10,
        lastSets: 4,
        unit: "kg",
      });
    });

    it("should exclude specified session", async () => {
      const mockSessions = [
        {
          id: 1,
          exercises: [
            {
              id: 1,
              exerciseName: "Bench Press",
              weight: 80,
              reps: 8,
              sets: 3,
              unit: "kg",
            },
          ],
        },
      ];

      db.query.exerciseLinks.findFirst = vi.fn().mockResolvedValue(null);
      db.query.workoutSessions.findMany = vi
        .fn()
        .mockResolvedValue(mockSessions);

      const caller = workoutsRouter.createCaller(mockCtx);
      await caller.getLastExerciseData({
        exerciseName: "Bench Press",
        excludeSessionId: 2,
      });

      expect(db.query.workoutSessions.findMany).toHaveBeenCalledWith({
        where: expect.any(Function), // Should include ne condition
        orderBy: [expect.any(Function)],
        with: expect.any(Object),
      });
    });

    it("should return null if no previous data found", async () => {
      db.query.exerciseLinks.findFirst = vi.fn().mockResolvedValue(null);
      db.query.workoutSessions.findMany = vi.fn().mockResolvedValue([]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLastExerciseData({
        exerciseName: "New Exercise",
      });

      expect(result).toBeNull();
    });
  });

  describe("start", () => {
    it("should start a new workout session", async () => {
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        exercises: [
          {
            id: 1,
            exerciseName: "Bench Press",
            sets: 3,
            reps: 8,
            weight: 80,
            unit: "kg",
          },
        ],
      };

      const mockSession = {
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: "2024-01-01",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutTemplates.findFirst = vi
        .fn()
        .mockResolvedValue(mockTemplate);
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.start({
        templateId: 1,
        workoutDate: new Date("2024-01-01"),
      });

      expect(result).toEqual({
        session: mockSession,
        template: mockTemplate,
      });
    });

    it("should throw error if template not found", async () => {
      db.query.workoutTemplates.findFirst = vi.fn().mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(
        caller.start({
          templateId: 999,
          workoutDate: new Date("2024-01-01"),
        }),
      ).rejects.toThrow("Template not found");
    });
  });

  describe("save", () => {
    it("should save workout session with exercises", async () => {
      const mockSession = {
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: "2024-01-01",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutSessions.findFirst = vi
        .fn()
        .mockResolvedValue(mockSession);
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      });
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.save({
        sessionId: 1,
        exercises: [
          {
            templateExerciseId: 1,
            exerciseName: "Bench Press",
            sets: [
              {
                id: "set-1",
                weight: 80,
                reps: 8,
                sets: 3,
                unit: "kg",
              },
            ],
            unit: "kg",
          },
        ],
      });

      expect(result).toEqual({ success: true });
    });

    it("should throw error if session not found", async () => {
      db.query.workoutSessions.findFirst = vi.fn().mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(
        caller.save({
          sessionId: 999,
          exercises: [],
        }),
      ).rejects.toThrow("Workout session not found");
    });
  });

  describe("updateSessionSets", () => {
    it("should update session sets", async () => {
      const mockSession = {
        id: 1,
        user_id: "user-123",
        exercises: [
          {
            id: 1,
            exerciseName: "Bench Press",
            sets: [{ id: "set-1", weight: 80, reps: 8, sets: 3, unit: "kg" }],
          },
        ],
      };

      db.query.workoutSessions.findFirst = vi
        .fn()
        .mockResolvedValue(mockSession);
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.updateSessionSets({
        sessionId: 1,
        updates: [
          {
            setId: "set-1",
            exerciseName: "Bench Press",
            setIndex: 0,
            weight: 85,
            reps: 6,
            unit: "kg",
          },
        ],
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("delete", () => {
    it("should delete workout session", async () => {
      const mockSession = {
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: "2024-01-01",
        createdAt: new Date(),
        updatedAt: null,
      };

      db.query.workoutSessions.findFirst = vi
        .fn()
        .mockResolvedValue(mockSession);
      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });

    it("should throw error if session not found", async () => {
      db.query.workoutSessions.findFirst = vi.fn().mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.delete({ id: 999 })).rejects.toThrow(
        "Workout session not found",
      );
    });
  });
});
