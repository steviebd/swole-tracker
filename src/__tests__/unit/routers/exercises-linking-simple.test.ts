import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockUser } from "~/__tests__/mocks/test-data";
import { exercisesRouter } from "~/server/api/routers/exercises";
import { clearTestData } from "~/__tests__/mocks/db";

// Override firstOrNull for debugging
let debugFirstOrNullCallCount = 0;
const debugFirstOrNull = async <T>(
  maybe: T[] | Promise<T[]> | undefined | null,
): Promise<T | null> => {
  debugFirstOrNullCallCount++;
  console.log(
    `DEBUG firstOrNull #${debugFirstOrNullCallCount} called with:`,
    maybe,
  );
  console.log(
    `DEBUG firstOrNull #${debugFirstOrNullCallCount} typeof:`,
    typeof maybe,
  );
  console.log(
    `DEBUG firstOrNull #${debugFirstOrNullCallCount} isArray:`,
    Array.isArray(maybe),
  );

  if (Array.isArray(maybe)) {
    console.log(
      `DEBUG firstOrNull #${debugFirstOrNullCallCount} is array, length:`,
      maybe.length,
    );
    if (maybe.length > 0) {
      console.log(
        `DEBUG firstOrNull #${debugFirstOrNullCallCount} returning:`,
        maybe[0],
      );
      return maybe[0] as T;
    }
  }

  console.log(`DEBUG firstOrNull #${debugFirstOrNullCallCount} returning null`);
  return null;
};

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
        delete: vi.fn(),
        query: {},
      },
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
  });

  describe("unlink", () => {
    it("should successfully unlink template exercise", async () => {
      mockCtx.db.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.unlink({
        templateExerciseId: 1,
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("isLinkingRejected", () => {
    it("should return false when template exercise not found", async () => {
      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.isLinkingRejected({
        templateExerciseId: 999,
      });

      expect(result).toBe(false);
    });

    it("should return linking rejected status when found", async () => {
      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                linkingRejected: true,
              },
            ]),
          }),
        }),
      });

      const caller = exercisesRouter.createCaller(mockCtx);
      const result = await caller.isLinkingRejected({
        templateExerciseId: 1,
      });

      expect(result).toBe(true);
    });
  });
});
