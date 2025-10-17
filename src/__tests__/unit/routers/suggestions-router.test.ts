import { describe, it, expect, vi, beforeEach } from "vitest";
import { suggestionsRouter } from "~/server/api/routers/suggestions";
import { TRPCError } from "@trpc/server";

// Mock the database
const mockDb = {
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoUpdate: vi.fn(() => ({
        set: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
        })),
      })),
      returning: vi.fn().mockResolvedValue([]),
    })),
  })),
  query: {
    aiSuggestionHistory: {
      findMany: vi.fn(),
    },
  },
};

const mockUser = { id: "test-user-id" };

describe("suggestionsRouter", () => {
  let caller: ReturnType<(typeof suggestionsRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();

    const ctx = {
      db: mockDb as any,
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
        })
      ).rejects.toThrow();

      // Test invalid action
      await expect(
        caller.trackInteraction({
          sessionId: 1,
          exerciseName: "Bench Press",
          setId: "set-1",
          setIndex: 0,
          action: "invalid" as any, // Invalid action
        })
      ).rejects.toThrow();
    });
  });

  describe("getAnalytics", () => {
    it("should return suggestion analytics", async () => {
      const mockInteractions = [
        {
          user_id: mockUser.id,
          sessionId: 1,
          exerciseName: "Bench Press",
          action: "accepted",
          createdAt: new Date(),
        },
        {
          user_id: mockUser.id,
          sessionId: 2,
          exerciseName: "Squat",
          action: "rejected",
          createdAt: new Date(),
        },
        {
          user_id: mockUser.id,
          sessionId: 3,
          exerciseName: "Bench Press",
          action: "modified",
          createdAt: new Date(),
        },
      ];

      mockDb.query.aiSuggestionHistory.findMany.mockResolvedValue(
        mockInteractions,
      );

      const result = await caller.getAnalytics({ days: 30 });

      expect(result).toEqual({
        totalInteractions: 3,
        acceptedCount: 1,
        rejectedCount: 1,
        modifiedCount: 1,
        acceptanceRate: 33.3,
        exerciseStats: {
          "Bench Press": {
            total: 2,
            accepted: 1,
            rejected: 0,
            modified: 1,
          },
          Squat: {
            total: 1,
            accepted: 0,
            rejected: 1,
            modified: 0,
          },
        },
        recentInteractions: mockInteractions.slice(0, 10),
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

      expect(mockDb.query.aiSuggestionHistory.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function),
        limit: 100,
      });
    });
  });
});
