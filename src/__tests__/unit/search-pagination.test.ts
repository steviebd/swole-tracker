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
  } as any;

  const mockCtx = {
    db: mockDb,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle pagination correctly with cursor-based offset", async () => {
    // This test verifies that the searchMaster procedure correctly uses OFFSET
    // instead of the broken slice-based pagination that was previously implemented

    const mockExercises = [
      {
        id: 1,
        name: "Bench Press",
        normalizedName: "bench press",
        createdAt: new Date("2024-01-01"),
      },
      {
        id: 2,
        name: "Incline Bench Press",
        normalizedName: "incline bench press",
        createdAt: new Date("2024-01-02"),
      },
      {
        id: 3,
        name: "Close Grip Bench Press",
        normalizedName: "close grip bench press",
        createdAt: new Date("2024-01-03"),
      },
    ];

    // Mock the database to track that OFFSET is used correctly
    let capturedOffset = -1;
    const selectMock = vi.fn();
    const fromMock = vi.fn();
    const whereMock = vi.fn();
    const orderByMock = vi.fn();
    const limitMock = vi.fn();
    const offsetMock = vi.fn();

    mockDb.select = selectMock;
    selectMock.mockReturnValue({
      from: fromMock,
    });
    fromMock.mockReturnValue({
      where: whereMock,
    });
    whereMock.mockReturnValue({
      orderBy: orderByMock,
    });
    orderByMock.mockReturnValue({
      limit: limitMock,
    });
    limitMock.mockReturnValue({
      offset: offsetMock,
    });
    offsetMock.mockImplementation((offset: number) => {
      capturedOffset = offset;
      return Promise.resolve(mockExercises.slice(offset, offset + 2));
    });

    const caller = exercisesRouter.createCaller(mockCtx);

    // Test that cursor=2 results in offset=2 being used
    await caller.searchMaster({
      q: "bench",
      limit: 2,
      cursor: "2", // cursor is now string
    });

    expect(capturedOffset).toBe(2);
  });

  it("should return properly formatted results with ISO date strings", async () => {
    const mockExercises = [
      {
        id: 1,
        name: "Bench Press",
        normalizedName: "bench press",
        createdAt: new Date("2024-01-01T12:00:00Z"),
      },
    ];

    const selectMock = vi.fn();
    const fromMock = vi.fn();
    const whereMock = vi.fn();
    const orderByMock = vi.fn();
    const limitMock = vi.fn();
    const offsetMock = vi.fn();

    mockDb.select = selectMock;
    selectMock.mockReturnValue({
      from: fromMock,
    });
    fromMock.mockReturnValue({
      where: whereMock,
    });
    whereMock.mockReturnValue({
      orderBy: orderByMock,
    });
    orderByMock.mockReturnValue({
      limit: limitMock,
    });
    limitMock.mockReturnValue({
      offset: offsetMock,
    });
    offsetMock.mockResolvedValue(mockExercises);

    const caller = exercisesRouter.createCaller(mockCtx);

    const result = (await caller.searchMaster({
      q: "bench",
      limit: 10,
      cursor: undefined, // cursor is now optional string
    })) as SearchResult;

    expect(result.items).toHaveLength(1);
    const firstItem = result.items[0]!;
    expect(firstItem.id).toBe(1);
    expect(firstItem.name).toBe("Bench Press");
    expect(firstItem.createdAt).toBe("2024-01-01T12:00:00.000Z");
    expect(typeof firstItem.createdAt).toBe("string");
  });

  it("should cache search results and return cached data on subsequent calls", async () => {
    const mockExercises = [
      {
        id: 1,
        name: "Bench Press",
        normalizedName: "bench press",
        createdAt: new Date("2024-01-01T12:00:00Z"),
      },
    ];

    let callCount = 0;
    const selectMock = vi.fn();
    const fromMock = vi.fn();
    const whereMock = vi.fn();
    const orderByMock = vi.fn();
    const limitMock = vi.fn();
    const offsetMock = vi.fn();

    mockDb.select = selectMock;
    selectMock.mockReturnValue({
      from: fromMock,
    });
    fromMock.mockReturnValue({
      where: whereMock,
    });
    whereMock.mockReturnValue({
      orderBy: orderByMock,
    });
    orderByMock.mockReturnValue({
      limit: limitMock,
    });
    limitMock.mockReturnValue({
      offset: offsetMock,
    });
    offsetMock.mockImplementation(() => {
      callCount++;
      return Promise.resolve(mockExercises);
    });

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

    expect(callCount).toBe(1); // Database should only be called once
    expect(result1.items).toHaveLength(1);
    expect(result2.items).toHaveLength(1);
    expect(result1.items[0]).toEqual(result2.items[0]);
  });

  it("should return cache metrics", async () => {
    const caller = exercisesRouter.createCaller(mockCtx);

    const metrics = await caller.getCacheMetrics();

    expect(metrics).toHaveProperty("hits");
    expect(metrics).toHaveProperty("misses");
    expect(typeof metrics.hits).toBe("number");
    expect(typeof metrics.misses).toBe("number");
  });
});
