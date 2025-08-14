import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { healthAdvice, wellnessData } from "~/server/db/schema";
import { 
  healthAdviceRequestSchema, 
  healthAdviceResponseSchema
} from "~/server/api/schemas/health-advice";
import { enhancedHealthAdviceRequestSchema } from "~/server/api/schemas/wellness";
import { logger } from "~/lib/logger";

export const healthAdviceRouter = createTRPCRouter({
  // Save AI advice response to database
  save: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      request: healthAdviceRequestSchema,
      response: healthAdviceResponseSchema,
      responseTimeMs: z.number().optional(),
      modelUsed: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, request, response, responseTimeMs, modelUsed } = input;

      // Calculate total suggestions
      const totalSuggestions = response.per_exercise.reduce((sum, ex) => sum + ex.sets.length, 0);

      // Upsert health advice (update if exists, insert if not)
      const result = await ctx.db
        .insert(healthAdvice)
        .values({
          user_id: ctx.user.id,
          sessionId: sessionId,
          request: request,
          response: response,
          readiness_rho: response.readiness.rho.toString(),
          overload_multiplier: response.readiness.overload_multiplier.toString(),
          session_predicted_chance: response.session_predicted_chance.toString(),
          user_accepted_suggestions: 0, // Will be updated when user accepts
          total_suggestions: totalSuggestions,
          response_time_ms: responseTimeMs ? Math.round(responseTimeMs) : null,
          model_used: modelUsed,
        })
        .onConflictDoUpdate({
          target: [healthAdvice.user_id, healthAdvice.sessionId],
          set: {
            request: request,
            response: response,
            readiness_rho: response.readiness.rho.toString(),
            overload_multiplier: response.readiness.overload_multiplier.toString(),
            session_predicted_chance: response.session_predicted_chance.toString(),
            total_suggestions: totalSuggestions,
            response_time_ms: responseTimeMs ? Math.round(responseTimeMs) : null,
            model_used: modelUsed,
          },
        })
        .returning();

      return result[0];
    }),

  // Enhanced save method that can optionally link wellness data
  saveWithWellness: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      request: enhancedHealthAdviceRequestSchema,
      response: healthAdviceResponseSchema,
      responseTimeMs: z.number().optional(),
      modelUsed: z.string().optional(),
      wellnessDataId: z.number().optional(), // Link to wellness data if available
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, request, response, responseTimeMs, modelUsed, wellnessDataId } = input;

      try {
        // Calculate total suggestions
        const totalSuggestions = response.per_exercise.reduce((sum, ex) => sum + ex.sets.length, 0);

        // Verify wellness data belongs to user if provided
        if (wellnessDataId) {
          const wellnessRecord = await ctx.db
            .select({ id: wellnessData.id })
            .from(wellnessData)
            .where(
              and(
                eq(wellnessData.id, wellnessDataId),
                eq(wellnessData.user_id, ctx.user.id)
              )
            )
            .limit(1);

          if (!wellnessRecord.length) {
            logger.warn('Wellness data not found or access denied', {
              wellnessDataId,
              userId: ctx.user.id,
              sessionId,
            });
            // Continue without wellness data rather than failing
          }
        }

        // Upsert health advice with wellness context
        const result = await ctx.db
          .insert(healthAdvice)
          .values({
            user_id: ctx.user.id,
            sessionId: sessionId,
            request: request,
            response: response,
            readiness_rho: response.readiness.rho.toString(),
            overload_multiplier: response.readiness.overload_multiplier.toString(),
            session_predicted_chance: response.session_predicted_chance.toString(),
            user_accepted_suggestions: 0,
            total_suggestions: totalSuggestions,
            response_time_ms: responseTimeMs ? Math.round(responseTimeMs) : null,
            model_used: modelUsed,
          })
          .onConflictDoUpdate({
            target: [healthAdvice.user_id, healthAdvice.sessionId],
            set: {
              request: request,
              response: response,
              readiness_rho: response.readiness.rho.toString(),
              overload_multiplier: response.readiness.overload_multiplier.toString(),
              session_predicted_chance: response.session_predicted_chance.toString(),
              total_suggestions: totalSuggestions,
              response_time_ms: responseTimeMs ? Math.round(responseTimeMs) : null,
              model_used: modelUsed,
            },
          })
          .returning();

        logger.info('Health advice saved with wellness context', {
          userId: ctx.user.id,
          sessionId,
          hasWellnessData: !!wellnessDataId,
          hasManualWellness: !!request.manual_wellness,
          readinessRho: response.readiness.rho,
        });

        return result[0];

      } catch (error) {
        logger.error('Failed to save health advice with wellness', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: ctx.user.id,
          sessionId,
          wellnessDataId,
        });

        throw error;
      }
    }),

  // Get AI advice for a session
  getBySessionId: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(healthAdvice)
        .where(
          and(
            eq(healthAdvice.user_id, ctx.user.id),
            eq(healthAdvice.sessionId, input.sessionId)
          )
        )
        .limit(1);

      return result[0] ?? null;
    }),

  // Get user's health advice history
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select()
        .from(healthAdvice)
        .where(eq(healthAdvice.user_id, ctx.user.id))
        .orderBy(desc(healthAdvice.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  // Update user accepted suggestions count
  updateAcceptedSuggestions: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      acceptedCount: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(healthAdvice)
        .set({
          user_accepted_suggestions: input.acceptedCount,
        })
        .where(
          and(
            eq(healthAdvice.user_id, ctx.user.id),
            eq(healthAdvice.sessionId, input.sessionId)
          )
        )
        .returning();

      return result[0] ?? null;
    }),

  // Delete health advice (for cleanup)
  delete: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(healthAdvice)
        .where(
          and(
            eq(healthAdvice.user_id, ctx.user.id),
            eq(healthAdvice.sessionId, input.sessionId)
          )
        )
        .returning();

      return result[0] ?? null;
    }),
});