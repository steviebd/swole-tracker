import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { userIntegrations, externalWorkoutsWhoop } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const whoopRouter = createTRPCRouter({
  getIntegrationStatus: protectedProcedure.query(async ({ ctx }) => {
    const [integration] = await ctx.db
      .select({
        isActive: userIntegrations.isActive,
        createdAt: userIntegrations.createdAt,
        scope: userIntegrations.scope,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, ctx.user.id),
          eq(userIntegrations.provider, "whoop"),
        ),
      );

    return {
      isConnected: !!integration?.isActive,
      connectedAt: integration?.createdAt || null,
      scope: integration?.scope || null,
    };
  }),

  getWorkouts: protectedProcedure.query(async ({ ctx }) => {
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
      supportedEvents: ["workout.updated"],
      instructions: [
        "1. Go to your Whoop Developer Dashboard",
        "2. Navigate to your app settings",
        "3. Add the webhook URL above",
        '4. Select "v2" model version for UUID support',
        "5. Set your app secret as WHOOP_WEBHOOK_SECRET environment variable",
        "6. Save the configuration",
      ],
    };
  }),

  // Get latest sleep and recovery data from WHOOP API
  getLatestRecoveryData: protectedProcedure.query(async ({ ctx }) => {
    // Get user's WHOOP integration
    const [integration] = await ctx.db
      .select({
        accessToken: userIntegrations.accessToken,
        isActive: userIntegrations.isActive,
        expiresAt: userIntegrations.expiresAt,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, ctx.user.id),
          eq(userIntegrations.provider, "whoop"),
          eq(userIntegrations.isActive, true)
        ),
      );

    if (!integration?.accessToken) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "WHOOP integration not found or inactive",
      });
    }

    // Check if token is expired
    if (integration.expiresAt && new Date() > integration.expiresAt) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "WHOOP access token has expired. Please reconnect your WHOOP account.",
      });
    }

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch recovery data from WHOOP API
      const recoveryResponse = await fetch(
        `https://api.prod.whoop.com/developer/v1/recovery?start=${today}&end=${today}`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!recoveryResponse.ok) {
        throw new Error(`WHOOP API error: ${recoveryResponse.status}`);
      }

      const recoveryData = await recoveryResponse.json();
      
      // Fetch sleep data from WHOOP API
      const sleepResponse = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${today}&end=${today}`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!sleepResponse.ok) {
        throw new Error(`WHOOP Sleep API error: ${sleepResponse.status}`);
      }

      const sleepData = await sleepResponse.json();
      
      // Get the latest recovery record (most recent)
      const latestRecovery = recoveryData.records?.[0];
      const latestSleep = sleepData.records?.[0];
      
      if (!latestRecovery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No recovery data found for today",
        });
      }

      // Map WHOOP API response to our expected format
      return {
        recovery_score: latestRecovery.score?.recovery_score || null,
        sleep_performance: latestSleep?.score?.stage_summary?.total_sleep_time_milli 
          ? Math.min(100, (latestSleep.score.stage_summary.total_sleep_time_milli / (8 * 60 * 60 * 1000)) * 100) // Convert to percentage of 8 hours
          : null,
        hrv_now_ms: latestRecovery.score?.hrv_rmssd_milli || null,
        hrv_baseline_ms: latestRecovery.score?.baseline?.hrv_rmssd_milli || null,
        rhr_now_bpm: latestRecovery.score?.resting_heart_rate || null,
        rhr_baseline_bpm: latestRecovery.score?.baseline?.resting_heart_rate || null,
        yesterday_strain: null, // Would need to fetch from workouts API
        raw_data: {
          recovery: latestRecovery,
          sleep: latestSleep,
        },
      };
    } catch (error) {
      // Re-throw TRPC errors as-is
      if (error instanceof TRPCError) {
        throw error;
      }
      
      console.error("Failed to fetch WHOOP recovery data:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch WHOOP data. Please try again.",
      });
    }
  }),
});
