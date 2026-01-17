import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { wellnessData, workoutSessions } from "~/server/db/schema";
import { eq, and, desc, gte, lte, avg, count, sql } from "drizzle-orm";
import { withAuth } from "./middleware";

// === SAVE WELLNESS DATA ===
export const saveWellness = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number().optional(),
      energyLevel: z.number().min(1).max(10),
      sleepQuality: z.number().min(1).max(10),
      deviceTimezone: z.string().default("UTC"),
      notes: z.string().optional(),
      hasWhoopData: z.boolean().default(false),
      whoopData: z.record(z.string(), z.any()).optional().nullable(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const {
      sessionId,
      energyLevel,
      sleepQuality,
      deviceTimezone,
      notes,
      hasWhoopData,
      whoopData,
    } = data;

    if (sessionId) {
      const session = await db
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.id, sessionId),
            eq(workoutSessions.user_id, user.id),
          ),
        )
        .limit(1);

      if (!session.length) {
        throw new Error("Workout session not found or access denied");
      }
    }

    const now = new Date();

    const result = await db
      .insert(wellnessData)
      .values({
        user_id: user.id,
        sessionId: sessionId || null,
        date: now,
        energy_level: energyLevel,
        sleep_quality: sleepQuality,
        device_timezone: deviceTimezone,
        submitted_at: now,
        has_whoop_data: hasWhoopData,
        whoop_data: whoopData ? JSON.stringify(whoopData) : null,
        notes: notes ?? null,
      })
      .onConflictDoUpdate({
        target: [wellnessData.user_id, wellnessData.sessionId],
        set: {
          energy_level: energyLevel,
          sleep_quality: sleepQuality,
          device_timezone: deviceTimezone,
          submitted_at: now,
          has_whoop_data: hasWhoopData,
          whoop_data: whoopData ? JSON.stringify(whoopData) : null,
          notes: notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  });

// === GET WELLNESS BY SESSION ID ===
export const getWellnessBySessionId = createServerFn({ method: "GET" })
  .inputValidator(z.object({ sessionId: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId } = data;

    const result = await db
      .select()
      .from(wellnessData)
      .innerJoin(
        workoutSessions,
        and(
          eq(wellnessData.sessionId, workoutSessions.id),
          eq(workoutSessions.user_id, user.id),
        ),
      )
      .where(
        and(
          eq(wellnessData.user_id, user.id),
          eq(wellnessData.sessionId, sessionId),
        ),
      )
      .limit(1);

    return result[0]?.wellness_data ?? null;
  });

// === GET WELLNESS HISTORY ===
export const getWellnessHistory = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().default(30),
      offset: z.number().int().nonnegative().default(0),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { limit, offset, startDate, endDate } = data;

    let results;
    if (startDate && endDate) {
      results = await db
        .select()
        .from(wellnessData)
        .where(
          and(
            eq(wellnessData.user_id, user.id),
            gte(wellnessData.date, startDate),
            lte(wellnessData.date, endDate),
          ),
        )
        .orderBy(desc(wellnessData.date))
        .limit(limit)
        .offset(offset);
    } else if (startDate) {
      results = await db
        .select()
        .from(wellnessData)
        .where(
          and(
            eq(wellnessData.user_id, user.id),
            gte(wellnessData.date, startDate),
          ),
        )
        .orderBy(desc(wellnessData.date))
        .limit(limit)
        .offset(offset);
    } else if (endDate) {
      results = await db
        .select()
        .from(wellnessData)
        .where(
          and(
            eq(wellnessData.user_id, user.id),
            lte(wellnessData.date, endDate),
          ),
        )
        .orderBy(desc(wellnessData.date))
        .limit(limit)
        .offset(offset);
    } else {
      results = await db
        .select()
        .from(wellnessData)
        .where(eq(wellnessData.user_id, user.id))
        .orderBy(desc(wellnessData.date))
        .limit(limit)
        .offset(offset);
    }

    return results;
  });

// === GET WELLNESS STATS ===
export const getWellnessStats = createServerFn({ method: "GET" })
  .inputValidator(z.object({ days: z.number().int().positive().default(30) }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { days } = data;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db
      .select({
        avgEnergyLevel: avg(wellnessData.energy_level),
        avgSleepQuality: avg(wellnessData.sleep_quality),
        totalEntries: count(wellnessData.id),
      })
      .from(wellnessData)
      .where(
        and(
          eq(wellnessData.user_id, user.id),
          gte(wellnessData.date, startDate),
        ),
      );

    const recentStartDate = new Date();
    recentStartDate.setDate(recentStartDate.getDate() - 7);

    const recentStats = await db
      .select({
        avgEnergyLevel: avg(wellnessData.energy_level),
        avgSleepQuality: avg(wellnessData.sleep_quality),
        totalEntries: count(wellnessData.id),
      })
      .from(wellnessData)
      .where(
        and(
          eq(wellnessData.user_id, user.id),
          gte(wellnessData.date, recentStartDate),
        ),
      );

    return {
      period: {
        days,
        avgEnergyLevel: stats[0]?.avgEnergyLevel
          ? Number(stats[0].avgEnergyLevel)
          : null,
        avgSleepQuality: stats[0]?.avgSleepQuality
          ? Number(stats[0].avgSleepQuality)
          : null,
        totalEntries: stats[0]?.totalEntries || 0,
      },
      recent: {
        days: 7,
        avgEnergyLevel: recentStats[0]?.avgEnergyLevel
          ? Number(recentStats[0].avgEnergyLevel)
          : null,
        avgSleepQuality: recentStats[0]?.avgSleepQuality
          ? Number(recentStats[0].avgSleepQuality)
          : null,
        totalEntries: recentStats[0]?.totalEntries || 0,
      },
    };
  });

// === DELETE WELLNESS DATA ===
export const deleteWellness = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sessionId: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId } = data;

    const result = await db
      .delete(wellnessData)
      .where(
        and(
          eq(wellnessData.user_id, user.id),
          eq(wellnessData.sessionId, sessionId),
        ),
      )
      .returning();

    if (!result.length) {
      throw new Error("Wellness data not found or access denied");
    }

    return result[0];
  });
