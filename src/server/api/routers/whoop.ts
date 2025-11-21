import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { DrizzleDb } from "~/server/db";
import {
  userIntegrations,
  externalWorkoutsWhoop,
  whoopRecovery,
  whoopCycles,
  whoopSleep,
  whoopProfile,
  whoopBodyMeasurement,
} from "~/server/db/schema";
import { rotateOAuthTokens } from "~/lib/token-rotation";
import { logger } from "~/lib/logger";

const whoopIntegrationSelection = {
  isActive: userIntegrations.isActive,
  createdAt: userIntegrations.createdAt,
  expiresAt: userIntegrations.expiresAt,
  scope: userIntegrations.scope,
};

async function loadWhoopIntegration(
  db: DrizzleDb,
  userId: string,
): Promise<
  | {
      isActive: boolean | null;
      createdAt: Date | string | null;
      expiresAt: Date | string | null;
      scope: string | null;
    }
  | undefined
> {
  const [integration] = await db
    .select(whoopIntegrationSelection)
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.user_id, userId),
        eq(userIntegrations.provider, "whoop"),
      ),
    )
    .limit(1);

  return integration;
}

const benignRotationErrors = new Set([
  "Integration not found",
  "No refresh token available",
]);

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function pickLatestDate(values: Array<Date | null>): Date | null {
  return values.reduce<Date | null>((latest, current) => {
    if (!current) {
      return latest;
    }

    if (!latest || current.getTime() > latest.getTime()) {
      return current;
    }

    return latest;
  }, null);
}

async function refreshWhoopIntegrationIfNeeded(
  db: DrizzleDb,
  userId: string,
): Promise<{
  integration:
    | {
        isActive: boolean | null;
        createdAt: Date | string | null;
        expiresAt: Date | string | null;
        scope: string | null;
      }
    | undefined;
  rotationError?: string;
}> {
  const integration = await loadWhoopIntegration(db, userId);

  if (!integration) {
    return { integration: undefined };
  }

  if (!integration.isActive) {
    return { integration };
  }

  const rotationResult = await rotateOAuthTokens(db, userId, "whoop");

  if (!rotationResult.success) {
    if (
      rotationResult.error &&
      !benignRotationErrors.has(rotationResult.error)
    ) {
      logger.warn("WHOOP token rotation failed", {
        userId: `${userId.substring(0, 8)}...`,
        error: rotationResult.error,
      });
    }

    const result: { integration: typeof integration; rotationError?: string } =
      { integration };
    if (rotationResult.error) {
      result.rotationError = rotationResult.error;
    }
    return result;
  }

  if (rotationResult.rotated) {
    const refreshedIntegration = await loadWhoopIntegration(db, userId);
    return { integration: refreshedIntegration ?? integration };
  }

  return { integration };
}

export const whoopRouter = createTRPCRouter({
  getIntegrationStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { integration } = await refreshWhoopIntegrationIfNeeded(
        ctx.db,
        ctx.user.id,
      );

      const [
        workoutLatest,
        recoveryLatest,
        sleepLatest,
        cycleLatest,
        bodyMeasurementLatest,
      ] = await Promise.all([
        ctx.db
          .select({
            latest: sql<string | null>`
              max(
                coalesce(${externalWorkoutsWhoop.updatedAt}, ${externalWorkoutsWhoop.createdAt})
              )
            `,
          })
          .from(externalWorkoutsWhoop)
          .where(eq(externalWorkoutsWhoop.user_id, ctx.user.id))
          .limit(1),
        ctx.db
          .select({
            latest: sql<string | null>`
              max(
                coalesce(${whoopRecovery.updatedAt}, ${whoopRecovery.createdAt})
              )
            `,
          })
          .from(whoopRecovery)
          .where(eq(whoopRecovery.user_id, ctx.user.id))
          .limit(1),
        ctx.db
          .select({
            latest: sql<string | null>`
              max(
                coalesce(${whoopSleep.updatedAt}, ${whoopSleep.createdAt})
              )
            `,
          })
          .from(whoopSleep)
          .where(eq(whoopSleep.user_id, ctx.user.id))
          .limit(1),
        ctx.db
          .select({
            latest: sql<string | null>`
              max(
                coalesce(${whoopCycles.updatedAt}, ${whoopCycles.createdAt})
              )
            `,
          })
          .from(whoopCycles)
          .where(eq(whoopCycles.user_id, ctx.user.id))
          .limit(1),
        ctx.db
          .select({
            latest: sql<string | null>`
              max(
                coalesce(${whoopBodyMeasurement.updatedAt}, ${whoopBodyMeasurement.createdAt})
              )
            `,
          })
          .from(whoopBodyMeasurement)
          .where(eq(whoopBodyMeasurement.user_id, ctx.user.id))
          .limit(1),
      ]);

      const lastSyncDate = pickLatestDate([
        toDate(workoutLatest[0]?.latest ?? null),
        toDate(recoveryLatest[0]?.latest ?? null),
        toDate(sleepLatest[0]?.latest ?? null),
        toDate(cycleLatest[0]?.latest ?? null),
        toDate(bodyMeasurementLatest[0]?.latest ?? null),
      ]);

      // Check if token is expired
      const now = new Date();
      const isExpired = integration?.expiresAt
        ? new Date(integration.expiresAt).getTime() < now.getTime()
        : false;

      return {
        isConnected: Boolean(integration?.isActive) && !isExpired,
        hasEverConnected: Boolean(integration),
        connectedAt: integration?.createdAt || null,
        expiresAt: integration?.expiresAt || null,
        isExpired,
        scope: integration?.scope || null,
        lastSyncAt: lastSyncDate ? lastSyncDate.toISOString() : null,
      };
    } catch (error) {
      console.error("Failed to fetch WHOOP integration status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Failed to check WHOOP integration status. Please try again later.",
      });
    }
  }),

  getWorkouts: protectedProcedure
    .input(
      z.object({ limit: z.number().int().positive().default(50) }).optional(),
    )
    .query(async ({ input, ctx }) => {
      try {
        const limit = input?.limit ?? 50;
        const workouts = await ctx.db
          .select({
            id: externalWorkoutsWhoop.id,
            whoopWorkoutId: externalWorkoutsWhoop.whoopWorkoutId,
            start: externalWorkoutsWhoop.start,
            end: externalWorkoutsWhoop.end,
            sport_name: externalWorkoutsWhoop.sport_name,
            score_state: externalWorkoutsWhoop.score_state,
            score: externalWorkoutsWhoop.score,
            during: externalWorkoutsWhoop.during,
            zone_duration: externalWorkoutsWhoop.zone_duration,
            createdAt: externalWorkoutsWhoop.createdAt,
          })
          .from(externalWorkoutsWhoop)
          .where(eq(externalWorkoutsWhoop.user_id, ctx.user.id))
          .orderBy(desc(externalWorkoutsWhoop.start))
          .limit(limit);

        return workouts;
      } catch (error) {
        console.error("Failed to fetch WHOOP workouts:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch WHOOP workouts. Please try again later.",
        });
      }
    }),

  disconnectIntegration: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(userIntegrations)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userIntegrations.user_id, ctx.user.id),
          eq(userIntegrations.provider, "whoop"),
        ),
      );

    return { success: true };
  }),

  getWebhookInfo: protectedProcedure.query(async ({ ctx: _ctx }) => {
    // Get the base URL for the webhook endpoint
    const webhookUrl = process.env["VERCEL_URL"]
      ? `https://${process.env["VERCEL_URL"]}/api/webhooks/whoop`
      : `${process.env["NEXTAUTH_URL"] || "http://localhost:3000"}/api/webhooks/whoop`;

    return {
      webhookUrl,
      isConfigured: !!process.env["WHOOP_WEBHOOK_SECRET"],
      supportedEvents: [
        "workout.created",
        "workout.updated",
        "recovery.created",
        "recovery.updated",
        "sleep.created",
        "sleep.updated",
        "cycle.created",
        "cycle.updated",
        "body_measurement.created",
        "body_measurement.updated",
        "user_profile.created",
        "user_profile.updated",
      ],
      instructions: [
        "1. Go to your Whoop Developer Dashboard",
        "2. Navigate to your app settings",
        "3. Add the webhook URL above",
        '4. Select "v2" model version for UUID support and expanded event types',
        "5. Subscribe to the events you want to receive (all supported events listed above)",
        "6. Set your app secret as WHOOP_WEBHOOK_SECRET environment variable",
        "7. Save the configuration",
      ],
    };
  }),

  // Get latest sleep and recovery data from cached database
  getLatestRecoveryData: protectedProcedure.query(async ({ ctx }) => {
    const { integration, rotationError } =
      await refreshWhoopIntegrationIfNeeded(ctx.db, ctx.user.id);

    if (!integration?.isActive) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "WHOOP integration not found or inactive",
      });
    }

    // Check if token is expired
    const now = new Date();
    const isExpired = integration.expiresAt
      ? new Date(integration.expiresAt).getTime() < now.getTime()
      : false;

    if (isExpired) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          rotationError === "No refresh token available"
            ? "WHOOP authorization can no longer be renewed automatically. Please reconnect your WHOOP account."
            : "WHOOP access token has expired. Please reconnect your WHOOP account.",
      });
    }

    try {
      // Get latest recovery and sleep data in parallel
      const [latestRecovery, latestSleep] = await Promise.all([
        ctx.db
          .select({
            recovery_score: whoopRecovery.recovery_score,
            hrv_rmssd_milli: whoopRecovery.hrv_rmssd_milli,
            hrv_rmssd_baseline: whoopRecovery.hrv_rmssd_baseline,
            resting_heart_rate: whoopRecovery.resting_heart_rate,
            resting_heart_rate_baseline:
              whoopRecovery.resting_heart_rate_baseline,
            respiratory_rate: whoopRecovery.respiratory_rate,
            respiratory_rate_baseline: whoopRecovery.respiratory_rate_baseline,
            raw_data: whoopRecovery.raw_data,
            date: whoopRecovery.date,
          })
          .from(whoopRecovery)
          .where(eq(whoopRecovery.user_id, ctx.user.id))
          .orderBy(desc(whoopRecovery.date))
          .limit(1)
          .then((rows) => rows[0]),
        ctx.db
          .select({
            sleep_performance_percentage:
              whoopSleep.sleep_performance_percentage,
            raw_data: whoopSleep.raw_data,
            start: whoopSleep.start,
          })
          .from(whoopSleep)
          .where(eq(whoopSleep.user_id, ctx.user.id))
          .orderBy(desc(whoopSleep.start))
          .limit(1)
          .then((rows) => rows[0]),
      ]);

      if (!latestRecovery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No recovery data found. Try syncing your WHOOP data first.",
        });
      }

      // Map database data to expected format
      return {
        recovery_score: latestRecovery.recovery_score || null,
        sleep_performance: latestSleep?.sleep_performance_percentage || null,
        hrv_now_ms: latestRecovery.hrv_rmssd_milli || null,
        hrv_baseline_ms: latestRecovery.hrv_rmssd_baseline || null,
        rhr_now_bpm: latestRecovery.resting_heart_rate || null,
        rhr_baseline_bpm: latestRecovery.resting_heart_rate_baseline || null,
        respiratory_rate: latestRecovery.respiratory_rate || null,
        respiratory_rate_baseline:
          latestRecovery.respiratory_rate_baseline || null,
        yesterday_strain: null, // Could be calculated from cycles table if needed
        raw_data: {
          recovery: latestRecovery.raw_data,
          sleep: latestSleep?.raw_data || null,
        },
      };
    } catch (error) {
      // Re-throw TRPC errors as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error(
        "Failed to fetch WHOOP recovery data from database:",
        error,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch WHOOP data from database. Please try again.",
      });
    }
  }),

  getRecovery: protectedProcedure.query(async ({ ctx }) => {
    const recovery = await ctx.db
      .select({
        id: whoopRecovery.id,
        whoop_recovery_id: whoopRecovery.whoop_recovery_id,
        cycle_id: whoopRecovery.cycle_id,
        date: whoopRecovery.date,
        recovery_score: whoopRecovery.recovery_score,
        hrv_rmssd_milli: whoopRecovery.hrv_rmssd_milli,
        hrv_rmssd_baseline: whoopRecovery.hrv_rmssd_baseline,
        resting_heart_rate: whoopRecovery.resting_heart_rate,
        resting_heart_rate_baseline: whoopRecovery.resting_heart_rate_baseline,
        respiratory_rate: whoopRecovery.respiratory_rate,
        respiratory_rate_baseline: whoopRecovery.respiratory_rate_baseline,
        raw_data: whoopRecovery.raw_data,
        createdAt: whoopRecovery.createdAt,
      })
      .from(whoopRecovery)
      .where(eq(whoopRecovery.user_id, ctx.user.id))
      .orderBy(desc(whoopRecovery.date));

    return recovery;
  }),

  getCycles: protectedProcedure.query(async ({ ctx }) => {
    const cycles = await ctx.db
      .select({
        id: whoopCycles.id,
        whoop_cycle_id: whoopCycles.whoop_cycle_id,
        start: whoopCycles.start,
        end: whoopCycles.end,
        timezone_offset: whoopCycles.timezone_offset,
        day_strain: whoopCycles.day_strain,
        average_heart_rate: whoopCycles.average_heart_rate,
        max_heart_rate: whoopCycles.max_heart_rate,
        kilojoule: whoopCycles.kilojoule,
        percent_recorded: whoopCycles.percent_recorded,
        distance_meter: whoopCycles.distance_meter,
        altitude_gain_meter: whoopCycles.altitude_gain_meter,
        altitude_change_meter: whoopCycles.altitude_change_meter,
        raw_data: whoopCycles.raw_data,
        createdAt: whoopCycles.createdAt,
      })
      .from(whoopCycles)
      .where(eq(whoopCycles.user_id, ctx.user.id))
      .orderBy(desc(whoopCycles.start));

    return cycles;
  }),

  getSleep: protectedProcedure.query(async ({ ctx }) => {
    const sleep = await ctx.db
      .select({
        id: whoopSleep.id,
        whoop_sleep_id: whoopSleep.whoop_sleep_id,
        start: whoopSleep.start,
        end: whoopSleep.end,
        timezone_offset: whoopSleep.timezone_offset,
        sleep_performance_percentage: whoopSleep.sleep_performance_percentage,
        total_sleep_time_milli: whoopSleep.total_sleep_time_milli,
        sleep_efficiency_percentage: whoopSleep.sleep_efficiency_percentage,
        slow_wave_sleep_time_milli: whoopSleep.slow_wave_sleep_time_milli,
        rem_sleep_time_milli: whoopSleep.rem_sleep_time_milli,
        light_sleep_time_milli: whoopSleep.light_sleep_time_milli,
        wake_time_milli: whoopSleep.wake_time_milli,
        arousal_time_milli: whoopSleep.arousal_time_milli,
        disturbance_count: whoopSleep.disturbance_count,
        sleep_latency_milli: whoopSleep.sleep_latency_milli,
        sleep_consistency_percentage: whoopSleep.sleep_consistency_percentage,
        sleep_need_baseline_milli: whoopSleep.sleep_need_baseline_milli,
        sleep_need_from_sleep_debt_milli:
          whoopSleep.sleep_need_from_sleep_debt_milli,
        sleep_need_from_recent_strain_milli:
          whoopSleep.sleep_need_from_recent_strain_milli,
        sleep_need_from_recent_nap_milli:
          whoopSleep.sleep_need_from_recent_nap_milli,
        raw_data: whoopSleep.raw_data,
        createdAt: whoopSleep.createdAt,
      })
      .from(whoopSleep)
      .where(eq(whoopSleep.user_id, ctx.user.id))
      .orderBy(desc(whoopSleep.start));

    return sleep;
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await ctx.db
      .select({
        id: whoopProfile.id,
        whoop_user_id: whoopProfile.whoop_user_id,
        email: whoopProfile.email,
        first_name: whoopProfile.first_name,
        last_name: whoopProfile.last_name,
        raw_data: whoopProfile.raw_data,
        last_updated: whoopProfile.last_updated,
        createdAt: whoopProfile.createdAt,
      })
      .from(whoopProfile)
      .where(eq(whoopProfile.user_id, ctx.user.id))
      .limit(1);

    return profile || null;
  }),

  getBodyMeasurements: protectedProcedure.query(async ({ ctx }) => {
    const measurements = await ctx.db
      .select({
        id: whoopBodyMeasurement.id,
        whoop_measurement_id: whoopBodyMeasurement.whoop_measurement_id,
        height_meter: whoopBodyMeasurement.height_meter,
        weight_kilogram: whoopBodyMeasurement.weight_kilogram,
        max_heart_rate: whoopBodyMeasurement.max_heart_rate,
        measurement_date: whoopBodyMeasurement.measurement_date,
        raw_data: whoopBodyMeasurement.raw_data,
        createdAt: whoopBodyMeasurement.createdAt,
      })
      .from(whoopBodyMeasurement)
      .where(eq(whoopBodyMeasurement.user_id, ctx.user.id))
      .orderBy(desc(whoopBodyMeasurement.measurement_date));

    return measurements;
  }),
});
