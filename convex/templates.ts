import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureUser } from "./users";

/**
 * Template Management Functions with proper authentication
 */

/**
 * Helper function to get current authenticated user
 */
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  
  return await ensureUser(ctx, identity);
}

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
  userId: any,
  exerciseName: string,
  templateExerciseId: any,
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
    .withIndex("by_user_normalized", (q: any) => 
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
    .withIndex("by_templateExerciseId", (q: any) => 
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
    const userId = user._id;

    // Get templates with exercises
    const templates = await ctx.db
      .query("workoutTemplates")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // For each template, get its exercises
    const templatesWithExercises = await Promise.all(
      templates.map(async (template) => {
        const exercises = await ctx.db
          .query("templateExercises")
          .withIndex("by_templateId", (q: any) => q.eq("templateId", template._id))
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
    // Get authenticated user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const userId = user._id;

    const template = await ctx.db.get(args.id);
    if (!template || template.userId !== userId) {
      throw new ConvexError("Template not found");
    }

    // Get exercises for this template
    const exercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q: any) => q.eq("templateId", template._id))
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
 * Create a new template - authenticated
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

    // Basic validation
    if (!args.name || args.name.trim().length === 0) {
      throw new ConvexError("Template name is required");
    }

    // Create template
    const templateId = await ctx.db.insert("workoutTemplates", {
      name: args.name.trim(),
      userId: user._id,
      updatedAt: Date.now(),
    });

    // Create exercises
    for (let i = 0; i < args.exercises.length; i++) {
      const exerciseName = args.exercises[i];
      if (exerciseName && exerciseName.trim()) {
        await ctx.db.insert("templateExercises", {
          userId: user._id,
          templateId: templateId,
          exerciseName: exerciseName.trim(),
          orderIndex: i,
          linkingRejected: false,
        });
      }
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
    const user = await getCurrentUser(ctx);
    const userId = user._id;

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
    if (!existingTemplate || existingTemplate.userId !== userId) {
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
      .withIndex("by_templateId", (q: any) => q.eq("templateId", args.id))
      .collect();

    for (const exercise of existingExercises) {
      await ctx.db.delete(exercise._id);
    }

    // Insert new exercises and create master exercise links
    if (args.exercises.length > 0) {
      const exercisePromises = args.exercises.map(async (exerciseName, index) => {
        const exerciseId = await ctx.db.insert("templateExercises", {
          userId: userId,
          templateId: args.id,
          exerciseName,
          orderIndex: index,
          linkingRejected: false,
        });

        // Create master exercise and link
        await createAndLinkMasterExercise(
          ctx,
          userId,
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
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Verify ownership
    const existingTemplate = await ctx.db.get(args.id);
    if (!existingTemplate || existingTemplate.userId !== userId) {
      throw new ConvexError("Template not found");
    }

    // Delete the template (exercises will be deleted by cascade in Convex schema)
    await ctx.db.delete(args.id);

    return { success: true };
  },
});
