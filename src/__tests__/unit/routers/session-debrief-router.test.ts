import { describe, it, expect, vi, beforeEach } from "vitest";

import { sessionDebriefRouter } from "~/server/api/routers/session-debrief";
import type { db } from "~/server/db";
import { generateAndPersistDebrief } from "~/server/api/services/session-debrief";

vi.mock("~/server/api/services/session-debrief", () => ({
  generateAndPersistDebrief: vi.fn(),
}));

const mockedGenerate = vi.mocked(generateAndPersistDebrief);

type Chains = {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

describe("sessionDebriefRouter", () => {
  const mockUser = { id: "user-abc" };
  let mockDb: typeof db;
  let updateChains: Chains;

  beforeEach(() => {
    vi.clearAllMocks();

    updateChains = {
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn(),
    };

    const updateBuilder = {
      set: updateChains.set.mockReturnValue({
        where: updateChains.where.mockReturnValue({
          returning: updateChains.returning,
        }),
      }),
    };

    updateChains.returning.mockResolvedValue([
      {
        id: 1,
        sessionId: 5,
        user_id: mockUser.id,
        version: 1,
        viewedAt: new Date().toISOString(),
        pinnedAt: null,
      },
    ]);

    const queryMocks = {
      sessionDebriefs: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    mockDb = {
      query: queryMocks as any,
      update: vi.fn().mockReturnValue(updateBuilder),
    } as unknown as typeof db;
  });

  const mockCtx = {
    db: undefined as unknown as typeof db,
    user: mockUser,
    requestId: "req-1",
    headers: new Headers(),
  };

  beforeEach(() => {
    mockCtx.db = mockDb;
  });

  it("generates and saves a new debrief", async () => {
    const caller = sessionDebriefRouter.createCaller(mockCtx);

    mockedGenerate.mockResolvedValue({
      debrief: { id: 10, sessionId: 5, version: 1 },
      content: {
        summary: "Great job",
        prHighlights: [],
        focusAreas: [],
        metadata: {},
      },
    });

    const result = await caller.generateAndSave({ sessionId: 5 });

    expect(mockedGenerate).toHaveBeenCalledWith(
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

    const updatedRow = {
      id: 1,
      sessionId: 5,
      user_id: mockUser.id,
      version: 2,
      viewedAt: new Date().toISOString(),
      pinnedAt: null,
    };

    updateChains.returning.mockResolvedValueOnce([updatedRow]);

    const result = await caller.markViewed({ sessionId: 5, debriefId: 1 });
    expect(result).toBeDefined();
    if (!result) {
      return;
    }

    expect(updateChains.set).toHaveBeenCalledWith({ viewedAt: expect.any(Date) });
    expect(result.id).toBe(1);
  });

  it("returns session history for listBySession", async () => {
    const caller = sessionDebriefRouter.createCaller(mockCtx);
    const mockList = [
      {
        id: 1,
        sessionId: 5,
        user_id: mockUser.id,
        version: 1,
        createdAt: new Date().toISOString(),
        pinnedAt: null,
        dismissedAt: null,
        summary: "Summary",
        prHighlights: [],
        focusAreas: [],
        overloadDigest: null,
        streakContext: null,
        adherenceScore: null,
      },
    ];

    (mockDb.query.sessionDebriefs.findMany as any).mockResolvedValue(mockList);

    const result = await caller.listBySession({ sessionId: 5 });

    expect(mockDb.query.sessionDebriefs.findMany).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });
});
