import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createMockUser } from "~/__tests__/mocks/test-data";

// Import after mocking
import { wellnessRouter } from "~/server/api/routers/wellness";

describe("wellnessRouter", () => {
  const mockUser = createMockUser({ id: "test-user-id" });

  let mockDb: any;
  let caller: ReturnType<(typeof wellnessRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a simple mock database that works with the router
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn((callback: (tx: any) => Promise<any>) =>
        callback(mockDb),
      ),
    };

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
      // Mock session validation - the select chain should return a session
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });

      // Mock insert operation
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });

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

    it("should save wellness data without sessionId", async () => {
      // Mock insert operation
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });

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
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

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
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error("Database error")),
          }),
        }),
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

    it("should handle TRPCError from database", async () => {
      // Mock insert to throw TRPCError
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(
              new TRPCError({
                code: "BAD_REQUEST",
                message: "Custom error",
              }),
            ),
          }),
        }),
      });

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
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ wellness_data: mockData }]),
            }),
          }),
        }),
      });

      const result = await caller.getBySessionId({ sessionId: 1 });

      expect(result).toEqual(mockData);
    });

    it("should return null when no data found", async () => {
      // Mock empty result
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

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

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockHistory),
              }),
            }),
          }),
        }),
      });

      const result = await caller.getHistory({
        limit: 10,
        offset: 0,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(result).toEqual(mockHistory);
    });

    it("should handle database errors", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockRejectedValue(new Error("Database error")),
              }),
            }),
          }),
        }),
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

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockStats),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRecentStats),
          }),
        });

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
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      await expect(caller.getStats({ days: 30 })).rejects.toThrow(
        "Failed to retrieve wellness statistics",
      );
    });
  });

  describe("delete", () => {
    it("should delete wellness data", async () => {
      const mockDeleteBuilder = {
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      };
      mockDb.delete.mockReturnValue(mockDeleteBuilder);

      const result = await caller.delete({ sessionId: 1 });

      expect(result).toEqual({ id: 1 });
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should throw error when data not found", async () => {
      const mockDeleteBuilder = {
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      mockDb.delete.mockReturnValue(mockDeleteBuilder);

      await expect(caller.delete({ sessionId: 1 })).rejects.toThrow(
        "Wellness data not found or access denied",
      );
    });

    it("should handle database errors", async () => {
      const mockDeleteBuilder = {
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      };
      mockDb.delete.mockReturnValue(mockDeleteBuilder);

      await expect(caller.delete({ sessionId: 1 })).rejects.toThrow(
        "Failed to delete wellness data",
      );
    });
  });

  describe("checkExists", () => {
    it("should return true when data exists", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(true);
    });

    it("should return false when data does not exist", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(false);
    });

    it("should return false on database errors", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              throw new Error("Database error");
            }),
          }),
        }),
      });

      const result = await caller.checkExists({ sessionId: 1 });

      expect(result).toBe(false);
    });
  });
});
