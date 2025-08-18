import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { 
  userIntegrations, 
  externalWorkoutsWhoop,
  whoopRecovery,
  whoopCycles,
  whoopSleep,
  whoopProfile,
  whoopBodyMeasurement
} from "~/server/db/schema-d1";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const whoopRouter = createTRPCRouter({
  getIntegrationStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [integration] = await ctx.db
        .select({
          isActive: userIntegrations.isActive,
          createdAt: userIntegrations.createdAt,
          expiresAt: userIntegrations.expiresAt,
          scope: userIntegrations.scope,
        })
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.user_id, ctx.user.id),
            eq(userIntegrations.provider, "whoop"),
          ),
        );

      // Check if token is expired
      const now = new Date();
      const isExpired = integration?.expiresAt 
        ? new Date(integration.expiresAt).getTime() < now.getTime()
        : false;

      return {
        isConnected: !!integration?.isActive && !isExpired,
        connectedAt: integration?.createdAt || null,
        expiresAt: integration?.expiresAt || null,
        isExpired,
        scope: integration?.scope || null,
      };
    } catch (error) {
      console.error("Failed to fetch WHOOP integration status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check WHOOP integration status. Please try again later.",
      });
    }
  }),

  getWorkouts: protectedProcedure.query(async ({ ctx }) => {
    try {
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
        .orderBy(desc(externalWorkoutsWhoop.start));

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
    const webhookUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/webhooks/whoop`
      : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/webhooks/whoop`;

    return {
      webhookUrl,
      isConfigured: !!process.env.WHOOP_WEBHOOK_SECRET,
      supportedEvents: [
        "workout.updated",
        "recovery.updated", 
        "sleep.updated",
        "cycle.updated",
        "body_measurement.updated",
        "user_profile.updated"
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
    // Check if user has active WHOOP integration
    const [integration] = await ctx.db
      .select({
        isActive: userIntegrations.isActive,
        expiresAt: userIntegrations.expiresAt,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, ctx.user.id),
          eq(userIntegrations.provider, "whoop"),
        ),
      );

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
        message: "WHOOP access token has expired. Please reconnect your WHOOP account.",
      });
    }

    try {
      // Get latest recovery data from database (most recent record)
      const [latestRecovery] = await ctx.db
        .select()
        .from(whoopRecovery)
        .where(eq(whoopRecovery.user_id, ctx.user.id))
        .orderBy(desc(whoopRecovery.date))
        .limit(1);
      
      // Get latest sleep data from database (most recent record)
      const [latestSleep] = await ctx.db
        .select()
        .from(whoopSleep)
        .where(eq(whoopSleep.user_id, ctx.user.id))
        .orderBy(desc(whoopSleep.start))
        .limit(1);
      
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
        hrv_now_ms: latestRecovery.hrv_rmssd_milli ? parseFloat(latestRecovery.hrv_rmssd_milli) : null,
        hrv_baseline_ms: latestRecovery.hrv_rmssd_baseline ? parseFloat(latestRecovery.hrv_rmssd_baseline) : null,
        rhr_now_bpm: latestRecovery.resting_heart_rate || null,
        rhr_baseline_bpm: latestRecovery.resting_heart_rate_baseline || null,
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
      
      console.error("Failed to fetch WHOOP recovery data from database:", error);
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
