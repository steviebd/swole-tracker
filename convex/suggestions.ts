import { ConvexError, v } from "convex/values";
import { ensureUser } from "./users";
import { query, mutation } from "./_generated/server";

/**
 * Helper function to get or create shared user ID
 */
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  
  return await ensureUser(ctx, identity);
}

/**
 * AI Suggestion History Management
 * 
 * Tracks user interactions with AI workout suggestions for learning and analytics.
 * Helps improve future recommendations by understanding user preferences.
 */

/**
 * Track user interaction with AI suggestions
 */
export const recordInteraction = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    exerciseName: v.string(),
    setId: v.string(),
    setIndex: v.number(),
    
    // Original suggestion details
    suggestedWeightKg: v.optional(v.number()),
    suggestedReps: v.optional(v.number()),
    suggestedRestSeconds: v.optional(v.number()),
    suggestionRationale: v.optional(v.string()),
    
    // User interaction
    action: v.union(v.literal("accepted"), v.literal("rejected"), v.literal("modified")),
    acceptedWeightKg: v.optional(v.number()),
    acceptedReps: v.optional(v.number()),
    
    // Context at time of suggestion
    progressionType: v.optional(v.string()),
    readinessScore: v.optional(v.number()),
    plateauDetected: v.boolean(),
    
    // Timing
    interactionTimeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    try {
      // Validate inputs
      if (args.setIndex < 0) {
        throw new ConvexError("Set index must be non-negative");
      }
      
      if (args.suggestedWeightKg !== undefined && args.suggestedWeightKg < 0) {
        throw new ConvexError("Suggested weight must be non-negative");
      }
      
      if (args.suggestedReps !== undefined && args.suggestedReps < 1) {
        throw new ConvexError("Suggested reps must be positive");
      }
      
      if (args.suggestedRestSeconds !== undefined && args.suggestedRestSeconds < 1) {
        throw new ConvexError("Suggested rest seconds must be positive");
      }
      
      if (args.readinessScore !== undefined && (args.readinessScore < 0 || args.readinessScore > 1)) {
        throw new ConvexError("Readiness score must be between 0 and 1");
      }
      
      if (args.interactionTimeMs !== undefined && args.interactionTimeMs < 1) {
        throw new ConvexError("Interaction time must be positive");
      }

      // SECURITY: Verify session belongs to user
      const session = await ctx.db.get(args.sessionId);
      if (!session || session.userId !== userId) {
        throw new ConvexError("Workout session not found or access denied");
      }

      // Insert suggestion history record
      const suggestionId = await ctx.db.insert("aiSuggestionHistory", {
        userId,
        sessionId: args.sessionId,
        exerciseName: args.exerciseName,
        setId: args.setId,
        setIndex: args.setIndex,
        
        suggestedWeightKg: args.suggestedWeightKg,
        suggestedReps: args.suggestedReps,
        suggestedRestSeconds: args.suggestedRestSeconds,
        suggestionRationale: args.suggestionRationale,
        
        action: args.action,
        acceptedWeightKg: args.acceptedWeightKg,
        acceptedReps: args.acceptedReps,
        
        progressionType: args.progressionType,
        readinessScore: args.readinessScore,
        plateauDetected: args.plateauDetected,
        
        interactionTimeMs: args.interactionTimeMs,
      });

      const savedSuggestion = await ctx.db.get(suggestionId);
      if (!savedSuggestion) {
        throw new ConvexError("Failed to save suggestion interaction");
      }

      console.log('Suggestion interaction tracked successfully', {
        userId,
        sessionId: args.sessionId,
        exerciseName: args.exerciseName,
        action: args.action,
        plateauDetected: args.plateauDetected,
      });

      return { success: true };

    } catch (error) {
      console.error('Failed to track suggestion interaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        sessionId: args.sessionId,
        exerciseName: args.exerciseName,
      });

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError("Failed to track suggestion interaction");
    }
  },
});

/**
 * Get suggestion analytics for the user (for insights)
 */
export const getHistory = query({
  args: {
    days: v.optional(v.number()),
    limit: v.optional(v.number()),
    exerciseName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    try {
      // Validate inputs
      const days = Math.min(Math.max(args.days || 30, 1), 365); // Default 30 days, max 365
      const limit = Math.min(Math.max(args.limit || 100, 1), 1000); // Default 100, max 1000

      // Calculate cutoff date
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

      // Get recent suggestion interactions
      let interactions = await ctx.db
        .query("aiSuggestionHistory")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .order("desc")
        .collect();

      // Filter by time range
      interactions = interactions.filter(
        (interaction) => interaction._creationTime >= cutoffTime
      );

      // Filter by exercise name if provided
      if (args.exerciseName) {
        interactions = interactions.filter(
          (interaction) => interaction.exerciseName === args.exerciseName
        );
      }

      // Apply limit
      interactions = interactions.slice(0, limit);

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
      }, {} as Record<string, { total: number; accepted: number; rejected: number; modified: number }>);

      return {
        totalInteractions,
        acceptedCount,
        rejectedCount,
        modifiedCount,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        exerciseStats,
        recentInteractions: interactions.slice(0, 10), // Last 10 interactions
      };

    } catch (error) {
      console.error('Failed to get suggestion analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        days: args.days,
        limit: args.limit,
      });

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError("Failed to retrieve suggestion analytics");
    }
  },
});

/**
 * Get suggestion patterns for a specific exercise (for AI learning)
 */
export const getSuggestions = query({
  args: {
    exerciseName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    try {
      // Validate inputs
      const limit = Math.min(Math.max(args.limit || 50, 1), 200); // Default 50, max 200

      // Get suggestions for this specific exercise
      const suggestions = await ctx.db
        .query("aiSuggestionHistory")
        .withIndex("by_exerciseName", (q: any) => q.eq("exerciseName", args.exerciseName))
        .filter((q: any) => q.eq(q.field("userId"), userId))
        .order("desc")
        .take(limit);

      // Calculate exercise-specific patterns
      const patterns = analyzeExercisePatterns(suggestions);

      return {
        exerciseName: args.exerciseName,
        totalSuggestions: suggestions.length,
        patterns,
        recentSuggestions: suggestions.slice(0, 10),
      };

    } catch (error) {
      console.error('Failed to get exercise suggestion patterns', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        exerciseName: args.exerciseName,
      });

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError("Failed to retrieve suggestion patterns");
    }
  },
});

/**
 * Get user acceptance patterns across all exercises (for system learning)
 */
export const getUserPatterns = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    try {
      // Validate inputs
      const days = Math.min(Math.max(args.days || 90, 1), 365); // Default 90 days, max 365

      // Calculate cutoff date
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

      // Get all interactions in the time range
      let interactions = await ctx.db
        .query("aiSuggestionHistory")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .order("desc")
        .collect();

      // Filter by time range
      interactions = interactions.filter(
        (interaction) => interaction._creationTime >= cutoffTime
      );

      // Analyze user patterns
      const userPatterns = analyzeUserPatterns(interactions);

      return {
        userId,
        periodDays: days,
        totalInteractions: interactions.length,
        patterns: userPatterns,
      };

    } catch (error) {
      console.error('Failed to get user suggestion patterns', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        days: args.days,
      });

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError("Failed to retrieve user patterns");
    }
  },
});

/**
 * Helper function to analyze exercise-specific patterns
 */
function analyzeExercisePatterns(suggestions: any[]) {
  if (suggestions.length === 0) {
    return {
      acceptanceRate: 0,
      averageInteractionTime: null,
      commonProgressionType: null,
      plateauFrequency: 0,
    };
  }

  const acceptedCount = suggestions.filter(s => s.action === 'accepted').length;
  const acceptanceRate = (acceptedCount / suggestions.length) * 100;

  // Average interaction time (only for suggestions that have this data)
  const interactionTimes = suggestions.filter(s => s.interactionTimeMs != null).map(s => s.interactionTimeMs);
  const averageInteractionTime = interactionTimes.length > 0
    ? interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length
    : null;

  // Most common progression type
  const progressionTypes = suggestions.filter(s => s.progressionType).map(s => s.progressionType);
  const progressionCounts = progressionTypes.reduce((counts, type) => {
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const commonProgressionType = Object.keys(progressionCounts).length > 0
    ? Object.keys(progressionCounts).reduce((a, b) => progressionCounts[a] > progressionCounts[b] ? a : b)
    : null;

  // Plateau detection frequency
  const plateauCount = suggestions.filter(s => s.plateauDetected).length;
  const plateauFrequency = (plateauCount / suggestions.length) * 100;

  return {
    acceptanceRate: Math.round(acceptanceRate * 10) / 10,
    averageInteractionTime: averageInteractionTime ? Math.round(averageInteractionTime) : null,
    commonProgressionType,
    plateauFrequency: Math.round(plateauFrequency * 10) / 10,
  };
}

/**
 * Helper function to analyze user-wide patterns
 */
function analyzeUserPatterns(interactions: any[]) {
  if (interactions.length === 0) {
    return {
      overallAcceptanceRate: 0,
      preferredProgressionTypes: {},
      exercisePreferences: {},
      timePatterns: {},
    };
  }

  // Overall acceptance rate
  const acceptedCount = interactions.filter(i => i.action === 'accepted').length;
  const overallAcceptanceRate = (acceptedCount / interactions.length) * 100;

  // Preferred progression types
  const progressionTypes = interactions.filter(i => i.progressionType).map(i => i.progressionType);
  const progressionTypeCounts = progressionTypes.reduce((counts, type) => {
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Exercise preferences (acceptance rate by exercise)
  const exerciseGroups = interactions.reduce((groups, interaction) => {
    if (!groups[interaction.exerciseName]) {
      groups[interaction.exerciseName] = { total: 0, accepted: 0 };
    }
    groups[interaction.exerciseName].total++;
    if (interaction.action === 'accepted') {
      groups[interaction.exerciseName].accepted++;
    }
    return groups;
  }, {} as Record<string, { total: number; accepted: number }>);

  const exercisePreferences = Object.keys(exerciseGroups).reduce((prefs, exerciseName) => {
    const group = exerciseGroups[exerciseName];
    prefs[exerciseName] = {
      acceptanceRate: (group.accepted / group.total) * 100,
      totalInteractions: group.total,
    };
    return prefs;
  }, {} as Record<string, { acceptanceRate: number; totalInteractions: number }>);

  // Time patterns (if interaction times are available)
  const interactionTimes = interactions.filter(i => i.interactionTimeMs != null).map(i => i.interactionTimeMs);
  const timePatterns = interactionTimes.length > 0 ? {
    averageTime: Math.round(interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length),
    fastDecisions: interactionTimes.filter(time => time < 5000).length, // < 5 seconds
    slowDecisions: interactionTimes.filter(time => time > 30000).length, // > 30 seconds
  } : {};

  return {
    overallAcceptanceRate: Math.round(overallAcceptanceRate * 10) / 10,
    preferredProgressionTypes: progressionTypeCounts,
    exercisePreferences,
    timePatterns,
  };
}