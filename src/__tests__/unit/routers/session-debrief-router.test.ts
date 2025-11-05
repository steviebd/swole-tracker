import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sessionDebriefRouter,
  setGenerateDebriefImplementationForTesting,
  resetGenerateDebriefImplementationForTesting,
} from "~/server/api/routers/session-debrief";
import {
  createMockUser,
  createMockSessionDebrief,
} from "~/__tests__/mocks/test-data";

type GenerateDebriefFn = Parameters<
  typeof setGenerateDebriefImplementationForTesting
>[0];

const mockGenerate = vi.fn();

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
    query: {
      sessionDebriefs: {
        findMany: vi.fn(),
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

describe("sessionDebriefRouter", () => {
  const mockUser = createMockUser({ id: "user-abc" });

  let mockDb: ReturnType<typeof createMockDb>;
  let mockCtx: {
    db: typeof mockDb;
    user: typeof mockUser;
    requestId: string;
    headers: Headers;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerate.mockReset();
    mockDb = createMockDb();
    mockCtx = {
      db: mockDb,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    };

    setGenerateDebriefImplementationForTesting(
      mockGenerate as unknown as GenerateDebriefFn,
    );
  });

  afterEach(() => {
    resetGenerateDebriefImplementationForTesting();
  });

  it("generates and saves a new debrief", async () => {
    const caller = sessionDebriefRouter.createCaller(mockCtx);

    const mockDebrief = createMockSessionDebrief({
      id: 10,
      sessionId: 5,
      version: 1,
      user_id: mockUser.id,
      summary: "Great job",
      prHighlights: "Bench Press: 185lbs x 10",
      focusAreas: "Increase volume on accessories",
    });

    mockGenerate.mockResolvedValue({
      debrief: mockDebrief,
      content: {
        summary: mockDebrief.summary,
        prHighlights: mockDebrief.prHighlights,
        focusAreas: mockDebrief.focusAreas,
        metadata: {},
      },
      context: {} as any,
    });

    const result = await caller.generateAndSave({ sessionId: 5 });

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUser.id,
        sessionId: 5,
        trigger: "manual",
      }),
    );
    expect(result.debrief.id).toBe(10);
  });

  it("marks a debrief as viewed", async () => {
    const caller = sessionDebriefRouter.createCaller(mockCtx);

    (mockDb.query.sessionDebriefs.findFirst as any).mockResolvedValue({
      id: 1,
      sessionId: 5,
      user_id: mockUser.id,
      version: 2,
      pinnedAt: null,
    });

    const updatedRow = createMockSessionDebrief({
      id: 1,
      sessionId: 5,
      user_id: mockUser.id,
      version: 2,
      viewedAt: new Date(),
      pinnedAt: null,
    });

    mockDb.queueUpdateResult([updatedRow]);

    const result = await caller.markViewed({ sessionId: 5, debriefId: 1 });
    expect(result).toBeDefined();
    if (!result) {
      return;
    }

    expect(result.id).toBe(1);
  });

  it("returns session history for listBySession", async () => {
    const caller = sessionDebriefRouter.createCaller(mockCtx);
    const mockList = [
      createMockSessionDebrief({
        id: 1,
        sessionId: 5,
        user_id: mockUser.id,
        version: 1,
        summary: "Summary",
        prHighlights: "Bench Press: 185lbs x 10",
        focusAreas: "Increase volume on accessories",
        overloadDigest: null,
        streakContext: null,
        adherenceScore: null,
      }),
    ];

    (mockDb.query.sessionDebriefs.findMany as any).mockResolvedValue(mockList);

    const result = await caller.listBySession({ sessionId: 5 });

    expect(mockDb.query.sessionDebriefs.findMany).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });
});
