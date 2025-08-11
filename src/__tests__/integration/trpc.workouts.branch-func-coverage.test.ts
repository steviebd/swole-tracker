import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb } from "../integration/trpc-harness";

describe("tRPC workouts router branch and function coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("start procedure - duplicate session handling", () => {
    it("should return existing recent session when one exists with same template and no exercises", async () => {
      const user = { id: "user_dup_1" } as const;

      const recentSession = {
        id: 100,
        user_id: user.id,
        templateId: 1,
        workoutDate: new Date(Date.now() - 60000), // 1 minute ago
        exercises: [], // No exercises
      };

      const template = {
        id: 1,
        user_id: user.id,
        name: "Test Template",
        exercises: [],
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValueOnce(recentSession),
          },
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce(template),
          },
        },
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.start({
        templateId: 1,
        workoutDate: new Date(),
      } as any);

      expect(result.sessionId).toBe(100);
      expect(result.template).toEqual(template);
      expect(db.query.workoutSessions.findFirst).toHaveBeenCalled();
      expect(db.query.workoutTemplates.findFirst).toHaveBeenCalled();
    });

    it("should create new session when recent session exists but has exercises", async () => {
      const user = { id: "user_dup_2" } as const;

      const recentSessionWithExercises = {
        id: 101,
        user_id: user.id,
        templateId: 1,
        workoutDate: new Date(Date.now() - 60000), // 1 minute ago
        exercises: [{ id: 1 }], // Has exercises
      };

      const template = {
        id: 1,
        user_id: user.id,
        name: "Test Template",
        exercises: [],
      };

      const newSession = {
        id: 102,
        user_id: user.id,
        templateId: 1,
        workoutDate: new Date(),
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValueOnce(recentSessionWithExercises),
          },
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce(template),
          },
        },
      });

      // Mock insert chain
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValueOnce([newSession]),
        }),
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.start({
        templateId: 1,
        workoutDate: new Date(),
      } as any);

      expect(result.sessionId).toBe(102);
      expect(result.template).toEqual(template);
      expect(db.query.workoutSessions.findFirst).toHaveBeenCalled();
      expect(db.query.workoutTemplates.findFirst).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should create new session when no recent session exists", async () => {
      const user = { id: "user_dup_3" } as const;

      const template = {
        id: 1,
        user_id: user.id,
        name: "Test Template",
        exercises: [],
      };

      const newSession = {
        id: 103,
        user_id: user.id,
        templateId: 1,
        workoutDate: new Date(),
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValueOnce(null), // No recent session
          },
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce(template),
          },
        },
      });

      // Mock insert chain
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValueOnce([newSession]),
        }),
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.start({
        templateId: 1,
        workoutDate: new Date(),
      } as any);

      expect(result.sessionId).toBe(103);
      expect(result.template).toEqual(template);
      expect(db.query.workoutSessions.findFirst).toHaveBeenCalled();
      expect(db.query.workoutTemplates.findFirst).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("start procedure - error handling", () => {
    it("should handle TRPCError when template not found", async () => {
      const user = { id: "user_err_1" } as const;

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
          },
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce(null), // Template not found
          },
        },
      });

      const trpc = await buildCaller({ db, user });

      await expect(
        trpc.workouts.start({
          templateId: 999,
          workoutDate: new Date(),
        } as any)
      ).rejects.toThrow("Template not found");
    });

    it("should handle TRPCError when session creation fails", async () => {
      const user = { id: "user_err_2" } as const;

      const template = {
        id: 1,
        user_id: user.id,
        name: "Test Template",
        exercises: [],
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
          },
          workoutTemplates: {
            findFirst: vi.fn().mockResolvedValueOnce(template),
          },
        },
      });

      // Mock insert chain to return empty array (failure)
      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValueOnce([]), // Empty result = failure
        }),
      });

      const trpc = await buildCaller({ db, user });

      await expect(
        trpc.workouts.start({
          templateId: 1,
          workoutDate: new Date(),
        } as any)
      ).rejects.toThrow("Failed to create workout session");
    });

    it("should handle generic errors in start procedure", async () => {
      const user = { id: "user_err_3" } as const;

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockRejectedValueOnce(new Error("Database error")),
          },
        },
      });

      const trpc = await buildCaller({ db, user });

      await expect(
        trpc.workouts.start({
          templateId: 1,
          workoutDate: new Date(),
        } as any)
      ).rejects.toThrow("Database error");
    });
  });

  describe("save procedure - telemetry updates", () => {
    it("should update session telemetry fields when provided", async () => {
      const user = { id: "user_save_1" } as const;

      const session = {
        id: 200,
        user_id: user.id,
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValueOnce(session),
          },
        },
      });

      // Mock delete and insert chains
      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce([]),
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([]),
      });

      // Mock update chain
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([]),
      };
      db.update = vi.fn().mockReturnValue(updateChain);

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.save({
        sessionId: 200,
        exercises: [],
        theme_used: "dark",
        device_type: "ios",
        perf_metrics: { loadTime: 100 },
      } as any);

      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalledWith({
        theme_used: "dark",
        device_type: "ios",
        perf_metrics: { loadTime: 100 },
      });
      expect(updateChain.where).toHaveBeenCalled();
    });

    it("should only update specific telemetry fields when provided individually", async () => {
      const user = { id: "user_save_2" } as const;

      const session = {
        id: 201,
        user_id: user.id,
      };

      const db = createMockDb({
        query: {
          workoutSessions: {
            findFirst: vi.fn().mockResolvedValueOnce(session),
          },
        },
      });

      // Mock delete and insert chains
      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce([]),
      });

      db.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValueOnce([]),
      });

      // Mock update chain
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValueOnce([]),
      };
      db.update = vi.fn().mockReturnValue(updateChain);

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.save({
        sessionId: 201,
        exercises: [],
        theme_used: "light",
      } as any);

      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalledWith({
        theme_used: "light",
      });
      expect(updateChain.where).toHaveBeenCalled();
    });
  });

  describe("getLastExerciseData - linked exercises", () => {
    it("should handle linked exercises with multiple linked template exercises", async () => {
      const user = { id: "user_linked_1" } as const;

      const exerciseLink = {
        masterExerciseId: 1,
        masterExercise: {
          id: 1,
          exerciseName: "Bench Press",
        },
      };

      const linkedExercises = [
        {
          templateExercise: {
            exerciseName: "Bench Press",
          },
        },
        {
          templateExercise: {
            exerciseName: "DB Bench Press",
          },
        },
        {
          templateExercise: {
            exerciseName: "Incline Bench Press",
          },
        },
      ];

      const sessionWithLinkedExercises = [
        {
          id: 300,
          user_id: user.id,
          workoutDate: new Date(),
          exercises: [
            {
              id: 1,
              exerciseName: "DB Bench Press",
              weight: "20",
              reps: 12,
              sets: 3,
              unit: "kg",
              setOrder: 0,
            },
            {
              id: 2,
              exerciseName: "Incline Bench Press",
              weight: "40",
              reps: 10,
              sets: 3,
              unit: "kg",
              setOrder: 1,
            },
          ],
        },
      ];

      const db = createMockDb({
        query: {
          exerciseLinks: {
            findFirst: vi.fn().mockResolvedValueOnce(exerciseLink),
            findMany: vi.fn().mockResolvedValueOnce(linkedExercises),
          },
          workoutSessions: {
            findMany: vi.fn().mockResolvedValueOnce(sessionWithLinkedExercises),
          },
        },
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.getLastExerciseData({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
      } as any);

      expect(result).toBeDefined();
      expect(result?.sets).toHaveLength(2);
      expect(db.query.exerciseLinks.findFirst).toHaveBeenCalled();
      expect(db.query.exerciseLinks.findMany).toHaveBeenCalled();
      expect(db.query.workoutSessions.findMany).toHaveBeenCalled();
    });

    it("should handle case when no linked exercises are found", async () => {
      const user = { id: "user_linked_2" } as const;

      const exerciseLink = {
        masterExerciseId: 1,
        masterExercise: {
          id: 1,
          exerciseName: "Bench Press",
        },
      };

      // Empty array means no linked exercises
      const linkedExercises = [];

      const db = createMockDb({
        query: {
          exerciseLinks: {
            findFirst: vi.fn().mockResolvedValueOnce(exerciseLink),
            findMany: vi.fn().mockResolvedValueOnce(linkedExercises),
          },
          workoutSessions: {
            findMany: vi.fn().mockResolvedValueOnce([]),
          },
        },
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.getLastExerciseData({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
      } as any);

      expect(result).toBeNull();
      expect(db.query.exerciseLinks.findFirst).toHaveBeenCalled();
      expect(db.query.exerciseLinks.findMany).toHaveBeenCalled();
      expect(db.query.workoutSessions.findMany).toHaveBeenCalled();
    });
  });

  describe("getLatestPerformanceForTemplateExercise", () => {
    it("should return performance when exercise is linked to master and performance found", async () => {
      const user = { id: "user_perf_1" } as const;

      const exerciseLink = [{ masterExerciseId: 1 }];
      const linkedTemplateExercises = [{ id: 1 }, { id: 2 }];
      const latestWorkout = [{ sessionId: 400, workoutDate: new Date() }];
      const latestPerformance = [
        {
          weight: "100",
          reps: 5,
          sets: 3,
          unit: "kg",
          workoutDate: new Date(),
        },
      ];

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
          };

          // The actual method calls await on the chain, so we need to make the chain thenable
          chain.then = vi.fn(async (resolve) => {
            // First call: exercise link lookup - return array with the exercise link
            if (callCount === 1) {
              return resolve(exerciseLink);
            }
            // Second call: linked template exercises
            if (callCount === 2) {
              return resolve(linkedTemplateExercises);
            }
            // Third call: latest workout
            if (callCount === 3) {
              return resolve(latestWorkout);
            }
            // Fourth call: latest performance
            if (callCount === 4) {
              return resolve(latestPerformance);
            }
            return resolve([]);
          });

          return chain;
        }),
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 1,
      } as any);

      expect(result).toBeDefined();
      expect(result?.weight).toBe("100");
      expect(result?.reps).toBe(5);
      expect(db.select).toHaveBeenCalledTimes(4);
    });

    it("should return null when exercise is linked but no performance found", async () => {
      const user = { id: "user_perf_2" } as const;

      const exerciseLink = [{ masterExerciseId: 1 }];
      const linkedTemplateExercises = [{ id: 1 }, { id: 2 }];
      const latestWorkout = []; // No workouts found

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
          };

          // The actual method calls await on the chain, so we need to make the chain thenable
          chain.then = vi.fn(async (resolve) => {
            // First call: exercise link lookup - return array with the exercise link
            if (callCount === 1) {
              return resolve(exerciseLink);
            }
            // Second call: linked template exercises
            if (callCount === 2) {
              return resolve(linkedTemplateExercises);
            }
            // Third call: latest workout - return empty array
            if (callCount === 3) {
              return resolve(latestWorkout);
            }
            return resolve([]);
          });

          return chain;
        }),
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 1,
      } as any);

      expect(result).toBeNull();
      expect(db.select).toHaveBeenCalledTimes(3);
    });

    it("should return performance by exercise name when no link exists and performance found", async () => {
      const user = { id: "user_perf_3" } as const;

      const templateExercise = [{ exerciseName: "Squats" }];
      const latestWorkout = [{ sessionId: 401, workoutDate: new Date() }];
      const latestPerformance = [
        {
          weight: "120",
          reps: 8,
          sets: 3,
          unit: "kg",
          workoutDate: new Date(),
        },
      ];

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
          };

          // The actual method calls await on the chain, so we need to make the chain thenable
          chain.then = vi.fn(async (resolve) => {
            // First call: exercise link lookup - return empty array (no link)
            if (callCount === 1) {
              return resolve([]);
            }
            // Second call: template exercise lookup
            if (callCount === 2) {
              return resolve(templateExercise);
            }
            // Third call: latest workout
            if (callCount === 3) {
              return resolve(latestWorkout);
            }
            // Fourth call: latest performance
            if (callCount === 4) {
              return resolve(latestPerformance);
            }
            return resolve([]);
          });

          return chain;
        }),
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 2,
      } as any);

      expect(result).toBeDefined();
      expect(result?.weight).toBe("120");
      expect(result?.reps).toBe(8);
      expect(db.select).toHaveBeenCalledTimes(4);
    });

    it("should return null when no link exists and no template exercise found", async () => {
      const user = { id: "user_perf_4" } as const;

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
          };

          // The actual method calls await on the chain, so we need to make the chain thenable
          chain.then = vi.fn(async (resolve) => {
            // First call: exercise link lookup - return empty array (no link)
            if (callCount === 1) {
              return resolve([]);
            }
            // Second call: template exercise lookup - return empty array (no template exercise)
            if (callCount === 2) {
              return resolve([]);
            }
            return resolve([]);
          });

          return chain;
        }),
      });

      const trpc = await buildCaller({ db, user });

      const result = await trpc.workouts.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 999,
      } as any);

      expect(result).toBeNull();
      expect(db.select).toHaveBeenCalledTimes(2);
    });
  });
});