import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockUser } from "~/__tests__/mocks/test-data";
import { exercisesRouter } from "~/server/api/routers/exercises";
import { clearTestData } from "~/__tests__/mocks/db";

describe("exercisesRouter - Linking Functions", () => {
  const mockUser = createMockUser({ id: "user-123" });
  let mockCtx: {
    db: any;
    user: typeof mockUser;
    requestId: string;
    headers: Headers;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestData();

    mockCtx = {
      db: {
        select: vi.fn(),
        insert: vi.fn(),
        query: {},
      },
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("linkToMaster", () => {
    it("should throw error when template exercise not found", async () => {
      // Mock database to return empty result
      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = exercisesRouter.createCaller(mockCtx);
      await expect(
        caller.linkToMaster({
          templateExerciseId: 999,
          masterExerciseId: 1,
        }),
      ).rejects.toThrow("Template exercise not found");
    });

    it("should successfully link template exercise to master exercise", async () => {
      // Mock database to return template exercise
      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                user_id: "user-123",
                templateId: 1,
                exerciseName: "Bench Press",
              },
            ]),
          }),
        }),
      });

      // Mock insert to return link result
      mockCtx.db.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                templateExerciseId: 1,
                masterExerciseId: 1,
                user_id: "user-123",
              },
            ]),
          }),
        }),
      });

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.linkToMaster({
        templateExerciseId: 1,
        masterExerciseId: 1,
      });

      expect(result).toEqual({
        templateExerciseId: 1,
        masterExerciseId: 1,
        user_id: "user-123",
      });
    });
  });
});
