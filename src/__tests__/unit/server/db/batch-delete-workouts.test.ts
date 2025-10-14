import { beforeEach, describe, expect, it, vi } from "vitest";
import { batchDeleteWorkouts } from "~/server/db/utils";

const transactionMock = vi.fn();
const findManyMock = vi.fn();
const deleteMock = vi.fn();
const deleteWhereMock = vi.fn();
const debugMock = vi.fn();
const errorMock = vi.fn();

const mockDb = {
  transaction: transactionMock,
} as any;

const mockLogger = {
  debug: debugMock,
  error: errorMock,
} as any;

describe("batchDeleteWorkouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findManyMock.mockReset();
    deleteMock.mockReset();
    deleteWhereMock.mockReset();
    debugMock.mockReset();
    errorMock.mockReset();
    transactionMock.mockReset();

    deleteMock.mockImplementation(() => ({ where: deleteWhereMock }));
    transactionMock.mockImplementation(async (callback) =>
      callback({
        query: {
          workoutSessions: {
            findMany: findManyMock,
          },
        },
        delete: deleteMock,
      }),
    );
  });

  it("deletes all owned sessions in a single query", async () => {
    findManyMock.mockResolvedValue([{ id: 1 }, { id: 3 }]);
    deleteWhereMock.mockResolvedValue({ changes: 2 });

    const result = await batchDeleteWorkouts("user-1", [1, 2, 3], {
      db: mockDb,
      logger: mockLogger,
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, deletedCount: 2 });
    expect(debugMock).toHaveBeenCalledWith(
      "Batch workout deletion completed",
      expect.objectContaining({
        deletedCount: 2,
        requestedCount: 3,
        bulkDelete: true,
      }),
    );
  });

  it("falls back to valid session count when driver does not return changes", async () => {
    findManyMock.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    deleteWhereMock.mockResolvedValue({});

    const result = await batchDeleteWorkouts("user-2", [10, 11, 12], {
      db: mockDb,
      logger: mockLogger,
    });

    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, deletedCount: 2 });
  });

  it("throws when no valid sessions are owned by the user", async () => {
    findManyMock.mockResolvedValue([]);

    await expect(
      batchDeleteWorkouts("user-3", [99], {
        db: mockDb,
        logger: mockLogger,
      }),
    ).rejects.toThrow(
      "No valid sessions found for deletion",
    );
    expect(deleteMock).not.toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalled();
  });
});
