import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  userIntegrations,
  externalWorkoutsWhoop,
  whoopRecovery,
  whoopCycles,
  whoopSleep,
  whoopProfile,
  whoopBodyMeasurement,
} from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { withAuth } from "./middleware";

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function pickLatestDate(values: Array<Date | null>): Date | null {
  return values.reduce<Date | null>((latest, current) => {
    if (!current) return latest;
    if (!latest || current.getTime() > latest.getTime()) {
      return current;
    }
    return latest;
  }, null);
}

// === GET WEBHOOK INFO ===
export const getWebhookInfo = createServerFn({ method: "GET" }).handler(
  async () => {
    return {
      webhookUrl: "/api/webhooks/whoop",
      isConfigured: false,
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
  },
);

// === GET PROFILE ===
export const getProfile = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const [profile] = await db
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
      .where(eq(whoopProfile.user_id, user.id))
      .limit(1);

    return profile || null;
  });

// === GET READINESS AGGREGATION ===
export const getReadinessAggregation = createServerFn({
  method: "GET",
})
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const [integration] = await db
      .select({
        isActive: userIntegrations.isActive,
        expiresAt: userIntegrations.expiresAt,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, user.id),
          eq(userIntegrations.provider, "whoop"),
        ),
      )
      .limit(1);

    if (!integration?.isActive) {
      return {
        hasData: false,
        recoveryScore: null,
        sleepPerformance: null,
        hrvStatus: null,
        rhrStatus: null,
        readinessScore: 0.5,
        dataQuality: "none",
        recommendation: "manual_input_required",
      };
    }

    const isExpired = integration.expiresAt
      ? new Date(integration.expiresAt).getTime() < Date.now()
      : false;

    if (isExpired) {
      return {
        hasData: false,
        recoveryScore: null,
        sleepPerformance: null,
        hrvStatus: null,
        rhrStatus: null,
        readinessScore: 0.5,
        dataQuality: "expired",
        recommendation: "reconnect_whoop",
      };
    }

    const [latestRecovery, latestSleep] = await Promise.all([
      db
        .select({
          recovery_score: whoopRecovery.recovery_score,
          hrv_rmssd_milli: whoopRecovery.hrv_rmssd_milli,
          hrv_rmssd_baseline: whoopRecovery.hrv_rmssd_baseline,
          resting_heart_rate: whoopRecovery.resting_heart_rate,
          resting_heart_rate_baseline:
            whoopRecovery.resting_heart_rate_baseline,
          date: whoopRecovery.date,
        })
        .from(whoopRecovery)
        .where(eq(whoopRecovery.user_id, user.id))
        .orderBy(desc(whoopRecovery.date))
        .limit(1)
        .then((rows) => rows[0]),
      db
        .select({
          sleep_performance_percentage: whoopSleep.sleep_performance_percentage,
          start: whoopSleep.start,
        })
        .from(whoopSleep)
        .where(eq(whoopSleep.user_id, user.id))
        .orderBy(desc(whoopSleep.start))
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (!latestRecovery) {
      return {
        hasData: false,
        recoveryScore: null,
        sleepPerformance: null,
        hrvStatus: null,
        rhrStatus: null,
        readinessScore: 0.5,
        dataQuality: "no_data",
        recommendation: "sync_whoop_data",
      };
    }

    let hrvStatus: "low" | "baseline" | "high" = "baseline";
    if (latestRecovery.hrv_rmssd_milli && latestRecovery.hrv_rmssd_baseline) {
      const deviation =
        (latestRecovery.hrv_rmssd_milli - latestRecovery.hrv_rmssd_baseline) /
        latestRecovery.hrv_rmssd_baseline;
      if (deviation < -0.1) hrvStatus = "low";
      else if (deviation > 0.1) hrvStatus = "high";
    }

    let rhrStatus: "elevated" | "baseline" | "optimal" = "baseline";
    if (
      latestRecovery.resting_heart_rate &&
      latestRecovery.resting_heart_rate_baseline
    ) {
      const deviation =
        (latestRecovery.resting_heart_rate -
          latestRecovery.resting_heart_rate_baseline) /
        latestRecovery.resting_heart_rate_baseline;
      if (deviation > 0.05) rhrStatus = "elevated";
      else if (deviation < -0.05) rhrStatus = "optimal";
    }

    const recoveryScore = latestRecovery.recovery_score || 50;
    const sleepPerformance = latestSleep?.sleep_performance_percentage || 50;

    const hrvScore =
      hrvStatus === "baseline" ? 0.8 : hrvStatus === "high" ? 0.9 : 0.6;
    const rhrScore =
      rhrStatus === "baseline" ? 0.8 : rhrStatus === "optimal" ? 0.9 : 0.6;

    const readinessScore =
      (recoveryScore / 100) * 0.4 +
      (sleepPerformance / 100) * 0.3 +
      hrvScore * 0.2 +
      rhrScore * 0.1;

    const dataAge = Date.now() - new Date(latestRecovery.date).getTime();
    const hoursOld = dataAge / (1000 * 60 * 60);

    let dataQuality: "excellent" | "good" | "fair" | "poor" = "excellent";
    let recommendation = "train_as_planned";

    if (hoursOld > 48) {
      dataQuality = "poor";
      recommendation = "data_stale";
    } else if (hoursOld > 24) {
      dataQuality = "fair";
      recommendation = "consider_recent_trends";
    } else if (!latestSleep?.sleep_performance_percentage) {
      dataQuality = "good";
      recommendation = "missing_sleep_data";
    }

    return {
      hasData: true,
      recoveryScore: latestRecovery.recovery_score,
      sleepPerformance: latestSleep?.sleep_performance_percentage || null,
      hrvStatus,
      rhrStatus,
      readinessScore: Math.round(readinessScore * 100) / 100,
      dataQuality,
      recommendation,
      lastUpdated: latestRecovery.date,
    };
  });
