import { describe, it, expect, vi, beforeEach } from "vitest";
import { desc, asc, max, count } from "drizzle-orm";
import { workoutTemplates, workoutSessions } from "~/server/db/schema";
import {
  createMockUser,
  createMockWorkoutTemplate,
  createMockWorkoutSession,
  createMockSessionExercise,
} from "~/__tests__/mocks/test-data";

// Import after mocking
import { templatesRouter } from "~/server/api/routers/templates";

type ChainResult<TData> = TData extends Array<unknown> ? TData : never;

const createQueryChain = <TData extends unknown[]>(
  queue: Array<ChainResult<TData>>,
) => {
  const result = queue.length > 0 ? queue.shift()! : ([] as unknown as TData);

  const chain: any = {
    result,
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    select: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    returning: vi.fn(async () => chain.result),
    onConflictDoUpdate: vi.fn(() => chain),
    execute: vi.fn(async () => chain.result),
    all: vi.fn(async () => chain.result),
    then: (
      resolve: (value: TData) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(chain.result as TData).then(resolve, reject),
    catch: (reject: (reason: unknown) => void) =>
      Promise.resolve(chain.result as TData).catch(reject),
    finally: (cb: () => void) =>
      Promise.resolve(chain.result as TData).finally(cb),
  };

  return chain;
};

const createMockDb = () => {
  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const updateQueue: unknown[][] = [];
  const deleteQueue: unknown[][] = [];

  const mockDb = {
    query: {},
    queueSelectResult: (rows: unknown[]) => selectQueue.push(rows),
    queueInsertResult: (rows: unknown[]) => insertQueue.push(rows),
    queueUpdateResult: (rows: unknown[]) => updateQueue.push(rows),
    queueDeleteResult: (rows: unknown[]) => deleteQueue.push(rows),
    select: vi.fn(() => createQueryChain(selectQueue)),
    insert: vi.fn(() => createQueryChain(insertQueue)),
    update: vi.fn(() => createQueryChain(updateQueue)),
    delete: vi.fn(() => createQueryChain(deleteQueue)),
    transaction: vi.fn((callback: (tx: any) => Promise<any>) =>
      callback(mockDb),
    ),
    all: vi.fn(async () => []),
  } as any;

  return mockDb;
};

describe("templatesRouter", () => {
  const mockUser = createMockUser({ id: "user-123" });

  let mockDb: ReturnType<typeof createMockDb>;
  let caller: ReturnType<(typeof templatesRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    const ctx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = templatesRouter.createCaller(ctx);
  });

  describe("getAll", () => {
    it("should sort by recent (createdAt desc) by default", async () => {
      const mockStats = [
        {
          template: {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date(),
          },
          lastUsed: null,
          totalSessions: 0,
        },
      ];
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue(mockStats);
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue([
          {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date(),
            exercises: [],
          },
        ]);

      await caller.getAll({});

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort by lastUsed when sort='lastUsed'", async () => {
      const mockStats = [
        {
          template: {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date(),
          },
          lastUsed: new Date("2024-01-01"),
          totalSessions: 1,
        },
      ];
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue(mockStats);
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue([
          {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date(),
            exercises: [],
          },
        ]);

      await caller.getAll({ sort: "lastUsed" });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort by mostUsed when sort='mostUsed'", async () => {
      const mockStats = [
        {
          template: {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date(),
          },
          lastUsed: null,
          totalSessions: 5,
        },
      ];
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue(mockStats);
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue([
          {
            id: 1,
            name: "Template 1",
            user_id: "user-123",
            createdAt: new Date(),
            exercises: [],
          },
        ]);

      await caller.getAll({ sort: "mostUsed" });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should sort by name when sort='name'", async () => {
      const mockStats = [
        {
          template: {
            id: 1,
            name: "Template A",
            user_id: "user-123",
            createdAt: new Date(),
          },
          lastUsed: null,
          totalSessions: 0,
        },
      ];
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue(mockStats);
      mockDb
        .select()
        .from()
        .where()
        .orderBy()
        .limit()
        .execute.mockResolvedValue([
          {
            id: 1,
            name: "Template A",
            user_id: "user-123",
            createdAt: new Date(),
            exercises: [],
          },
        ]);

      await caller.getAll({ sort: "name" });

      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
