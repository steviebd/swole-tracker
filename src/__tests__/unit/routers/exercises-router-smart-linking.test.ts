import { describe, it, expect, beforeEach, vi } from "vitest";
import { exercisesRouter } from "~/server/api/routers/exercises";
import { createMockUser } from "~/__tests__/mocks/test-data";
import { createDatabaseMock } from "~/__tests__/generated-mocks/database-mocks";
import { clearTestData } from "~/__tests__/mocks/db";

// Mock utility functions
vi.mock("~/server/db/chunk-utils", () => ({
  whereInChunks: vi.fn(async (ids, callback) => {
    return callback(ids);
  }),
  chunkedBatch: vi.fn(async (db, items, callback) => {
    return [callback(items)];
  }),
  SQLITE_VARIABLE_LIMIT: 999,
}));

vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  debugLog: vi.fn(),
  logApiCall: vi.fn(),
}));

const mockUser = createMockUser();

type ChainResult<TData> = TData extends Array<unknown> ? TData : never;

const createMockDb = () => {
  const centralMock = createDatabaseMock();

  return centralMock as any;
};

const setupMockSelect = (mockDb: any, result: unknown[]) => {
  // Override the select function to always return chains with our result
  mockDb.select = vi.fn(() => {
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
      returning: vi.fn(async () => result),
      onConflictDoUpdate: vi.fn(() => chain),
      onConflictDoNothing: vi.fn(() => chain),
      execute: vi.fn(async () => result),
      all: vi.fn(async () => result),
      then: (resolve: (value: unknown[]) => void) => {
        return Promise.resolve(result).then(resolve);
      },
    };

    return chain;
  });

  return mockDb;
};

describe("exercisesRouter - Smart Linking Tests", () => {
  let mockCtx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestData();
    mockCtx = {
      db: createMockDb(),
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("getSmartLinkingSuggestions", () => {
    it("should return suggestions with exact matches", async () => {
      // Mock master exercises
      const mockMasterExercises = [
        {
          id: 1,
          name: "Bench Press",
          normalizedName: "bench press",
          user_id: "test-user-id",
        },
        {
          id: 2,
          name: "Squat",
          normalizedName: "squat",
          user_id: "test-user-id",
        },
      ];

      setupMockSelect(mockCtx.db, mockMasterExercises);

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.getSmartLinkingSuggestions({
        exercises: [
          { name: "Bench Press", tempId: "temp-0" },
          { name: "Squat", tempId: "temp-1" },
        ],
        similarityThreshold: 0.7,
      });

      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0]?.exerciseName).toBe("Bench Press");
      expect(result.suggestions[0]?.tempId).toBe("temp-0");
      expect(result.suggestions[1]?.exerciseName).toBe("Squat");
      expect(result.suggestions[1]?.tempId).toBe("temp-1");

      // Should have exact matches with high similarity
      expect(result.suggestions[0]?.recommendedAction).toBe("auto-link");
      expect(result.suggestions[1]?.recommendedAction).toBe("auto-link");

      expect(result.summary.totalExercises).toBe(2);
      expect(result.summary.autoLinkCount).toBe(2);
      expect(result.summary.needReviewCount).toBe(0);
      expect(result.summary.createNewCount).toBe(0);
    });

    it("should return create-new for exercises with no matches", async () => {
      const mockMasterExercises = [
        {
          id: 1,
          name: "Bench Press",
          normalizedName: "bench press",
          user_id: "test-user-id",
        },
      ];

      setupMockSelect(mockCtx.db, mockMasterExercises);

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.getSmartLinkingSuggestions({
        exercises: [{ name: "Custom Exercise", tempId: "temp-0" }],
        similarityThreshold: 0.7,
      });

      expect(result.suggestions[0]?.recommendedAction).toBe("create-new");
      expect(result.suggestions[0]?.matches).toHaveLength(0);
      expect(result.summary.createNewCount).toBe(1);
    });

    it("should handle empty exercises array", async () => {
      setupMockSelect(mockCtx.db, []);

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.getSmartLinkingSuggestions({
        exercises: [],
        similarityThreshold: 0.7,
      });

      expect(result.suggestions).toHaveLength(0);
      expect(result.summary.totalExercises).toBe(0);
      expect(result.summary.autoLinkCount).toBe(0);
      expect(result.summary.needReviewCount).toBe(0);
      expect(result.summary.createNewCount).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      // Override the select function to reject for this test
      mockCtx.db.select = vi.fn(() => {
        const chain: any = {
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
          returning: vi.fn(async () => []),
          onConflictDoUpdate: vi.fn(() => chain),
          onConflictDoNothing: vi.fn(() => chain),
          execute: vi.fn(async () => {
            throw new Error("Database error");
          }),
          all: vi.fn(async () => {
            throw new Error("Database error");
          }),
        };

        return chain;
      });

      const caller = exercisesRouter.createCaller(mockCtx);

      await expect(
        caller.getSmartLinkingSuggestions({
          exercises: [{ name: "Test", tempId: "temp-0" }],
          similarityThreshold: 0.7,
        }),
      ).rejects.toThrow();
    });

    it("should limit matches to top 5 per exercise", async () => {
      const mockMasterExercises = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Exercise ${i + 1}`,
        normalizedName: `exercise ${i + 1}`,
        user_id: "test-user-id",
      }));

      setupMockSelect(mockCtx.db, mockMasterExercises);

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.getSmartLinkingSuggestions({
        exercises: [{ name: "Exercise", tempId: "temp-0" }],
        similarityThreshold: 0.5,
      });

      expect(result.suggestions[0]?.matches).toHaveLength(5);
    });

    it("should handle custom similarity threshold", async () => {
      const mockMasterExercises = [
        {
          id: 1,
          name: "Bench Press",
          normalizedName: "bench press",
          user_id: "test-user-id",
        },
      ];

      setupMockSelect(mockCtx.db, mockMasterExercises);

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.getSmartLinkingSuggestions({
        exercises: [{ name: "Bench Press", tempId: "temp-0" }],
        similarityThreshold: 0.5, // Lower threshold
      });

      // Should find matches even with lower threshold
      expect(result.suggestions[0]?.matches.length).toBeGreaterThan(0);
    });

    it("should return correct summary statistics", async () => {
      const mockMasterExercises = [
        {
          id: 1,
          name: "Bench Press",
          normalizedName: "bench press",
          user_id: "test-user-id",
        },
        {
          id: 2,
          name: "Deadlift",
          normalizedName: "deadlift",
          user_id: "test-user-id",
        },
      ];

      setupMockSelect(mockCtx.db, mockMasterExercises);

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.getSmartLinkingSuggestions({
        exercises: [
          { name: "Bench Press", tempId: "temp-0" }, // Should auto-link
          { name: "Custom Exercise", tempId: "temp-1" }, // Should create-new
        ],
        similarityThreshold: 0.7,
      });

      expect(result.summary.totalExercises).toBe(2);
      expect(result.summary.autoLinkCount).toBe(1);
      expect(result.summary.createNewCount).toBe(1);
      expect(result.summary.needReviewCount).toBe(0);
    });

    it("should preserve tempId in suggestions", async () => {
      const mockMasterExercises: any[] = [];

      setupMockSelect(mockCtx.db, mockMasterExercises);

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.getSmartLinkingSuggestions({
        exercises: [
          { name: "Exercise 1", tempId: "abc-123" },
          { name: "Exercise 2", tempId: "def-456" },
        ],
        similarityThreshold: 0.7,
      });

      expect(result.suggestions[0]?.tempId).toBe("abc-123");
      expect(result.suggestions[1]?.tempId).toBe("def-456");
    });
  });
});
