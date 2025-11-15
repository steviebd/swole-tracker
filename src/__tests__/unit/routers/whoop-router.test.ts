/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";
import { whoopRouter } from "~/server/api/routers/whoop";
import * as tokenRotationModule from "~/lib/token-rotation";
import {
  userIntegrations,
  whoopRecovery,
  whoopSleep,
} from "~/server/db/schema";
import {
  createMockUser,
  createMockUserIntegration,
  createMockWhoopRecovery,
  createMockWhoopSleep,
  createMockExternalWorkoutWhoop,
} from "~/__tests__/mocks/test-data";

const createCaller = () =>
  whoopRouter.createCaller({
    db: mockDb as unknown as any,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  } as any);

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

const mockUser = createMockUser({ id: "user-123" });

let mockDb: ReturnType<typeof createMockDb>;
let caller: ReturnType<(typeof whoopRouter)["createCaller"]>;
let rotateOAuthTokensSpy: MockInstance<
  typeof tokenRotationModule.rotateOAuthTokens
>;

beforeEach(() => {
  mockDb = createMockDb();
  vi.clearAllMocks();

  const ctx = {
    db: mockDb,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  } as any;

  caller = whoopRouter.createCaller(ctx);

  rotateOAuthTokensSpy = vi
    .spyOn(tokenRotationModule, "rotateOAuthTokens")
    .mockResolvedValue({
      success: true,
      rotated: false,
      newAccessToken: "access-token",
    });
});

afterEach(() => {
  rotateOAuthTokensSpy.mockRestore();
});

const selectMock = () => mockDb.select as any;
const updateMock = () => mockDb.update as any;

function withLimit<Result>(value: Result) {
  return {
    limit: vi.fn().mockResolvedValue(value),
  };
}

function mockIntegrationQuery(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(withLimit(result)),
    }),
  };
}

function mockLatestQuery(value: string | null = null) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue(
          withLimit([{ latest: value }] as Array<{ latest: string | null }>),
        ),
    }),
  };
}

describe("parallel database queries", () => {
  it("uses Promise.all for parallel database queries in getIntegrationStatus", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      expiresAt: new Date("2025-12-31T00:00:00.000Z"), // Future date
    });

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValueOnce(mockLatestQuery("2024-01-15T10:00:00Z"))
      .mockReturnValueOnce(mockLatestQuery("2024-01-15T10:00:00Z"))
      .mockReturnValueOnce(mockLatestQuery("2024-01-15T10:00:00Z"))
      .mockReturnValueOnce(mockLatestQuery("2024-01-15T10:00:00Z"))
      .mockReturnValueOnce(mockLatestQuery("2024-01-15T10:00:00Z"));

    const caller = createCaller();
    const result = await caller.getIntegrationStatus();

    expect(result.isConnected).toBe(true);
    expect(result.lastSyncAt).toBeDefined();
    // Verify that multiple select calls were made (indicating parallel queries)
    expect(mockDb.select).toHaveBeenCalledTimes(6); // 1 for integration + 5 for latest timestamps
  });

  it("uses Promise.all for parallel database queries in getLatestRecoveryData", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      expiresAt: new Date("2025-12-31T00:00:00.000Z"), // Future date
    });
    const recovery = createMockWhoopRecovery({ user_id: mockUser.id });
    const sleep = createMockWhoopSleep({ user_id: mockUser.id });

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([recovery]),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([sleep]),
            }),
          }),
        }),
      });

    const caller = createCaller();
    const result = await caller.getLatestRecoveryData();

    expect(result).toHaveProperty("recovery_score");
    expect(result).toHaveProperty("sleep_performance");
    // Verify that multiple select calls were made (indicating parallel queries)
    expect(mockDb.select).toHaveBeenCalledTimes(3); // 1 for integration + 2 for recovery/sleep
  });
});

describe("whoopRouter.getIntegrationStatus", () => {
  it("returns connected status when integration is active and not expired", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      expiresAt: new Date("2025-12-31T00:00:00.000Z"), // Future date
    });
    const latestSync = "2024-02-01T00:00:00.000Z";

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValueOnce(mockLatestQuery(latestSync))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null));

    const caller = createCaller();
    const result = await caller.getIntegrationStatus();

    expect(result).toEqual({
      isConnected: true,
      hasEverConnected: true,
      connectedAt: integration.createdAt,
      expiresAt: integration.expiresAt,
      isExpired: false,
      scope: integration.scope,
      lastSyncAt: new Date(latestSync).toISOString(),
    });
  });

  it("returns disconnected status when integration does not exist", async () => {
    let call = 0;
    selectMock().mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return mockIntegrationQuery([]);
      }

      return mockLatestQuery(null);
    });

    const caller = createCaller();
    const result = await caller.getIntegrationStatus();

    expect(result).toEqual({
      isConnected: false,
      hasEverConnected: false,
      connectedAt: null,
      expiresAt: null,
      isExpired: false,
      scope: null,
      lastSyncAt: null,
    });
  });

  it("returns expired status when token is expired", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      expiresAt: new Date("2024-06-01T00:00:00.000Z"),
      scope: "read:profile",
    });

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null));

    const caller = createCaller();
    const result = await caller.getIntegrationStatus();

    expect(result).toEqual({
      isConnected: false,
      hasEverConnected: true,
      connectedAt: integration.createdAt,
      expiresAt: integration.expiresAt,
      isExpired: true,
      scope: integration.scope,
      lastSyncAt: null,
    });
  });

  it("derives last sync timestamp from non-workout datasets", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      createdAt: new Date("2024-04-01T00:00:00.000Z"),
      scope: "read:recovery",
    });
    const recoveryTimestamp = "2024-04-05T12:34:56.000Z";

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValueOnce(mockLatestQuery(null)) // workouts empty
      .mockReturnValueOnce(mockLatestQuery(recoveryTimestamp))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null))
      .mockReturnValueOnce(mockLatestQuery(null));

    const caller = createCaller();
    const result = await caller.getIntegrationStatus();

    expect(result.lastSyncAt).toBe(recoveryTimestamp);
  });
});

describe("whoopRouter.getWorkouts", () => {
  it("returns workouts ordered by start time", async () => {
    const workouts = [createMockExternalWorkoutWhoop({ user_id: mockUser.id })];

    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(workouts),
          }),
        }),
      }),
    });

    const caller = createCaller();
    const result = await caller.getWorkouts();

    expect(result).toEqual(workouts);
  });
});

describe("whoopRouter.disconnectIntegration", () => {
  it("marks integration as inactive", async () => {
    const whereSpy = vi.fn().mockResolvedValue(undefined);
    updateMock().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: whereSpy }),
    });

    const caller = createCaller();
    const result = await caller.disconnectIntegration();

    expect(result).toEqual({ success: true });
    expect(whereSpy).toHaveBeenCalled();
  });
});

describe("whoopRouter.getWebhookInfo", () => {
  let originalVercelUrl: string | undefined;
  let originalNextAuthUrl: string | undefined;
  let originalWebhookSecret: string | undefined;

  beforeEach(() => {
    originalVercelUrl = process.env["VERCEL_URL"];
    originalNextAuthUrl = process.env["NEXTAUTH_URL"];
    originalWebhookSecret = process.env["WHOOP_WEBHOOK_SECRET"];
  });

  afterEach(() => {
    process.env["VERCEL_URL"] = originalVercelUrl;
    process.env["NEXTAUTH_URL"] = originalNextAuthUrl;
    process.env["WHOOP_WEBHOOK_SECRET"] = originalWebhookSecret;
  });

  it("returns webhook info using VERCEL_URL when available", async () => {
    process.env["VERCEL_URL"] = "my-app.vercel.app";
    process.env["WHOOP_WEBHOOK_SECRET"] = "secret";

    const caller = createCaller();
    const result = await caller.getWebhookInfo();

    expect(result.webhookUrl).toBe(
      "https://my-app.vercel.app/api/webhooks/whoop",
    );
    expect(result.isConfigured).toBe(true);
    expect(result.supportedEvents).toHaveLength(12);
    expect(result.supportedEvents).toContain("workout.created");
    expect(result.supportedEvents).toContain("recovery.created");
  });

  it("falls back to NEXTAUTH_URL when VERCEL_URL is missing", async () => {
    delete process.env["VERCEL_URL"];
    process.env["NEXTAUTH_URL"] = "http://localhost:3000";

    const caller = createCaller();
    const result = await caller.getWebhookInfo();

    expect(result.webhookUrl).toBe("http://localhost:3000/api/webhooks/whoop");
  });
});

describe("whoopRouter.getLatestRecoveryData", () => {
  it("returns latest recovery data when integration active", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      expiresAt: new Date("2025-12-31T00:00:00.000Z"), // Future date
    });
    const recovery = createMockWhoopRecovery({ user_id: mockUser.id });
    const sleep = createMockWhoopSleep({ user_id: mockUser.id });

    selectMock().mockImplementation(() => ({
      from: vi.fn().mockImplementation((table) => {
        if (table === userIntegrations) {
          return {
            where: vi.fn().mockReturnValue(withLimit([integration])),
          };
        }
        if (table === whoopRecovery) {
          return {
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([recovery]),
              }),
            }),
          };
        }
        if (table === whoopSleep) {
          return {
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([sleep]),
              }),
            }),
          };
        }

        return {
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      }),
    }));

    const caller = createCaller();
    const result = await caller.getLatestRecoveryData();

    expect(result).toEqual({
      recovery_score: recovery.recovery_score,
      sleep_performance: sleep.sleep_performance_percentage,
      hrv_now_ms: recovery.hrv_rmssd_milli,
      hrv_baseline_ms: recovery.hrv_rmssd_baseline,
      rhr_now_bpm: recovery.resting_heart_rate,
      rhr_baseline_bpm: recovery.resting_heart_rate_baseline,
      respiratory_rate: recovery.respiratory_rate,
      respiratory_rate_baseline: recovery.respiratory_rate_baseline,
      yesterday_strain: null,
      raw_data: {
        recovery: recovery.raw_data,
        sleep: sleep.raw_data,
      },
    });
  });

  it("throws when integration inactive", async () => {
    selectMock().mockReturnValue(mockIntegrationQuery([]));

    const caller = createCaller();

    await expect(caller.getLatestRecoveryData()).rejects.toThrow(
      "WHOOP integration not found or inactive",
    );
  });

  it("throws when integration token expired", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      expiresAt: new Date("2024-01-01T00:00:00.000Z"),
    });

    selectMock().mockReturnValue(mockIntegrationQuery([integration]));

    const caller = createCaller();

    await expect(caller.getLatestRecoveryData()).rejects.toThrow(
      "WHOOP access token has expired. Please reconnect your WHOOP account.",
    );
  });

  it("throws when no recovery data is stored", async () => {
    const integration = createMockUserIntegration({
      user_id: mockUser.id,
      provider: "whoop",
      expiresAt: new Date("2025-12-31T00:00:00.000Z"), // Future date
    });

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

    const caller = createCaller();

    await expect(caller.getLatestRecoveryData()).rejects.toThrow(
      "No recovery data found. Try syncing your WHOOP data first.",
    );
  });
});

describe("whoopRouter data readers", () => {
  it("getRecovery returns recovery entries", async () => {
    const recovery = [{ recovery_score: 80 }];
    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(recovery),
        }),
      }),
    });

    const caller = createCaller();
    expect(await caller.getRecovery()).toEqual(recovery);
  });

  it("getCycles returns cycle entries", async () => {
    const cycles = [{ id: 1 }];
    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(cycles),
        }),
      }),
    });

    const caller = createCaller();
    expect(await caller.getCycles()).toEqual(cycles);
  });

  it("getSleep returns sleep entries", async () => {
    const sleep = [{ id: 1 }];
    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(sleep),
        }),
      }),
    });

    const caller = createCaller();
    expect(await caller.getSleep()).toEqual(sleep);
  });

  it("getProfile returns single profile when present", async () => {
    const profile = { id: 1 };
    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([profile]),
        }),
      }),
    });

    const caller = createCaller();
    expect(await caller.getProfile()).toEqual(profile);
  });

  it("getProfile returns null when profile absent", async () => {
    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const caller = createCaller();
    expect(await caller.getProfile()).toBeNull();
  });

  it("getBodyMeasurements returns measurement list", async () => {
    const measurements = [{ id: 1 }];
    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(measurements),
        }),
      }),
    });

    const caller = createCaller();
    expect(await caller.getBodyMeasurements()).toEqual(measurements);
  });

  it("getBodyMeasurements returns empty list when none found", async () => {
    selectMock().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const caller = createCaller();
    expect(await caller.getBodyMeasurements()).toEqual([]);
  });
});
