import { describe, it, expect, vi, beforeEach } from "vitest";

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
    limit: vi.fn(async () => chain.result),
    offset: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    returning: vi.fn(async () => chain.result),
    onConflictDoUpdate: vi.fn(() => chain),
    onConflictDoNothing: vi.fn(() => chain),
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
    query: {
      workoutTemplates: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      workoutSessions: {
        findFirst: vi.fn(),
      },
    },
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
  const mockUser = { id: "user-123" };

  let mockDb: ReturnType<typeof createMockDb>;
  let mockCtx: {
    db: typeof mockDb;
    user: typeof mockUser;
    requestId: string;
    headers: Headers;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    mockCtx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };
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
      mockDb.queueSelectResult(mockStats);
      mockDb.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date(),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      await caller.getAll({});

      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.orderBy).toHaveBeenCalledTimes(1);
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
      mockDb.queueSelectResult(mockStats);
      mockDb.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date(),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      await caller.getAll({ sort: "lastUsed" });

      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.orderBy).toHaveBeenCalledTimes(1);
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
      mockDb.queueSelectResult(mockStats);
      mockDb.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date(),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      await caller.getAll({ sort: "mostUsed" });

      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.orderBy).toHaveBeenCalledTimes(1);
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
      mockDb.queueSelectResult(mockStats);
      mockDb.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template A",
          user_id: "user-123",
          createdAt: new Date(),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      await caller.getAll({ sort: "name" });

      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.orderBy).toHaveBeenCalledTimes(1);
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
      mockDb.queueSelectResult(mockStats);
      mockDb.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date(),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      await caller.getAll({ sort: "lastUsed" });

      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.orderBy).toHaveBeenCalledTimes(1);
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
      mockDb.queueSelectResult(mockStats);
      mockDb.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template 1",
          user_id: "user-123",
          createdAt: new Date(),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      await caller.getAll({ sort: "mostUsed" });

      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.orderBy).toHaveBeenCalledTimes(1);
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
      mockDb.queueSelectResult(mockStats);
      mockDb.query.workoutTemplates.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Template A",
          user_id: "user-123",
          createdAt: new Date(),
          exercises: [],
        },
      ]);

      const caller = templatesRouter.createCaller(mockCtx);
      await caller.getAll({ sort: "name" });

      const selectChain = mockDb.select.mock.results[0].value;
      expect(selectChain.orderBy).toHaveBeenCalledTimes(1);
    });
  });
});
