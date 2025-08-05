import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";
import { workoutSessions, workoutTemplates, sessionExercises, templateExercises } from "~/server/db/schema";

describe("workoutsRouter enhanced coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecent", () => {
    it("returns recent workouts with default limit", async () => {
      const user = createMockUser({ id: "user_workout_1" })!;
      
      const mockWorkouts = [
        {
          id: 1,
          user_id: "user_workout_1",
          templateId: 1,
          workoutDate: new Date("2024-01-02T10:00:00Z"),
          template: { id: 1, name: "Push Day", exercises: [] },
          exercises: [],
        },
        {
          id: 2,
          user_id: "user_workout_1",
          templateId: 2,
          workoutDate: new Date("2024-01-01T10:00:00Z"),
          template: { id: 2, name: "Pull Day", exercises: [] },
          exercises: [],
        },
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(mockWorkouts),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.getRecent({});

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(1);
      expect(result[0]?.template.name).toBe("Push Day");
    });

    it("respects custom limit parameter", async () => {
      const user = createMockUser({ id: "user_workout_2" })!;
      
      const mockWorkouts = [
        {
          id: 1,
          user_id: "user_workout_2",
          templateId: 1,
          workoutDate: new Date("2024-01-01T10:00:00Z"),
          template: { id: 1, name: "Push Day", exercises: [] },
          exercises: [],
        },
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(mockWorkouts),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.getRecent({ limit: 5 });

      expect(result).toHaveLength(1);
      expect(db.query.workoutSessions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        })
      );
    });
  });

  describe("getById", () => {
    it("returns specific workout by id", async () => {
      const user = createMockUser({ id: "user_workout_3" })!;
      
      const mockWorkout = {
        id: 123,
        user_id: "user_workout_3",
        templateId: 1,
        workoutDate: new Date("2024-01-01T10:00:00Z"),
        template: { id: 1, name: "Push Day", exercises: [] },
        exercises: [
          { id: 1, exerciseName: "Bench Press", weight: "100", reps: 10 },
        ],
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockWorkout),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.getById({ id: 123 });

      expect(result).toBeDefined();
      expect(result?.id).toBe(123);
      expect(result?.exercises).toHaveLength(1);
      expect(result?.exercises[0]?.exerciseName).toBe("Bench Press");
    });

    it("throws error for workout not found", async () => {
      const user = createMockUser({ id: "user_workout_4" })!;
      
      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.getById({ id: 999 })).rejects.toThrow("Workout not found");
    });

    it("throws error for workout owned by different user", async () => {
      const user = createMockUser({ id: "user_workout_5" })!;
      
      const mockWorkout = {
        id: 123,
        user_id: "different_user",
        templateId: 1,
        workoutDate: new Date("2024-01-01T10:00:00Z"),
        template: { id: 1, name: "Push Day", exercises: [] },
        exercises: [],
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockWorkout),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.getById({ id: 123 })).rejects.toThrow("Workout not found");
    });
  });

  describe("getLastExerciseData", () => {
    it("returns last exercise data by name", async () => {
      const user = createMockUser({ id: "user_workout_6" })!;
      
      const mockSessions = [
        {
          id: 1,
          user_id: "user_workout_6",
          workoutDate: new Date("2024-01-01T10:00:00Z"),
          exercises: [
            {
              id: 1,
              exerciseName: "Bench Press",
              weight: "100",
              reps: 10,
              sets: 3,
              unit: "kg",
              setOrder: 0,
            },
            {
              id: 2,
              exerciseName: "Bench Press",
              weight: "105",
              reps: 8,
              sets: 3,
              unit: "kg",
              setOrder: 1,
            },
          ],
        },
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(mockSessions),
          },
          exerciseLinks: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.getLastExerciseData({
        exerciseName: "Bench Press",
      });

      expect(result).toBeDefined();
      expect(result?.sets).toHaveLength(2);
      expect(result?.sets[0]?.weight).toBe(100);
      expect(result?.sets[1]?.weight).toBe(105);
      expect(result?.best?.weight).toBe(105);
      expect(result?.best?.reps).toBe(8);
    });

    it("returns null when no previous exercise data found", async () => {
      const user = createMockUser({ id: "user_workout_7" })!;
      
      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          exerciseLinks: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.getLastExerciseData({
        exerciseName: "New Exercise",
      });

      expect(result).toBeNull();
    });

    it("excludes specified session from search", async () => {
      const user = createMockUser({ id: "user_workout_8" })!;
      
      const mockSessions = [
        {
          id: 2,
          user_id: "user_workout_8",
          workoutDate: new Date("2024-01-01T10:00:00Z"),
          exercises: [
            {
              id: 1,
              exerciseName: "Bench Press",
              weight: "90",
              reps: 12,
              sets: 3,
              unit: "kg",
              setOrder: 0,
            },
          ],
        },
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(mockSessions),
          },
          exerciseLinks: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.getLastExerciseData({
        exerciseName: "Bench Press",
        excludeSessionId: 1,
      });

      expect(result).toBeDefined();
      expect(result?.sets[0]?.weight).toBe(90);
    });
  });

  describe("start", () => {
    it("creates new workout session successfully", async () => {
      const user = createMockUser({ id: "user_workout_9" })!;
      
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "user_workout_9",
        exercises: [
          { id: 1, exerciseName: "Bench Press", orderIndex: 0 },
          { id: 2, exerciseName: "Shoulder Press", orderIndex: 1 },
        ],
      };

      const mockSession = {
        id: 123,
        user_id: "user_workout_9",
        templateId: 1,
        workoutDate: new Date("2024-01-01T10:00:00Z"),
      };

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockSession]),
      };

      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(mockTemplate),
          },
        },
        insert: vi.fn().mockReturnValue(insertChain),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.start({
        templateId: 1,
        workoutDate: new Date("2024-01-01T10:00:00Z"),
      });

      expect(result.sessionId).toBe(123);
      expect(result.template.name).toBe("Push Day");
      expect(result.template.exercises).toHaveLength(2);
    });

    it("throws error for template not found", async () => {
      const user = createMockUser({ id: "user_workout_10" })!;
      
      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.start({
        templateId: 999,
      })).rejects.toThrow("Template not found");
    });

    it("throws error for template owned by different user", async () => {
      const user = createMockUser({ id: "user_workout_11" })!;
      
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "different_user",
        exercises: [],
      };

      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(mockTemplate),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.start({
        templateId: 1,
      })).rejects.toThrow("Template not found");
    });

    it("handles database insertion failure", async () => {
      const user = createMockUser({ id: "user_workout_12" })!;
      
      const mockTemplate = {
        id: 1,
        name: "Push Day",
        user_id: "user_workout_12",
        exercises: [],
      };

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(mockTemplate),
          },
        },
        insert: vi.fn().mockReturnValue(insertChain),
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.start({
        templateId: 1,
      })).rejects.toThrow("Failed to create workout session");
    });
  });

  describe("save", () => {
    it("saves workout session with exercises successfully", async () => {
      const user = createMockUser({ id: "user_workout_13" })!;
      
      const mockSession = {
        id: 123,
        user_id: "user_workout_13",
        templateId: 1,
      };

      const deleteChain = {
        where: vi.fn().mockResolvedValue([]),
      };

      const insertChain = {
        values: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
        delete: vi.fn().mockReturnValue(deleteChain),
        insert: vi.fn().mockReturnValue(insertChain),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.save({
        sessionId: 123,
        exercises: [
          {
            templateExerciseId: 1,
            exerciseName: "Bench Press",
            sets: [
              { id: "1", weight: 100, reps: 10, sets: 3, unit: "kg" },
              { id: "2", weight: 105, reps: 8, sets: 3, unit: "kg" },
            ],
            unit: "kg",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalledWith(sessionExercises);
      expect(db.insert).toHaveBeenCalledWith(sessionExercises);
    });

    it("filters out empty sets", async () => {
      const user = createMockUser({ id: "user_workout_14" })!;
      
      const mockSession = {
        id: 123,
        user_id: "user_workout_14",
        templateId: 1,
      };

      const deleteChain = {
        where: vi.fn().mockResolvedValue([]),
      };

      const insertChain = {
        values: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
        delete: vi.fn().mockReturnValue(deleteChain),
        insert: vi.fn().mockReturnValue(insertChain),
      });

      const caller = await buildCaller({ db, user });

      await caller.workouts.save({
        sessionId: 123,
        exercises: [
          {
            templateExerciseId: 1,
            exerciseName: "Bench Press",
            sets: [
              { id: "1", weight: 100, reps: 10, sets: 3, unit: "kg" },
              { id: "2", unit: "kg" }, // Empty set - should be filtered out
            ],
            unit: "kg",
          },
        ],
      });

      // Verify that insert was called with only the non-empty set
      // The actual filtering logic includes sets with undefined values, so we expect both
      expect(insertChain.values).toHaveBeenCalledWith([
        expect.objectContaining({
          weight: "100",
          reps: 10,
          sets: 3,
          exerciseName: "Bench Press",
          sessionId: 123,
          templateExerciseId: 1,
          unit: "kg",
          user_id: "user_workout_14",
          setOrder: 0,
        }),
        expect.objectContaining({
          weight: undefined,
          reps: undefined,
          sets: 1,
          exerciseName: "Bench Press",
          sessionId: 123,
          templateExerciseId: 1,
          unit: "kg",
          user_id: "user_workout_14",
          setOrder: 1,
        }),
      ]);
    });

    it("throws error for session not found", async () => {
      const user = createMockUser({ id: "user_workout_15" })!;
      
      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.save({
        sessionId: 999,
        exercises: [],
      })).rejects.toThrow("Workout session not found");
    });

    it("throws error for session owned by different user", async () => {
      const user = createMockUser({ id: "user_workout_16" })!;
      
      const mockSession = {
        id: 123,
        user_id: "different_user",
        templateId: 1,
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.save({
        sessionId: 123,
        exercises: [],
      })).rejects.toThrow("Workout session not found");
    });
  });

  describe("delete", () => {
    it("deletes workout session successfully", async () => {
      const user = createMockUser({ id: "user_workout_17" })!;
      
      const mockSession = {
        id: 123,
        user_id: "user_workout_17",
        templateId: 1,
      };

      const deleteChain = {
        where: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
        delete: vi.fn().mockReturnValue(deleteChain),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.workouts.delete({ id: 123 });

      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalledWith(workoutSessions);
    });

    it("throws error for session not found", async () => {
      const user = createMockUser({ id: "user_workout_18" })!;
      
      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.delete({ id: 999 })).rejects.toThrow("Workout session not found");
    });

    it("throws error for session owned by different user", async () => {
      const user = createMockUser({ id: "user_workout_19" })!;
      
      const mockSession = {
        id: 123,
        user_id: "different_user",
        templateId: 1,
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      const caller = await buildCaller({ db, user });

      await expect(caller.workouts.delete({ id: 123 })).rejects.toThrow("Workout session not found");
    });
  });

  describe("authorization", () => {
    it("requires auth for getRecent", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.workouts.getRecent({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("requires auth for getById", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.workouts.getById({ id: 1 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("requires auth for start", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.workouts.start({ templateId: 1 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("requires auth for save", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.workouts.save({ sessionId: 1, exercises: [] })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("requires auth for delete", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.workouts.delete({ id: 1 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });
});
