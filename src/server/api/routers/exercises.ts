import { z } from "zod";
import { eq, and, sql, desc, ilike, inArray } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { 
  masterExercises, 
  exerciseLinks, 
  templateExercises, 
  sessionExercises, 
  workoutSessions 
} from "~/server/db/schema";

// Utility function to normalize exercise names for fuzzy matching
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
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
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }
  
  return matrix[str2.length]![str1.length]!;
}

export const exercisesRouter = createTRPCRouter({
  // Find similar exercises for linking suggestions
  findSimilar: protectedProcedure
    .input(z.object({
      exerciseName: z.string(),
      threshold: z.number().min(0).max(1).default(0.6),
    }))
    .query(async ({ ctx, input }) => {
      const normalizedInput = normalizeExerciseName(input.exerciseName);
      
      // Get all master exercises for the user
      const allExercises = await ctx.db
        .select()
        .from(masterExercises)
        .where(eq(masterExercises.user_id, ctx.user.id));
      
      // Calculate similarity scores and filter
      const similarExercises = allExercises
        .map((exercise) => ({
          ...exercise,
          similarity: calculateSimilarity(normalizedInput, exercise.normalizedName),
        }))
        .filter((exercise) => exercise.similarity >= input.threshold)
        .sort((a, b) => b.similarity - a.similarity);
      
      return similarExercises;
    }),

  // Get all master exercises for management
  getAllMaster: protectedProcedure
    .query(async ({ ctx }) => {
      const exercises = await ctx.db
        .select({
          id: masterExercises.id,
          name: masterExercises.name,
          normalizedName: masterExercises.normalizedName,
          createdAt: masterExercises.createdAt,
          linkedCount: sql<number>`count(${exerciseLinks.id})`,
        })
        .from(masterExercises)
        .leftJoin(exerciseLinks, eq(exerciseLinks.masterExerciseId, masterExercises.id))
        .where(eq(masterExercises.user_id, ctx.user.id))
        .groupBy(masterExercises.id)
        .orderBy(masterExercises.name);
      
      return exercises;
    }),

  // Create or get master exercise
  createOrGetMaster: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const normalizedName = normalizeExerciseName(input.name);
      
      // Try to find existing master exercise
      const existing = await ctx.db
        .select()
        .from(masterExercises)
        .where(
          and(
            eq(masterExercises.user_id, ctx.user.id),
            eq(masterExercises.normalizedName, normalizedName)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        return existing[0]!;
      }
      
      // Create new master exercise
      const newExercise = await ctx.db
        .insert(masterExercises)
        .values({
          user_id: ctx.user.id,
          name: input.name,
          normalizedName,
        })
        .returning();
      
      return newExercise[0]!;
    }),

  // Link template exercise to master exercise
  linkToMaster: protectedProcedure
    .input(z.object({
      templateExerciseId: z.number(),
      masterExerciseId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the template exercise belongs to the user
      const templateExercise = await ctx.db
        .select()
        .from(templateExercises)
        .where(
          and(
            eq(templateExercises.id, input.templateExerciseId),
            eq(templateExercises.user_id, ctx.user.id)
          )
        )
        .limit(1);
      
      if (templateExercise.length === 0) {
        throw new Error("Template exercise not found");
      }
      
      // Verify the master exercise belongs to the user
      const masterExercise = await ctx.db
        .select()
        .from(masterExercises)
        .where(
          and(
            eq(masterExercises.id, input.masterExerciseId),
            eq(masterExercises.user_id, ctx.user.id)
          )
        )
        .limit(1);
      
      if (masterExercise.length === 0) {
        throw new Error("Master exercise not found");
      }
      
      // Create or update the link
      const link = await ctx.db
        .insert(exerciseLinks)
        .values({
          templateExerciseId: input.templateExerciseId,
          masterExerciseId: input.masterExerciseId,
          user_id: ctx.user.id,
        })
        .onConflictDoUpdate({
          target: exerciseLinks.templateExerciseId,
          set: {
            masterExerciseId: input.masterExerciseId,
          },
        })
        .returning();
      
      return link[0]!;
    }),

  // Unlink template exercise from master exercise
  unlink: protectedProcedure
    .input(z.object({
      templateExerciseId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(exerciseLinks)
        .where(
          and(
            eq(exerciseLinks.templateExerciseId, input.templateExerciseId),
            eq(exerciseLinks.user_id, ctx.user.id)
          )
        );
      
      return { success: true };
    }),

  // Get latest performance data for a master exercise
  getLatestPerformance: protectedProcedure
    .input(z.object({
      masterExerciseId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Find all template exercises linked to this master exercise
      const linkedTemplateExercises = await ctx.db
        .select({ id: templateExercises.id })
        .from(templateExercises)
        .innerJoin(exerciseLinks, eq(exerciseLinks.templateExerciseId, templateExercises.id))
        .where(
          and(
            eq(exerciseLinks.masterExerciseId, input.masterExerciseId),
            eq(templateExercises.user_id, ctx.user.id)
          )
        );
      
      if (linkedTemplateExercises.length === 0) {
        return null;
      }
      
      const templateExerciseIds = linkedTemplateExercises.map(te => te.id);
      
      // Return null if no template exercise IDs to search
      if (templateExerciseIds.length === 0) {
        return null;
      }
      
      // Get the most recent session exercise from any linked template exercise
      const latestPerformance = await ctx.db
        .select({
          weight: sessionExercises.weight,
          reps: sessionExercises.reps,
          sets: sessionExercises.sets,
          unit: sessionExercises.unit,
          workoutDate: workoutSessions.workoutDate,
        })
        .from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.sessionId))
        .where(
          and(
            inArray(sessionExercises.templateExerciseId, templateExerciseIds),
            eq(sessionExercises.user_id, ctx.user.id)
          )
        )
        .orderBy(desc(workoutSessions.workoutDate))
        .limit(1);
      
      return latestPerformance[0] ?? null;
    }),

  // Get exercise links for a template
  getLinksForTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const links = await ctx.db
        .select({
          templateExerciseId: templateExercises.id,
          exerciseName: templateExercises.exerciseName,
          masterExerciseId: masterExercises.id,
          masterExerciseName: masterExercises.name,
          isLinked: sql<boolean>`${exerciseLinks.id} IS NOT NULL`,
        })
        .from(templateExercises)
        .leftJoin(exerciseLinks, eq(exerciseLinks.templateExerciseId, templateExercises.id))
        .leftJoin(masterExercises, eq(masterExercises.id, exerciseLinks.masterExerciseId))
        .where(
          and(
            eq(templateExercises.templateId, input.templateId),
            eq(templateExercises.user_id, ctx.user.id)
          )
        )
        .orderBy(templateExercises.orderIndex);
      
      return links;
    }),

  // Check if a template exercise has linking rejected
  isLinkingRejected: protectedProcedure
    .input(z.object({
      templateExerciseId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const templateExercise = await ctx.db
        .select({ linkingRejected: templateExercises.linkingRejected })
        .from(templateExercises)
        .where(
          and(
            eq(templateExercises.id, input.templateExerciseId),
            eq(templateExercises.user_id, ctx.user.id)
          )
        )
        .limit(1);

      return templateExercise[0]?.linkingRejected ?? false;
    }),

  // Mark template exercise as linking rejected (user chose not to link)
  rejectLinking: protectedProcedure
    .input(z.object({
      templateExerciseId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the template exercise belongs to the user
      const templateExercise = await ctx.db
        .select()
        .from(templateExercises)
        .where(
          and(
            eq(templateExercises.id, input.templateExerciseId),
            eq(templateExercises.user_id, ctx.user.id)
          )
        )
        .limit(1);
      
      if (templateExercise.length === 0) {
        throw new Error("Template exercise not found");
      }

      // Mark as linking rejected
      await ctx.db
        .update(templateExercises)
        .set({ linkingRejected: true })
        .where(eq(templateExercises.id, input.templateExerciseId));

      return { success: true };
    }),

  // Get detailed linking information for a master exercise
  getLinkingDetails: protectedProcedure
    .input(z.object({
      masterExerciseId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all template exercises linked to this master exercise
      const linkedExercises = await ctx.db
        .select({
          templateExerciseId: templateExercises.id,
          exerciseName: templateExercises.exerciseName,
          templateId: templateExercises.templateId,
          templateName: sql<string>`(SELECT name FROM "swole-tracker_workout_template" WHERE id = ${templateExercises.templateId})`,
        })
        .from(templateExercises)
        .innerJoin(exerciseLinks, eq(exerciseLinks.templateExerciseId, templateExercises.id))
        .where(
          and(
            eq(exerciseLinks.masterExerciseId, input.masterExerciseId),
            eq(templateExercises.user_id, ctx.user.id)
          )
        );

      // Get all unlinked template exercises for potential linking
      const unlinkedExercises = await ctx.db
        .select({
          templateExerciseId: templateExercises.id,
          exerciseName: templateExercises.exerciseName,
          templateId: templateExercises.templateId,
          templateName: sql<string>`(SELECT name FROM "swole-tracker_workout_template" WHERE id = ${templateExercises.templateId})`,
          linkingRejected: templateExercises.linkingRejected,
        })
        .from(templateExercises)
        .leftJoin(exerciseLinks, eq(exerciseLinks.templateExerciseId, templateExercises.id))
        .where(
          and(
            eq(templateExercises.user_id, ctx.user.id),
            sql`${exerciseLinks.id} IS NULL` // Not linked to any master exercise
          )
        );

      // Get master exercise name for similarity comparison
      const masterExercise = await ctx.db
        .select({ name: masterExercises.name, normalizedName: masterExercises.normalizedName })
        .from(masterExercises)
        .where(
          and(
            eq(masterExercises.id, input.masterExerciseId),
            eq(masterExercises.user_id, ctx.user.id)
          )
        )
        .limit(1);

      if (masterExercise.length === 0) {
        throw new Error("Master exercise not found");
      }

      // Calculate similarity for unlinked exercises
      const masterNormalizedName = masterExercise[0]!.normalizedName;
      const potentialLinks = unlinkedExercises.map(exercise => {
        const exerciseNormalizedName = normalizeExerciseName(exercise.exerciseName);
        const similarity = calculateSimilarity(masterNormalizedName, exerciseNormalizedName);
        
        return {
          ...exercise,
          similarity,
        };
      }).sort((a, b) => b.similarity - a.similarity); // Sort by similarity desc

      return {
        linkedExercises,
        potentialLinks,
        masterExerciseName: masterExercise[0]!.name,
      };
    }),

  // Bulk link similar exercises
  bulkLinkSimilar: protectedProcedure
    .input(z.object({
      masterExerciseId: z.number(),
      minimumSimilarity: z.number().min(0).max(1).default(0.7),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get linking details to find similar exercises
      const details = await ctx.db.query.masterExercises.findFirst({
        where: and(
          eq(masterExercises.id, input.masterExerciseId),
          eq(masterExercises.user_id, ctx.user.id)
        ),
      });

      if (!details) {
        throw new Error("Master exercise not found");
      }

      // Get unlinked exercises
      const unlinkedExercises = await ctx.db
        .select({
          id: templateExercises.id,
          exerciseName: templateExercises.exerciseName,
        })
        .from(templateExercises)
        .leftJoin(exerciseLinks, eq(exerciseLinks.templateExerciseId, templateExercises.id))
        .where(
          and(
            eq(templateExercises.user_id, ctx.user.id),
            sql`${exerciseLinks.id} IS NULL`,
            eq(templateExercises.linkingRejected, false) // Don't link rejected exercises
          )
        );

      let linkedCount = 0;
      const masterNormalizedName = details.normalizedName;

      for (const exercise of unlinkedExercises) {
        const exerciseNormalizedName = normalizeExerciseName(exercise.exerciseName);
        const similarity = calculateSimilarity(masterNormalizedName, exerciseNormalizedName);
        
        if (similarity >= input.minimumSimilarity) {
          await ctx.db
            .insert(exerciseLinks)
            .values({
              templateExerciseId: exercise.id,
              masterExerciseId: input.masterExerciseId,
              user_id: ctx.user.id,
            });
          linkedCount++;
        }
      }

      return { linkedCount };
    }),

  // Bulk unlink all exercises from master exercise
  bulkUnlinkAll: protectedProcedure
    .input(z.object({
      masterExerciseId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(exerciseLinks)
        .where(
          and(
            eq(exerciseLinks.masterExerciseId, input.masterExerciseId),
            eq(exerciseLinks.user_id, ctx.user.id)
          )
        )
        .returning();

      return { unlinkedCount: result.length };
    }),

  // Migrate existing template exercises to master exercises (one-time setup)
  migrateExistingExercises: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Get all template exercises for the user that don't have links
      const unlinkedExercises = await ctx.db
        .select({
          id: templateExercises.id,
          exerciseName: templateExercises.exerciseName,
        })
        .from(templateExercises)
        .leftJoin(exerciseLinks, eq(exerciseLinks.templateExerciseId, templateExercises.id))
        .where(
          and(
            eq(templateExercises.user_id, ctx.user.id),
            sql`${exerciseLinks.id} IS NULL`
          )
        );

      let createdMasterExercises = 0;
      let createdLinks = 0;

      for (const templateExercise of unlinkedExercises) {
        const normalizedName = normalizeExerciseName(templateExercise.exerciseName);
        
        // Try to find existing master exercise
        const existing = await ctx.db
          .select()
          .from(masterExercises)
          .where(
            and(
              eq(masterExercises.user_id, ctx.user.id),
              eq(masterExercises.normalizedName, normalizedName)
            )
          )
          .limit(1);

        let masterExercise;

        if (existing.length > 0) {
          masterExercise = existing[0];
        } else {
          // Create new master exercise
          const newMasterExercise = await ctx.db
            .insert(masterExercises)
            .values({
              user_id: ctx.user.id,
              name: templateExercise.exerciseName,
              normalizedName,
            })
            .returning();

          masterExercise = newMasterExercise[0];
          createdMasterExercises++;
        }

        // Create the link
        await ctx.db
          .insert(exerciseLinks)
          .values({
            templateExerciseId: templateExercise.id,
            masterExerciseId: masterExercise!.id,
            user_id: ctx.user.id,
          });
        
        createdLinks++;
      }

      return {
        migratedExercises: unlinkedExercises.length,
        createdMasterExercises,
        createdLinks,
      };
    }),
});
