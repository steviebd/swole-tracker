import { describe, it, expect, vi, beforeEach } from "vitest";
import { desc, asc, max, count } from "drizzle-orm";
import { workoutTemplates, workoutSessions } from "~/server/db/schema";

// Import after mocking
import { workoutsRouter } from "~/server/api/routers/workouts";
import * as sessionDebrief from "~/server/api/services/session-debrief";
import {
  createMockUser,
  createMockWorkoutSession,
  createMockWorkoutTemplate,
  createMockSessionExercise,
} from "~/__tests__/mocks/test-data";
import { getMockData } from "~/__tests__/mocks/mock-sets";
import { clearTestData } from "~/__tests__/mocks/db";

type ChainResult<TData> = TData extends Array<unknown> ? TData : never;

const createQueryChain = <TData extends unknown[]>(
  queue: Array<ChainResult<TData>>,
) => {
  const result = queue.length > 0 ? queue.shift()! : ([] as unknown as TData);

  const chain: any = {
    result,
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    select: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    returning: vi.fn(async () => chain.result),
    onConflictDoUpdate: vi.fn(() => chain),
    execute: vi.fn(async () => chain.result),
    all: vi.fn(async () => chain.result),
    delete: vi.fn(() => chain),
    then: (
      resolve: (value: TData) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(chain.result as TData).then(resolve, reject),
    catch: (reject: (reason: unknown) => void) =>
      Promise.resolve(chain.result as TData).catch(reject),
    finally: (cb: () => void) =>
      Promise.resolve(chain.result as TData).finally(cb),
    toString: () => "[MockQueryChain]",
  };

  return chain;
};

const createMockDb = () => {
  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const updateQueue: unknown[][] = [];
  const deleteQueue: unknown[][] = [];

  const mockDb = {
    queueSelectResult: (rows: unknown[]) => selectQueue.push(rows),
    queueInsertResult: (rows: unknown[]) => insertQueue.push(rows),
    queueUpdateResult: (rows: unknown[]) => updateQueue.push(rows),
    queueDeleteResult: (rows: unknown[]) => deleteQueue.push(rows),
    select: vi.fn(() => createQueryChain(selectQueue)),
    insert: vi.fn(() => createQueryChain(insertQueue)),
    update: vi.fn(() => createQueryChain(updateQueue)),
    delete: vi.fn(() => createQueryChain(deleteQueue)),
    transaction: vi.fn((callback: (tx: any) => Promise<any>) =>
      callback(mockDb),
    ),
    batch: vi.fn((statements: any[]) =>
      Promise.resolve(statements.map(() => [])),
    ),
    all: vi.fn(async () => []),
    query: {
      workoutSessions: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      exerciseLinks: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      workoutTemplates: {
        findFirst: vi.fn(),
      },
      sessionExercises: {
        findMany: vi.fn(),
      },
    },
  } as any;

  return mockDb;
};

describe("workoutsRouter", () => {
  const mockUser = createMockUser({ id: "user-123" });

  let mockCtx: {
    db: ReturnType<typeof createMockDb>;
    user: typeof mockUser;
    requestId: string;
    headers: Headers;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(sessionDebrief, "generateAndPersistDebrief");
    clearTestData();

    // Set up mock database with query interface
    mockCtx = {
      db: createMockDb(),
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("getRecent", () => {
    it("should return recent workouts for user", async () => {
      const mockWorkouts = [
        {
          ...createMockWorkoutSession({
            id: 1,
            user_id: "user-123",
            templateId: 1,
            workoutDate: new Date("2024-01-01"),
          }),
          template: {
            ...createMockWorkoutTemplate({
              id: 1,
              name: "Push Day",
              user_id: "user-123",
            }),
            exercises: [],
          },
          exercises: [],
        },
      ];

      mockCtx.db.query.workoutSessions.findMany.mockResolvedValue(mockWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getRecent({ limit: 5 });

      expect(mockCtx.db.query.workoutSessions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        }),
      );
      expect(result).toEqual(mockWorkouts as any);
    });

    it("should use default limit of 10", async () => {
      const mockWorkouts: Array<any> = [];
      mockCtx.db.query.workoutSessions.findMany.mockResolvedValue(mockWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      await caller.getRecent({});

      expect(mockCtx.db.query.workoutSessions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 }),
      );
    });
  });

  describe("getById", () => {
    it("should return workout by id for owner", async () => {
      const mockWorkout = {
        ...createMockWorkoutSession({
          id: 1,
          user_id: "user-123",
          templateId: 1,
          workoutDate: new Date("2024-01-01"),
        }),
        template: {
          ...createMockWorkoutTemplate({
            id: 1,
            name: "Push Day",
            user_id: "user-123",
          }),
          exercises: [],
        },
        exercises: [],
      };

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockWorkout);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(result).toEqual(mockWorkout);
    });

    it("should throw error if workout not found", async () => {
      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.getById({ id: 999 })).rejects.toThrow(
        "Workout not found",
      );
    });

    it("should throw error if workout belongs to different user", async () => {
      const mockWorkout = createMockWorkoutSession({
        id: 1,
        user_id: "different-user",
        templateId: 1,
        workoutDate: new Date("2024-01-01"),
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockWorkout);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.getById({ id: 1 })).rejects.toThrow(
        "Workout not found",
      );
    });
  });

  describe("getLastExerciseData", () => {
    it("should return last exercise data for simple exercise", async () => {
      // Mock the latest session query result
      mockCtx.db.queueSelectResult([{ sessionId: 1 }]);

      // Mock the sets query result
      mockCtx.db.queueSelectResult([
        {
          weight: 80,
          reps: 8,
          sets: 3,
          unit: "kg",
          setOrder: 0,
        },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLastExerciseData({
        exerciseName: "Bench Press",
      });

      expect(result).toEqual({
        sets: [
          {
            id: "prev-0",
            weight: 80,
            reps: 8,
            sets: 3,
            unit: "kg",
          },
        ],
        best: {
          weight: 80,
          reps: 8,
          sets: 3,
          unit: "kg",
        },
      });
    });

    it("should handle exercise links for linked exercises", async () => {
      // Mock the exercise name resolution view query
      mockCtx.db.queueSelectResult([{ resolvedName: "Bench Press (Barbell)" }]);

      // Mock the latest session query
      mockCtx.db.queueSelectResult([{ sessionId: 1 }]);

      // Mock the sets query
      mockCtx.db.queueSelectResult([
        {
          weight: 75,
          reps: 10,
          sets: 4,
          unit: "kg",
          setOrder: 0,
        },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLastExerciseData({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
      });

      expect(result).toEqual({
        sets: [
          {
            id: "prev-0",
            weight: 75,
            reps: 10,
            sets: 4,
            unit: "kg",
          },
        ],
        best: {
          weight: 75,
          reps: 10,
          sets: 4,
          unit: "kg",
        },
      });
    });

    it("should exclude specified session", async () => {
      // Mock the latest session query (no need for exercise name resolution since no templateExerciseId)
      mockCtx.db.queueSelectResult([{ sessionId: 1 }]);

      // Mock the sets query
      mockCtx.db.queueSelectResult([
        {
          weight: 80,
          reps: 8,
          sets: 3,
          unit: "kg",
          setOrder: 0,
        },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLastExerciseData({
        exerciseName: "Bench Press",
        excludeSessionId: 2,
      });

      expect(result).toEqual({
        sets: [
          {
            id: "prev-0",
            weight: 80,
            reps: 8,
            sets: 3,
            unit: "kg",
          },
        ],
        best: {
          weight: 80,
          reps: 8,
          sets: 3,
          unit: "kg",
        },
      });
    });

    it("should return null if no previous data found", async () => {
      mockCtx.db.all.mockResolvedValue([]);

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
        ...createMockWorkoutTemplate({
          id: 1,
          user_id: "user-123",
          name: "Push Day",
        }),
        exercises: [
          {
            ...createMockSessionExercise({
              id: 1,
              user_id: "user-123",
              exerciseName: "Bench Press",
              sets: 3,
              reps: 8,
              weight: 80,
              unit: "kg",
            }),
          },
        ],
      };

      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: new Date("2024-01-01"),
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValueOnce(null);
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(
        mockTemplate,
      );
      const insertChain: any = {
        values: vi.fn(() => insertChain),
        returning: vi.fn(async () => [mockSession]),
        then: (
          resolve: (value: unknown[]) => void,
          reject?: (reason: unknown) => void,
        ) => Promise.resolve([mockSession]).then(resolve, reject),
      };
      mockCtx.db.insert.mockImplementation(() => insertChain);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.start({
        templateId: 1,
        workoutDate: new Date("2024-01-01"),
      });

      expect(result).toEqual({
        sessionId: mockSession.id,
        template: mockTemplate,
      });
    });

    it("should throw error if template not found", async () => {
      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValueOnce(null);
      mockCtx.db.query.workoutTemplates.findFirst.mockResolvedValue(null);

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
      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: new Date("2024-01-01"),
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

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
      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(
        caller.save({
          sessionId: 999,
          exercises: [],
        }),
      ).rejects.toThrow("Workout session not found");
    });

    it("should trigger generateAndPersistDebrief when saving exercises", async () => {
      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: new Date("2024-01-01"),
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

      const caller = workoutsRouter.createCaller(mockCtx);
      await caller.save({
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

      expect(sessionDebrief.generateAndPersistDebrief).toHaveBeenCalledWith({
        dbClient: mockCtx.db,
        userId: "user-123",
        sessionId: 1,
        locale: undefined,
        trigger: "auto",
        requestId: "test-request",
      });
    });
  });

  describe("updateSessionSets", () => {
    it("should update session sets", async () => {
      const mockSession = {
        ...createMockWorkoutSession({
          id: 1,
          user_id: "user-123",
        }),
        exercises: [
          createMockSessionExercise({
            id: 1,
            user_id: "user-123",
            exerciseName: "Bench Press",
            setOrder: 0,
            weight: 80,
            reps: 8,
            sets: 3,
            unit: "kg",
          }),
        ],
      };

      const mockExistingSets = [
        {
          id: 1,
          exerciseName: "Bench Press",
          setOrder: 0,
        },
      ];

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockSession);
      const selectChain: any = {
        from: vi.fn(() => selectChain),
        where: vi.fn(() => selectChain),
        orderBy: vi.fn(() => selectChain),
        then: (
          resolve: (value: typeof mockExistingSets) => void,
          reject?: (reason: unknown) => void,
        ) => Promise.resolve(mockExistingSets).then(resolve, reject),
      };
      mockCtx.db.select.mockImplementation(() => selectChain);

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

      expect(result).toEqual({ success: true, updatedCount: 1 });
    });
  });

  describe("getLatestPerformanceForTemplateExercise", () => {
    it("should return latest performance data for template exercise", async () => {
      // Mock resolved names query
      mockCtx.db.queueSelectResult([
        { resolvedName: "Bench Press (Barbell)" },
        { resolvedName: "Bench Press (Dumbbell)" },
      ]);

      // Mock latest session query
      mockCtx.db.queueSelectResult([{ sessionId: 1 }]);

      // Mock performance query
      mockCtx.db.queueSelectResult([
        {
          weight: 90,
          reps: 8,
          sets: 3,
          unit: "kg",
          workoutDate: new Date("2024-01-01"),
        },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 1,
      });

      expect(result).toEqual({
        weight: 90,
        reps: 8,
        sets: 3,
        unit: "kg",
        workoutDate: new Date("2024-01-01"),
      });
    });

    it("should exclude specified session", async () => {
      // Mock resolved names query
      mockCtx.db.queueSelectResult([{ resolvedName: "Bench Press" }]);

      // Mock latest session query
      mockCtx.db.queueSelectResult([{ sessionId: 2 }]);

      // Mock performance query
      mockCtx.db.queueSelectResult([
        {
          weight: 85,
          reps: 10,
          sets: 4,
          unit: "kg",
          workoutDate: new Date("2024-01-02"),
        },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 1,
        excludeSessionId: 1,
      });

      expect(result).toEqual({
        weight: 85,
        reps: 10,
        sets: 4,
        unit: "kg",
        workoutDate: new Date("2024-01-02"),
      });
    });

    it("should return null if no resolved names found", async () => {
      // Mock empty resolved names
      mockCtx.db.queueSelectResult([]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 999,
      });

      expect(result).toBeNull();
    });

    it("should return null if no previous session found", async () => {
      // Mock resolved names query
      mockCtx.db.queueSelectResult([{ resolvedName: "Bench Press" }]);

      // Mock empty latest session query
      mockCtx.db.queueSelectResult([]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 1,
      });

      expect(result).toBeNull();
    });

    it("should handle multiple resolved names correctly", async () => {
      // Mock multiple resolved names
      mockCtx.db.queueSelectResult([
        { resolvedName: "Bench Press" },
        { resolvedName: "Chest Press" },
        { resolvedName: "Push Press" },
      ]);

      // Mock latest session query
      mockCtx.db.queueSelectResult([{ sessionId: 1 }]);

      // Mock performance query with best weight
      mockCtx.db.queueSelectResult([
        {
          weight: 100,
          reps: 6,
          sets: 3,
          unit: "kg",
          workoutDate: new Date("2024-01-01"),
        },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getLatestPerformanceForTemplateExercise({
        templateExerciseId: 1,
      });

      expect(result).toEqual({
        weight: 100,
        reps: 6,
        sets: 3,
        unit: "kg",
        workoutDate: new Date("2024-01-01"),
      });
    });
  });

  describe("batchSave", () => {
    it("should save multiple workout sessions successfully", async () => {
      const mockSession1 = createMockWorkoutSession({
        id: 1,
        user_id: mockUser.id,
      });
      const mockSession2 = createMockWorkoutSession({
        id: 2,
        user_id: mockUser.id,
      });

      // Mock the session verification calls - simple approach like the save test
      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(
        mockSession1,
      );

      // Mock the insert operations for the new session exercises
      mockCtx.db.queueInsertResult([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ]);
      mockCtx.db.queueInsertResult([
        { id: 5 },
        { id: 6 },
        { id: 7 },
        { id: 8 },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.batchSave({
        workouts: [
          {
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
          },
        ],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        sessionId: 1,
        success: true,
      });
    });

    it("should handle session not found errors", async () => {
      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.batchSave({
        workouts: [
          {
            sessionId: 999,
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
          },
        ],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        sessionId: 999,
        success: false,
        error: "Workout session not found",
      });
    });

    it("should handle mixed success and failure results", async () => {
      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: mockUser.id,
      });

      // Mock all database operations that might interfere with session verification
      mockCtx.db.queueSelectResult([
        {
          templateExerciseId: 1,
          templateName: "Bench Press",
          masterName: null,
          masterExerciseId: null,
        },
        {
          templateExerciseId: 2,
          templateName: "Squat",
          masterName: null,
          masterExerciseId: null,
        },
      ]);

      // Use a mock implementation that handles the Drizzle SQL object pattern
      // Reset any existing mocks first
      mockCtx.db.query.workoutSessions.findFirst.mockReset();

      // Create a mock implementation that returns different results based on session ID
      const findFirstMock = vi.fn();
      findFirstMock.mockImplementation((query: any) => {
        const where = query?.where;

        // Handle the Drizzle SQL object pattern
        if (where && where.queryChunks && Array.isArray(where.queryChunks)) {
          // Look for the Param object that contains the session ID value
          for (const chunk of where.queryChunks) {
            if (chunk && chunk.value && typeof chunk.value === "number") {
              if (chunk.value === 1) {
                return Promise.resolve(mockSession);
              }
              if (chunk.value === 999) {
                return Promise.resolve(null);
              }
            }
          }
        }

        return Promise.resolve(null);
      });

      mockCtx.db.query.workoutSessions.findFirst = findFirstMock;

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.batchSave({
        workouts: [
          {
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
          },
          {
            sessionId: 999,
            exercises: [
              {
                templateExerciseId: 2,
                exerciseName: "Squat",
                sets: [
                  {
                    id: "set-2",
                    weight: 100,
                    reps: 5,
                    sets: 4,
                    unit: "kg",
                  },
                ],
                unit: "kg",
              },
            ],
          },
        ],
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        sessionId: 1,
        success: true,
      });
      expect(result.results[1]).toEqual({
        sessionId: 999,
        success: false,
        error: "Workout session not found",
      });
    });

    it("should trigger generateAndPersistDebrief for sessions with exercises", async () => {
      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: mockUser.id,
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.batchSave({
        workouts: [
          {
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
          },
          {
            sessionId: 999,
            exercises: [
              {
                templateExerciseId: 2,
                exerciseName: "Squat",
                sets: [
                  {
                    id: "set-2",
                    weight: 100,
                    reps: 5,
                    sets: 4,
                    unit: "kg",
                  },
                ],
                unit: "kg",
              },
            ],
          },
        ],
      });

      expect(sessionDebrief.generateAndPersistDebrief).toHaveBeenCalledWith({
        dbClient: mockCtx.db,
        userId: "user-123",
        sessionId: 1,
        locale: undefined,
        trigger: "auto",
        requestId: "test-request",
      });
    });

    it("should handle empty exercises array", async () => {
      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: mockUser.id,
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.batchSave({
        workouts: [
          {
            sessionId: 1,
            exercises: [],
          },
        ],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        sessionId: 1,
        success: true,
      });
      expect(sessionDebrief.generateAndPersistDebrief).not.toHaveBeenCalled();
    });

    it("should handle exercises with no valid sets", async () => {
      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: mockUser.id,
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

      // Mock the loadResolvedExerciseNameMap function for the template exercise
      mockCtx.db.queueSelectResult([
        {
          templateExerciseId: 1,
          templateName: "Bench Press",
          masterName: null,
          masterExerciseId: null,
        },
      ]);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.batchSave({
        workouts: [
          {
            sessionId: 1,
            exercises: [
              {
                templateExerciseId: 1,
                exerciseName: "Bench Press",
                sets: [
                  {
                    id: "set-1",
                    weight: undefined,
                    reps: undefined,
                    sets: undefined,
                    unit: "kg",
                  },
                ],
                unit: "kg",
              },
            ],
          },
        ],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        sessionId: 1,
        success: true,
      });
      // Note: generateAndPersistDebrief is called asynchronously, so we can't easily test it's not called
      // The important thing is that the batch save succeeds even with invalid sets
    });
  });

  describe("delete", () => {
    it("should delete workout session", async () => {
      const mockSession = createMockWorkoutSession({
        id: 1,
        user_id: "user-123",
        templateId: 1,
        workoutDate: new Date("2024-01-01"),
      });

      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });

    it("should throw error if session not found", async () => {
      mockCtx.db.query.workoutSessions.findFirst.mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.delete({ id: 999 })).rejects.toThrow(
        "Workout session not found",
      );
    });
  });
});
