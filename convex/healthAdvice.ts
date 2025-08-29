import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Health advice request schema
const healthAdviceRequestSchema = v.object({
  whoop_data: v.optional(v.object({
    recovery_score: v.optional(v.number()),
    hrv_now_ms: v.optional(v.number()),
    hrv_baseline_ms: v.optional(v.number()),
    rhr_now_bpm: v.optional(v.number()),
    rhr_baseline_bpm: v.optional(v.number()),
    yesterday_strain: v.optional(v.number()),
    sleep_performance: v.optional(v.number()),
  })),
  manual_wellness: v.optional(v.object({
    energy_level: v.optional(v.number()), // 1-10
    sleep_quality: v.optional(v.number()), // 1-10
  })),
  current_workout: v.object({
    template_name: v.string(),
    exercises: v.array(v.object({
      exercise_name: v.string(),
      sets: v.array(v.object({
        weight: v.optional(v.number()),
        reps: v.optional(v.number()),
        is_warmup: v.optional(v.boolean()),
      })),
    })),
  }),
  workout_history: v.optional(v.array(v.object({
    date: v.string(),
    exercises: v.array(v.object({
      exercise_name: v.string(),
      volume_kg: v.number(),
      sets_completed: v.number(),
    })),
  }))),
});

// Health advice response schema (for type validation)
const healthAdviceResponseSchema = v.object({
  readiness: v.object({
    rho: v.number(), // 0.00-1.00
    overload_multiplier: v.number(), // 0.90-1.10
    interpretation: v.string(),
  }),
  session_predicted_chance: v.number(), // 0.00-1.00
  per_exercise: v.array(v.object({
    exercise_name: v.string(),
    sets: v.array(v.object({
      set_number: v.number(),
      suggested_weight: v.optional(v.number()),
      suggested_reps: v.optional(v.number()),
      suggested_rest_seconds: v.optional(v.number()),
      rationale: v.optional(v.string()),
    })),
  })),
});

// Save AI advice response to database
export const saveAdvice = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    request: v.any(), // healthAdviceRequestSchema - using v.any() to avoid deep validation issues
    response: v.any(), // healthAdviceResponseSchema
    responseTimeMs: v.optional(v.number()),
    modelUsed: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    try {
      const { sessionId, request, response, responseTimeMs, modelUsed } = args;

      // Verify session belongs to user
      const session = await ctx.db.get(sessionId);
      if (!session || session.userId !== user._id) {
        throw new ConvexError("Workout session not found or access denied");
      }

      // Calculate total suggestions
      const totalSuggestions = response.per_exercise.reduce((sum: number, ex: any) => 
        sum + ex.sets.length, 0);

      // Check if advice already exists for this session
      const existingAdvice = await ctx.db
        .query("healthAdvice")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", sessionId))
        .unique();

      let adviceId: Id<"healthAdvice">;

      if (existingAdvice) {
        // Update existing advice
        await ctx.db.patch(existingAdvice._id, {
          request: request,
          response: response,
          readinessRho: response.readiness.rho,
          overloadMultiplier: response.readiness.overload_multiplier,
          sessionPredictedChance: response.session_predicted_chance,
          totalSuggestions: totalSuggestions,
          responseTimeMs: responseTimeMs ? Math.round(responseTimeMs) : undefined,
          modelUsed: modelUsed,
        });
        adviceId = existingAdvice._id;
      } else {
        // Insert new advice
        adviceId = await ctx.db.insert("healthAdvice", {
          userId: user._id,
          sessionId: sessionId,
          request: request,
          response: response,
          readinessRho: response.readiness.rho,
          overloadMultiplier: response.readiness.overload_multiplier,
          sessionPredictedChance: response.session_predicted_chance,
          userAcceptedSuggestions: 0, // Will be updated when user accepts
          totalSuggestions: totalSuggestions,
          responseTimeMs: responseTimeMs ? Math.round(responseTimeMs) : undefined,
          modelUsed: modelUsed,
        });
      }

      const savedAdvice = await ctx.db.get(adviceId);
      if (!savedAdvice) {
        throw new ConvexError("Failed to save health advice to database");
      }

      console.log("Health advice saved successfully", {
        userId: user._id,
        sessionId,
        readinessRho: response.readiness.rho,
      });

      return savedAdvice;
    } catch (error) {
      console.error("Failed to save health advice to database", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: user._id,
        sessionId: args.sessionId,
      });
      throw error;
    }
  },
});

// Enhanced save method that can optionally link wellness data
export const saveAdviceWithWellness = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    request: v.any(), // Enhanced request schema with wellness data
    response: v.any(), // healthAdviceResponseSchema
    responseTimeMs: v.optional(v.number()),
    modelUsed: v.optional(v.string()),
    wellnessDataId: v.optional(v.id("wellnessData")), // Link to wellness data if available
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const { sessionId, request, response, responseTimeMs, modelUsed, wellnessDataId } = args;

    try {
      // Verify session belongs to user
      const session = await ctx.db.get(sessionId);
      if (!session || session.userId !== user._id) {
        throw new ConvexError("Workout session not found or access denied");
      }

      // Verify wellness data belongs to user if provided
      if (wellnessDataId) {
        const wellnessRecord = await ctx.db.get(wellnessDataId);
        if (!wellnessRecord || wellnessRecord.userId !== user._id) {
          console.warn("Wellness data not found or access denied", {
            wellnessDataId,
            userId: user._id,
            sessionId,
          });
          // Continue without wellness data rather than failing
        }
      }

      // Calculate total suggestions
      const totalSuggestions = response.per_exercise.reduce((sum: number, ex: any) => 
        sum + ex.sets.length, 0);

      // Check if advice already exists for this session
      const existingAdvice = await ctx.db
        .query("healthAdvice")
        .withIndex("by_sessionId", (q: any) => q.eq("sessionId", sessionId))
        .unique();

      let adviceId: Id<"healthAdvice">;

      if (existingAdvice) {
        // Update existing advice
        await ctx.db.patch(existingAdvice._id, {
          request: request,
          response: response,
          readinessRho: response.readiness.rho,
          overloadMultiplier: response.readiness.overload_multiplier,
          sessionPredictedChance: response.session_predicted_chance,
          totalSuggestions: totalSuggestions,
          responseTimeMs: responseTimeMs ? Math.round(responseTimeMs) : undefined,
          modelUsed: modelUsed,
        });
        adviceId = existingAdvice._id;
      } else {
        // Insert new advice with wellness context
        adviceId = await ctx.db.insert("healthAdvice", {
          userId: user._id,
          sessionId: sessionId,
          request: request,
          response: response,
          readinessRho: response.readiness.rho,
          overloadMultiplier: response.readiness.overload_multiplier,
          sessionPredictedChance: response.session_predicted_chance,
          userAcceptedSuggestions: 0,
          totalSuggestions: totalSuggestions,
          responseTimeMs: responseTimeMs ? Math.round(responseTimeMs) : undefined,
          modelUsed: modelUsed,
        });
      }

      console.log("Health advice saved with wellness context", {
        userId: user._id,
        sessionId,
        hasWellnessData: !!wellnessDataId,
        hasManualWellness: !!request.manual_wellness,
        readinessRho: response.readiness.rho,
      });

      const savedAdvice = await ctx.db.get(adviceId);
      return savedAdvice;

    } catch (error) {
      console.error("Failed to save health advice with wellness", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: user._id,
        sessionId,
        wellnessDataId,
      });
      throw error;
    }
  },
});

// Get AI advice for a session
export const getAdviceBySessionId = query({
  args: {
    sessionId: v.id("workoutSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify session belongs to user and get advice
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new ConvexError("Workout session not found or access denied");
    }

    const advice = await ctx.db
      .query("healthAdvice")
      .withIndex("by_sessionId", (q: any) => q.eq("sessionId", args.sessionId))
      .unique();

    return advice ?? null;
  },
});

// Get user's health advice history
export const getAdviceHistory = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const limit = Math.min(args.limit ?? 10, 100); // Cap at 100
    const offset = args.offset ?? 0;

    const results = await ctx.db
      .query("healthAdvice")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(limit + offset);

    // Manual offset implementation since Convex doesn't have built-in offset
    return results.slice(offset, offset + limit);
  },
});

// Update user accepted suggestions count
export const updateAcceptedSuggestions = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    acceptedCount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    if (args.acceptedCount < 0) {
      throw new ConvexError("Accepted count must be non-negative");
    }

    // Verify session belongs to user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new ConvexError("Workout session not found or access denied");
    }

    const advice = await ctx.db
      .query("healthAdvice")
      .withIndex("by_sessionId", (q: any) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!advice) {
      throw new ConvexError("Health advice not found for session");
    }

    await ctx.db.patch(advice._id, {
      userAcceptedSuggestions: args.acceptedCount,
    });

    const updatedAdvice = await ctx.db.get(advice._id);
    return updatedAdvice ?? null;
  },
});

// Delete health advice (for cleanup)
export const deleteAdvice = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q: any) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify session belongs to user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new ConvexError("Workout session not found or access denied");
    }

    const advice = await ctx.db
      .query("healthAdvice")
      .withIndex("by_sessionId", (q: any) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!advice) {
      throw new ConvexError("Health advice not found for session");
    }

    const deletedAdvice = { ...advice }; // Save copy before deletion
    await ctx.db.delete(advice._id);

    return deletedAdvice;
  },
});