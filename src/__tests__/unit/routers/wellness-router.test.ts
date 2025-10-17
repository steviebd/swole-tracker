import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { wellnessRouter } from "~/server/api/routers/wellness";

// Mock the database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

const mockUser = { id: "test-user-id" };

describe("wellnessRouter", () => {
  let caller: ReturnType<(typeof wellnessRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockDb.insert.mockReset();
    mockDb.select.mockReset();
    mockDb.delete.mockReset();

    const ctx = {
      db: mockDb as any,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = wellnessRouter.createCaller(ctx);
  });

  describe("save", () => {
    it("should save wellness data successfully", async () => {
      // Mock session validation query chain
      const sessionValidationChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1 }]),
      };
      mockDb.select.mockReturnValue(sessionValidationChain);

      // Mock insert operation
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoUpdate: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const input = {
        sessionId: 1,
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
      // Mock session validation query chain - no session
      const sessionValidationChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(sessionValidationChain);

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
      // Mock insert to throw error
      mockDb.insert.mockImplementation(() => {
        throw new Error("Database error");
      });

      const input = {
        energyLevel: 8,
        sleepQuality: 7,
        deviceTimezone: "America/New_York",
        hasWhoopData: false,
      };

      await expect(caller.save(input)).rejects.toThrow(
        "Failed to save wellness data",
      );
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
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ wellness_data: mockData }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.getBySessionId({ sessionId: 1 });

      expect(result).toEqual(mockData);
    });

    it("should return null when no data found", async () => {
      // Mock empty result
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(selectChain);

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

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockHistory),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.getHistory({
        limit: 10,
        offset: 0,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(result).toEqual(mockHistory);
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

      const selectChain1 = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockStats),
      };
      const selectChain2 = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockRecentStats),
      };

      mockDb.select
        .mockReturnValueOnce(selectChain1)
        .mockReturnValueOnce(selectChain2);

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
  });

  describe("delete", () => {
    it("should delete wellness data", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      });

      const result = await caller.delete({ sessionId: 1 });

      expect(result).toEqual({ id: 1 });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should throw error when data not found", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(caller.delete({ sessionId: 1 })).rejects.toThrow(
        "Wellness data not found or access denied",
      );
    });
  });

  describe("checkExists", () => {
    it("should return true when data exists", async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 1 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(true);
    });

    it("should return false when data does not exist", async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(false);
    });
  });
});
