import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureUser } from "./users";

/**
 * User Preferences Management Functions
 * 
 * Handles user preference CRUD operations with proper user isolation.
 * Migrated from tRPC preferences router.
 */

// Schema for unit preferences
const unitPreferenceSchema = v.union(v.literal("kg"), v.literal("lbs"));

// Schema for progression types
const progressionTypeSchema = v.union(
  v.literal("linear"), 
  v.literal("percentage"), 
  v.literal("adaptive")
);

// Schema for swipe actions  
const swipeActionSchema = v.union(
  v.literal("collapse_expand"), 
  v.literal("none")
);

/**
 * Get user preferences
 */
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    // Return full preferences row when found, otherwise return default shape
    if (prefs) {
      return {
        defaultWeightUnit: prefs.defaultWeightUnit,
        predictiveDefaultsEnabled: prefs.predictiveDefaultsEnabled,
        rightSwipeAction: prefs.rightSwipeAction,
        enableManualWellness: prefs.enableManualWellness,
        progressionType: prefs.progressionType,
        linearProgressionKg: prefs.linearProgressionKg,
        percentageProgression: prefs.percentageProgression,
        updatedAt: prefs.updatedAt,
      };
    }

    // Return default preferences
    return {
      defaultWeightUnit: "kg" as const,
      predictiveDefaultsEnabled: false,
      rightSwipeAction: "collapse_expand" as const,
      enableManualWellness: false,
      progressionType: "adaptive" as const,
      linearProgressionKg: 2.5,
      percentageProgression: 2.5,
      updatedAt: Date.now(),
    };
  },
});

/**
 * Update user preferences
 */
export const updatePreferences = mutation({
  args: {
    input: v.union(
      unitPreferenceSchema,
      v.object({
        defaultWeightUnit: v.optional(unitPreferenceSchema),
        predictiveDefaultsEnabled: v.optional(v.boolean()),
        rightSwipeAction: v.optional(swipeActionSchema),
        enableManualWellness: v.optional(v.boolean()),
        progressionType: v.optional(progressionTypeSchema),
        linearProgressionKg: v.optional(v.number()),
        percentageProgression: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Normalize input - convert string to object if needed
    let input;
    if (typeof args.input === "string") {
      input = { defaultWeightUnit: args.input };
    } else {
      input = args.input;
    }

    // Load existing preferences (if any)
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    // Build update patch - only include provided fields
    const patch: any = { updatedAt: Date.now() };

    if (input.defaultWeightUnit !== undefined) {
      patch.defaultWeightUnit = input.defaultWeightUnit;
    }
    if (input.predictiveDefaultsEnabled !== undefined) {
      patch.predictiveDefaultsEnabled = input.predictiveDefaultsEnabled;
    }
    if (input.rightSwipeAction !== undefined) {
      patch.rightSwipeAction = input.rightSwipeAction;
    }
    if (input.enableManualWellness !== undefined) {
      patch.enableManualWellness = input.enableManualWellness;
    }
    if (input.progressionType !== undefined) {
      patch.progressionType = input.progressionType;
    }
    if (input.linearProgressionKg !== undefined) {
      patch.linearProgressionKg = input.linearProgressionKg;
    }
    if (input.percentageProgression !== undefined) {
      patch.percentageProgression = input.percentageProgression;
    }

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, patch);
    } else {
      // Create new preferences with safe defaults, then apply provided fields
      await ctx.db.insert("userPreferences", {
        userId: user._id,
        defaultWeightUnit: input.defaultWeightUnit ?? "kg",
        predictiveDefaultsEnabled: input.predictiveDefaultsEnabled ?? false,
        rightSwipeAction: input.rightSwipeAction ?? "collapse_expand",
        enableManualWellness: input.enableManualWellness ?? false,
        progressionType: input.progressionType ?? "adaptive",
        linearProgressionKg: input.linearProgressionKg ?? 2.5,
        percentageProgression: input.percentageProgression ?? 2.5,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});