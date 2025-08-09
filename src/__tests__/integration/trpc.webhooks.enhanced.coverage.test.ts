import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";
import { webhookEvents } from "~/server/db/schema";

describe("webhooksRouter enhanced coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecentEvents", () => {
    it("returns recent events with default limit", async () => {
      const user = createMockUser({ id: "user_webhook_1" })!;

      const mockEvents = [
        {
          id: 1,
          provider: "whoop",
          eventType: "workout.created",
          status: "success",
          payload: { test: "data1" },
          headers: {},
          createdAt: new Date("2024-01-01T11:00:00Z"),
        },
        {
          id: 2,
          provider: "whoop",
          eventType: "workout.updated",
          status: "success",
          payload: { test: "data2" },
          headers: {},
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
      ];

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockEvents),
        where: vi.fn().mockReturnThis(),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.webhooks.getRecentEvents({});

      expect(result).toHaveLength(2);
      expect(result[0]?.eventType).toBe("workout.created");
      expect(result[1]?.eventType).toBe("workout.updated");
    });

    it("respects custom limit parameter", async () => {
      const user = createMockUser({ id: "user_webhook_2" })!;

      const mockEvents = [
        {
          id: 1,
          provider: "whoop",
          eventType: "event.4",
          status: "success",
          payload: { index: 4 },
          headers: {},
          createdAt: new Date("2024-01-01T14:00:00Z"),
        },
        {
          id: 2,
          provider: "whoop",
          eventType: "event.3",
          status: "success",
          payload: { index: 3 },
          headers: {},
          createdAt: new Date("2024-01-01T13:00:00Z"),
        },
        {
          id: 3,
          provider: "whoop",
          eventType: "event.2",
          status: "success",
          payload: { index: 2 },
          headers: {},
          createdAt: new Date("2024-01-01T12:00:00Z"),
        },
      ];

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockEvents),
        where: vi.fn().mockReturnThis(),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.webhooks.getRecentEvents({ limit: 3 });

      expect(result).toHaveLength(3);
      expect(selectChain.limit).toHaveBeenCalledWith(3);
    });

    it("filters by provider when specified", async () => {
      const user = createMockUser({ id: "user_webhook_3" })!;

      const mockEvents = [
        {
          id: 1,
          provider: "whoop",
          eventType: "workout.created",
          status: "success",
          payload: { test: "whoop" },
          headers: {},
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
      ];

      // Mock the query chain that gets called when provider is specified
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        // Mock the final await
        [Symbol.asyncIterator]: vi.fn(),
        then: vi.fn((resolve) => resolve(mockEvents)),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.webhooks.getRecentEvents({
        provider: "whoop",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.provider).toBe("whoop");
      expect(mockQuery.where).toHaveBeenCalled();
    });

    it("validates limit parameter bounds", async () => {
      const user = createMockUser({ id: "user_webhook_4" })!;
      const db = createMockDb({});
      const caller = await buildCaller({ db, user });

      // Test minimum bound
      await expect(
        caller.webhooks.getRecentEvents({ limit: 0 }),
      ).rejects.toThrow();

      // Test maximum bound
      await expect(
        caller.webhooks.getRecentEvents({ limit: 101 }),
      ).rejects.toThrow();
    });
  });

  describe("getEventById", () => {
    it("returns specific event by id", async () => {
      const user = createMockUser({ id: "user_webhook_5" })!;

      const mockEvent = {
        id: 123,
        provider: "whoop",
        eventType: "workout.created",
        status: "success",
        payload: { test: "specific-event" },
        headers: {},
        createdAt: new Date("2024-01-01T10:00:00Z"),
      };

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockEvent]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.webhooks.getEventById({ id: 123 });

      expect(result).toBeDefined();
      expect(result?.id).toBe(123);
      expect(result?.eventType).toBe("workout.created");
      expect(result?.payload).toEqual({ test: "specific-event" });
    });

    it("returns undefined for non-existent event", async () => {
      const user = createMockUser({ id: "user_webhook_6" })!;

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.webhooks.getEventById({ id: 99999 });

      expect(result).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("returns comprehensive statistics", async () => {
      const user = createMockUser({ id: "user_webhook_7" })!;

      const mockEvents = [
        {
          status: "success",
          provider: "whoop",
          eventType: "workout.created",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          status: "success",
          provider: "whoop",
          eventType: "workout.updated",
          createdAt: new Date("2024-01-01T11:00:00Z"),
        },
        {
          status: "failed",
          provider: "strava",
          eventType: "activity.created",
          createdAt: new Date("2024-01-01T12:00:00Z"),
        },
        {
          status: "success",
          provider: "whoop",
          eventType: "workout.created",
          createdAt: new Date("2024-01-01T13:00:00Z"),
        },
      ];

      const selectChain = {
        from: vi.fn().mockResolvedValue(mockEvents),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const stats = await caller.webhooks.getStats();

      expect(stats.total).toBe(4);

      // Check status breakdown
      expect(stats.byStatus.success).toBe(3);
      expect(stats.byStatus.failed).toBe(1);

      // Check provider breakdown
      expect(stats.byProvider.whoop).toBe(3);
      expect(stats.byProvider.strava).toBe(1);

      // Check event type breakdown
      expect(stats.byEventType["workout.created"]).toBe(2);
      expect(stats.byEventType["workout.updated"]).toBe(1);
      expect(stats.byEventType["activity.created"]).toBe(1);

      // Check recent activity (should be limited to 10)
      expect(stats.recentActivity).toHaveLength(4);
    });

    it("handles empty webhook events gracefully", async () => {
      const user = createMockUser({ id: "user_webhook_8" })!;

      const selectChain = {
        from: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const stats = await caller.webhooks.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byStatus).toEqual({});
      expect(stats.byProvider).toEqual({});
      expect(stats.byEventType).toEqual({});
      expect(stats.recentActivity).toEqual([]);
    });

    it("limits recent activity to 10 items", async () => {
      const user = createMockUser({ id: "user_webhook_9" })!;

      // Create 15 mock events
      const mockEvents = Array.from({ length: 15 }, (_, i) => ({
        status: "success",
        provider: "whoop",
        eventType: `event.${i}`,
        createdAt: new Date(`2024-01-01T${10 + i}:00:00Z`),
      }));

      const selectChain = {
        from: vi.fn().mockResolvedValue(mockEvents),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const stats = await caller.webhooks.getStats();

      expect(stats.total).toBe(15);
      expect(stats.recentActivity).toHaveLength(10);
    });

    it("correctly aggregates multiple occurrences", async () => {
      const user = createMockUser({ id: "user_webhook_10" })!;

      const mockEvents = [
        {
          status: "success",
          provider: "whoop",
          eventType: "workout.created",
          createdAt: new Date(),
        },
        {
          status: "success",
          provider: "whoop",
          eventType: "workout.created",
          createdAt: new Date(),
        },
        {
          status: "failed",
          provider: "whoop",
          eventType: "workout.created",
          createdAt: new Date(),
        },
      ];

      const selectChain = {
        from: vi.fn().mockResolvedValue(mockEvents),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
      });

      const caller = await buildCaller({ db, user });

      const stats = await caller.webhooks.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.success).toBe(2);
      expect(stats.byStatus.failed).toBe(1);
      expect(stats.byProvider.whoop).toBe(3);
      expect(stats.byEventType["workout.created"]).toBe(3);
    });
  });

  describe("authorization", () => {
    it("requires auth for getRecentEvents", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.webhooks.getRecentEvents({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("requires auth for getEventById", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(
        caller.webhooks.getEventById({ id: 1 }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("requires auth for getStats", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.webhooks.getStats()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });
});
