import { describe, it, expect, vi, beforeEach } from "vitest";
import { suggestionsRouter } from "~/server/api/routers/suggestions";
import { TRPCError } from "@trpc/server";
import {
  createMockUser,
  createMockAISuggestionHistory,
} from "~/__tests__/mocks/test-data";

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
      aiSuggestionHistory: {
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

describe("suggestionsRouter", () => {
  const mockUser = createMockUser({ id: "test-user-id" });

  let mockDb: ReturnType<typeof createMockDb>;
  let caller: ReturnType<(typeof suggestionsRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    const ctx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = suggestionsRouter.createCaller(ctx);
  });

  describe("trackInteraction", () => {
    it("should successfully track suggestion interaction", async () => {
      const input = {
        sessionId: 1,
        exerciseName: "Bench Press",
        setId: "set-1",
        setIndex: 0,
        suggestedWeightKg: 80,
        suggestedReps: 10,
        suggestedRestSeconds: 120,
        suggestionRationale: "Progressive overload",
        action: "accepted" as const,
        acceptedWeightKg: 80,
        acceptedReps: 10,
        progressionType: "linear",
        readinessScore: 0.8,
        plateauDetected: false,
        interactionTimeMs: 1500,
      };

      const mockResult = createMockAISuggestionHistory({
        user_id: mockUser.id,
        sessionId: 1,
        exerciseName: "Bench Press",
        setId: "set-1",
        setIndex: 0,
        suggested_weight_kg: 80,
        suggested_reps: 10,
        suggested_rest_seconds: 120,
        suggestion_rationale: "Progressive overload",
        action: "accepted",
        accepted_weight_kg: 80,
        accepted_reps: 10,
        progression_type: "linear",
        readiness_score: 0.8,
        plateau_detected: false,
        interaction_time_ms: 1500,
      });

      mockDb.queueInsertResult([mockResult]);

      const result = await caller.trackInteraction(input);

      expect(result).toEqual({ success: true });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should validate input", async () => {
      // Test invalid setIndex (negative number)
      await expect(
        caller.trackInteraction({
          sessionId: 1,
          exerciseName: "Bench Press",
          setId: "set-1",
          setIndex: -1, // Invalid: should be >= 0
          action: "accepted" as const,
        }),
      ).rejects.toThrow();

      // Test invalid action
      await expect(
        caller.trackInteraction({
          sessionId: 1,
          exerciseName: "Bench Press",
          setId: "set-1",
          setIndex: 0,
          action: "invalid" as any, // Invalid action
        }),
      ).rejects.toThrow();
    });
  });

  describe("getAnalytics", () => {
    it("should return suggestion analytics", async () => {
      const mockInteractions = [
        createMockAISuggestionHistory({
          user_id: mockUser.id,
          sessionId: 1,
          exerciseName: "Bench Press",
          action: "accepted",
        }),
        createMockAISuggestionHistory({
          user_id: mockUser.id,
          sessionId: 2,
          exerciseName: "Squat",
          action: "rejected",
        }),
        createMockAISuggestionHistory({
          user_id: mockUser.id,
          sessionId: 3,
          exerciseName: "Bench Press",
          action: "modified",
        }),
      ];

      mockDb.query.aiSuggestionHistory.findMany.mockResolvedValue(
        mockInteractions,
      );

      const result = await caller.getAnalytics({ days: 30 });

      expect(result).toEqual({
        totalInteractions: 3,
        acceptedCount: 1,
        modifiedCount: 1,
        rejectedCount: 1,
        acceptanceRate: 33.3,
        exerciseStats: {
          "Bench Press": {
            total: 2,
            accepted: 1,
            modified: 1,
            rejected: 0,
          },
          Squat: {
            total: 1,
            accepted: 0,
            modified: 0,
            rejected: 1,
          },
        },
        recentInteractions: mockInteractions,
      });
    });

    it("should handle empty interactions", async () => {
      mockDb.query.aiSuggestionHistory.findMany.mockResolvedValue([]);

      const result = await caller.getAnalytics({ days: 30 });

      expect(result).toEqual({
        totalInteractions: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        modifiedCount: 0,
        acceptanceRate: 0,
        exerciseStats: {},
        recentInteractions: [],
      });
    });

    it("should use default days when not provided", async () => {
      mockDb.query.aiSuggestionHistory.findMany.mockResolvedValue([]);

      await caller.getAnalytics({});

      // Should not throw and should return empty analytics
      expect(await caller.getAnalytics({})).toBeDefined();
    });
  });
});
