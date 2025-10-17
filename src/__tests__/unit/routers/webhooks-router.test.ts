import { describe, it, expect, beforeEach, vi } from "vitest";
import { webhooksRouter } from "~/server/api/routers/webhooks";

describe("webhooksRouter", () => {
  let db: any;
  let caller: any;

  beforeEach(() => {
    // Create a mock db that includes the select structure
    db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
            limit: vi.fn().mockResolvedValue([]),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
          limit: vi.fn().mockResolvedValue([]),
        })),
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
          limit: vi.fn().mockResolvedValue([]),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
        limit: vi.fn().mockResolvedValue([]),
      })),
    };

    const ctx = {
      db,
      user: { id: "test-user-id" },
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = webhooksRouter.createCaller(ctx);
  });

  describe("getRecentEvents", () => {
    it("should return recent events without provider filter", async () => {
      const mockEvents = [
        {
          id: 1,
          userId: "test-user-id",
          provider: "whoop",
          eventType: "workout.created",
          status: "success",
          createdAt: new Date(),
        },
        {
          id: 2,
          userId: "test-user-id",
          provider: "whoop",
          eventType: "recovery.updated",
          status: "success",
          createdAt: new Date(),
        },
      ];

      const mockQueryChain = {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(mockEvents),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

      const result = await caller.getRecentEvents({ limit: 10 });

      expect(result).toEqual(mockEvents);
      expect(result).toHaveLength(2);
    });

    it("should return recent events with provider filter", async () => {
      const mockEvents = [
        {
          id: 1,
          userId: "test-user-id",
          provider: "whoop",
          eventType: "workout.created",
          status: "success",
          createdAt: new Date(),
        },
      ];

      const mockQueryChain = {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(mockEvents),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

      const result = await caller.getRecentEvents({
        limit: 10,
        provider: "whoop",
      });

      expect(result).toEqual(mockEvents);
      expect(result).toHaveLength(1);
    });

    it("should use default limit when not provided", async () => {
      const mockEvents = Array(20).fill({
        id: 1,
        userId: "test-user-id",
        provider: "whoop",
        eventType: "workout.created",
        status: "success",
        createdAt: new Date(),
      });

      const mockQueryChain = {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(mockEvents.slice(0, 20)),
            })),
          })),
        })),
      };

      db.select.mockReturnValue(mockQueryChain);

      const result = await caller.getRecentEvents({});

      expect(result).toHaveLength(20);
    });
  });

  describe("getEventById", () => {
    it("should return event by id", async () => {
      const mockEvent = {
        id: 123,
        userId: "test-user-id",
        provider: "whoop",
        eventType: "workout.created",
        status: "success",
        createdAt: new Date(),
        payload: { workoutId: 456 },
      };

      db.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([mockEvent]),
        })),
      });

      const result = await caller.getEventById({ id: 123 });

      expect(result).toEqual(mockEvent);
    });

    it("should return undefined when event not found", async () => {
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      });

      const result = await caller.getEventById({ id: 999 });

      expect(result).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return webhook statistics", async () => {
      const mockEvents = [
        {
          status: "success",
          provider: "whoop",
          eventType: "workout.created",
          createdAt: new Date("2024-01-01"),
        },
        {
          status: "success",
          provider: "whoop",
          eventType: "recovery.updated",
          createdAt: new Date("2024-01-02"),
        },
        {
          status: "error",
          provider: "whoop",
          eventType: "workout.created",
          createdAt: new Date("2024-01-03"),
        },
        {
          status: "success",
          provider: "strava",
          eventType: "activity.created",
          createdAt: new Date("2024-01-04"),
        },
      ];

      db.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(mockEvents),
        })),
      });

      const result = await caller.getStats();

      expect(result.total).toBe(4);
      expect(result.byStatus.success).toBe(3);
      expect(result.byStatus.error).toBe(1);
      expect(result.byProvider.whoop).toBe(3);
      expect(result.byProvider.strava).toBe(1);
      expect(result.byEventType["workout.created"]).toBe(2);
      expect(result.byEventType["recovery.updated"]).toBe(1);
      expect(result.byEventType["activity.created"]).toBe(1);
      expect(result.recentActivity).toHaveLength(4);
    });

    it("should return empty stats when no events exist", async () => {
      db.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      });

      const result = await caller.getStats();

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.byProvider).toEqual({});
      expect(result.byEventType).toEqual({});
      expect(result.recentActivity).toEqual([]);
    });
  });
});
