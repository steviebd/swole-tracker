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
import { createDrizzleMock } from "~/__tests__/test-utils/mock-factories";

const mockUser = { id: "user-123" };

let mockDb: ReturnType<typeof createDrizzleMock>;
let rotateOAuthTokensSpy: MockInstance<
  typeof tokenRotationModule.rotateOAuthTokens
>;

const createCaller = () =>
  whoopRouter.createCaller({
    db: mockDb as unknown as any,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  } as any);

beforeEach(() => {
  mockDb = createDrizzleMock();
  vi.clearAllMocks();
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

describe("whoopRouter.getIntegrationStatus", () => {
  it("returns connected status when integration is active and not expired", async () => {
    const integration = {
      isActive: true,
      createdAt: new Date("2024-01-01"),
      expiresAt: new Date("2025-12-31"),
      scope: "read:profile read:recovery",
    };

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

    const caller = createCaller();
    const result = await caller.getIntegrationStatus();

    expect(result).toEqual({
      isConnected: true,
      hasEverConnected: true,
      connectedAt: integration.createdAt,
      expiresAt: integration.expiresAt,
      isExpired: false,
      scope: integration.scope,
      lastSyncAt: null,
    });
  });

  it("returns disconnected status when integration does not exist", async () => {
    let call = 0;
    selectMock().mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return mockIntegrationQuery([]);
      }

      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
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
    const integration = {
      isActive: true,
      createdAt: new Date("2024-01-01"),
      expiresAt: new Date("2024-06-01"),
      scope: "read:profile",
    };

    selectMock()
      .mockReturnValueOnce(mockIntegrationQuery([integration]))
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

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
});

describe("whoopRouter.getWorkouts", () => {
  it("returns workouts ordered by start time", async () => {
    const workouts = [
      {
        id: 1,
        whoopWorkoutId: "workout-123",
        start: new Date("2024-01-01T10:00:00Z"),
        end: new Date("2024-01-01T11:00:00Z"),
        sport_name: "Running",
        score_state: "SCORED",
        score: 15.5,
        during: { heart_rate: 150 },
        zone_duration: { zone_one_duration: 1800 },
        createdAt: new Date(),
      },
    ];

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
    originalVercelUrl = process.env.VERCEL_URL;
    originalNextAuthUrl = process.env.NEXTAUTH_URL;
    originalWebhookSecret = process.env.WHOOP_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env.VERCEL_URL = originalVercelUrl;
    process.env.NEXTAUTH_URL = originalNextAuthUrl;
    process.env.WHOOP_WEBHOOK_SECRET = originalWebhookSecret;
  });

  it("returns webhook info using VERCEL_URL when available", async () => {
    process.env.VERCEL_URL = "my-app.vercel.app";
    process.env.WHOOP_WEBHOOK_SECRET = "secret";

    const caller = createCaller();
    const result = await caller.getWebhookInfo();

    expect(result.webhookUrl).toBe(
      "https://my-app.vercel.app/api/webhooks/whoop",
    );
    expect(result.isConfigured).toBe(true);
    expect(result.supportedEvents).toHaveLength(6);
  });

  it("falls back to NEXTAUTH_URL when VERCEL_URL is missing", async () => {
    delete process.env.VERCEL_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    const caller = createCaller();
    const result = await caller.getWebhookInfo();

    expect(result.webhookUrl).toBe("http://localhost:3000/api/webhooks/whoop");
  });
});

describe("whoopRouter.getLatestRecoveryData", () => {
  it("returns latest recovery data when integration active", async () => {
    const integration = {
      isActive: true,
      expiresAt: new Date("2025-12-31"),
    };
    const recovery = {
      recovery_score: 85,
      hrv_rmssd_milli: "45.2",
      hrv_rmssd_baseline: "42.1",
      resting_heart_rate: 60,
      resting_heart_rate_baseline: 65,
      respiratory_rate: 14.2,
      respiratory_rate_baseline: 13.9,
      raw_data: { recovery: true },
      date: new Date(),
    };
    const sleep = {
      sleep_performance_percentage: 92,
      raw_data: { sleep: true },
      start: new Date(),
    };

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
      recovery_score: 85,
      sleep_performance: 92,
      hrv_now_ms: "45.2",
      hrv_baseline_ms: "42.1",
      rhr_now_bpm: 60,
      rhr_baseline_bpm: 65,
      respiratory_rate: 14.2,
      respiratory_rate_baseline: 13.9,
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
    const integration = {
      isActive: true,
      expiresAt: new Date("2024-01-01"),
    };

    selectMock().mockReturnValue(mockIntegrationQuery([integration]));

    const caller = createCaller();

    await expect(caller.getLatestRecoveryData()).rejects.toThrow(
      "WHOOP access token has expired. Please reconnect your WHOOP account.",
    );
  });

  it("throws when no recovery data is stored", async () => {
    const integration = {
      isActive: true,
      expiresAt: new Date("2025-12-31"),
    };

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
