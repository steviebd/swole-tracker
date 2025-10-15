import { describe, it, expect, vi, beforeEach } from "vitest";

// Import after mocking
import { workoutsRouter } from "~/server/api/routers/workouts";

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
    limit: vi.fn(async () => chain.result),
    offset: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    returning: vi.fn(async () => chain.result),
    onConflictDoUpdate: vi.fn(() => chain),
    execute: vi.fn(async () => chain.result),
    all: vi.fn(async () => chain.result),
    then: (
      resolve: (value: TData) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(chain.result as TData).then(resolve, reject),
    catch: (reject: (reason: unknown) => void) =>
      Promise.resolve(chain.result as TData).catch(reject),
    finally: (cb: () => void) =>
      Promise.resolve(chain.result as TData).finally(cb),
  };

  return chain;
};

const createMockDb = () => {
  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const updateQueue: unknown[][] = [];
  const deleteQueue: unknown[][] = [];

  return {
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
    queueSelectResult: (rows: unknown[]) => selectQueue.push(rows),
    queueInsertResult: (rows: unknown[]) => insertQueue.push(rows),
    queueUpdateResult: (rows: unknown[]) => updateQueue.push(rows),
    queueDeleteResult: (rows: unknown[]) => deleteQueue.push(rows),
    select: vi.fn(() => createQueryChain(selectQueue)),
    insert: vi.fn(() => createQueryChain(insertQueue)),
    update: vi.fn(() => createQueryChain(updateQueue)),
    delete: vi.fn(() => createQueryChain(deleteQueue)),
    all: vi.fn(async () => []),
  } as any;
};

describe("workoutsRouter", () => {
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

      mockDb.query.workoutSessions.findMany.mockResolvedValue(mockWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getRecent({ limit: 5 });

      expect(mockDb.query.workoutSessions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        }),
      );
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
      mockDb.query.workoutSessions.findMany.mockResolvedValue(mockWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      await caller.getRecent({});

      expect(mockDb.query.workoutSessions.findMany).toHaveBeenCalledWith(
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

      mockDb.query.workoutSessions.findFirst.mockResolvedValue(mockWorkout);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(result).toEqual(mockWorkout);
    });

    it("should throw error if workout not found", async () => {
      mockDb.query.workoutSessions.findFirst.mockResolvedValue(null);

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

      mockDb.query.workoutSessions.findFirst.mockResolvedValue(mockWorkout);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.getById({ id: 1 })).rejects.toThrow(
        "Workout not found",
      );
    });
  });

  describe("getLastExerciseData", () => {
    it("should return last exercise data for simple exercise", async () => {
      mockDb.all.mockResolvedValue([
        {
          weight: 80,
          reps: 8,
          sets: 3,
          unit: "kg",
          set_order: 0,
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
      mockDb.all.mockResolvedValue([
        {
          weight: 75,
          reps: 10,
          sets: 4,
          unit: "kg",
          set_order: 0,
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
      mockDb.all.mockResolvedValue([
        {
          weight: 80,
          reps: 8,
          sets: 3,
          unit: "kg",
          set_order: 0,
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
      mockDb.all.mockResolvedValue([]);

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
        user_id: "user-123",
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

      mockDb.query.workoutSessions.findFirst.mockResolvedValueOnce(null);
      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(mockTemplate);
      const insertChain: any = {
        values: vi.fn(() => insertChain),
        returning: vi.fn(async () => [mockSession]),
        then: (
          resolve: (value: unknown[]) => void,
          reject?: (reason: unknown) => void,
        ) => Promise.resolve([mockSession]).then(resolve, reject),
      };
      mockDb.insert.mockImplementation(() => insertChain);

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
      mockDb.query.workoutSessions.findFirst.mockResolvedValueOnce(null);
      mockDb.query.workoutTemplates.findFirst.mockResolvedValue(null);

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

      mockDb.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

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
      mockDb.query.workoutSessions.findFirst.mockResolvedValue(null);

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
            setOrder: 0,
            weight: 80,
            reps: 8,
            sets: 3,
            unit: "kg",
          },
        ],
      };

      const mockExistingSets = [
        {
          id: 1,
          exerciseName: "Bench Press",
          setOrder: 0,
        },
      ];

      mockDb.query.workoutSessions.findFirst.mockResolvedValue(mockSession);
      const selectChain: any = {
        from: vi.fn(() => selectChain),
        where: vi.fn(() => selectChain),
        orderBy: vi.fn(() => selectChain),
        then: (
          resolve: (value: typeof mockExistingSets) => void,
          reject?: (reason: unknown) => void,
        ) => Promise.resolve(mockExistingSets).then(resolve, reject),
      };
      mockDb.select.mockImplementation(() => selectChain);

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

      mockDb.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.delete({ id: 1 });

      expect(result).toEqual({ success: true });
    });

    it("should throw error if session not found", async () => {
      mockDb.query.workoutSessions.findFirst.mockResolvedValue(null);

      const caller = workoutsRouter.createCaller(mockCtx);

      await expect(caller.delete({ id: 999 })).rejects.toThrow(
        "Workout session not found",
      );
    });
  });
});
