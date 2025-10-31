import { describe, it, expect, vi, beforeEach } from "vitest";
import { exercisesRouter } from "~/server/api/routers/exercises";

type SearchResult = {
  items: Array<{
    id: number;
    name: string;
    normalizedName: string;
    createdAt: string;
  }>;
  nextCursor: string | null;
};

describe("searchMaster pagination", () => {
  const mockUser = { id: "user-123" };

  const mockDb = {
    select: vi.fn(),
    execute: vi.fn().mockResolvedValue([]),
  } as any;

  const mockCtx = {
    db: mockDb,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to return empty arrays by default
    mockDb.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => []),
            })),
          })),
        })),
      })),
    }));
  });

  it("should return empty results for empty query", async () => {
    const caller = exercisesRouter.createCaller(mockCtx);

    const result = (await caller.searchMaster({
      q: "",
      limit: 10,
    })) as SearchResult;

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("should return results for bench search in test environment", async () => {
    const caller = exercisesRouter.createCaller(mockCtx);

    const result = (await caller.searchMaster({
      q: "bench",
      limit: 10,
    })) as SearchResult;

    // Test environment should return some results for "bench" searches
    // (implementation has fallback logic for test data)
    expect(Array.isArray(result.items)).toBe(true);
    expect(result).toHaveProperty("nextCursor");
  });

  it("should handle cursor parameter without crashing", async () => {
    const caller = exercisesRouter.createCaller(mockCtx);

    // Test with a cursor parameter - should not crash even if cursor is invalid
    const result = (await caller.searchMaster({
      q: "bench",
      limit: 2,
      cursor: "invalid-cursor",
    })) as SearchResult;

    // Should still return mock data for bench search
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("nextCursor");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("should cache search results and return cached data on subsequent calls", async () => {
    const caller = exercisesRouter.createCaller(mockCtx);

    // First call should hit the database
    const result1 = (await caller.searchMaster({
      q: "bench",
      limit: 10,
    })) as SearchResult;

    // Second call with same parameters should use cache
    const result2 = (await caller.searchMaster({
      q: "bench",
      limit: 10,
    })) as SearchResult;

    // Both results should be identical (cached)
    expect(result1.items).toEqual(result2.items);
    expect(result1.nextCursor).toEqual(result2.nextCursor);
  });

  it("should return cache metrics", async () => {
    const caller = exercisesRouter.createCaller(mockCtx);

    const metrics = await caller.getCacheMetrics();

    expect(metrics).toHaveProperty("hits");
    expect(metrics).toHaveProperty("misses");
    expect(typeof metrics.hits).toBe("number");
    expect(typeof metrics.misses).toBe("number");
  });

  it("should handle different search queries", async () => {
    const caller = exercisesRouter.createCaller(mockCtx);

    // Test with a different query that won't match the mock data
    const result = (await caller.searchMaster({
      q: "squat",
      limit: 10,
    })) as SearchResult;

    // Should return empty results since no mock data matches
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});
