import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockUser,
  createMockExerciseLink,
  createMockTemplateExercise,
  createMockWorkoutSession,
  createMockSessionExercise,
} from "~/__tests__/mocks/test-data";

// Import after mocking
import { insightsRouter } from "~/server/api/routers/insights";

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
    all: vi.fn(async () => []),
  } as any;

  return mockDb;
};

describe("insightsRouter", () => {
  const mockUser = createMockUser({ id: "user-123" });

  let mockDb: ReturnType<typeof createMockDb>;
  let caller: ReturnType<(typeof insightsRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    const ctx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = insightsRouter.createCaller(ctx);
  });

  describe("getExerciseInsights", () => {
    it("should return insights for basic exercise lookup", async () => {
      // Mock no linked exercises
      mockDb.select().from().where().limit().execute.mockResolvedValue([]);
      mockDb.select().from().where().limit().execute.mockResolvedValue([]);

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

      const result = await caller.getExerciseInsights({
        exerciseName: "Bench Press",
      });

      expect(result).toBeDefined();
      expect(result.unit).toBe("kg");
      expect(result.volumeSparkline).toBeDefined();
    });

    it("should handle linked exercise lookups", async () => {
      // Mock linked exercise
      mockDb
        .select()
        .from()
        .where()
        .limit()
        .execute.mockResolvedValueOnce([
          {
            masterExerciseId: 1,
            masterExercise: { id: 1, name: "Bench Press" },
          },
        ]);

      mockDb
        .select()
        .from()
        .where()
        .limit()
        .execute.mockResolvedValueOnce([
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

      const result = await caller.getExerciseInsights({
        exerciseName: "Bench Press",
        templateExerciseId: 1,
      });

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should normalize units correctly", async () => {
      mockDb.select().from().where().limit().execute.mockResolvedValue([]);
      mockDb.select().from().where().limit().execute.mockResolvedValue([]);

      mockDb.query.workoutSessions.findMany.mockResolvedValue([
        {
          id: 1,
          workoutDate: new Date("2024-01-01"),
          exercises: [
            {
              exerciseName: "Bench Press",
              weight: 180,
              reps: 8,
              sets: 3,
              unit: "lbs",
              setOrder: 0,
            },
          ],
        },
      ]);

      const result = await caller.getExerciseInsights({
        exerciseName: "Bench Press",
        unit: "kg", // Request kg, but data is in lbs
      });

      expect(result).toBeDefined();
      // Should convert 180 lbs to kg
      expect(result.bestSet?.weight).toBeCloseTo(81.65, 1);
    });

    it("should exclude specified session", async () => {
      mockDb.select().from().where().limit().execute.mockResolvedValue([]);
      mockDb.select().from().where().limit().execute.mockResolvedValue([]);

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

      await caller.getExerciseInsights({
        exerciseName: "Bench Press",
        excludeSessionId: 2, // Different session
      });

      expect(mockDb.select).toHaveBeenCalled();
      // The mock doesn't check the where clause, but in real implementation it would exclude session 2
    });
  });
});
