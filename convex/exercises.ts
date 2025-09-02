import { ConvexError, v } from "convex/values";
import { ensureUser } from "./users";
import { mutation, query } from "./_generated/server";

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
 * Exercise Management Functions
 * 
 * Handles master exercise creation, fuzzy matching, and linking between template exercises
 * and master exercises. Provides search functionality and exercise management tools.
 * 
 * Key Features:
 * - Master exercise creation and management
 * - Fuzzy matching with similarity scoring
 * - Linking template exercises to master exercises
 * - Exercise search and filtering
 * - Performance data retrieval
 * - Bulk operations for linking/unlinking
 */

// Utility function to normalize exercise names for fuzzy matching
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

// Fuzzy matching utility - simple similarity score
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1,
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * Deterministic, indexed search for master exercises (prefix/substring)
 */
export const searchMaster = query({
  args: {
    q: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;
    const normalized = normalizeExerciseName(args.q);
    const limit = args.limit ?? 20;
    const cursor = args.cursor ?? 0;

    if (!normalized) {
      return { items: [], nextCursor: null as number | null };
    }

    // First, get prefix matches (exercises starting with the query)
    const prefixMatches = await ctx.db
      .query("masterExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => 
        q.gte(q.field("normalizedName"), normalized) &&
        q.lt(q.field("normalizedName"), normalized + "\uFFFF")
      )
      .order("asc")
      .take(limit);

    // If we have enough prefix matches, return them
    if (prefixMatches.length >= limit) {
      const paginatedResults = prefixMatches.slice(cursor, cursor + limit);
      const nextCursor = paginatedResults.length === limit ? cursor + limit : null;
      return { 
        items: paginatedResults.map(ex => ({
          id: ex._id,
          name: ex.name,
          normalizedName: ex.normalizedName,
          createdAt: ex._creationTime,
        })),
        nextCursor 
      };
    }

    // Otherwise, get all exercises and filter for contains matches
    const allExercises = await ctx.db
      .query("masterExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();

    const containsMatches = allExercises.filter(ex => 
      ex.normalizedName.includes(normalized) && 
      !ex.normalizedName.startsWith(normalized) // exclude prefix matches we already have
    );

    // Combine and sort
    const allMatches = [...prefixMatches, ...containsMatches];
    const paginatedResults = allMatches.slice(cursor, cursor + limit);
    const nextCursor = paginatedResults.length === limit ? cursor + limit : null;

    return { 
      items: paginatedResults.map(ex => ({
        id: ex._id,
        name: ex.name,
        normalizedName: ex.normalizedName,
        createdAt: ex._creationTime,
      })),
      nextCursor 
    };
  },
});

/**
 * Find similar exercises for linking suggestions
 */
export const findSimilar = query({
  args: {
    exerciseName: v.string(),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;
    const threshold = args.threshold ?? 0.6;
    const normalizedInput = normalizeExerciseName(args.exerciseName);

    const allExercises = await ctx.db
      .query("masterExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();

    const similarExercises = allExercises
      .map((exercise) => ({
        ...exercise,
        similarity: calculateSimilarity(normalizedInput, exercise.normalizedName),
      }))
      .filter((exercise) => exercise.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return similarExercises;
  },
});

/**
 * Get all master exercises for management
 */
export const getAllMaster = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    const exercises = await ctx.db
      .query("masterExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("asc")
      .collect();

    // Get linked count for each exercise
    const exercisesWithLinks = await Promise.all(
      exercises.map(async (exercise) => {
        const linkedCount = await ctx.db
          .query("exerciseLinks")
          .withIndex("by_masterExerciseId", (q: any) => q.eq("masterExerciseId", exercise._id))
          .collect();
        
        return {
          id: exercise._id,
          name: exercise.name,
          normalizedName: exercise.normalizedName,
          createdAt: exercise._creationTime,
          linkedCount: linkedCount.length,
        };
      })
    );

    return exercisesWithLinks;
  },
});

/**
 * Create or get master exercise
 */
export const createOrGetMaster = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;
    const normalizedName = normalizeExerciseName(args.name);

    // Try to find existing master exercise
    const existing = await ctx.db
      .query("masterExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("normalizedName"), normalizedName))
      .unique();

    if (existing) {
      return existing;
    }

    // Create new master exercise
    const masterExerciseId = await ctx.db.insert("masterExercises", {
      userId: userId,
      name: args.name,
      normalizedName,
      updatedAt: Date.now(),
    });

    const created = await ctx.db.get(masterExerciseId);
    if (!created) {
      throw new ConvexError("Failed to create master exercise");
    }

    return created;
  },
});

/**
 * Link template exercise to master exercise
 */
export const linkToMaster = mutation({
  args: {
    templateExerciseId: v.id("templateExercises"),
    masterExerciseId: v.id("masterExercises"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Verify the template exercise belongs to the user
    const templateExercise = await ctx.db.get(args.templateExerciseId);
    if (!templateExercise || templateExercise.userId !== userId) {
      throw new ConvexError("Template exercise not found");
    }

    // Verify the master exercise belongs to the user
    const masterExercise = await ctx.db.get(args.masterExerciseId);
    if (!masterExercise || masterExercise.userId !== userId) {
      throw new ConvexError("Master exercise not found");
    }

    // Check if link already exists
    const existingLink = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_templateExerciseId", (q: any) => q.eq("templateExerciseId", args.templateExerciseId))
      .unique();

    if (existingLink) {
      // Update existing link
      await ctx.db.patch(existingLink._id, {
        masterExerciseId: args.masterExerciseId,
      });
      return existingLink;
    }

    // Create new link
    const linkId = await ctx.db.insert("exerciseLinks", {
      templateExerciseId: args.templateExerciseId,
      masterExerciseId: args.masterExerciseId,
      userId: userId,
    });

    return await ctx.db.get(linkId);
  },
});

/**
 * Unlink template exercise from master exercise
 */
export const unlink = mutation({
  args: {
    templateExerciseId: v.id("templateExercises"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Find the link
    const link = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_templateExerciseId", (q: any) => q.eq("templateExerciseId", args.templateExerciseId))
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .unique();

    if (link) {
      await ctx.db.delete(link._id);
    }

    return { success: true };
  },
});

/**
 * Get latest performance data for a master exercise
 */
export const getLatestPerformance = query({
  args: {
    masterExerciseId: v.id("masterExercises"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Find all template exercises linked to this master exercise
    const linkedExercises = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_masterExerciseId", (q: any) => q.eq("masterExerciseId", args.masterExerciseId))
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();

    if (linkedExercises.length === 0) {
      return null;
    }

    const templateExerciseIds = linkedExercises.map(link => link.templateExerciseId);

    // Get the most recent session exercise from any linked template exercise
    const sessionExercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => 
        templateExerciseIds.some(id => q.eq(q.field("templateExerciseId"), id))
      )
      .collect();

    if (sessionExercises.length === 0) {
      return null;
    }

    // Get session details and find the most recent one
    const sessionExercisesWithDates = await Promise.all(
      sessionExercises.map(async (sessionEx) => {
        const session = await ctx.db.get(sessionEx.sessionId);
        return {
          ...sessionEx,
          workoutDate: session?.workoutDate,
        };
      })
    );

    const sortedByDate = sessionExercisesWithDates
      .filter(se => se.workoutDate)
      .sort((a, b) => (b.workoutDate! - a.workoutDate!));

    const latest = sortedByDate[0];
    if (!latest) {
      return null;
    }

    return {
      weight: latest.weight,
      reps: latest.reps,
      sets: latest.sets,
      unit: latest.unit,
      workoutDate: latest.workoutDate,
    };
  },
});

/**
 * Get exercise links for a template
 */
export const getLinksForTemplate = query({
  args: {
    templateId: v.id("workoutTemplates"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Get all template exercises for this template
    const templateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q: any) => q.eq("templateId", args.templateId))
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .order("asc") // ordered by orderIndex
      .collect();

    // Get links and master exercise details for each template exercise
    const links = await Promise.all(
      templateExercises.map(async (templateEx) => {
        const link = await ctx.db
          .query("exerciseLinks")
          .withIndex("by_templateExerciseId", (q: any) => q.eq("templateExerciseId", templateEx._id))
          .unique();

        let masterExerciseName = null;
        let masterExerciseId = null;
        let isLinked = false;

        if (link) {
          const masterExercise = await ctx.db.get(link.masterExerciseId);
          if (masterExercise) {
            masterExerciseName = masterExercise.name;
            masterExerciseId = masterExercise._id;
            isLinked = true;
          }
        }

        return {
          templateExerciseId: templateEx._id,
          exerciseName: templateEx.exerciseName,
          masterExerciseId,
          masterExerciseName,
          isLinked,
        };
      })
    );

    return links;
  },
});

/**
 * Check if a template exercise has linking rejected
 */
export const isLinkingRejected = query({
  args: {
    templateExerciseId: v.id("templateExercises"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    const templateExercise = await ctx.db.get(args.templateExerciseId);
    if (!templateExercise || templateExercise.userId !== userId) {
      throw new ConvexError("Template exercise not found");
    }

    return templateExercise.linkingRejected;
  },
});

/**
 * Mark template exercise as linking rejected (user chose not to link)
 */
export const rejectLinking = mutation({
  args: {
    templateExerciseId: v.id("templateExercises"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Verify the template exercise belongs to the user
    const templateExercise = await ctx.db.get(args.templateExerciseId);
    if (!templateExercise || templateExercise.userId !== userId) {
      throw new ConvexError("Template exercise not found");
    }

    // Mark as linking rejected
    await ctx.db.patch(args.templateExerciseId, {
      linkingRejected: true,
    });

    return { success: true };
  },
});

/**
 * Get detailed linking information for a master exercise
 */
export const getLinkingDetails = query({
  args: {
    masterExerciseId: v.id("masterExercises"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Get master exercise
    const masterExercise = await ctx.db.get(args.masterExerciseId);
    if (!masterExercise || masterExercise.userId !== userId) {
      throw new ConvexError("Master exercise not found");
    }

    // Get all template exercises linked to this master exercise
    const links = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_masterExerciseId", (q: any) => q.eq("masterExerciseId", args.masterExerciseId))
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();

    const linkedExercises = await Promise.all(
      links.map(async (link: any) => {
        const templateExercise = await ctx.db.get(link.templateExerciseId);
        const template = templateExercise && 'templateId' in templateExercise ? await ctx.db.get(templateExercise.templateId as any) : null;
        
        return {
          templateExerciseId: link.templateExerciseId,
          exerciseName: templateExercise && 'exerciseName' in templateExercise ? templateExercise.exerciseName : "Unknown",
          templateId: templateExercise && 'templateId' in templateExercise ? templateExercise.templateId : null,
          templateName: template && 'name' in template ? template.name : "Unknown",
        };
      })
    );

    // Get all unlinked template exercises for potential linking
    const allTemplateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();

    const linkedTemplateExerciseIds = new Set(links.map(link => link.templateExerciseId));
    
    const unlinkedExercises = await Promise.all(
      allTemplateExercises
        .filter(templateEx => !linkedTemplateExerciseIds.has(templateEx._id))
        .map(async (templateEx) => {
          const template = await ctx.db.get(templateEx.templateId);
          const exerciseNormalizedName = normalizeExerciseName(templateEx.exerciseName);
          const similarity = calculateSimilarity(masterExercise.normalizedName, exerciseNormalizedName);

          return {
            templateExerciseId: templateEx._id,
            exerciseName: templateEx.exerciseName,
            templateId: templateEx.templateId,
            templateName: template && 'name' in template ? template.name : "Unknown",
            linkingRejected: templateEx.linkingRejected,
            similarity,
          };
        })
    );

    // Sort potential links by similarity descending
    const potentialLinks = unlinkedExercises.sort((a, b) => b.similarity - a.similarity);

    return {
      linkedExercises,
      potentialLinks,
      masterExerciseName: masterExercise.name,
    };
  },
});

/**
 * Bulk link similar exercises
 */
export const bulkLinkSimilar = mutation({
  args: {
    masterExerciseId: v.id("masterExercises"),
    minimumSimilarity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;
    const minimumSimilarity = args.minimumSimilarity ?? 0.7;

    const masterExercise = await ctx.db.get(args.masterExerciseId);
    if (!masterExercise || masterExercise.userId !== userId) {
      throw new ConvexError("Master exercise not found");
    }

    // Get unlinked exercises
    const allTemplateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("linkingRejected"), false))
      .collect();

    // Get already linked template exercise IDs
    const existingLinks = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();

    const linkedTemplateExerciseIds = new Set(existingLinks.map(link => link.templateExerciseId));

    let linkedCount = 0;
    const masterNormalizedName = masterExercise.normalizedName;

    for (const templateExercise of allTemplateExercises) {
      if (linkedTemplateExerciseIds.has(templateExercise._id)) {
        continue; // Skip already linked exercises
      }

      const exerciseNormalizedName = normalizeExerciseName(templateExercise.exerciseName);
      const similarity = calculateSimilarity(masterNormalizedName, exerciseNormalizedName);

      if (similarity >= minimumSimilarity) {
        await ctx.db.insert("exerciseLinks", {
          templateExerciseId: templateExercise._id,
          masterExerciseId: args.masterExerciseId,
          userId: userId,
        });
        linkedCount++;
      }
    }

    return { linkedCount };
  },
});

/**
 * Bulk unlink all exercises from master exercise
 */
export const bulkUnlinkAll = mutation({
  args: {
    masterExerciseId: v.id("masterExercises"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Get all links for this master exercise
    const links = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_masterExerciseId", (q: any) => q.eq("masterExerciseId", args.masterExerciseId))
      .filter((q: any) => q.eq(q.field("userId"), userId))
      .collect();

    // Delete all links
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    return { unlinkedCount: links.length };
  },
});

/**
 * Migrate existing template exercises to master exercises (one-time setup)
 */
export const migrateExistingExercises = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const userId = user._id;

    // Get all template exercises for the user that don't have links
    const allTemplateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();

    const existingLinks = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();

    const linkedTemplateExerciseIds = new Set(existingLinks.map(link => link.templateExerciseId));
    const unlinkedExercises = allTemplateExercises.filter(ex => !linkedTemplateExerciseIds.has(ex._id));

    let createdMasterExercises = 0;
    let createdLinks = 0;

    for (const templateExercise of unlinkedExercises) {
      const normalizedName = normalizeExerciseName(templateExercise.exerciseName);

      // Try to find existing master exercise
      const existing = await ctx.db
        .query("masterExercises")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("normalizedName"), normalizedName))
        .unique();

      let masterExerciseId;

      if (existing) {
        masterExerciseId = existing._id;
      } else {
        // Create new master exercise
        masterExerciseId = await ctx.db.insert("masterExercises", {
          userId: userId,
          name: templateExercise.exerciseName,
          normalizedName,
          updatedAt: Date.now(),
        });
        createdMasterExercises++;
      }

      // Create the link
      await ctx.db.insert("exerciseLinks", {
        templateExerciseId: templateExercise._id,
        masterExerciseId,
        userId: userId,
      });

      createdLinks++;
    }

    return {
      migratedExercises: unlinkedExercises.length,
      createdMasterExercises,
      createdLinks,
    };
  },
});