import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockUser,
  createMockHealthAdvice,
} from "~/__tests__/mocks/test-data";

// Import after mocking
import { healthAdviceRouter } from "~/server/api/routers/health-advice";

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
    query: {},
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

describe("healthAdviceRouter", () => {
  const mockUser = createMockUser({ id: "user-123" });

  let mockDb: ReturnType<typeof createMockDb>;
  let caller: ReturnType<(typeof healthAdviceRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    const ctx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = healthAdviceRouter.createCaller(ctx);
  });

  describe("save", () => {
    it("should save health advice to database", async () => {
      const mockResult = [
        createMockHealthAdvice({
          user_id: mockUser.id,
          sessionId: 1,
          total_suggestions: 1,
        }),
      ];

      mockDb.queueInsertResult(mockResult);

      const mockRequest = {
        session_id: "session-1",
        user_profile: {
          experience_level: "intermediate" as const,
        },
        workout_plan: {
          exercises: [],
        },
        prior_bests: {
          by_exercise_id: {},
        },
      };

      const mockResponse = {
        session_id: "session-1",
        readiness: {
          rho: 0.8,
          overload_multiplier: 1.0,
          flags: [],
        },
        per_exercise: [
          {
            exercise_id: "ex-1",
            predicted_chance_to_beat_best: 0.8,
            sets: [
              {
                set_id: "set-1",
                suggested_weight_kg: 100,
                suggested_reps: 8,
                suggested_rest_seconds: 180,
                rationale: "Progressive overload",
              },
            ],
          },
        ],
        session_predicted_chance: 0.9,
        summary: "Good session",
        warnings: [],
      };

      const result = await caller.save({
        sessionId: 1,
        request: mockRequest,
        response: mockResponse,
      });

      expect(result.total_suggestions).toBe(1);
    });
  });

  describe("saveWithWellness", () => {
    it("should save health advice with wellness data", async () => {
      const mockWellnessData = [{ id: 1, user_id: mockUser.id }];
      const mockResult = [
        createMockHealthAdvice({
          user_id: mockUser.id,
          sessionId: 1,
          response_time_ms: 1200,
        }),
      ];

      mockDb.queueSelectResult(mockWellnessData);
      mockDb.queueInsertResult(mockResult);

      const mockRequest = {
        session_id: "session-1",
        user_profile: {
          experience_level: "intermediate" as const,
        },
        workout_plan: {
          exercises: [],
        },
        prior_bests: {
          by_exercise_id: {},
        },
        manual_wellness: {
          has_whoop_data: false,
          energy_level: 8,
          sleep_quality: 7,
        },
      };

      const mockResponse = {
        session_id: "session-1",
        readiness: {
          rho: 0.8,
          overload_multiplier: 1.0,
          flags: [],
        },
        per_exercise: [],
        session_predicted_chance: 0.9,
        summary: "Good session",
        warnings: [],
      };

      const result = await caller.saveWithWellness({
        sessionId: 1,
        request: mockRequest,
        response: mockResponse,
        responseTimeMs: 1200,
        modelUsed: "gpt-4o-mini",
        wellnessDataId: 1,
      });

      expect(result).toEqual(mockResult[0]);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return null when no advice found", async () => {
      mockDb.queueDeleteResult([]);

      const result = await caller.delete({ sessionId: 999 });

      expect(result).toBeNull();
    });
  });

  describe("input validation", () => {
    it("should validate sessionId is positive number", async () => {
      await expect(caller.getBySessionId({ sessionId: -1 })).rejects.toThrow();

      await expect(caller.getBySessionId({ sessionId: 0 })).rejects.toThrow();
    });

    it("should validate history pagination parameters", async () => {
      await expect(caller.getHistory({ limit: 0 })).rejects.toThrow();

      await expect(caller.getHistory({ limit: 101 })).rejects.toThrow();

      await expect(caller.getHistory({ offset: -1 })).rejects.toThrow();
    });

    it("should validate accepted suggestions count", async () => {
      await expect(
        caller.updateAcceptedSuggestions({
          sessionId: 1,
          acceptedCount: -1,
        }),
      ).rejects.toThrow();
    });
  });
});
