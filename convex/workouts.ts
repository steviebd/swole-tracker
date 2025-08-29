import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureUser } from "./users";

/**
 * Workout Session Management Functions
 * 
 * Handles workout session CRUD operations with proper user isolation.
 * Migrated from tRPC workouts router with exercise performance tracking.
 */

// Input schemas for exercise sets and exercises
const setInputSchema = v.object({
  id: v.string(),
  weight: v.optional(v.number()),
  reps: v.optional(v.number()),
  sets: v.optional(v.number()),
  unit: v.union(v.literal("kg"), v.literal("lbs")),
  // Phase 2 additions (optional on input)
  rpe: v.optional(v.number()), // 1-10
  rest: v.optional(v.number()), // seconds
  isEstimate: v.optional(v.boolean()),
  isDefaultApplied: v.optional(v.boolean()),
});

const exerciseInputSchema = v.object({
  templateExerciseId: v.optional(v.id("templateExercises")),
  exerciseName: v.string(),
  sets: v.array(setInputSchema),
  unit: v.union(v.literal("kg"), v.literal("lbs")),
});

/**
 * Get recent workouts for the current user
 */
export const getWorkouts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const limit = args.limit ?? 10;

    // Get recent workout sessions
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // For each session, get template and exercises
    const workoutsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const template = await ctx.db.get(session.templateId);
        
        let templateExercises = [];
        if (template) {
          templateExercises = await ctx.db
            .query("templateExercises")
            .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
            .order("asc")
            .collect();
          templateExercises.sort((a, b) => a.orderIndex - b.orderIndex);
        }

        const sessionExercises = await ctx.db
          .query("sessionExercises")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
          .order("asc")
          .collect();

        return {
          ...session,
          template: template ? {
            ...template,
            exercises: templateExercises,
          } : null,
          exercises: sessionExercises,
        };
      })
    );

    return workoutsWithDetails;
  },
});

/**
 * Get a specific workout session
 */
export const getWorkout = query({
  args: { id: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    const workout = await ctx.db.get(args.id);
    if (!workout || workout.userId !== user._id) {
      throw new ConvexError("Workout not found");
    }

    // Get template with exercises
    const template = await ctx.db.get(workout.templateId);
    let templateExercises = [];
    if (template) {
      templateExercises = await ctx.db
        .query("templateExercises")
        .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
        .order("asc")
        .collect();
      templateExercises.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    // Get session exercises
    const exercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", workout._id))
      .order("asc")
      .collect();

    return {
      ...workout,
      template: template ? {
        ...template,
        exercises: templateExercises,
      } : null,
      exercises,
    };
  },
});

/**
 * Get last workout data for a specific exercise (for pre-populating)
 */
export const getLastExerciseData = query({
  args: {
    exerciseName: v.string(),
    templateId: v.optional(v.id("workoutTemplates")),
    excludeSessionId: v.optional(v.id("workoutSessions")),
    templateExerciseId: v.optional(v.id("templateExercises")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Start with the base exercise name
    let exerciseNamesToSearch = [args.exerciseName];

    // If we have a templateExerciseId, check for linked exercises
    if (args.templateExerciseId) {
      const exerciseLink = await ctx.db
        .query("exerciseLinks")
        .withIndex("by_templateExerciseId", (q) => 
          q.eq("templateExerciseId", args.templateExerciseId)
        )
        .unique();

      if (exerciseLink) {
        // Find all template exercises linked to the same master exercise
        const linkedExercises = await ctx.db
          .query("exerciseLinks")
          .withIndex("by_masterExerciseId", (q) => 
            q.eq("masterExerciseId", exerciseLink.masterExerciseId)
          )
          .collect();

        // Get all exercise names from linked template exercises
        const linkedNames = await Promise.all(
          linkedExercises.map(async (link) => {
            const templateExercise = await ctx.db.get(link.templateExerciseId);
            return templateExercise?.exerciseName;
          })
        );

        exerciseNamesToSearch = linkedNames.filter(Boolean) as string[];
      }
    }

    // Find recent sessions with any of these exercises
    const allSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50); // Check more sessions since we're looking across templates

    // Filter out excluded session if specified
    const sessions = args.excludeSessionId 
      ? allSessions.filter(s => s._id !== args.excludeSessionId)
      : allSessions;

    // Find the first session that contains any of our target exercises
    let lastSessionWithExercise = null;
    for (const session of sessions) {
      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      const hasTargetExercise = sessionExercises.some(exercise => 
        exerciseNamesToSearch.includes(exercise.exerciseName)
      );

      if (hasTargetExercise) {
        lastSessionWithExercise = {
          ...session,
          exercises: sessionExercises.filter(exercise => 
            exerciseNamesToSearch.includes(exercise.exerciseName)
          ),
        };
        break;
      }
    }

    if (!lastSessionWithExercise) {
      return null;
    }

    // Sort sets by setOrder and create response
    const lastExerciseSets = lastSessionWithExercise.exercises.sort(
      (a, b) => (a.setOrder ?? 0) - (b.setOrder ?? 0)
    );

    const sets = lastExerciseSets.map((set, index) => ({
      id: `prev-${index}`,
      weight: set.weight ?? undefined,
      reps: set.reps ?? undefined,
      sets: set.sets ?? 1,
      unit: set.unit as "kg" | "lbs",
    }));

    // Calculate best performance
    const bestWeight = Math.max(...sets.map((set) => set.weight ?? 0));
    const bestSet = sets.find((set) => set.weight === bestWeight);

    return {
      sets,
      best: bestSet ? {
        weight: bestSet.weight,
        reps: bestSet.reps,
        sets: bestSet.sets,
        unit: bestSet.unit,
      } : undefined,
    };
  },
});

/**
 * Get latest performance data for template exercise using exercise linking
 */
export const getLatestPerformanceForTemplateExercise = query({
  args: {
    templateExerciseId: v.id("templateExercises"),
    excludeSessionId: v.optional(v.id("workoutSessions")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // First, check if this template exercise is linked to a master exercise
    const exerciseLink = await ctx.db
      .query("exerciseLinks")
      .withIndex("by_templateExerciseId", (q) => 
        q.eq("templateExerciseId", args.templateExerciseId)
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();

    let templateExerciseIds = [args.templateExerciseId];

    if (exerciseLink) {
      // Get all template exercises linked to this master exercise
      const linkedExercises = await ctx.db
        .query("exerciseLinks")
        .withIndex("by_masterExerciseId", (q) => 
          q.eq("masterExerciseId", exerciseLink.masterExerciseId)
        )
        .collect();

      templateExerciseIds = linkedExercises.map(link => link.templateExerciseId);
    }

    // Find the most recent workout that contains any linked exercise
    const allSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    // Filter out excluded session if specified
    const sessions = args.excludeSessionId 
      ? allSessions.filter(s => s._id !== args.excludeSessionId)
      : allSessions;

    let latestPerformance = null;
    let latestWorkoutDate = 0;

    for (const session of sessions) {
      if (session.workoutDate <= latestWorkoutDate) {
        continue; // Skip older sessions
      }

      const sessionExercises = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", session._id))
        .collect();

      // Find exercises that match our template exercise IDs
      const matchingExercises = sessionExercises.filter(exercise => 
        exercise.templateExerciseId && 
        templateExerciseIds.includes(exercise.templateExerciseId)
      );

      if (matchingExercises.length > 0) {
        // Get the highest weight set from this session
        const bestSet = matchingExercises.reduce((best, current) => {
          const currentWeight = current.weight ?? 0;
          const bestWeight = best?.weight ?? 0;
          return currentWeight > bestWeight ? current : best;
        }, matchingExercises[0]);

        if (bestSet) {
          latestPerformance = {
            weight: bestSet.weight,
            reps: bestSet.reps,
            sets: bestSet.sets,
            unit: bestSet.unit,
            workoutDate: session.workoutDate,
          };
          latestWorkoutDate = session.workoutDate;
          break; // Found the most recent, we can stop
        }
      }
    }

    return latestPerformance;
  },
});

/**
 * Start a new workout session
 */
export const createWorkout = mutation({
  args: {
    templateId: v.id("workoutTemplates"),
    workoutDate: v.optional(v.number()), // timestamp in milliseconds
    // Phase 3 telemetry (optional on start)
    themeUsed: v.optional(v.string()),
    deviceType: v.optional(v.union(
      v.literal("android"), 
      v.literal("ios"), 
      v.literal("desktop"), 
      v.literal("ipad"), 
      v.literal("other")
    )),
    perfMetrics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);
    const workoutDate = args.workoutDate ?? Date.now();

    // Check for recent duplicate session (within last 2 minutes)
    const twoMinutesAgo = Date.now() - 120000;
    const recentSessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => 
        q.and(
          q.eq(q.field("templateId"), args.templateId),
          q.gt(q.field("workoutDate"), twoMinutesAgo)
        )
      )
      .order("desc")
      .take(1);

    // If we found a recent session with no exercises, return it
    if (recentSessions.length > 0) {
      const recentSession = recentSessions[0];
      const exerciseCount = await ctx.db
        .query("sessionExercises")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", recentSession._id))
        .collect();

      if (exerciseCount.length === 0) {
        // Get template for response
        const template = await ctx.db.get(args.templateId);
        let templateExercises = [];
        if (template) {
          templateExercises = await ctx.db
            .query("templateExercises")
            .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
            .order("asc")
            .collect();
          templateExercises.sort((a, b) => a.orderIndex - b.orderIndex);
        }

        return {
          sessionId: recentSession._id,
          template: template ? {
            ...template,
            exercises: templateExercises,
          } : null,
        };
      }
    }

    // Verify template ownership
    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id) {
      throw new ConvexError("Template not found");
    }

    // Get template exercises
    const templateExercises = await ctx.db
      .query("templateExercises")
      .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
      .order("asc")
      .collect();
    templateExercises.sort((a, b) => a.orderIndex - b.orderIndex);

    // Create workout session
    const sessionId = await ctx.db.insert("workoutSessions", {
      userId: user._id,
      templateId: args.templateId,
      workoutDate,
      // Phase 3 persistence
      themeUsed: args.themeUsed,
      deviceType: args.deviceType,
      perfMetrics: args.perfMetrics,
      updatedAt: Date.now(),
    });

    return {
      sessionId,
      template: {
        ...template,
        exercises: templateExercises,
      },
    };
  },
});

/**
 * Save workout session with exercises
 */
export const updateWorkout = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    exercises: v.array(exerciseInputSchema),
    // Phase 3 telemetry on save (optional updates)
    themeUsed: v.optional(v.string()),
    deviceType: v.optional(v.union(
      v.literal("android"), 
      v.literal("ios"), 
      v.literal("desktop"), 
      v.literal("ipad"), 
      v.literal("other")
    )),
    perfMetrics: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new ConvexError("Workout session not found");
    }

    // Update session telemetry fields if provided
    const updateFields: any = { updatedAt: Date.now() };
    if (args.themeUsed !== undefined) updateFields.themeUsed = args.themeUsed;
    if (args.deviceType !== undefined) updateFields.deviceType = args.deviceType;
    if (args.perfMetrics !== undefined) updateFields.perfMetrics = args.perfMetrics;

    await ctx.db.patch(args.sessionId, updateFields);

    // Delete existing exercises for this session
    const existingExercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const exercise of existingExercises) {
      await ctx.db.delete(exercise._id);
    }

    // Flatten exercises into individual sets and filter out empty ones
    const setsToInsert = args.exercises.flatMap((exercise) =>
      exercise.sets
        .filter((set) =>
          set.weight !== undefined ||
          set.reps !== undefined ||
          set.sets !== undefined ||
          set.rpe !== undefined ||
          set.rest !== undefined
        )
        .map((set, setIndex) => ({
          userId: user._id,
          sessionId: args.sessionId,
          templateExerciseId: exercise.templateExerciseId,
          exerciseName: exercise.exerciseName,
          setOrder: setIndex,
          weight: set.weight,
          reps: set.reps,
          sets: set.sets ?? 1,
          unit: set.unit,
          // Phase 2 mappings
          rpe: set.rpe,
          restSeconds: set.rest,
          isEstimate: set.isEstimate ?? false,
          isDefaultApplied: set.isDefaultApplied ?? false,
        }))
    );

    // Insert new sets
    for (const set of setsToInsert) {
      await ctx.db.insert("sessionExercises", set);
    }

    return { success: true };
  },
});

/**
 * Update specific sets in a workout session (for accepting AI suggestions)
 */
export const updateSessionSets = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    updates: v.array(v.object({
      setId: v.string(), // Format: "{templateExerciseId}_{setIndex}"
      exerciseName: v.string(),
      setIndex: v.optional(v.number()), // 0-based index for direct targeting
      weight: v.optional(v.number()),
      reps: v.optional(v.number()),
      unit: v.union(v.literal("kg"), v.literal("lbs")),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new ConvexError("Workout session not found");
    }

    // Get all exercises for this session
    const sessionExercises = await ctx.db
      .query("sessionExercises")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();

    let updatedCount = 0;

    // Apply updates to session exercises
    for (const update of args.updates) {
      let setIndex: number;

      // Use setIndex if provided, otherwise parse from setId
      if (update.setIndex !== undefined) {
        setIndex = update.setIndex;
      } else {
        // Legacy parsing for old setId format
        const setIdMatch = /_set_(\d+)$/.exec(update.setId);
        if (!setIdMatch?.[1]) {
          continue; // Skip invalid setId format
        }
        setIndex = parseInt(setIdMatch[1]) - 1; // Convert to 0-based index
      }

      // Find exercises matching the exercise name
      const exerciseMatches = sessionExercises.filter(
        (ex) => ex.exerciseName === update.exerciseName
      );

      // Find the specific set by index within the exercise
      if (setIndex >= 0 && setIndex < exerciseMatches.length) {
        const targetExercise = exerciseMatches[setIndex];

        if (targetExercise) {
          // Update the existing set
          const updateFields: any = {};
          if (update.weight !== undefined) updateFields.weight = update.weight;
          if (update.reps !== undefined) updateFields.reps = update.reps;
          if (update.unit !== undefined) updateFields.unit = update.unit;

          await ctx.db.patch(targetExercise._id, updateFields);
          updatedCount++;
        }
      }
    }

    return { success: true, updatedCount };
  },
});

/**
 * Delete a workout session
 */
export const deleteWorkout = mutation({
  args: { id: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ensureUser(ctx, identity);

    // Verify ownership before deleting
    const existingSession = await ctx.db.get(args.id);
    if (!existingSession || existingSession.userId !== user._id) {
      throw new ConvexError("Workout session not found");
    }

    // Delete the session (exercises will be deleted by cascade)
    await ctx.db.delete(args.id);

    return { success: true };
  },
});