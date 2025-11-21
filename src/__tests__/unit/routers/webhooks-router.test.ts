import { describe, it, expect, beforeEach, vi } from "vitest";
import { webhooksRouter } from "~/server/api/routers/webhooks";
import {
  createMockUser,
  createMockWebhookEvent,
} from "~/__tests__/mocks/test-data";

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

describe("webhooksRouter", () => {
  const mockUser = createMockUser({ id: "test-user-id" });

  let db: ReturnType<typeof createMockDb>;
  let caller: ReturnType<(typeof webhooksRouter)["createCaller"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();

    const ctx = {
      db,
      user: mockUser,
      requestId: "test-request",
      headers: new Headers(),
    } as any;

    caller = webhooksRouter.createCaller(ctx);
  });

  describe("getRecentEvents", () => {
    it("should return recent events without provider filter", async () => {
      const mockEvents = [
        createMockWebhookEvent({
          id: 1,
          userId: "test-user-id",
          provider: "whoop",
          eventType: "workout.created",
          status: "processed",
        }),
        createMockWebhookEvent({
          id: 2,
          userId: "test-user-id",
          provider: "whoop",
          eventType: "recovery.updated",
          status: "processed",
        }),
      ];

      db.queueSelectResult(mockEvents);

      const result = await caller.getRecentEvents({ limit: 10 });

      expect(result).toEqual(mockEvents);
      expect(result).toHaveLength(2);
    });

    it("should return recent events with provider filter", async () => {
      const mockEvents = [
        createMockWebhookEvent({
          id: 1,
          userId: "test-user-id",
          provider: "whoop",
          eventType: "workout.created",
          status: "success",
          createdAt: new Date(),
        }),
      ];

      db.queueSelectResult(mockEvents);

      const result = await caller.getRecentEvents({
        limit: 10,
        provider: "whoop",
      });

      expect(result).toEqual(mockEvents);
      expect(result).toHaveLength(1);
    });

    it("should use default limit when not provided", async () => {
      const mockEvents = Array.from({ length: 20 }, (_, i) =>
        createMockWebhookEvent({
          id: i + 1,
          userId: "test-user-id",
          provider: "whoop",
          eventType: "workout.created",
          status: "success",
          createdAt: new Date(),
        }),
      );

      db.queueSelectResult(mockEvents);

      const result = await caller.getRecentEvents({});

      expect(result).toHaveLength(20);
    });
  });

  describe("getEventById", () => {
    it("should return event by id", async () => {
      const mockEvent = createMockWebhookEvent({
        id: 123,
        userId: "test-user-id",
        provider: "whoop",
        eventType: "workout.created",
        status: "processed",
        payload: '{"workoutId": 456}',
      });

      db.queueSelectResult([mockEvent]);

      const result = await caller.getEventById({ id: 123 });

      expect(result).toEqual(mockEvent);
    });

    it("should return undefined when event not found", async () => {
      db.queueSelectResult([]);

      const result = await caller.getEventById({ id: 999 });

      expect(result).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return webhook statistics", async () => {
      const mockEvents = [
        createMockWebhookEvent({
          status: "processed",
          provider: "whoop",
          eventType: "workout.created",
        }),
        createMockWebhookEvent({
          status: "processed",
          provider: "whoop",
          eventType: "recovery.updated",
        }),
        createMockWebhookEvent({
          status: "error",
          provider: "whoop",
          eventType: "workout.created",
        }),
        createMockWebhookEvent({
          status: "processed",
          provider: "strava",
          eventType: "activity.created",
        }),
      ];

      db.queueSelectResult(mockEvents);

      const result = await caller.getStats();

      expect(result.total).toBe(4);
      expect(result.byStatus["processed"]).toBe(3);
      expect(result.byStatus["error"]).toBe(1);
      expect(result.byProvider["whoop"]).toBe(3);
      expect(result.byProvider["strava"]).toBe(1);
      expect(result.byEventType["workout.created"]).toBe(2);
      expect(result.byEventType["recovery.updated"]).toBe(1);
      expect(result.byEventType["activity.created"]).toBe(1);
      expect(result.recentActivity).toHaveLength(4);
    });

    it("should return empty stats when no events exist", async () => {
      db.queueSelectResult([]);

      const result = await caller.getStats();

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.byProvider).toEqual({});
      expect(result.byEventType).toEqual({});
      expect(result.recentActivity).toEqual([]);
    });
  });
});
