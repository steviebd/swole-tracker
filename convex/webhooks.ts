import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ensureUser } from "./users";

/**
 * Webhook Event Processing
 * 
 * Handles webhook events from external services (primarily WHOOP).
 * Logs events for debugging and audit trail, processes data updates.
 */

// WHOOP webhook event types
const whoopEventTypes = [
  "workout.updated",
  "recovery.updated", 
  "sleep.updated",
  "cycle.updated",
  "body_measurement.updated",
  "user_profile.updated"
] as const;

type WhoopWebhookEventType = typeof whoopEventTypes[number];

/**
 * Log a webhook event (called by HTTP action/route handler)
 */
export const logWebhookEvent = mutation({
  args: {
    provider: v.string(),
    eventType: v.string(),
    externalUserId: v.optional(v.string()),
    externalEntityId: v.optional(v.string()),
    payload: v.optional(v.any()),
    headers: v.optional(v.any()),
    status: v.union(
      v.literal("received"),
      v.literal("processed"), 
      v.literal("failed"), 
      v.literal("ignored")
    ),
    error: v.optional(v.string()),
    processingTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const webhookEventId = await ctx.db.insert("webhookEvents", {
        provider: args.provider,
        eventType: args.eventType,
        userId: undefined, // Will be set later if we can map the external user ID
        externalUserId: args.externalUserId,
        externalEntityId: args.externalEntityId,
        payload: args.payload,
        headers: args.headers,
        status: args.status,
        error: args.error,
        processingTime: args.processingTime,
        processedAt: args.status === "processed" ? Date.now() : undefined,
      });

      // Try to map external user ID to internal user if possible
      if (args.externalUserId && args.provider === "whoop") {
        try {
          // Find user by their WHOOP profile
          const whoopProfile = await ctx.db
            .query("whoopProfile")
            .withIndex("by_whoopUserId", (q) => q.eq("whoopUserId", args.externalUserId))
            .unique();
          
          if (whoopProfile) {
            // Update the webhook event with the mapped user ID
            await ctx.db.patch(webhookEventId, {
              userId: whoopProfile.userId,
            });
          }
        } catch (error) {
          console.warn("Could not map external user ID to internal user", {
            provider: args.provider,
            externalUserId: args.externalUserId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const savedEvent = await ctx.db.get(webhookEventId);
      console.log('Webhook event logged', {
        provider: args.provider,
        eventType: args.eventType,
        status: args.status,
        hasPayload: !!args.payload,
        hasError: !!args.error,
      });

      return savedEvent;

    } catch (error) {
      console.error('Failed to log webhook event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: args.provider,
        eventType: args.eventType,
      });

      throw new ConvexError("Failed to log webhook event");
    }
  },
});

/**
 * Update webhook event status (for processing workflow)
 */
export const updateWebhookEventStatus = mutation({
  args: {
    eventId: v.id("webhookEvents"),
    status: v.union(
      v.literal("received"),
      v.literal("processed"), 
      v.literal("failed"), 
      v.literal("ignored")
    ),
    error: v.optional(v.string()),
    processingTime: v.optional(v.number()),
    userId: v.optional(v.id("users")), // Set if user mapping is resolved
  },
  handler: async (ctx, args) => {
    try {
      const updateData: any = {
        status: args.status,
        error: args.error,
        processingTime: args.processingTime,
      };

      if (args.status === "processed" || args.status === "failed") {
        updateData.processedAt = Date.now();
      }

      if (args.userId) {
        updateData.userId = args.userId;
      }

      await ctx.db.patch(args.eventId, updateData);

      const updatedEvent = await ctx.db.get(args.eventId);
      return updatedEvent;

    } catch (error) {
      console.error('Failed to update webhook event status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: args.eventId,
        status: args.status,
      });

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError("Failed to update webhook event status");
    }
  },
});

/**
 * Process WHOOP workout webhook data
 */
export const processWhoopWorkout = mutation({
  args: {
    webhookEventId: v.id("webhookEvents"),
    whoopUserId: v.string(),
    workoutData: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      // Find the user by their WHOOP profile
      const whoopProfile = await ctx.db
        .query("whoopProfile")
        .withIndex("by_whoopUserId", (q) => q.eq("whoopUserId", args.whoopUserId))
        .unique();

      if (!whoopProfile) {
        console.warn('WHOOP profile not found for user', {
          whoopUserId: args.whoopUserId,
          webhookEventId: args.webhookEventId,
        });
        
        // Update webhook status
        await ctx.db.patch(args.webhookEventId, {
          status: "ignored",
          error: "WHOOP profile not found for user",
          processedAt: Date.now(),
        });
        
        return { success: false, reason: "User not found" };
      }

      // Extract workout data
      const workout = args.workoutData;
      if (!workout?.id) {
        throw new ConvexError("Invalid workout data: missing ID");
      }

      // Check if workout already exists
      const existingWorkout = await ctx.db
        .query("externalWorkoutsWhoop")
        .withIndex("by_user_workout_id", (q) => 
          q.eq("userId", whoopProfile.userId).eq("whoopWorkoutId", workout.id)
        )
        .unique();

      const now = Date.now();
      const workoutStart = new Date(workout.start).getTime();
      const workoutEnd = new Date(workout.end).getTime();

      if (existingWorkout) {
        // Update existing workout
        await ctx.db.patch(existingWorkout._id, {
          start: workoutStart,
          end: workoutEnd,
          timezoneOffset: workout.timezone_offset,
          sportName: workout.sport_name,
          scoreState: workout.score_state,
          score: workout.score,
          during: workout.during,
          zoneDuration: workout.zone_duration,
          updatedAt: now,
        });
      } else {
        // Insert new workout
        await ctx.db.insert("externalWorkoutsWhoop", {
          userId: whoopProfile.userId,
          whoopWorkoutId: workout.id,
          start: workoutStart,
          end: workoutEnd,
          timezoneOffset: workout.timezone_offset,
          sportName: workout.sport_name,
          scoreState: workout.score_state,
          score: workout.score,
          during: workout.during,
          zoneDuration: workout.zone_duration,
          updatedAt: now,
        });
      }

      // Update webhook event status
      await ctx.db.patch(args.webhookEventId, {
        status: "processed",
        userId: whoopProfile.userId,
        processedAt: now,
      });

      console.log('WHOOP workout processed successfully', {
        userId: whoopProfile.userId,
        whoopWorkoutId: workout.id,
        sportName: workout.sport_name,
        scoreState: workout.score_state,
      });

      return { success: true };

    } catch (error) {
      console.error('Failed to process WHOOP workout webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhookEventId: args.webhookEventId,
        whoopUserId: args.whoopUserId,
      });

      // Update webhook event status
      try {
        await ctx.db.patch(args.webhookEventId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: Date.now(),
        });
      } catch (updateError) {
        console.error('Failed to update webhook event status', updateError);
      }

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError("Failed to process WHOOP workout webhook");
    }
  },
});

/**
 * Process WHOOP recovery webhook data
 */
export const processWhoopRecovery = mutation({
  args: {
    webhookEventId: v.id("webhookEvents"),
    whoopUserId: v.string(),
    recoveryData: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      // Find the user by their WHOOP profile
      const whoopProfile = await ctx.db
        .query("whoopProfile")
        .withIndex("by_whoopUserId", (q) => q.eq("whoopUserId", args.whoopUserId))
        .unique();

      if (!whoopProfile) {
        console.warn('WHOOP profile not found for user', {
          whoopUserId: args.whoopUserId,
          webhookEventId: args.webhookEventId,
        });
        
        await ctx.db.patch(args.webhookEventId, {
          status: "ignored",
          error: "WHOOP profile not found for user",
          processedAt: Date.now(),
        });
        
        return { success: false, reason: "User not found" };
      }

      // Extract recovery data
      const recovery = args.recoveryData;
      if (!recovery?.id) {
        throw new ConvexError("Invalid recovery data: missing ID");
      }

      // Parse the created_at date to get the date string
      const dateObj = new Date(recovery.created_at);
      const dateString = dateObj.toISOString().split('T')[0];
      if (!dateString) {
        throw new ConvexError("Invalid recovery date");
      }

      // Check if recovery already exists
      const existingRecovery = await ctx.db
        .query("whoopRecovery")
        .withIndex("by_whoopRecoveryId", (q) => q.eq("whoopRecoveryId", recovery.id))
        .unique();

      const now = Date.now();

      if (existingRecovery) {
        // Update existing recovery
        await ctx.db.patch(existingRecovery._id, {
          cycleId: recovery.cycle_id,
          date: dateString,
          recoveryScore: recovery.score?.recovery_score,
          hrvRmssdMilli: recovery.score?.hrv_rmssd_milli,
          hrvRmssdBaseline: recovery.score?.hrv_baseline,
          restingHeartRate: recovery.score?.resting_heart_rate_milli / 1000, // Convert to BPM
          restingHeartRateBaseline: recovery.score?.hr_baseline / 1000, // Convert to BPM
          rawData: recovery,
          timezoneOffset: recovery.timezone_offset,
          webhookReceivedAt: now,
          updatedAt: now,
        });
      } else {
        // Insert new recovery
        await ctx.db.insert("whoopRecovery", {
          userId: whoopProfile.userId,
          whoopRecoveryId: recovery.id,
          cycleId: recovery.cycle_id,
          date: dateString,
          recoveryScore: recovery.score?.recovery_score,
          hrvRmssdMilli: recovery.score?.hrv_rmssd_milli,
          hrvRmssdBaseline: recovery.score?.hrv_baseline,
          restingHeartRate: recovery.score?.resting_heart_rate_milli / 1000, // Convert to BPM
          restingHeartRateBaseline: recovery.score?.hr_baseline / 1000, // Convert to BPM
          rawData: recovery,
          timezoneOffset: recovery.timezone_offset,
          webhookReceivedAt: now,
          updatedAt: now,
        });
      }

      // Update webhook event status
      await ctx.db.patch(args.webhookEventId, {
        status: "processed",
        userId: whoopProfile.userId,
        processedAt: now,
      });

      console.log('WHOOP recovery processed successfully', {
        userId: whoopProfile.userId,
        whoopRecoveryId: recovery.id,
        recoveryScore: recovery.score?.recovery_score,
        date: dateString,
      });

      return { success: true };

    } catch (error) {
      console.error('Failed to process WHOOP recovery webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhookEventId: args.webhookEventId,
        whoopUserId: args.whoopUserId,
      });

      // Update webhook event status
      try {
        await ctx.db.patch(args.webhookEventId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: Date.now(),
        });
      } catch (updateError) {
        console.error('Failed to update webhook event status', updateError);
      }

      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError("Failed to process WHOOP recovery webhook");
    }
  },
});

/**
 * Get recent webhook events (for monitoring/debugging)
 */
export const getRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
    provider: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = Math.min(args.limit || 20, 100); // Default 20, max 100

      // Get recent webhook events
      let events = await ctx.db
        .query("webhookEvents")
        .withIndex("by_creationTime", (q) => q.eq("_creationTime", q.field("_creationTime")))
        .order("desc")
        .take(limit * 2); // Take more initially to allow for filtering

      // Apply filters
      if (args.provider) {
        events = events.filter(event => event.provider === args.provider);
      }
      
      if (args.status) {
        events = events.filter(event => event.status === args.status);
      }

      // Apply final limit
      events = events.slice(0, limit);

      return events;

    } catch (error) {
      console.error('Failed to get recent webhook events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        limit: args.limit,
        provider: args.provider,
      });

      throw new ConvexError("Failed to retrieve webhook events");
    }
  },
});

/**
 * Get webhook event by ID (for debugging)
 */
export const getEventById = query({
  args: {
    eventId: v.id("webhookEvents"),
  },
  handler: async (ctx, args) => {
    try {
      const event = await ctx.db.get(args.eventId);
      return event ?? null;

    } catch (error) {
      console.error('Failed to get webhook event by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: args.eventId,
      });

      throw new ConvexError("Failed to retrieve webhook event");
    }
  },
});

/**
 * Get webhook statistics
 */
export const getStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const days = Math.min(args.days || 7, 30); // Default 7 days, max 30
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

      // Get events within the time range
      const events = await ctx.db
        .query("webhookEvents")
        .withIndex("by_creationTime", (q) => q.eq("_creationTime", q.field("_creationTime")))
        .order("desc")
        .collect();

      // Filter by time range
      const recentEvents = events.filter(event => event._creationTime >= cutoffTime);

      // Calculate statistics
      const stats = {
        total: recentEvents.length,
        byStatus: {} as Record<string, number>,
        byProvider: {} as Record<string, number>,
        byEventType: {} as Record<string, number>,
        averageProcessingTime: 0,
        recentActivity: recentEvents.slice(0, 10),
      };

      // Process statistics
      let totalProcessingTime = 0;
      let processedEventsCount = 0;

      recentEvents.forEach((event) => {
        stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;
        stats.byProvider[event.provider] = (stats.byProvider[event.provider] || 0) + 1;
        stats.byEventType[event.eventType] = (stats.byEventType[event.eventType] || 0) + 1;
        
        if (event.processingTime) {
          totalProcessingTime += event.processingTime;
          processedEventsCount++;
        }
      });

      // Calculate average processing time
      stats.averageProcessingTime = processedEventsCount > 0 
        ? Math.round(totalProcessingTime / processedEventsCount)
        : 0;

      return stats;

    } catch (error) {
      console.error('Failed to get webhook statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        days: args.days,
      });

      throw new ConvexError("Failed to retrieve webhook statistics");
    }
  },
});

/**
 * Get user-specific webhook events (for user debugging)
 */
export const getUserWebhookEvents = query({
  args: {
    limit: v.optional(v.number()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    try {
      const limit = Math.min(args.limit || 20, 50); // Default 20, max 50

      // Get webhook events for this user
      let events = await ctx.db
        .query("webhookEvents")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit * 2); // Take more initially to allow for filtering

      // Apply provider filter
      if (args.provider) {
        events = events.filter(event => event.provider === args.provider);
      }

      // Apply final limit
      events = events.slice(0, limit);

      // Remove sensitive data from payload for user viewing
      const sanitizedEvents = events.map(event => ({
        ...event,
        payload: event.payload ? { ...event.payload, headers: undefined } : null,
        headers: undefined, // Don't expose headers to users
      }));

      return sanitizedEvents;

    } catch (error) {
      console.error('Failed to get user webhook events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user._id,
        limit: args.limit,
      });

      throw new ConvexError("Failed to retrieve user webhook events");
    }
  },
});