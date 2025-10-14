import { describe, it, expect, vi, beforeEach } from "vitest";

// Import after mocking
import { exercisesRouter } from "~/server/api/routers/exercises";

describe("exercisesRouter", () => {
  const mockUser = { id: "user-123" };

  const mockDb = {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

  describe("mergeMasterExercises", () => {
    it("should reject merging an exercise with itself", async () => {
      const caller = exercisesRouter.createCaller(mockCtx);

      await expect(
        caller.mergeMasterExercises({
          sourceId: 1,
          targetId: 1,
        }),
      ).rejects.toThrow("Cannot merge an exercise with itself");
    });

    it("should reject merging non-existent exercises", async () => {
      // Mock empty results for both exercises
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = exercisesRouter.createCaller(mockCtx);

      await expect(
        caller.mergeMasterExercises({
          sourceId: 999,
          targetId: 1000,
        }),
      ).rejects.toThrow("One or both exercises not found");
    });

    it("should successfully merge two master exercises", async () => {
      const sourceExercise = {
        id: 1,
        user_id: "user-123",
        name: "Bench Press",
        normalizedName: "bench press",
        tags: null,
        muscleGroup: "chest",
        createdAt: new Date(),
        updatedAt: null,
      };

      const targetExercise = {
        id: 2,
        user_id: "user-123",
        name: "Incline Bench Press",
        normalizedName: "incline bench press",
        tags: null,
        muscleGroup: "chest",
        createdAt: new Date(),
        updatedAt: null,
      };

      const sourceLinks = [
        {
          id: 1,
          templateExerciseId: 10,
          masterExerciseId: 1,
          user_id: "user-123",
          createdAt: new Date(),
        },
        {
          id: 2,
          templateExerciseId: 11,
          masterExerciseId: 1,
          user_id: "user-123",
          createdAt: new Date(),
        },
      ];

      // Mock the database queries
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([sourceExercise]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([targetExercise]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(sourceLinks),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No duplicate links
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No duplicate links
            }),
          }),
        });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.mergeMasterExercises({
        sourceId: 1,
        targetId: 2,
      });

      expect(result).toEqual({
        movedLinks: 2,
        skippedLinks: 0,
        sourceName: "Bench Press",
        targetName: "Incline Bench Press",
      });
    });
  });
});
