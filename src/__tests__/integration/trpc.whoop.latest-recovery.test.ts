import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";
import { userIntegrations } from "~/server/db/schema";

describe("tRPC whoop router - getLatestRecoveryData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recovery data when integration is active and valid", async () => {
    const user = createMockUser({ id: "user_recovery_1" })!;
    
    const mockIntegration = {
      accessToken: "valid-token",
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    };

    const mockRecoveryResponse = {
      records: [
        {
          id: "rec_1",
          score: {
            recovery_score: 85,
            hrv_rmssd_milli: 55,
            baseline: {
              hrv_rmssd_milli: 50,
              resting_heart_rate: 60
            },
            resting_heart_rate: 58
          }
        }
      ]
    };

    const mockSleepResponse = {
      records: [
        {
          id: "sleep_1",
          score: {
            stage_summary: {
              total_sleep_time_milli: 28800000 // 8 hours
            }
          }
        }
      ]
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      }),
    });

    // Mock fetch globally for this test
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockRecoveryResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSleepResponse)
      });
      
    global.fetch = mockFetch;

    const caller = await buildCaller({ db, user });
    const result = await caller.whoop.getLatestRecoveryData();

    expect(result).toEqual({
      recovery_score: 85,
      sleep_performance: 100,
      hrv_now_ms: 55,
      hrv_baseline_ms: 50,
      rhr_now_bpm: 58,
      rhr_baseline_bpm: 60,
      yesterday_strain: null,
      raw_data: {
        recovery: mockRecoveryResponse.records[0],
        sleep: mockSleepResponse.records[0]
      }
    });

    // Verify fetch calls were made
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.prod.whoop.com/developer/v1/recovery"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer valid-token"
        })
      })
    );
  });

  it("throws NOT_FOUND when no integration exists", async () => {
    const user = createMockUser({ id: "user_recovery_2" })!;

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const caller = await buildCaller({ db, user });

    await expect(caller.whoop.getLatestRecoveryData()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "WHOOP integration not found or inactive"
    });
  });

  it("throws NOT_FOUND when integration is inactive", async () => {
    const user = createMockUser({ id: "user_recovery_3" })!;

    // Mock database to return no results (empty array) when querying for active integration
    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const caller = await buildCaller({ db, user });

    await expect(caller.whoop.getLatestRecoveryData()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "WHOOP integration not found or inactive",
    });
  });

  it("throws UNAUTHORIZED when access token is missing", async () => {
    const user = createMockUser({ id: "user_recovery_4" })!;

    const mockIntegration = {
      accessToken: null,
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      }),
    });

    const caller = await buildCaller({ db, user });

    await expect(caller.whoop.getLatestRecoveryData()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "WHOOP integration not found or inactive"
    });
  });

  it("throws UNAUTHORIZED when token is expired", async () => {
    const user = createMockUser({ id: "user_recovery_5" })!;

    const mockIntegration = {
      accessToken: "expired-token",
      isActive: true,
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      }),
    });

    const caller = await buildCaller({ db, user });

    await expect(caller.whoop.getLatestRecoveryData()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "WHOOP access token has expired. Please reconnect your WHOOP account."
    });
  });

  it("handles API errors gracefully", async () => {
    const user = createMockUser({ id: "user_recovery_6" })!;

    const mockIntegration = {
      accessToken: "valid-token",
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      }),
    });

    // Mock fetch to return an error
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized"
      });
      
    global.fetch = mockFetch;

    const caller = await buildCaller({ db, user });

    await expect(caller.whoop.getLatestRecoveryData()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch WHOOP data. Please try again."
    });
  });

  it("handles case when no recovery data is found", async () => {
    const user = createMockUser({ id: "user_recovery_7" })!;

    const mockIntegration = {
      accessToken: "valid-token",
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
    };

    const mockRecoveryResponse = {
      records: []
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      }),
    });

    // Mock fetch to return empty records for recovery data
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockRecoveryResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ records: [] })
      });
      
    global.fetch = mockFetch;

    const caller = await buildCaller({ db, user });

    await expect(caller.whoop.getLatestRecoveryData()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "No recovery data found for today"
    });
  });
});