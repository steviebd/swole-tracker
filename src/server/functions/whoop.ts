import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  userIntegrations,
  externalWorkoutsWhoop,
  whoopRecovery,
  whoopCycles,
  whoopSleep,
  whoopBodyMeasurement,
} from "~/server/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { withAuth } from "./middleware";

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

// === GET INTEGRATION STATUS ===
export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const [integration] = await db
      .select({
        isActive: userIntegrations.isActive,
        createdAt: userIntegrations.createdAt,
        expiresAt: userIntegrations.expiresAt,
        scope: userIntegrations.scope,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, user.id),
          eq(userIntegrations.provider, "whoop"),
        ),
      )
      .limit(1);

    return {
      isConnected: integration?.isActive ?? false,
      connectedAt: integration?.createdAt
        ? toDate(integration.createdAt)
        : null,
      expiresAt: integration?.expiresAt ? toDate(integration.expiresAt) : null,
      scope: integration?.scope ?? null,
    };
  });

// === DISCONNECT INTEGRATION ===
export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    await db
      .delete(userIntegrations)
      .where(
        and(
          eq(userIntegrations.user_id, user.id),
          eq(userIntegrations.provider, "whoop"),
        ),
      );

    return { success: true };
  });

// === GET RECOVERY DATA ===
export const getRecovery = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      days: z.number().int().positive().default(7),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { days } = data;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const recovery = await db
      .select({
        id: whoopRecovery.id,
        date: whoopRecovery.date,
        recoveryScore: whoopRecovery.recovery_score,
        hrv: whoopRecovery.hrv_rmssd_milli,
        rhr: whoopRecovery.resting_heart_rate,
        respiratoryRate: whoopRecovery.respiratory_rate,
        createdAt: whoopRecovery.createdAt,
      })
      .from(whoopRecovery)
      .where(
        and(
          eq(whoopRecovery.user_id, user.id),
          gte(whoopRecovery.date, startDate),
        ),
      )
      .orderBy(desc(whoopRecovery.date))
      .limit(days);

    return recovery.map((r) => ({
      id: r.id,
      date: toDate(r.date),
      score: r.recoveryScore,
      hrv: r.hrv,
      rhr: r.rhr,
      respiratoryRate: r.respiratoryRate,
    }));
  });

// === GET LATEST RECOVERY ===
export const getLatestRecovery = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async ({ context }) => {
    const { db, user } = context;

    const [recovery] = await db
      .select({
        id: whoopRecovery.id,
        date: whoopRecovery.date,
        recoveryScore: whoopRecovery.recovery_score,
        hrv_rmssd_milli: whoopRecovery.hrv_rmssd_milli,
        hrv_rmssd_baseline: whoopRecovery.hrv_rmssd_baseline,
        resting_heart_rate: whoopRecovery.resting_heart_rate,
        resting_heart_rate_baseline: whoopRecovery.resting_heart_rate_baseline,
        respiratory_rate: whoopRecovery.respiratory_rate,
        createdAt: whoopRecovery.createdAt,
      })
      .from(whoopRecovery)
      .where(eq(whoopRecovery.user_id, user.id))
      .orderBy(desc(whoopRecovery.date))
      .limit(1);

    return recovery
      ? {
          id: recovery.id,
          date: toDate(recovery.date),
          score: recovery.recoveryScore,
          hrv: recovery.hrv_rmssd_milli,
          hrvBaseline: recovery.hrv_rmssd_baseline,
          restingHeartRate: recovery.resting_heart_rate,
          restingHeartRateBaseline: recovery.resting_heart_rate_baseline,
          respiratoryRate: recovery.respiratory_rate,
        }
      : null;
  });

// === GET CYCLES ===
export const getCycles = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      days: z.number().int().positive().default(30),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { days } = data;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cycles = await db
      .select({
        id: whoopCycles.id,
        start: whoopCycles.start,
        dayStrain: whoopCycles.day_strain,
        averageHeartRate: whoopCycles.average_heart_rate,
        maxHeartRate: whoopCycles.max_heart_rate,
        kilojoule: whoopCycles.kilojoule,
        createdAt: whoopCycles.createdAt,
      })
      .from(whoopCycles)
      .where(
        and(
          eq(whoopCycles.user_id, user.id),
          gte(whoopCycles.start, startDate),
        ),
      )
      .orderBy(desc(whoopCycles.start))
      .limit(days);

    return cycles.map((c) => ({
      id: c.id,
      date: toDate(c.start),
      strain: c.dayStrain,
      averageHeartRate: c.averageHeartRate,
      maxHeartRate: c.maxHeartRate,
      kilojoule: c.kilojoule,
    }));
  });

// === GET SLEEP DATA ===
export const getSleep = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      days: z.number().int().positive().default(7),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { days } = data;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sleep = await db
      .select({
        id: whoopSleep.id,
        start: whoopSleep.start,
        sleepPerformance: whoopSleep.sleep_performance_percentage,
        totalSleep: whoopSleep.total_sleep_time_milli,
        sleepEfficiency: whoopSleep.sleep_efficiency_percentage,
        deepSleep: whoopSleep.slow_wave_sleep_time_milli,
        remSleep: whoopSleep.rem_sleep_time_milli,
        lightSleep: whoopSleep.light_sleep_time_milli,
        wakeTime: whoopSleep.wake_time_milli,
        createdAt: whoopSleep.createdAt,
      })
      .from(whoopSleep)
      .where(
        and(eq(whoopSleep.user_id, user.id), gte(whoopSleep.start, startDate)),
      )
      .orderBy(desc(whoopSleep.start))
      .limit(days);

    return sleep.map((s) => ({
      id: s.id,
      date: toDate(s.start),
      sleepPerformance: s.sleepPerformance,
      totalSleep: s.totalSleep,
      sleepEfficiency: s.sleepEfficiency,
      deepSleep: s.deepSleep,
      remSleep: s.remSleep,
      lightSleep: s.lightSleep,
      wakeTime: s.wakeTime,
    }));
  });

// === GET WHOOP WORKOUTS ===
export const getWhoopWorkouts = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      days: z.number().int().positive().default(30),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { days } = data;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const workouts = await db
      .select({
        id: externalWorkoutsWhoop.id,
        start: externalWorkoutsWhoop.start,
        sportName: externalWorkoutsWhoop.sport_name,
        scoreState: externalWorkoutsWhoop.score_state,
        createdAt: externalWorkoutsWhoop.createdAt,
      })
      .from(externalWorkoutsWhoop)
      .where(
        and(
          eq(externalWorkoutsWhoop.user_id, user.id),
          gte(externalWorkoutsWhoop.start, startDate),
        ),
      )
      .orderBy(desc(externalWorkoutsWhoop.start))
      .limit(days);

    return workouts.map((w) => ({
      id: w.id,
      date: toDate(w.start),
      name: w.sportName,
      scoreState: w.scoreState,
    }));
  });

// === GET BODY MEASUREMENTS ===
export const getBodyMeasurements = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().default(10),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { limit } = data;

    const measurements = await db
      .select({
        id: whoopBodyMeasurement.id,
        measurementDate: whoopBodyMeasurement.measurement_date,
        weight: whoopBodyMeasurement.weight_kilogram,
        height: whoopBodyMeasurement.height_meter,
        maxHeartRate: whoopBodyMeasurement.max_heart_rate,
        createdAt: whoopBodyMeasurement.createdAt,
      })
      .from(whoopBodyMeasurement)
      .where(eq(whoopBodyMeasurement.user_id, user.id))
      .orderBy(desc(whoopBodyMeasurement.measurement_date))
      .limit(limit);

    return measurements.map((m) => ({
      id: m.id,
      date: toDate(m.measurementDate),
      weight: m.weight,
      height: m.height,
      maxHeartRate: m.maxHeartRate,
    }));
  });
