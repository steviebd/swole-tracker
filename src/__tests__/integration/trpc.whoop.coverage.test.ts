import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";
import { userIntegrations, externalWorkoutsWhoop } from "~/server/db/schema";

describe("tRPC whoop router additional coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getIntegrationStatus handles inactive integration", async () => {
    const user = createMockUser({ id: "user_whoop_1" })!;

    const mockIntegration = {
      isActive: false,
      createdAt: new Date("2024-01-01"),
      scope: "read:workout",
    };

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockIntegration]),
        }),
      }),
    });

    const caller = await buildCaller({ db, user });

    const result = await caller.whoop.getIntegrationStatus();

    expect(result).toEqual({
      isConnected: false,
      connectedAt: mockIntegration.createdAt,
      scope: mockIntegration.scope,
    });
  });

  it("getWorkouts handles empty workout list", async () => {
    const user = createMockUser({ id: "user_whoop_2" })!;

    const db = createMockDb({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const caller = await buildCaller({ db, user });

    const result = await caller.whoop.getWorkouts();
    expect(result).toEqual([]);
  });

  it("disconnectIntegration handles case when no integration exists", async () => {
    const user = createMockUser({ id: "user_whoop_3" })!;

    const db = createMockDb({
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No rows updated
        }),
      }),
    });

    const caller = await buildCaller({ db, user });

    const result = await caller.whoop.disconnectIntegration();

    expect(result).toEqual({ success: true });
  });

  it("getWebhookInfo handles missing environment variables", async () => {
    const user = createMockUser({ id: "user_whoop_4" })!;

    // Clear environment variables
    delete process.env.VERCEL_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.WHOOP_WEBHOOK_SECRET;

    const db = createMockDb({});
    const caller = await buildCaller({ db, user });

    const result = await caller.whoop.getWebhookInfo();

    expect(result).toEqual({
      webhookUrl: "http://localhost:3000/api/webhooks/whoop",
      isConfigured: false,
      supportedEvents: ["workout.updated"],
      instructions: expect.arrayContaining([
        expect.stringContaining("Go to your Whoop Developer Dashboard"),
      ]),
    });
  });

  it("getWebhookInfo handles configured webhook", async () => {
    const user = createMockUser({ id: "user_whoop_5" })!;

    process.env.VERCEL_URL = "swole-tracker.vercel.app";
    process.env.WHOOP_WEBHOOK_SECRET = "test-secret";

    const db = createMockDb({});
    const caller = await buildCaller({ db, user });

    const result = await caller.whoop.getWebhookInfo();

    expect(result).toEqual({
      webhookUrl: "https://swole-tracker.vercel.app/api/webhooks/whoop",
      isConfigured: true,
      supportedEvents: ["workout.updated"],
      instructions: expect.arrayContaining([
        expect.stringContaining("Go to your Whoop Developer Dashboard"),
      ]),
    });
  });

  it("auth required for all whoop procedures", async () => {
    const db = createMockDb({});
    const caller = await buildCaller({ db, user: null });

    await expect(caller.whoop.getIntegrationStatus()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    await expect(caller.whoop.getWorkouts()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    await expect(caller.whoop.disconnectIntegration()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    await expect(caller.whoop.getWebhookInfo()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
