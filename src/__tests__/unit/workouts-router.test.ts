import { describe, it, expect, beforeEach, vi } from "vitest";
import { workoutsRouter } from "~/server/api/routers/workouts";
import type { TRPCContext } from "~/server/api/trpc";

// Mock database
const mockDb = {
  query: {
    workoutSessions: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
};

// Mock context
const mockCtx = {
  db: mockDb,
  user: { id: "test-user" },
  requestId: "test-request",
  headers: new Headers(),
} as unknown as TRPCContext;

describe("workoutsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRecent procedure", () => {
    it("should return recent workouts for the user", async () => {
      const mockWorkouts = [
        {
          id: 1,
          user_id: "test-user",
          templateId: 1,
          workoutDate: "2024-01-01",
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      mockDb.query.workoutSessions.findMany.mockResolvedValue(mockWorkouts);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getRecent({ limit: 5 });

      expect(result).toEqual(mockWorkouts);
    });
  });

  describe("getById procedure", () => {
    it("should return workout session when found and owned by user", async () => {
      const mockSession = {
        id: 1,
        user_id: "test-user",
        templateId: 1,
        workoutDate: "2024-01-01",
        createdAt: new Date(),
        updatedAt: null,
      };

      mockDb.query.workoutSessions.findFirst.mockResolvedValue(mockSession);

      const caller = workoutsRouter.createCaller(mockCtx);
      const result = await caller.getById({ id: 1 });

      expect(result).toEqual(mockSession);
    });
  });
});
