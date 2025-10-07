import { z } from "zod";
import { eq, and, desc, gte, lte, avg, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { wellnessData, workoutSessions } from "~/server/db/schema";
import {
  saveWellnessSchema,
  getWellnessHistorySchema,
  getWellnessStatsSchema,
} from "~/server/api/schemas/wellness";
import {
  asTrpcMiddleware,
  rateLimitMiddleware,
} from "~/lib/rate-limit-middleware";
import { env } from "~/env";
import { logger } from "~/lib/logger";

// Rate limiting configuration using existing environment variable
const WELLNESS_RATE_LIMIT = {
  limit: env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR || 60,
  windowMs: 60 * 60 * 1000, // 1 hour
};

export const wellnessRouter = createTRPCRouter({
  // Save wellness data for a session with security and anti-backfill safeguards
  save: protectedProcedure
    .input(saveWellnessSchema)
    .use(
      asTrpcMiddleware(
        rateLimitMiddleware({
          endpoint: "wellness_submission",
          limit: WELLNESS_RATE_LIMIT.limit,
          windowMs: WELLNESS_RATE_LIMIT.windowMs,
          skipIfDisabled: true,
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        sessionId,
        energyLevel,
        sleepQuality,
        deviceTimezone,
        notes,
        hasWhoopData,
        whoopData,
      } = input;

      try {
        // SECURITY: Always filter by user_id
        const userId = ctx.user.id;

        // Validation: Check if session belongs to user (if sessionId provided)
        if (sessionId) {
          const session = await ctx.db
            .select({ id: workoutSessions.id })
            .from(workoutSessions)
            .where(
              and(
                eq(workoutSessions.id, sessionId),
                eq(workoutSessions.user_id, userId),
              ),
            )
            .limit(1);

          if (!session.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Workout session not found or access denied",
            });
          }
        }

        // Anti-backfill validation: Only allow current/recent dates
        const now = new Date();
        const submittedAt = new Date();

        // Validate timezone
        if (!Intl.supportedValuesOf("timeZone").includes(deviceTimezone)) {
          logger.warn("Invalid timezone provided", { deviceTimezone, userId });
          // Don't fail, but log for monitoring
        }

        // Race condition prevention: Use INSERT ON CONFLICT DO UPDATE
        const result = await ctx.db
          .insert(wellnessData)
          .values({
            user_id: userId,
            sessionId: sessionId || null,
            date: now, // Pass Date object, custom type handles conversion
            energy_level: energyLevel,
            sleep_quality: sleepQuality,
            device_timezone: deviceTimezone,
            submitted_at: submittedAt,
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
              submitted_at: submittedAt,
              has_whoop_data: hasWhoopData,
              whoop_data: whoopData ? JSON.stringify(whoopData) : null,
              notes: notes ?? null,
              updatedAt: new Date(),
            },
          })
          .returning();

        logger.info("Wellness data saved successfully", {
          userId,
          sessionId,
          hasWhoopData,
          energyLevel,
          sleepQuality,
        });

        return result[0];
      } catch (error) {
        logger.error("Failed to save wellness data", {
          error: error instanceof Error ? error.message : "Unknown error",
          userId: ctx.user.id,
          sessionId,
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save wellness data",
        });
      }
    }),

  // Get wellness data for a specific session
  getBySessionId: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        // SECURITY: Filter by user_id AND verify session ownership
        const result = await ctx.db
          .select()
          .from(wellnessData)
          .innerJoin(
            workoutSessions,
            and(
              eq(wellnessData.sessionId, workoutSessions.id),
              eq(workoutSessions.user_id, ctx.user.id), // Verify session ownership
            ),
          )
          .where(
            and(
              eq(wellnessData.user_id, ctx.user.id),
              eq(wellnessData.sessionId, input.sessionId),
            ),
          )
          .limit(1);

        return result[0]?.wellness_data ?? null;
      } catch (error) {
        logger.error("Failed to get wellness data by session", {
          error: error instanceof Error ? error.message : "Unknown error",
          userId: ctx.user.id,
          sessionId: input.sessionId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve wellness data",
        });
      }
    }),

  // Get wellness history for trend analysis with pagination
  getHistory: protectedProcedure
    .input(getWellnessHistorySchema)
    .query(async ({ ctx, input }) => {
      try {
        const { limit, offset, startDate, endDate } = input;

        // SECURITY: Always filter by user_id
        // PERFORMANCE: Use indexed query on (user_id, date)

        // Build where conditions
        const whereConditions = [eq(wellnessData.user_id, ctx.user.id)];

        // Add date filters if provided
        if (startDate) {
          whereConditions.push(gte(wellnessData.date, startDate));
        }
        if (endDate) {
          whereConditions.push(lte(wellnessData.date, endDate));
        }

        const results = await ctx.db
          .select()
          .from(wellnessData)
          .where(and(...whereConditions))
          .orderBy(desc(wellnessData.date))
          .limit(limit)
          .offset(offset);

        return results;
      } catch (error) {
        logger.error("Failed to get wellness history", {
          error: error instanceof Error ? error.message : "Unknown error",
          userId: ctx.user.id,
          limit: input.limit,
          offset: input.offset,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve wellness history",
        });
      }
    }),

  // Get wellness statistics and trends
  getStats: protectedProcedure
    .input(getWellnessStatsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { days } = input;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // SECURITY: Always filter by user_id
        const stats = await ctx.db
          .select({
            avgEnergyLevel: avg(wellnessData.energy_level),
            avgSleepQuality: avg(wellnessData.sleep_quality),
            totalEntries: count(wellnessData.id),
          })
          .from(wellnessData)
          .where(
            and(
              eq(wellnessData.user_id, ctx.user.id),
              gte(wellnessData.date, startDate),
            ),
          );

        // Get recent trend (last 7 days for comparison)
        const recentStartDate = new Date();
        recentStartDate.setDate(recentStartDate.getDate() - 7);

        const recentStats = await ctx.db
          .select({
            avgEnergyLevel: avg(wellnessData.energy_level),
            avgSleepQuality: avg(wellnessData.sleep_quality),
            totalEntries: count(wellnessData.id),
          })
          .from(wellnessData)
          .where(
            and(
              eq(wellnessData.user_id, ctx.user.id),
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
      } catch (error) {
        logger.error("Failed to get wellness stats", {
          error: error instanceof Error ? error.message : "Unknown error",
          userId: ctx.user.id,
          days: input.days,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve wellness statistics",
        });
      }
    }),

  // Delete wellness data for a session
  delete: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // SECURITY: Filter by user_id AND verify session ownership
        const result = await ctx.db
          .delete(wellnessData)
          .where(
            and(
              eq(wellnessData.user_id, ctx.user.id),
              eq(wellnessData.sessionId, input.sessionId),
            ),
          )
          .returning();

        if (!result.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Wellness data not found or access denied",
          });
        }

        logger.info("Wellness data deleted successfully", {
          userId: ctx.user.id,
          sessionId: input.sessionId,
        });

        return result[0];
      } catch (error) {
        logger.error("Failed to delete wellness data", {
          error: error instanceof Error ? error.message : "Unknown error",
          userId: ctx.user.id,
          sessionId: input.sessionId,
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete wellness data",
        });
      }
    }),

  // Check if wellness data exists for a session (for race condition prevention)
  checkExists: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await ctx.db
          .select({ id: wellnessData.id })
          .from(wellnessData)
          .where(
            and(
              eq(wellnessData.user_id, ctx.user.id),
              eq(wellnessData.sessionId, input.sessionId),
            ),
          )
          .limit(1);

        return result.length > 0;
      } catch (error) {
        logger.error("Failed to check wellness data existence", {
          error: error instanceof Error ? error.message : "Unknown error",
          userId: ctx.user.id,
          sessionId: input.sessionId,
        });

        // Return false on error to allow submission attempt
        return false;
      }
    }),
});
