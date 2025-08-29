import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ensureUser } from "./users";

/**
 * WHOOP Integration Management
 * 
 * Handles WHOOP OAuth tokens, data sync status, and cached data retrieval.
 * Note: OAuth flow would typically be handled via HTTP actions in Convex,
 * but this focuses on the data management layer.
 */

/**
 * Get WHOOP integration status for the current user
 */
export const getIntegrationStatus = query({
  args: {},
  handler: async (ctx) => {
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
      // Get WHOOP integration for this user
      const integration = await ctx.db
        .query("userIntegrations")
        .withIndex("by_user_provider", (q) => 
          q.eq("userId", user._id).eq("provider", "whoop")
        )
        .unique();

      if (!integration) {
        return {
          isConnected: false,
          connectedAt: null,
          expiresAt: null,
          isExpired: false,
          scope: null,
        };
      }

      // Check if token is expired
      const now = Date.now();
      const isExpired = integration.expiresAt 
        ? integration.expiresAt < now
        : false;

      return {
        isConnected: integration.isActive && !isExpired,
        connectedAt: integration._creationTime,
        expiresAt: integration.expiresAt,
        isExpired,
        scope: integration.scope,
      };

    } catch (error) {
      console.error("Failed to fetch WHOOP integration status:", error);
      throw new ConvexError("Failed to check WHOOP integration status");
    }
  },
});

/**
 * Store or update WHOOP OAuth tokens (called after OAuth flow)
 */
export const storeTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresIn: v.optional(v.number()), // Seconds from now
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    try {
      // Calculate expires_at timestamp
      const expiresAt = args.expiresIn
        ? Date.now() + args.expiresIn * 1000
        : undefined;

      // Check if integration already exists
      const existingIntegration = await ctx.db
        .query("userIntegrations")
        .withIndex("by_user_provider", (q) => 
          q.eq("userId", user._id).eq("provider", "whoop")
        )
        .unique();

      let integrationId: string;

      if (existingIntegration) {
        // Update existing integration
        await ctx.db.patch(existingIntegration._id, {
          accessToken: args.accessToken,
          refreshToken: args.refreshToken || null,
          expiresAt: expiresAt,
          scope: args.scope || "read:workout read:recovery read:sleep read:cycles read:profile read:body_measurement offline",
          isActive: true,
          updatedAt: Date.now(),
        });
        integrationId = existingIntegration._id;
      } else {
        // Create new integration
        integrationId = await ctx.db.insert("userIntegrations", {
          userId: user._id,
          provider: "whoop",
          accessToken: args.accessToken,
          refreshToken: args.refreshToken || null,
          expiresAt: expiresAt,
          scope: args.scope || "read:workout read:recovery read:sleep read:cycles read:profile read:body_measurement offline",
          isActive: true,
          updatedAt: Date.now(),
        });
      }

      console.log('WHOOP tokens stored successfully', {
        userId: user._id,
        hasRefreshToken: !!args.refreshToken,
        expiresAt: expiresAt,
        scope: args.scope,
      });

      const savedIntegration = await ctx.db.get(integrationId);
      return savedIntegration;

    } catch (error) {
      console.error("Failed to store WHOOP tokens:", error);
      throw new ConvexError("Failed to store WHOOP tokens");
    }
  },
});

/**
 * Disconnect WHOOP integration
 */
export const disconnectIntegration = mutation({
  args: {},
  handler: async (ctx) => {
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
      // Find and deactivate the integration
      const integration = await ctx.db
        .query("userIntegrations")
        .withIndex("by_user_provider", (q) => 
          q.eq("userId", user._id).eq("provider", "whoop")
        )
        .unique();

      if (!integration) {
        throw new ConvexError("WHOOP integration not found");
      }

      await ctx.db.patch(integration._id, {
        isActive: false,
        updatedAt: Date.now(),
      });

      console.log('WHOOP integration disconnected', {
        userId: user._id,
        integrationId: integration._id,
      });

      return { success: true };

    } catch (error) {
      console.error("Failed to disconnect WHOOP integration:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to disconnect WHOOP integration");
    }
  },
});

/**
 * Get WHOOP workouts for the current user
 */
export const getWorkouts = query({
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
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    try {
      const limit = Math.min(args.limit || 50, 200); // Default 50, max 200
      const offset = args.offset || 0;

      // Get workouts ordered by start date (most recent first)
      let workouts = await ctx.db
        .query("externalWorkoutsWhoop")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();

      // Apply pagination
      workouts = workouts.slice(offset, offset + limit);

      return workouts.map(workout => ({
        _id: workout._id,
        whoopWorkoutId: workout.whoopWorkoutId,
        start: workout.start,
        end: workout.end,
        timezoneOffset: workout.timezoneOffset,
        sportName: workout.sportName,
        scoreState: workout.scoreState,
        score: workout.score,
        during: workout.during,
        zoneDuration: workout.zoneDuration,
        _creationTime: workout._creationTime,
        updatedAt: workout.updatedAt,
      }));

    } catch (error) {
      console.error("Failed to fetch WHOOP workouts:", error);
      throw new ConvexError("Failed to fetch WHOOP workouts");
    }
  },
});

/**
 * Get latest WHOOP recovery data from cached database
 */
export const getLatestRecoveryData = query({
  args: {},
  handler: async (ctx) => {
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
      // Check if user has active WHOOP integration
      const integration = await ctx.db
        .query("userIntegrations")
        .withIndex("by_user_provider", (q) => 
          q.eq("userId", user._id).eq("provider", "whoop")
        )
        .unique();

      if (!integration?.isActive) {
        throw new ConvexError("WHOOP integration not found or inactive");
      }

      // Check if token is expired
      const now = Date.now();
      const isExpired = integration.expiresAt 
        ? integration.expiresAt < now
        : false;

      if (isExpired) {
        throw new ConvexError("WHOOP access token has expired. Please reconnect your WHOOP account.");
      }

      // Get latest recovery data from database (most recent record)
      const latestRecovery = await ctx.db
        .query("whoopRecovery")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id))
        .order("desc")
        .first();
      
      // Get latest sleep data from database (most recent record)
      const latestSleep = await ctx.db
        .query("whoopSleep")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id))
        .order("desc")
        .first();
      
      if (!latestRecovery) {
        throw new ConvexError("No recovery data found. Try syncing your WHOOP data first.");
      }

      // Map database data to expected format
      return {
        recovery_score: latestRecovery.recoveryScore || null,
        sleep_performance: latestSleep?.sleepPerformancePercentage || null,
        hrv_now_ms: latestRecovery.hrvRmssdMilli || null,
        hrv_baseline_ms: latestRecovery.hrvRmssdBaseline || null,
        rhr_now_bpm: latestRecovery.restingHeartRate || null,
        rhr_baseline_bpm: latestRecovery.restingHeartRateBaseline || null,
        yesterday_strain: null, // Could be calculated from cycles table if needed
        raw_data: {
          recovery: latestRecovery.rawData,
          sleep: latestSleep?.rawData || null,
        },
      };

    } catch (error) {
      // Re-throw ConvexError as-is
      if (error instanceof ConvexError) {
        throw error;
      }
      
      console.error("Failed to fetch WHOOP recovery data from database:", error);
      throw new ConvexError("Failed to fetch WHOOP data from database");
    }
  },
});

/**
 * Get WHOOP recovery history
 */
export const getRecovery = query({
  args: {
    limit: v.optional(v.number()),
    startDate: v.optional(v.string()), // YYYY-MM-DD format
    endDate: v.optional(v.string()),   // YYYY-MM-DD format
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
      const limit = Math.min(args.limit || 30, 100); // Default 30, max 100

      // Get recovery data
      let recovery = await ctx.db
        .query("whoopRecovery")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();

      // Apply date filters if provided
      if (args.startDate || args.endDate) {
        recovery = recovery.filter(item => {
          if (args.startDate && item.date < args.startDate) return false;
          if (args.endDate && item.date > args.endDate) return false;
          return true;
        });
      }

      // Apply limit
      recovery = recovery.slice(0, limit);

      return recovery.map(item => ({
        _id: item._id,
        whoopRecoveryId: item.whoopRecoveryId,
        cycleId: item.cycleId,
        date: item.date,
        recoveryScore: item.recoveryScore,
        hrvRmssdMilli: item.hrvRmssdMilli,
        hrvRmssdBaseline: item.hrvRmssdBaseline,
        restingHeartRate: item.restingHeartRate,
        restingHeartRateBaseline: item.restingHeartRateBaseline,
        rawData: item.rawData,
        _creationTime: item._creationTime,
        webhookReceivedAt: item.webhookReceivedAt,
      }));

    } catch (error) {
      console.error("Failed to fetch WHOOP recovery data:", error);
      throw new ConvexError("Failed to fetch WHOOP recovery data");
    }
  },
});

/**
 * Get WHOOP cycles/strain data
 */
export const getCycles = query({
  args: {
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()), // Timestamp
    endDate: v.optional(v.number()),   // Timestamp
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
      const limit = Math.min(args.limit || 30, 100); // Default 30, max 100

      // Get cycles data ordered by start time
      let cycles = await ctx.db
        .query("whoopCycles")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();

      // Apply date filters if provided
      if (args.startDate || args.endDate) {
        cycles = cycles.filter(item => {
          if (args.startDate && item.start < args.startDate) return false;
          if (args.endDate && item.start > args.endDate) return false;
          return true;
        });
      }

      // Apply limit
      cycles = cycles.slice(0, limit);

      return cycles.map(item => ({
        _id: item._id,
        whoopCycleId: item.whoopCycleId,
        start: item.start,
        end: item.end,
        timezoneOffset: item.timezoneOffset,
        dayStrain: item.dayStrain,
        averageHeartRate: item.averageHeartRate,
        maxHeartRate: item.maxHeartRate,
        kilojoule: item.kilojoule,
        rawData: item.rawData,
        _creationTime: item._creationTime,
        webhookReceivedAt: item.webhookReceivedAt,
      }));

    } catch (error) {
      console.error("Failed to fetch WHOOP cycles:", error);
      throw new ConvexError("Failed to fetch WHOOP cycles");
    }
  },
});

/**
 * Get WHOOP sleep data
 */
export const getSleep = query({
  args: {
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()), // Timestamp
    endDate: v.optional(v.number()),   // Timestamp
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
      const limit = Math.min(args.limit || 30, 100); // Default 30, max 100

      // Get sleep data ordered by start time
      let sleep = await ctx.db
        .query("whoopSleep")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect();

      // Apply date filters if provided
      if (args.startDate || args.endDate) {
        sleep = sleep.filter(item => {
          if (args.startDate && item.start < args.startDate) return false;
          if (args.endDate && item.start > args.endDate) return false;
          return true;
        });
      }

      // Apply limit
      sleep = sleep.slice(0, limit);

      return sleep.map(item => ({
        _id: item._id,
        whoopSleepId: item.whoopSleepId,
        start: item.start,
        end: item.end,
        timezoneOffset: item.timezoneOffset,
        sleepPerformancePercentage: item.sleepPerformancePercentage,
        totalSleepTimeMilli: item.totalSleepTimeMilli,
        sleepEfficiencyPercentage: item.sleepEfficiencyPercentage,
        slowWaveSleepTimeMilli: item.slowWaveSleepTimeMilli,
        remSleepTimeMilli: item.remSleepTimeMilli,
        lightSleepTimeMilli: item.lightSleepTimeMilli,
        wakeTimeMilli: item.wakeTimeMilli,
        arousalTimeMilli: item.arousalTimeMilli,
        disturbanceCount: item.disturbanceCount,
        sleepLatencyMilli: item.sleepLatencyMilli,
        rawData: item.rawData,
        _creationTime: item._creationTime,
        webhookReceivedAt: item.webhookReceivedAt,
      }));

    } catch (error) {
      console.error("Failed to fetch WHOOP sleep data:", error);
      throw new ConvexError("Failed to fetch WHOOP sleep data");
    }
  },
});

/**
 * Get WHOOP profile data
 */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
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
      const profile = await ctx.db
        .query("whoopProfile")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();

      if (!profile) {
        return null;
      }

      return {
        _id: profile._id,
        whoopUserId: profile.whoopUserId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        rawData: profile.rawData,
        lastUpdated: profile.lastUpdated,
        _creationTime: profile._creationTime,
        webhookReceivedAt: profile.webhookReceivedAt,
      };

    } catch (error) {
      console.error("Failed to fetch WHOOP profile:", error);
      throw new ConvexError("Failed to fetch WHOOP profile");
    }
  },
});

/**
 * Get WHOOP body measurements
 */
export const getBodyMeasurements = query({
  args: {
    limit: v.optional(v.number()),
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
      const limit = Math.min(args.limit || 10, 50); // Default 10, max 50

      let measurements = await ctx.db
        .query("whoopBodyMeasurement")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(limit);

      return measurements.map(item => ({
        _id: item._id,
        whoopMeasurementId: item.whoopMeasurementId,
        heightMeter: item.heightMeter,
        weightKilogram: item.weightKilogram,
        maxHeartRate: item.maxHeartRate,
        measurementDate: item.measurementDate,
        rawData: item.rawData,
        _creationTime: item._creationTime,
        webhookReceivedAt: item.webhookReceivedAt,
      }));

    } catch (error) {
      console.error("Failed to fetch WHOOP body measurements:", error);
      throw new ConvexError("Failed to fetch WHOOP body measurements");
    }
  },
});

/**
 * Get webhook configuration information
 */
export const getWebhookInfo = query({
  args: {},
  handler: async (ctx) => {
    // This would typically be environment-dependent
    // In Convex, you might use environment variables or config
    const webhookUrl = process.env.WHOOP_WEBHOOK_URL || "https://your-app.convex.site/api/webhooks/whoop";

    return {
      webhookUrl,
      isConfigured: !!process.env.WHOOP_WEBHOOK_SECRET,
      supportedEvents: [
        "workout.updated",
        "recovery.updated", 
        "sleep.updated",
        "cycle.updated",
        "body_measurement.updated",
        "user_profile.updated"
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
});