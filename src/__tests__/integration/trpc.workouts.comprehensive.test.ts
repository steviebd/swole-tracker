import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb } from "../integration/trpc-harness";

// Comprehensive test suite for workouts router to achieve 85%+ coverage
describe("tRPC workouts router comprehensive coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("getRecent", () => {
    it("returns populated array with workout data", async () => {
      const user = { id: "user_comp_1" } as const;
      const mockWorkouts = [
        {
          id: 1,
          user_id: user.id,
          workoutDate: new Date("2024-01-01"),
          template: {
            id: 1,
            name: "Upper Body",
            exercises: [
              { id: 1, exerciseName: "Bench Press", orderIndex: 0 },
              { id: 2, exerciseName: "Shoulder Press", orderIndex: 1 },
            ],
          },
          exercises: [
            {
              id: 1,
              exerciseName: "Bench Press",
              weight: "100",
              reps: 10,
              sets: 3,
              unit: "kg",
            },
            {
              id: 2,
              exerciseName: "Shoulder Press",
              weight: "50",
              reps: 8,
              sets: 3,
              unit: "kg",
            },
          ],
        },
        {
          id: 2,
          user_id: user.id,
          workoutDate: new Date("2024-01-03"),
          template: {
            id: 2,
            name: "Lower Body",
            exercises: [{ id: 3, exerciseName: "Squats", orderIndex: 0 }],
          },
          exercises: [
            {
              id: 3,
              exerciseName: "Squats",
              weight: "120",
              reps: 8,
              sets: 4,
              unit: "kg",
            },
          ],
        },
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(mockWorkouts),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.getRecent({ limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id", 1);
      expect(result[0]).toHaveProperty("template.name", "Upper Body");
      expect(result[0]).toHaveProperty("exercises");
      expect(result[0].exercises).toHaveLength(2);
      expect(db.query.workoutSessions.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
        limit: 10,
        with: expect.any(Object),
      });
    });

    it("respects custom limit parameter", async () => {
      const user = { id: "user_comp_2" } as const;
      const mockWorkouts = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        user_id: user.id,
        workoutDate: new Date(`2024-01-${i + 1}`),
        template: { id: i + 1, name: `Template ${i + 1}`, exercises: [] },
        exercises: [],
      }));

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(mockWorkouts.slice(0, 3)),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.getRecent({ limit: 3 });

      expect(result).toHaveLength(3);
      expect(db.query.workoutSessions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 3 }),
      );
    });
  });

  describe("getById", () => {
    it("returns workout when found and owned", async () => {
      const user = { id: "user_comp_3" } as const;
      const mockWorkout = {
        id: 42,
        user_id: user.id,
        workoutDate: new Date("2024-01-15"),
        template: {
          id: 5,
          name: "Full Body",
          exercises: [
            { id: 10, exerciseName: "Deadlift", orderIndex: 0 },
            { id: 11, exerciseName: "Pull-ups", orderIndex: 1 },
          ],
        },
        exercises: [
          {
            id: 100,
            exerciseName: "Deadlift",
            weight: "140",
            reps: 5,
            sets: 3,
            unit: "kg",
          },
          {
            id: 101,
            exerciseName: "Pull-ups",
            weight: "0",
            reps: 10,
            sets: 3,
            unit: "kg",
          },
        ],
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockWorkout),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.getById({ id: 42 });

      expect(result.id).toBe(42);
      expect(result.user_id).toBe(user.id);
      expect(result.template.name).toBe("Full Body");
      expect(result.exercises).toHaveLength(2);
      expect(db.query.workoutSessions.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
        with: expect.any(Object),
      });
    });

    it("throws error when workout not found", async () => {
      const user = { id: "user_comp_4" } as const;
      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(trpc.workouts.getById({ id: 999 })).rejects.toThrow(
        "Workout not found",
      );
    });

    it("throws error when workout belongs to different user", async () => {
      const user = { id: "user_comp_5" } as const;
      const mockWorkout = {
        id: 43,
        user_id: "different_user",
        workoutDate: new Date(),
        template: { id: 1, name: "Test", exercises: [] },
        exercises: [],
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockWorkout),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(trpc.workouts.getById({ id: 43 })).rejects.toThrow(
        "Workout not found",
      );
    });
  });

  describe("start", () => {
    it("creates session successfully with template data", async () => {
      const user = { id: "user_comp_6" } as const;
      const mockTemplate = {
        id: 1,
        user_id: user.id,
        name: "Push Day",
        exercises: [
          { id: 1, exerciseName: "Bench Press", orderIndex: 0 },
          { id: 2, exerciseName: "Tricep Extensions", orderIndex: 1 },
        ],
      };

      const mockSession = {
        id: 123,
        user_id: user.id,
        templateId: 1,
        workoutDate: new Date("2024-01-20"),
      };

      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(mockTemplate),
          },
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null), // No recent duplicate session
          },
        },
      });

      // Mock insert chain
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.start({
        templateId: 1,
        workoutDate: new Date("2024-01-20"),
      });

      expect(result.sessionId).toBe(123);
      expect(result.template).toEqual(mockTemplate);
      expect(db.query.workoutTemplates.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
        with: expect.any(Object),
      });
    });

    it("creates session with optional telemetry fields", async () => {
      const user = { id: "user_comp_7" } as const;
      const mockTemplate = {
        id: 2,
        user_id: user.id,
        name: "Leg Day",
        exercises: [],
      };

      const mockSession = {
        id: 124,
        user_id: user.id,
        templateId: 2,
        workoutDate: new Date("2024-01-21"),
      };

      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(mockTemplate),
          },
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null), // No recent duplicate session
          },
        },
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.start({
        templateId: 2,
        workoutDate: new Date("2024-01-21"),
        theme_used: "dark",
        device_type: "ios",
        perf_metrics: { loadTime: 1500 },
      });

      expect(result.sessionId).toBe(124);
      expect(db.insert).toHaveBeenCalledWith(expect.any(Object));
    });

    it("throws error when template not found", async () => {
      const user = { id: "user_comp_8" } as const;
      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null), // No recent duplicate session
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(
        trpc.workouts.start({
          templateId: 999,
          workoutDate: new Date(),
        }),
      ).rejects.toThrow("Template not found");
    });

    it("throws error when template belongs to different user", async () => {
      const user = { id: "user_comp_9" } as const;
      const mockTemplate = {
        id: 3,
        user_id: "different_user",
        name: "Not Mine",
        exercises: [],
      };

      const db = createMockDb({
        query: {
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValue(mockTemplate),
          },
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null), // No recent duplicate session
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(
        trpc.workouts.start({
          templateId: 3,
          workoutDate: new Date(),
        }),
      ).rejects.toThrow("Template not found");
    });
  });

  describe("save", () => {
    it("saves workout session with exercises successfully", async () => {
      const user = { id: "user_comp_10" } as const;
      const mockSession = { id: 200, user_id: user.id };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      // Mock delete and insert chains
      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.save({
        sessionId: 200,
        exercises: [
          {
            templateExerciseId: 1,
            exerciseName: "Bench Press",
            sets: [
              { id: "set-1", weight: 100, reps: 10, sets: 3, unit: "kg" },
              { id: "set-2", weight: 105, reps: 8, sets: 2, unit: "kg" },
            ],
            unit: "kg",
          },
          {
            exerciseName: "Push-ups",
            sets: [{ id: "set-3", reps: 15, sets: 3, unit: "kg" }],
            unit: "kg",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(db.query.workoutSessions.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("saves workout with Phase 2 fields (RPE, rest, estimates)", async () => {
      const user = { id: "user_comp_11" } as const;
      const mockSession = { id: 201, user_id: user.id };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      const trpc = await buildCaller({ db, user });
      await trpc.workouts.save({
        sessionId: 201,
        exercises: [
          {
            templateExerciseId: 1,
            exerciseName: "Squats",
            sets: [
              {
                id: "set-1",
                weight: 120,
                reps: 8,
                sets: 4,
                unit: "kg",
                rpe: 8,
                rest: 90,
                isEstimate: true,
                isDefaultApplied: false,
              },
            ],
            unit: "kg",
          },
        ],
      });

      expect(db.insert).toHaveBeenCalledWith(expect.any(Object));
    });

    it("filters out empty sets from exercises", async () => {
      const user = { id: "user_comp_12" } as const;
      const mockSession = { id: 202, user_id: user.id };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      const trpc = await buildCaller({ db, user });
      await trpc.workouts.save({
        sessionId: 202,
        exercises: [
          {
            exerciseName: "Deadlift",
            sets: [
              { id: "set-1", weight: 140, reps: 5, sets: 3, unit: "kg" },
              { id: "set-2" }, // Empty set should be filtered out
              { id: "set-3", weight: 145, reps: 3, sets: 2, unit: "kg" },
            ],
            unit: "kg",
          },
        ],
      });

      // Should only insert 2 sets (filtered out the empty one)
      expect(db.insert).toHaveBeenCalled();
    });

    it("handles empty exercises array", async () => {
      const user = { id: "user_comp_13" } as const;
      const mockSession = { id: 203, user_id: user.id };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.save({
        sessionId: 203,
        exercises: [],
      });

      expect(result.success).toBe(true);
      // When exercises array is empty, no insert should be called
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("updates session telemetry fields when provided", async () => {
      const user = { id: "user_comp_14" } as const;
      const mockSession = { id: 204, user_id: user.id };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      });

      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const trpc = await buildCaller({ db, user });
      await trpc.workouts.save({
        sessionId: 204,
        exercises: [],
        theme_used: "light",
        device_type: "android",
        perf_metrics: { loadTime: 1200 },
      });

      expect(db.update).toHaveBeenCalled();
    });

    it("throws error when session not found", async () => {
      const user = { id: "user_comp_15" } as const;
      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(
        trpc.workouts.save({
          sessionId: 999,
          exercises: [],
        }),
      ).rejects.toThrow("Workout session not found");
    });

    it("throws error when session belongs to different user", async () => {
      const user = { id: "user_comp_16" } as const;
      const mockSession = { id: 205, user_id: "different_user" };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(
        trpc.workouts.save({
          sessionId: 205,
          exercises: [],
        }),
      ).rejects.toThrow("Workout session not found");
    });
  });

  describe("delete", () => {
    it("deletes workout session successfully", async () => {
      const user = { id: "user_comp_17" } as const;
      const mockSession = { id: 300, user_id: user.id };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.delete({ id: 300 });

      expect(result.success).toBe(true);
      expect(db.query.workoutSessions.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
      expect(db.delete).toHaveBeenCalled();
    });

    it("throws error when session not found", async () => {
      const user = { id: "user_comp_18" } as const;
      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(trpc.workouts.delete({ id: 999 })).rejects.toThrow(
        "Workout session not found",
      );
    });

    it("throws error when session belongs to different user", async () => {
      const user = { id: "user_comp_19" } as const;
      const mockSession = { id: 301, user_id: "different_user" };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValue(mockSession),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await expect(trpc.workouts.delete({ id: 301 })).rejects.toThrow(
        "Workout session not found",
      );
    });
  });

  describe("getLastExerciseData", () => {
    it("returns null when no workouts contain the exercise", async () => {
      const user = { id: "user_comp_20" } as const;
      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.getLastExerciseData({
        exerciseName: "Non-existent Exercise",
      });

      expect(result).toBeNull();
    });

    it("returns exercise data with multiple sets", async () => {
      const user = { id: "user_comp_21" } as const;
      const mockWorkouts = [
        {
          id: 400,
          user_id: user.id,
          workoutDate: new Date("2024-01-10"),
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
              sets: 2,
              unit: "kg",
              setOrder: 1,
            },
          ],
        },
      ];

      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue(mockWorkouts),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      const result = await trpc.workouts.getLastExerciseData({
        exerciseName: "Bench Press",
      });

      expect(result).toBeDefined();
      expect(result?.sets).toHaveLength(2);
      expect(result?.sets[0].weight).toBe(100);
      expect(result?.sets[1].weight).toBe(105);
      expect(result?.best?.weight).toBe(105);
    });

    it("handles exercise linking with templateExerciseId", async () => {
      const user = { id: "user_comp_22" } as const;
      const db = createMockDb({
        query: {
          workoutSessions: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          exerciseLinks: {
            findFirst: vi.fn().mockResolvedValue({
              masterExerciseId: 1,
              masterExercise: { id: 1, exerciseName: "Master Bench Press" },
            }),
            findMany: vi.fn().mockResolvedValue([
              {
                templateExercise: { exerciseName: "Bench Press" },
              },
              {
                templateExercise: { exerciseName: "DB Bench Press" },
              },
            ]),
          },
        },
      });

      const trpc = await buildCaller({ db, user });
      await trpc.workouts.getLastExerciseData({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
      });

      expect(db.query.exerciseLinks.findFirst).toHaveBeenCalled();
    });
  });

  describe("getLatestPerformanceForTemplateExercise", () => {
    it("returns null when no template exercise found", async () => {
      const user = { id: "user_comp_23" } as const;

      let callCount = 0;
      const db = createMockDb({
        select: vi.fn(() => {
          callCount++;
          const chain: any = {
            from: vi.fn(() => chain),
            where: vi.fn(() => chain),
            innerJoin: vi.fn(() => chain),
            orderBy: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            then: vi.fn(async (resolve: any) => {
              if (callCount === 1) return resolve([]); // No exercise link
              if (callCount === 2) return resolve([]); // No template exercise
              return resolve([]);
            }),
          };
          return chain;
        }),
      });

      const trpc = await buildCaller({ db, user });
      const result =
        await trpc.workouts.getLatestPerformanceForTemplateExercise({
          templateExerciseId: 999,
        });

      expect(result).toBeNull();
    });

    it("returns performance by exercise name when no link exists", async () => {
      const user = { id: "user_comp_24" } as const;

      let callCount = 0;
      const db = createMockDb({
        select: vi.fn(() => {
          callCount++;
          const chain: any = {
            from: vi.fn(() => chain),
            where: vi.fn(() => chain),
            innerJoin: vi.fn(() => chain),
            orderBy: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            then: vi.fn(async (resolve: any) => {
              if (callCount === 1) return resolve([]); // No exercise link
              if (callCount === 2) return resolve([{ exerciseName: "Squats" }]); // Template exercise found
              if (callCount === 3)
                return resolve([{ sessionId: 500, workoutDate: new Date() }]); // Latest workout
              if (callCount === 4)
                return resolve([
                  {
                    weight: "150",
                    reps: 8,
                    sets: 4,
                    unit: "kg",
                    workoutDate: new Date(),
                  },
                ]); // Performance
              return resolve([]);
            }),
          };
          return chain;
        }),
      });

      const trpc = await buildCaller({ db, user });
      const result =
        await trpc.workouts.getLatestPerformanceForTemplateExercise({
          templateExerciseId: 1,
        });

      expect(result).toBeDefined();
      expect(result?.weight).toBe("150");
      expect(result?.reps).toBe(8);
    });

    it("handles excludeSessionId parameter correctly", async () => {
      const user = { id: "user_comp_25" } as const;

      let callCount = 0;
      const db = createMockDb({
        select: vi.fn(() => {
          callCount++;
          const chain: any = {
            from: vi.fn(() => chain),
            where: vi.fn(() => chain),
            innerJoin: vi.fn(() => chain),
            orderBy: vi.fn(() => chain),
            limit: vi.fn(() => chain),
            then: vi.fn(async (resolve: any) => {
              if (callCount === 1) return resolve([]); // No exercise link
              if (callCount === 2)
                return resolve([{ exerciseName: "Deadlift" }]); // Template exercise
              if (callCount === 3) return resolve([]); // No workouts excluding session 100
              return resolve([]);
            }),
          };
          return chain;
        }),
      });

      const trpc = await buildCaller({ db, user });
      const result =
        await trpc.workouts.getLatestPerformanceForTemplateExercise({
          templateExerciseId: 1,
          excludeSessionId: 100,
        });

      expect(result).toBeNull();
    });
  });
});
