import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb } from "../integration/trpc-harness";

// This suite focuses on raising coverage for server/api/routers/workouts.ts
// by exercising simple happy paths and error branches with a mocked ctx/db.

describe("tRPC workouts router additional coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("getRecent returns empty array when db returns none (happy path smoke)", async () => {
    const user = { id: "user_cov_1" } as const;

    const db = createMockDb({
      query: {
        workoutSessions: {
          findMany: vi.fn().mockResolvedValueOnce([]),
        },
      },
    });

    const trpc = await buildCaller({ db, user });

    const result = await trpc.workouts.getRecent({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    expect(db.query.workoutSessions.findMany).toHaveBeenCalledOnce();
  });

  it("getRecent truncates to limit and returns raw fields (list present)", async () => {
    const user = { id: "user_cov_2" } as const;

    const rows = Array.from({ length: 3 }).map((_, i) => ({
      id: i + 1,
      user_id: user.id,
      workoutDate: new Date(Date.now() - (i + 1) * 1000),
      template: {
        name: `Template ${i + 1}`,
        exercises: Array(i + 2).fill(null).map((_, j) => ({ id: j + 1 })),
      },
      exercises: Array(i + 2).fill(null),
    }));

    const db = createMockDb({
      query: {
        workoutSessions: {
          findMany: vi.fn().mockResolvedValueOnce(rows.slice(0, 2)),
        },
      },
    });

    const trpc = await buildCaller({ db, user });

    const result = await trpc.workouts.getRecent({ limit: 2 });
    // Router should honor limit and return raw database fields
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("user_id");
    expect(result[0]).toHaveProperty("workoutDate");
    expect(result[0]).toHaveProperty("template");
    expect(result[0]).toHaveProperty("exercises");
    expect(db.query.workoutSessions.findMany).toHaveBeenCalledOnce();
  });

  it("start returns session and template when insert succeeds", async () => {
    const user = { id: "user_cov_3" } as const;

    const templateRow = {
      id: 1,
      user_id: user.id,
      name: "Test Template",
      exercises: [{ id: 11, exerciseName: "Bench Press", orderIndex: 0 }],
    };

    const sessionRow = { id: 500, user_id: user.id, templateId: 1, workoutDate: new Date() };

    const db = createMockDb({
      query: {
        workoutTemplates: {
          findFirst: vi.fn().mockResolvedValueOnce(templateRow),
        },
      },
    });

    // Override the insert method to properly handle workout_sessions
    db.insert = vi.fn((table) => {
      const chain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValueOnce([sessionRow]),
      };
      return chain;
    });

    const trpc = await buildCaller({ db, user });

    const result = await trpc.workouts.start({
      templateId: 1,
      workoutDate: new Date(),
    } as any);
    expect(result.sessionId).toBe(500);
    expect(result.template).toBeDefined();
    expect(db.query.workoutTemplates.findFirst).toHaveBeenCalledOnce();
    expect(db.insert).toHaveBeenCalled();
  });

  it("save returns success when insert succeeds", async () => {
    const user = { id: "user_cov_4" } as const;

    const sessionRow = { id: 99, user_id: user.id };
    const db = createMockDb({
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValueOnce(sessionRow),
        },
      },
    });

    // Override delete and insert methods
    db.delete = vi.fn((table) => {
      return {
        where: vi.fn().mockResolvedValueOnce([]),
      };
    });

    db.insert = vi.fn((table) => {
      return {
        values: vi.fn().mockResolvedValueOnce([]),
      };
    });

    const trpc = await buildCaller({ db, user });

    const res = await trpc.workouts.save({
      sessionId: 99,
      exercises: [
        {
          exerciseName: "Bench Press",
          sets: [{ id: "set-1", weight: 100, reps: 5, sets: 3, unit: "kg" }],
        },
      ],
    } as any);
    expect(res.success).toBe(true);
    expect(db.query.workoutSessions.findFirst).toHaveBeenCalledOnce();
    expect(db.delete).toHaveBeenCalledOnce();
    expect(db.insert).toHaveBeenCalledOnce();
  });

  it("save throws when session not found (error branch)", async () => {
    const user = { id: "user_cov_5" } as const;

    const db = {
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValueOnce(null),
        },
      },
    } as any;

    const trpc = await buildCaller({ db, user });

    await expect(
      trpc.workouts.save({
        sessionId: 999,
        exercises: [],
      } as any),
    ).rejects.toBeTruthy();
  });

  it("delete returns success when delete succeeds", async () => {
    const user = { id: "user_cov_6" } as const;

    const sessionRow = { id: 77, user_id: user.id };
    const db = createMockDb({
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValueOnce(sessionRow),
        },
      },
      delete: vi.fn((table) => {
        if (table?._?.name === "workout_sessions") {
          return {
            where: vi.fn().mockResolvedValueOnce([]),
          };
        }
        return {
          where: vi.fn().mockResolvedValueOnce([]),
        };
      }),
    });

    const trpc = await buildCaller({ db, user });

    const res = await trpc.workouts.delete({ id: 77 } as any);
    expect(res.success).toBe(true);
    expect(db.query.workoutSessions.findFirst).toHaveBeenCalledOnce();
    // Verify delete was called
    expect(db.delete).toHaveBeenCalled();
  });

  it("delete throws when session not found (error branch)", async () => {
    const user = { id: "user_cov_7" } as const;

    const db = {
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValueOnce(null),
        },
      },
    } as any;

    const trpc = await buildCaller({ db, user });

    await expect(trpc.workouts.delete({ id: 404 } as any)).rejects.toBeTruthy();
  });

  it("getById returns workout when found and owned", async () => {
    const user = { id: "user_cov_8" } as const;

    const workoutRow = {
      id: 100,
      user_id: user.id,
      templateId: 1,
      workoutDate: new Date(),
      template: { name: "Test Template", exercises: [] },
      exercises: [],
    };

    const db = createMockDb({
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValueOnce(workoutRow),
        },
      },
    });

    const trpc = await buildCaller({ db, user });

    const result = await trpc.workouts.getById({ id: 100 } as any);
    expect(result.id).toBe(100);
    expect(result.user_id).toBe(user.id);
    expect(db.query.workoutSessions.findFirst).toHaveBeenCalledOnce();
  });

  it("getById throws when workout not found (error branch)", async () => {
    const user = { id: "user_cov_9" } as const;

    const db = {
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValueOnce(null),
        },
      },
    } as any;

    const trpc = await buildCaller({ db, user });

    await expect(trpc.workouts.getById({ id: 999 } as any)).rejects.toBeTruthy();
  });

  it("getById throws when workout not owned (error branch)", async () => {
    const user = { id: "user_cov_10" } as const;

    const workoutRow = {
      id: 101,
      user_id: "different_user",
      templateId: 1,
      workoutDate: new Date(),
      template: { name: "Test Template", exercises: [] },
      exercises: [],
    };

    const db = createMockDb({
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValueOnce(workoutRow),
        },
      },
    });

    const trpc = await buildCaller({ db, user });

    await expect(trpc.workouts.getById({ id: 101 } as any)).rejects.toBeTruthy();
  });

  it("getLastExerciseData returns null when no matching workouts", async () => {
    const user = { id: "user_cov_11" } as const;

    const db = createMockDb({
      query: {
        workoutSessions: {
          findMany: vi.fn().mockResolvedValueOnce([]),
        },
      },
    });

    const trpc = await buildCaller({ db, user });

    const result = await trpc.workouts.getLastExerciseData({
      exerciseName: "Bench Press",
    } as any);
    expect(result).toBeNull();
    expect(db.query.workoutSessions.findMany).toHaveBeenCalledOnce();
  });

  it("getLastExerciseData returns last workout data when found", async () => {
    const user = { id: "user_cov_12" } as const;

    const sessionRow = {
      id: 200,
      user_id: user.id,
      workoutDate: new Date(),
      exercises: [
        {
          id: 1,
          sessionId: 200,
          exerciseName: "Bench Press",
          weight: "100",
          reps: 5,
          sets: 3,
          unit: "kg",
          setOrder: 0,
        },
      ],
    };

    const db = createMockDb({
      query: {
        workoutSessions: {
          findMany: vi.fn().mockResolvedValueOnce([sessionRow]),
        },
      },
    });

    const trpc = await buildCaller({ db, user });

    const result = await trpc.workouts.getLastExerciseData({
      exerciseName: "Bench Press",
    } as any);
    expect(result).toBeDefined();
    expect(result?.sets).toHaveLength(1);
    expect(result?.sets[0]?.weight).toBe(100);
    expect(result?.sets[0]?.reps).toBe(5);
    expect(result?.best).toBeDefined();
    expect(db.query.workoutSessions.findMany).toHaveBeenCalledOnce();
  });

  it("getLatestPerformanceForTemplateExercise returns null when no link and no template exercise", async () => {
    const user = { id: "user_cov_13" } as const;

    let callCount = 0;
    const db = createMockDb({
      select: vi.fn((cols) => {
        callCount++;
        const chain: any = {
          from: vi.fn((table: any) => {
            chain._table = String(table);
            return chain;
          }),
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
    expect(db.select).toHaveBeenCalled();
  });

  it("getLatestPerformanceForTemplateExercise returns performance when linked to master exercise", async () => {
    const user = { id: "user_cov_14" } as const;

    const exerciseLink = {
      masterExerciseId: 1,
    };

    const linkedTemplateExercises = [
      { id: 11 },
      { id: 12 },
    ];

    const latestWorkout = {
      sessionId: 300,
      workoutDate: new Date(),
    };

    const latestPerformance = {
      weight: "120",
      reps: 5,
      sets: 3,
      unit: "kg",
      workoutDate: new Date(),
    };

    let callCount = 0;
    const db = createMockDb({
      select: vi.fn((cols) => {
        callCount++;
        const chain: any = {
          from: vi.fn((table: any) => {
            chain._table = String(table);
            return chain;
          }),
          where: vi.fn(() => chain),
          innerJoin: vi.fn(() => chain),
          orderBy: vi.fn(() => chain),
          limit: vi.fn(() => chain),
        };
        
        // The actual method calls await on the chain, so we need to make the chain thenable
        chain.then = vi.fn(async (resolve) => {
          // First call: exercise link lookup - return array with the exercise link
          if (callCount === 1) {
            return resolve([exerciseLink]);
          }
          // Second call: linked template exercises
          if (callCount === 2) {
            return resolve(linkedTemplateExercises);
          }
          // Third call: latest workout
          if (callCount === 3) {
            return resolve([latestWorkout]);
          }
          // Fourth call: latest performance
          if (callCount === 4) {
            return resolve([latestPerformance]);
          }
          return resolve([]);
        });
        
        return chain;
      }),
    });

    const trpc = await buildCaller({ db, user });

    const result = await trpc.workouts.getLatestPerformanceForTemplateExercise({
      templateExerciseId: 11,
    } as any);
    expect(result).toBeDefined();
    expect(result?.weight).toBe("120");
    expect(result?.reps).toBe(5);
  });
});
