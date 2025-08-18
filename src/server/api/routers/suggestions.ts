import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { aiSuggestionHistory } from "~/server/db/schema-d1";

export const suggestionsRouter = createTRPCRouter({
  // Track user interaction with AI suggestions
  trackInteraction: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        exerciseName: z.string(),
        setId: z.string(),
        setIndex: z.number().min(0),
        
        // Original suggestion details
        suggestedWeightKg: z.number().optional().nullable(),
        suggestedReps: z.number().int().positive().optional().nullable(),
        suggestedRestSeconds: z.number().int().positive().optional().nullable(),
        suggestionRationale: z.string().optional(),
        
        // User interaction
        action: z.enum(['accepted', 'rejected', 'modified']),
        acceptedWeightKg: z.number().optional(),
        acceptedReps: z.number().int().positive().optional(),
        
        // Context at time of suggestion
        progressionType: z.string().optional(),
        readinessScore: z.number().min(0).max(1).optional(),
        plateauDetected: z.boolean().default(false),
        
        // Timing
        interactionTimeMs: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await ctx.db.insert(aiSuggestionHistory).values({
          user_id: ctx.user.id,
          sessionId: input.sessionId,
          exerciseName: input.exerciseName,
          setId: input.setId,
          setIndex: input.setIndex,
          
          suggested_weight_kg: input.suggestedWeightKg?.toString(),
          suggested_reps: input.suggestedReps,
          suggested_rest_seconds: input.suggestedRestSeconds,
          suggestion_rationale: input.suggestionRationale,
          
          action: input.action,
          accepted_weight_kg: input.acceptedWeightKg?.toString(),
          accepted_reps: input.acceptedReps,
          
          progression_type: input.progressionType,
          readiness_score: input.readinessScore?.toString(),
          plateau_detected: input.plateauDetected,
          
          interaction_time_ms: input.interactionTimeMs,
        });
        
        return { success: true };
      } catch (error) {
        console.error('Failed to track suggestion interaction:', error);
        throw new Error('Failed to track suggestion interaction');
      }
    }),

  // Get suggestion analytics for the user (optional - for insights)
  getAnalytics: protectedProcedure
    .input(
      z.object({
        days: z.number().int().positive().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);
      
      // Get recent suggestion interactions
      const interactions = await ctx.db.query.aiSuggestionHistory.findMany({
        where: (history, { eq, and, gte }) => and(
          eq(history.user_id, ctx.user.id),
          gte(history.createdAt, cutoffDate)
        ),
        orderBy: (history, { desc }) => [desc(history.createdAt)],
        limit: 100,
      });
      
      // Calculate basic analytics
      const totalInteractions = interactions.length;
      const acceptedCount = interactions.filter(i => i.action === 'accepted').length;
      const rejectedCount = interactions.filter(i => i.action === 'rejected').length;
      const modifiedCount = interactions.filter(i => i.action === 'modified').length;
      
      const acceptanceRate = totalInteractions > 0 ? (acceptedCount / totalInteractions) * 100 : 0;
      
      // Group by exercise to find which exercises have highest acceptance
      const exerciseStats = interactions.reduce((stats, interaction) => {
        if (!stats[interaction.exerciseName]) {
          stats[interaction.exerciseName] = {
            total: 0,
            accepted: 0,
            rejected: 0,
            modified: 0,
          };
        }
        
        stats[interaction.exerciseName]!.total++;
        if (interaction.action === 'accepted') stats[interaction.exerciseName]!.accepted++;
        if (interaction.action === 'rejected') stats[interaction.exerciseName]!.rejected++;
        if (interaction.action === 'modified') stats[interaction.exerciseName]!.modified++;
        
        return stats;
      }, {} as Record<string, { total: number; accepted: number; rejected: number; modified: number; }>);
      
      return {
        totalInteractions,
        acceptedCount,
        rejectedCount,
        modifiedCount,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        exerciseStats,
        recentInteractions: interactions.slice(0, 10), // Last 10 interactions
      };
    }),
});