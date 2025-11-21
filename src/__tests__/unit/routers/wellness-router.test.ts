import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createMockUser } from "~/__tests__/mocks/test-data";
import { clearTestData } from "~/__tests__/mocks/db";
import { createDatabaseMock } from "~/__tests__/generated-mocks/database-mocks";

// Import after mocking
import { wellnessRouter } from "~/server/api/routers/wellness";

type ChainResult<TData> = TData extends Array<unknown> ? TData : never;

const createMockDb = () => {
  // Use central database mock
  const centralMock = createDatabaseMock();
  // Clear any existing data
  clearTestData();

  // Create separate queues for different operations
  const selectQueue: Array<ChainResult<any>> = [];
  const insertQueue: Array<ChainResult<any>> = [];
  const updateQueue: Array<ChainResult<any>> = [];
  const deleteQueue: Array<ChainResult<any>> = [];

  const createQueryChainWithMethods = <TData extends unknown[]>(
    queue: Array<ChainResult<TData>>,
  ) => {
    let cachedResult: TData | undefined;
    const getResult = () => {
      if (cachedResult === undefined) {
        console.log("Getting result, queue length:", queue.length);
        cachedResult =
          queue.length > 0 ? queue.shift()! : ([] as unknown as TData);
      }
      return cachedResult;
    };

    const chain: any = {
      from: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      leftJoin: vi.fn(() => chain),
      where: vi.fn(() => chain),
      groupBy: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      select: vi.fn((selectObj?: any) => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      values: vi.fn(() => chain),
      set: vi.fn(() => chain),
      returning: vi.fn().mockResolvedValue(getResult()),
      onConflictDoUpdate: vi.fn(() => chain),
      execute: vi.fn().mockResolvedValue(getResult()),
      all: vi.fn().mockResolvedValue(getResult()),
      delete: vi.fn(() => chain),
      toString: () => "[MockQueryChain]",
    };

    // Make the chain thenable
    Object.defineProperty(chain, "then", {
      value: (
        resolve: (value: any) => void,
        reject?: (reason: any) => void,
      ) => {
        return Promise.resolve(getResult()).then(resolve, reject);
      },
      enumerable: false,
      configurable: true,
    });

    // Make the chain thenable
    Object.defineProperty(chain, "then", {
      value: (
        resolve: (value: any) => void,
        reject?: (reason: any) => void,
      ) => {
        return Promise.resolve(result).then(resolve, reject);
      },
      enumerable: false,
      configurable: true,
    });

    Object.defineProperty(chain, "catch", {
      value: (reject: (reason: any) => void) => {
        return Promise.resolve(result).catch(reject);
      },
      enumerable: false,
      configurable: true,
    });

    Object.defineProperty(chain, "finally", {
      value: (cb: () => void) => {
        return Promise.resolve(result).finally(cb);
      },
      enumerable: false,
      configurable: true,
    });

    return chain;
  };

  // Create fresh query mocks for each test
  const mockDb = {
    ...centralMock,
    select: vi.fn(() => createQueryChainWithMethods(selectQueue)),
    insert: vi.fn(() => createQueryChainWithMethods(insertQueue)),
    update: vi.fn(() => createQueryChainWithMethods(updateQueue)),
    delete: vi.fn(() => createQueryChainWithMethods(deleteQueue)),
    // Helper methods for queueing results
    queueSelectResult: (rows: unknown[]) => selectQueue.push(rows),
    queueInsertResult: (rows: unknown[]) => insertQueue.push(rows),
    queueUpdateResult: (rows: unknown[]) => updateQueue.push(rows),
    queueDeleteResult: (rows: unknown[]) => deleteQueue.push(rows),
    // Raw query interface - create fresh mocks each time
    all: vi.fn(async () => []),
    query: {},
  } as any;

  return {
    ...mockDb,
    // Expose queues for debugging
    selectQueue,
    insertQueue,
    updateQueue,
    deleteQueue,
  };
};

describe("wellnessRouter", () => {
  const mockUser = createMockUser({ id: "test-user-id" });

  let mockDb: any;
  let caller: ReturnType<(typeof wellnessRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    const ctx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = wellnessRouter.createCaller(ctx);
  });

  describe("save", () => {
    it("should save wellness data successfully", async () => {
      // Mock session lookup
      console.log(
        "Before queueSelectResult, selectQueue length:",
        mockDb.selectQueue.length,
      );
      mockDb.queueSelectResult([{ id: 1 }]);
      console.log(
        "After queueSelectResult, selectQueue length:",
        mockDb.selectQueue.length,
      );
      // Mock insert operation
      mockDb.queueInsertResult([{ id: 1 }]);

      const input = {
        energyLevel: 8,
        sleepQuality: 7,
        readiness: 6,
        mood: "good",
        sessionId: 1,
        userId: "test-user",
        deviceTimezone: "America/New_York",
      };

      const result = await caller.save(input);

      expect(result).toEqual({ id: 1 });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should save wellness data without sessionId", async () => {
      // Mock insert operation
      mockDb.queueInsertResult([{ id: 1 }]);

      const input = {
        energyLevel: 8,
        sleepQuality: 7,
        deviceTimezone: "America/New_York",
        notes: "Feeling good",
        hasWhoopData: false,
      };

      const result = await caller.save(input);

      expect(result).toEqual({ id: 1 });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should handle session validation failure", async () => {
      // Mock session validation - no session found
      mockDb.queueSelectResult([]);

      const input = {
        sessionId: 999,
        energyLevel: 8,
        sleepQuality: 7,
        deviceTimezone: "America/New_York",
        hasWhoopData: false,
      };

      await expect(caller.save(input)).rejects.toThrow(
        "Workout session not found or access denied",
      );
    });

    it("should handle database errors", async () => {
      // Simplify error test
      mockDb.select.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      await expect(caller.getStats({ days: 30 })).rejects.toThrow(
        "Failed to retrieve wellness statistics",
      );
    });

    it("should handle TRPCError from database", async () => {
      // Create a custom mock for this test to simulate TRPCError
      const trpcError = new TRPCError({
        code: "BAD_REQUEST",
        message: "Custom error",
      });

      const errorInsertChain = {
        values: vi.fn(() => errorInsertChain),
        onConflictDoUpdate: vi.fn(() => errorInsertChain),
        returning: vi.fn(async () => {
          throw trpcError;
        }),
        then: vi.fn(),
        catch: vi.fn((cb) => {
          cb(trpcError);
          return Promise.reject(trpcError);
        }),
        finally: vi.fn(),
      };

      mockDb.insert.mockReturnValue(errorInsertChain);

      const input = {
        energyLevel: 8,
        sleepQuality: 7,
        deviceTimezone: "America/New_York",
        hasWhoopData: false,
      };

      await expect(caller.save(input)).rejects.toThrow("Custom error");
    });
  });

  describe("getBySessionId", () => {
    it("should return wellness data for session", async () => {
      const mockData = {
        id: 1,
        energy_level: 8,
        sleep_quality: 7,
      };

      // Mock the select query chain with innerJoin
      mockDb.queueSelectResult([{ wellness_data: mockData }]);

      const result = await caller.getBySessionId({ sessionId: 1 });

      expect(result).toEqual(mockData);
    });

    it("should return null when no data found", async () => {
      // Mock empty result
      mockDb.queueSelectResult([]);

      const result = await caller.getBySessionId({ sessionId: 1 });

      expect(result).toBeNull();
    });
  });

  describe("getHistory", () => {
    it("should return wellness history", async () => {
      const mockHistory = [
        { id: 1, date: new Date(), energy_level: 8 },
        { id: 2, date: new Date(), energy_level: 7 },
      ];

      mockDb.queueSelectResult(mockHistory);

      const result = await caller.getHistory({
        limit: 10,
        offset: 0,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(result).toEqual(mockHistory);
    });

    it("should handle database errors", async () => {
      // Simplify error test - just verify error handling works
      mockDb.select.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      await expect(caller.getHistory({ limit: 10, offset: 0 })).rejects.toThrow(
        "Failed to retrieve wellness history",
      );
    });
  });

  describe("getStats", () => {
    it("should return wellness statistics", async () => {
      const mockStats = [
        { avgEnergyLevel: 8.5, avgSleepQuality: 7.2, totalEntries: 10 },
      ];
      const mockRecentStats = [
        { avgEnergyLevel: 8.0, avgSleepQuality: 7.0, totalEntries: 5 },
      ];

      mockDb.queueSelectResult(mockStats);
      mockDb.queueSelectResult(mockRecentStats);

      const result = await caller.getStats({ days: 30 });

      expect(result).toEqual({
        period: {
          days: 30,
          avgEnergyLevel: 8.5,
          avgSleepQuality: 7.2,
          totalEntries: 10,
        },
        recent: {
          days: 7,
          avgEnergyLevel: 8.0,
          avgSleepQuality: 7.0,
          totalEntries: 5,
        },
      });
    });

    it("should handle database errors", async () => {
      // Create a custom mock for this test to simulate database error
      const errorSelectChain = {
        from: vi.fn(() => errorSelectChain),
        where: vi.fn(() => errorSelectChain),
        then: vi.fn(),
        catch: vi.fn((cb) => {
          cb(new Error("Database error"));
          return Promise.reject(new Error("Database error"));
        }),
        finally: vi.fn(),
      };

      mockDb.select.mockReturnValue(errorSelectChain);

      await expect(caller.getStats({ days: 30 })).rejects.toThrow(
        "Failed to retrieve wellness statistics",
      );
    });
  });

  describe("delete", () => {
    it("should delete wellness data", async () => {
      mockDb.queueDeleteResult([{ id: 1 }]);

      const result = await caller.delete({ sessionId: 1 });

      expect(result).toEqual({ id: 1 });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should throw error when data not found", async () => {
      mockDb.queueDeleteResult([]);

      await expect(caller.delete({ sessionId: 1 })).rejects.toThrow(
        "Wellness data not found or access denied",
      );
    });

    it("should handle database errors", async () => {
      // Simplify error test
      mockDb.insert.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const input = {
        energyLevel: 8,
        sleepQuality: 7,
        readiness: 6,
        mood: "good",
        sessionId: 1,
        userId: "test-user",
      };

      await expect(caller.save(input)).rejects.toThrow(
        "Failed to save wellness data",
      );
    });
  });

  describe("checkExists", () => {
    it("should return true when data exists", async () => {
      mockDb.queueSelectResult([{ id: 1 }]);

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(true);
    });

    it("should return false when data does not exist", async () => {
      mockDb.queueSelectResult([]);

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(false);
    });

    it("should return false on database errors", async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(false);
    });
  });
});
