import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";
import { userIntegrations, externalWorkoutsWhoop } from "~/server/db/schema";

describe("tRPC whoop router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getIntegrationStatus", () => {
    it("returns connected status when integration exists and is active", async () => {
      const user = createMockUser({ id: "user_1" })!;

      const mockIntegration = {
        isActive: true,
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
        isConnected: true,
        connectedAt: mockIntegration.createdAt,
        scope: mockIntegration.scope,
      });
    });

    it("returns not connected when no integration exists", async () => {
      const user = createMockUser({ id: "user_2" })!;

      const db = createMockDb({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.whoop.getIntegrationStatus();

      expect(result).toEqual({
        isConnected: false,
        connectedAt: null,
        scope: null,
      });
    });
  });

  describe("getWorkouts", () => {
    it("returns empty array when no workouts exist", async () => {
      const user = createMockUser({ id: "user_4" })!;

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

    it("returns workouts sorted by start date descending", async () => {
      const user = createMockUser({ id: "user_5" })!;

      const mockWorkouts = [
        {
          id: 1,
          whoopWorkoutId: "workout_1",
          start: new Date("2024-01-03"),
          end: new Date("2024-01-03T01:00:00"),
          sport_name: "RUNNING",
          score_state: "SCORED",
          score: 15.5,
          during: { zone: "CARDIO" },
          zone_duration: { zone1: 1800, zone2: 1200 },
          createdAt: new Date("2024-01-03"),
        },
        {
          id: 2,
          whoopWorkoutId: "workout_2",
          start: new Date("2024-01-01"),
          end: new Date("2024-01-01T00:45:00"),
          sport_name: "CYCLING",
          score_state: "PENDING",
          score: 12.3,
          during: { zone: "CARDIO" },
          zone_duration: { zone1: 2000, zone2: 1000 },
          createdAt: new Date("2024-01-01"),
        },
      ];

      const db = createMockDb({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockWorkouts),
            }),
          }),
        }),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.whoop.getWorkouts();

      expect(result).toEqual(mockWorkouts);
      expect(result[0].start.getTime()).toBeGreaterThan(
        result[1].start.getTime(),
      );
    });
  });

  describe("disconnectIntegration", () => {
    it("successfully disconnects integration", async () => {
      const user = createMockUser({ id: "user_6" })!;

      const db = createMockDb({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });

      const caller = await buildCaller({ db, user });

      const result = await caller.whoop.disconnectIntegration();

      expect(result).toEqual({ success: true });
    });
  });

  describe("getWebhookInfo", () => {
    it("returns webhook info with VERCEL_URL", async () => {
      const user = createMockUser({ id: "user_7" })!;

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

    it("returns webhook info with fallback URL when VERCEL_URL not set", async () => {
      const user = createMockUser({ id: "user_8" })!;

      delete process.env.VERCEL_URL;
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      process.env.WHOOP_WEBHOOK_SECRET = "test-secret";

      const db = createMockDb({});
      const caller = await buildCaller({ db, user });

      const result = await caller.whoop.getWebhookInfo();

      expect(result).toEqual({
        webhookUrl: "http://localhost:3000/api/webhooks/whoop",
        isConfigured: true,
        supportedEvents: ["workout.updated"],
        instructions: expect.arrayContaining([
          expect.stringContaining("Go to your Whoop Developer Dashboard"),
        ]),
      });
    });
  });
});
