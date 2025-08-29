import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureUser } from "./users";

/**
 * Template Management Functions
 * 
 * Handles workout template CRUD operations with proper user isolation.
 * Migrated from tRPC templates router with exercise linking logic.
 */

/**
 * Utility function to normalize exercise names for fuzzy matching
 */
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Helper function to create or get master exercise and link it to template exercise
 */
async function createAndLinkMasterExercise(
  ctx: any,
  userId: string,
  exerciseName: string,
  templateExerciseId: string,
  linkingRejected = false,
) {
  // Don't create links if user has rejected linking
  if (linkingRejected) {
    return null;
  }

  const normalizedName = normalizeExerciseName(exerciseName);

  // Try to find existing master exercise
  const existing = await ctx.db
    .query("masterExercises")
    .withIndex("by_user_normalized", (q) => 
      q.eq("userId", userId).eq("normalizedName", normalizedName)
    )
    .unique();

  let masterExercise;

  if (existing) {
    masterExercise = existing;
  } else {
    // Create new master exercise
    const masterExerciseId = await ctx.db.insert("masterExercises", {
      userId,
      name: exerciseName,
      normalizedName,
      updatedAt: Date.now(),
    });

    masterExercise = await ctx.db.get(masterExerciseId);
  }

  if (!masterExercise) {
    return null;
  }

  // Check if link already exists
  const existingLink = await ctx.db
    .query("exerciseLinks")
    .withIndex("by_templateExerciseId", (q) => 
      q.eq("templateExerciseId", templateExerciseId)
    )
    .unique();

  if (!existingLink) {
    // Create the link
    await ctx.db.insert("exerciseLinks", {
      templateExerciseId,
      masterExerciseId: masterExercise._id,
      userId,
    });
  } else {
    // Update existing link to point to current master exercise
    await ctx.db.patch(existingLink._id, {
      masterExerciseId: masterExercise._id,
    });
  }

  return masterExercise;
}

/**
 * Get all templates for the current user
 */
export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Get templates with exercises
    const templates = await ctx.db
      .query("workoutTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // For each template, get its exercises
    const templatesWithExercises = await Promise.all(
      templates.map(async (template) => {
        const exercises = await ctx.db
          .query("templateExercises")
          .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
          .order("asc")
          .collect();

        // Sort exercises by orderIndex
        exercises.sort((a, b) => a.orderIndex - b.orderIndex);

        return {
          ...template,
          exercises,
        };
      })
    );

    return templatesWithExercises;
  },
});

/**
 * Get a single template by ID
 */
export const getTemplate = query({
  args: { id: v.id("workoutTemplates") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    const template = await ctx.db.get(args.id);
    if (!template || template.userId !== user._id) {
      throw new ConvexError("Template not found");
    }

    // Get exercises for this template
    const exercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
      .order("asc")
      .collect();

    // Sort exercises by orderIndex
    exercises.sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      ...template,
      exercises,
    };
  },
});

/**
 * Create a new template
 */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    exercises: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Validate input
    if (!args.name || args.name.length === 0 || args.name.length > 256) {
      throw new ConvexError("Template name must be between 1 and 256 characters");
    }

    for (const exercise of args.exercises) {
      if (!exercise || exercise.length === 0 || exercise.length > 256) {
        throw new ConvexError("Exercise names must be between 1 and 256 characters");
      }
    }

    // Check for recent duplicate template (prevent double-clicks)
    const recentTemplate = await ctx.db
      .query("workoutTemplates")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("name"), args.name))
      .order("desc")
      .first();

    if (recentTemplate) {
      const timeDiff = Date.now() - recentTemplate._creationTime;
      if (timeDiff < 5000) { // 5 seconds
        return recentTemplate._id;
      }
    }

    // Create template
    const templateId = await ctx.db.insert("workoutTemplates", {
      name: args.name,
      userId: user._id,
      updatedAt: Date.now(),
    });

    // Create exercises if provided
    if (args.exercises.length > 0) {
      const exercisePromises = args.exercises.map(async (exerciseName, index) => {
        const exerciseId = await ctx.db.insert("templateExercises", {
          userId: user._id,
          templateId,
          exerciseName,
          orderIndex: index,
          linkingRejected: false,
        });

        // Create master exercise and link
        await createAndLinkMasterExercise(
          ctx,
          user._id,
          exerciseName,
          exerciseId,
          false
        );

        return exerciseId;
      });

      await Promise.all(exercisePromises);
    }

    return templateId;
  },
});

/**
 * Update a template
 */
export const updateTemplate = mutation({
  args: {
    id: v.id("workoutTemplates"),
    name: v.string(),
    exercises: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Validate input
    if (!args.name || args.name.length === 0 || args.name.length > 256) {
      throw new ConvexError("Template name must be between 1 and 256 characters");
    }

    for (const exercise of args.exercises) {
      if (!exercise || exercise.length === 0 || exercise.length > 256) {
        throw new ConvexError("Exercise names must be between 1 and 256 characters");
      }
    }

    // Verify ownership
    const existingTemplate = await ctx.db.get(args.id);
    if (!existingTemplate || existingTemplate.userId !== user._id) {
      throw new ConvexError("Template not found");
    }

    // Update template name and timestamp
    await ctx.db.patch(args.id, {
      name: args.name,
      updatedAt: Date.now(),
    });

    // Delete existing exercises
    const existingExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q) => q.eq("templateId", args.id))
      .collect();

    for (const exercise of existingExercises) {
      await ctx.db.delete(exercise._id);
    }

    // Insert new exercises and create master exercise links
    if (args.exercises.length > 0) {
      const exercisePromises = args.exercises.map(async (exerciseName, index) => {
        const exerciseId = await ctx.db.insert("templateExercises", {
          userId: user._id,
          templateId: args.id,
          exerciseName,
          orderIndex: index,
          linkingRejected: false,
        });

        // Create master exercise and link
        await createAndLinkMasterExercise(
          ctx,
          user._id,
          exerciseName,
          exerciseId,
          false
        );

        return exerciseId;
      });

      await Promise.all(exercisePromises);
    }

    return { success: true };
  },
});

/**
 * Delete a template
 */
export const deleteTemplate = mutation({
  args: { id: v.id("workoutTemplates") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Verify ownership
    const existingTemplate = await ctx.db.get(args.id);
    if (!existingTemplate || existingTemplate.userId !== user._id) {
      throw new ConvexError("Template not found");
    }

    // Delete the template (exercises will be deleted by cascade in Convex schema)
    await ctx.db.delete(args.id);

    return { success: true };
  },
});