import { z } from "zod";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import getPosthog from "~/lib/posthog";
import {
  playbookCreateInputSchema,
  rpeSubmissionSchema,
  regenerationRequestSchema,
  playbookStatusSchema,
  type PlaybookCreateInput,
  type PlaybookStatus,
  type WeeklyAiPlan,
  type WeeklyAlgorithmicPlan,
} from "~/server/api/schemas/playbook";
import {
  playbooks,
  playbookWeeks,
  playbookSessions,
  playbookRegenerations,
  workoutSessions,
  sessionExercises,
} from "~/server/db/schema";
import { chunkedBatch } from "~/server/db/chunk-utils";
import { buildPlaybookContext } from "~/server/api/utils/playbook-context";
import { generateAlgorithmicPlan } from "~/server/api/utils/algorithmic-planner";
import { buildPlaybookGenerationPrompt } from "~/lib/ai-prompts/playbook-generation";
import { logger } from "~/lib/logger";
import { env } from "~/env";

/**
 * Call AI to generate playbook plan using Vercel AI SDK
 */
async function generateAIPlan(
  context: ReturnType<typeof buildPlaybookContext> extends Promise<infer T>
    ? T
    : never,
): Promise<WeeklyAiPlan[]> {
  const { system, prompt } = buildPlaybookGenerationPrompt(context);

  // Use AI SDK (same pattern as session-debrief)
  const modelId = env.AI_DEBRIEF_MODEL ?? env.AI_GATEWAY_MODEL_HEALTH;
  if (!modelId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI model for playbook generation is not configured",
    });
  }

  const temperature = Number(env.AI_DEBRIEF_TEMPERATURE ?? 0.7);

  try {
    const { generateText } = await import("ai");

    const result = await generateText({
      model: modelId,
      system,
      prompt,
      temperature,
    });

    // Parse the JSON response
    const content = JSON.parse(result.text);

    if (!content.weeks || !Array.isArray(content.weeks)) {
      throw new Error("Invalid AI response: missing weeks array");
    }

    return content.weeks as WeeklyAiPlan[];
  } catch (error) {
    logger.error("Failed to generate AI playbook plan", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: context.userId,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate playbook plan. Please try again.",
    });
  }
}

/**
 * Calculate adherence score comparing prescribed vs actual workout
 */
function calculateAdherenceScore(
  prescribed: unknown,
  actual: { weight: number | null; reps: number; sets: number }[],
): number {
  // Simplified adherence calculation
  // In a real implementation, compare prescribed exercises with actual
  // For now, return a placeholder
  return 85;
}

const getByIdInputSchema = z.object({
  id: z.number().int().positive(),
});

const listByUserInputSchema = z.object({
  status: playbookStatusSchema.optional(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
});

const acceptPlaybookInputSchema = z.object({
  id: z.number().int().positive(),
});

export const playbookRouter = createTRPCRouter({
  /**
   * Create a new playbook with AI and algorithmic plans
   */
  create: protectedProcedure
    .input(playbookCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      logger.info("Creating playbook", { userId, input });

      // Build context from database
      const context = await buildPlaybookContext(ctx.db, userId, input);

      // Generate both AI and algorithmic plans
      const [aiWeeks, algorithmicWeeks] = await Promise.all([
        generateAIPlan(context),
        Promise.resolve(generateAlgorithmicPlan(context)),
      ]);

      // Create playbook record
      const [playbook] = await ctx.db
        .insert(playbooks)
        .values({
          userId,
          name: input.name,
          goalText: input.goalText ?? null,
          goalPreset: input.goalPreset ?? null,
          targetType: input.targetType,
          targetIds: JSON.stringify(input.targetIds),
          duration: input.duration,
          status: "draft",
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!playbook) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create playbook",
        });
      }

      // Create weeks with both plans
      const weekRows = aiWeeks.map((aiWeek, idx) => {
        const algorithmicWeek = algorithmicWeeks[idx];
        return {
          playbookId: playbook.id,
          weekNumber: aiWeek.weekNumber,
          weekType: aiWeek.weekType,
          aiPlanJson: JSON.stringify(aiWeek),
          algorithmicPlanJson: algorithmicWeek
            ? JSON.stringify(algorithmicWeek)
            : null,
          volumeTarget: aiWeek.volumeTarget ?? null,
          status: "pending" as const,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      // Use chunkedBatch to safely insert weeks
      await chunkedBatch(ctx.db, weekRows, (chunk) => {
        return ctx.db.insert(playbookWeeks).values(chunk);
      });

      // Fetch created weeks to get IDs
      const createdWeeks = await ctx.db
        .select()
        .from(playbookWeeks)
        .where(eq(playbookWeeks.playbookId, playbook.id))
        .orderBy(asc(playbookWeeks.weekNumber));

      // Create sessions for each week
      const sessionRows = [];
      for (const week of createdWeeks) {
        const aiWeek = aiWeeks.find((w) => w.weekNumber === week.weekNumber);
        if (!aiWeek) continue;

        for (const session of aiWeek.sessions) {
          sessionRows.push({
            playbookWeekId: week.id,
            sessionNumber: session.sessionNumber,
            sessionDate: null,
            prescribedWorkoutJson: JSON.stringify(session),
            actualWorkoutId: null,
            adherenceScore: null,
            rpe: null,
            rpeNotes: null,
            deviation: null,
            isCompleted: false,
            completedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Use chunkedBatch to safely insert sessions
      await chunkedBatch(ctx.db, sessionRows, (chunk) => {
        return ctx.db.insert(playbookSessions).values(chunk);
      });

      logger.info("Playbook created successfully", {
        userId,
        playbookId: playbook.id,
        weeks: createdWeeks.length,
        sessions: sessionRows.length,
      });

      // Analytics: Track playbook creation
      const posthog = getPosthog();
      posthog.capture("playbook.created", {
        playbook_id: playbook.id,
        goal_preset: playbook.goalPreset ?? undefined,
        target_type: playbook.targetType,
        duration_weeks: playbook.duration,
        weeks_count: createdWeeks.length,
        sessions_count: sessionRows.length,
        user_id: userId,
      });

      return {
        id: playbook.id,
        name: playbook.name,
        duration: playbook.duration,
        status: playbook.status,
        weeksCount: createdWeeks.length,
        sessionsCount: sessionRows.length,
      };
    }),

  /**
   * Get playbook by ID with nested weeks and sessions
   */
  getById: protectedProcedure
    .input(getByIdInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const playbook = await ctx.db.query.playbooks.findFirst({
        where: and(eq(playbooks.id, input.id), eq(playbooks.userId, userId)),
        with: {
          weeks: {
            orderBy: (weeks, { asc }) => [asc(weeks.weekNumber)],
            with: {
              sessions: {
                orderBy: (sessions, { asc }) => [asc(sessions.sessionNumber)],
              },
            },
          },
        },
      });

      if (!playbook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playbook not found",
        });
      }

      // Parse JSON fields
      return {
        ...playbook,
        targetIds: JSON.parse(playbook.targetIds),
        metadata: playbook.metadata ? JSON.parse(playbook.metadata) : null,
        weeks: playbook.weeks.map((week) => ({
          ...week,
          aiPlan: week.aiPlanJson ? JSON.parse(week.aiPlanJson) : null,
          algorithmicPlan: week.algorithmicPlanJson
            ? JSON.parse(week.algorithmicPlanJson)
            : null,
          metadata: week.metadata ? JSON.parse(week.metadata) : null,
          sessions: week.sessions.map((session) => ({
            ...session,
            prescribedWorkout: JSON.parse(session.prescribedWorkoutJson),
            deviation: session.deviation ? JSON.parse(session.deviation) : null,
          })),
        })),
      };
    }),

  /**
   * List playbooks for current user with filters
   */
  listByUser: protectedProcedure
    .input(listByUserInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const where = input.status
        ? and(eq(playbooks.userId, userId), eq(playbooks.status, input.status))
        : eq(playbooks.userId, userId);

      const results = await ctx.db
        .select()
        .from(playbooks)
        .where(where)
        .orderBy(desc(playbooks.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results.map((playbook) => ({
        ...playbook,
        targetIds: JSON.parse(playbook.targetIds),
        metadata: playbook.metadata ? JSON.parse(playbook.metadata) : null,
      }));
    }),

  /**
   * Accept and activate a playbook
   */
  acceptPlaybook: protectedProcedure
    .input(acceptPlaybookInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify ownership
      const playbook = await ctx.db.query.playbooks.findFirst({
        where: and(eq(playbooks.id, input.id), eq(playbooks.userId, userId)),
      });

      if (!playbook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playbook not found",
        });
      }

      if (playbook.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft playbooks can be accepted",
        });
      }

      // Update to active
      await ctx.db
        .update(playbooks)
        .set({
          status: "active",
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(playbooks.id, input.id));

      logger.info("Playbook accepted", { userId, playbookId: input.id });

      // Analytics: Track playbook acceptance
      const posthog = getPosthog();
      posthog.capture("playbook.accepted", {
        playbook_id: input.id,
        user_id: userId,
        goal_preset: playbook.goalPreset ?? undefined,
        duration_weeks: playbook.duration,
      });

      return { success: true };
    }),

  /**
   * Delete a playbook
   */
  delete: protectedProcedure
    .input(getByIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify ownership
      const playbook = await ctx.db.query.playbooks.findFirst({
        where: and(eq(playbooks.id, input.id), eq(playbooks.userId, userId)),
      });

      if (!playbook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playbook not found",
        });
      }

      // Delete playbook (cascade will handle weeks, sessions, regenerations)
      await ctx.db.delete(playbooks).where(eq(playbooks.id, input.id));

      logger.info("Playbook deleted", { userId, playbookId: input.id });

      // Analytics: Track playbook deletion
      const posthog = getPosthog();
      posthog.capture("playbook.deleted", {
        playbook_id: input.id,
        user_id: userId,
        status: playbook.status,
        goal_preset: playbook.goalPreset ?? undefined,
        duration_weeks: playbook.duration,
      });

      return { success: true };
    }),

  /**
   * Submit RPE after session completion
   */
  submitSessionRPE: protectedProcedure
    .input(rpeSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify session belongs to user's playbook
      const session = await ctx.db.query.playbookSessions.findFirst({
        where: eq(playbookSessions.id, input.playbookSessionId),
        with: {
          week: {
            with: {
              playbook: true,
            },
          },
        },
      });

      if (!session || session.week?.playbook?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Calculate adherence if we have actual workout data
      let adherenceScore = null;
      if (session.actualWorkoutId) {
        // Would fetch actual workout and compare - simplified for now
        adherenceScore = 85;
      }

      // Update session with RPE
      await ctx.db
        .update(playbookSessions)
        .set({
          rpe: input.rpe,
          rpeNotes: input.rpeNotes ?? null,
          adherenceScore,
          updatedAt: new Date(),
        })
        .where(eq(playbookSessions.id, input.playbookSessionId));

      logger.info("RPE submitted", {
        userId,
        sessionId: input.playbookSessionId,
        rpe: input.rpe,
      });

      // Analytics: Track RPE submission
      const posthog = getPosthog();
      posthog.capture("playbook_rpe.submitted", {
        playbook_id: session.week.playbook.id,
        session_id: input.playbookSessionId,
        week_number: session.week.weekNumber,
        rpe_value: input.rpe,
        adherence_score: adherenceScore ?? undefined,
        difficulty: input.difficulty,
        user_id: userId,
      });

      // Check if regeneration is needed based on RPE
      const needsRegeneration =
        input.difficulty === "too_hard" ||
        input.difficulty === "too_easy" ||
        (adherenceScore !== null && adherenceScore < 70);

      return {
        success: true,
        adherenceScore,
        suggestRegeneration: needsRegeneration,
      };
    }),

  /**
   * Start a workout from a playbook session
   * Creates a new workout session pre-filled with the prescribed exercises
   */
  startSessionWorkout: protectedProcedure
    .input(
      z.object({
        playbookSessionId: z.number(),
        workoutDate: z.date().default(() => new Date()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Fetch the playbook session with prescription
      const session = await ctx.db.query.playbookSessions.findFirst({
        where: eq(playbookSessions.id, input.playbookSessionId),
        with: {
          week: {
            with: {
              playbook: true,
            },
          },
        },
      });

      if (!session || session.week?.playbook?.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playbook session not found",
        });
      }

      // Check if workout already started
      if (session.actualWorkoutId) {
        return {
          workoutId: session.actualWorkoutId,
          alreadyStarted: true,
        };
      }

      // Parse the prescribed workout
      const prescription = (
        session.prescribedWorkoutJson
          ? JSON.parse(session.prescribedWorkoutJson)
          : null
      ) as {
        sessionNumber: number;
        dayOfWeek?: string;
        exercises: Array<{
          exerciseName: string;
          warmupSets?: Array<{
            weight: number;
            reps: number;
            percentageOfTop?: number;
          }>;
          sets: number;
          reps: number;
          weight: number | null;
          restSeconds?: number;
          rpe?: number;
          notes?: string;
          templateExerciseId?: number;
          masterExerciseId?: number;
        }>;
      } | null;

      if (!prescription?.exercises || prescription.exercises.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No exercises prescribed for this session",
        });
      }

      // Create the workout session
      const [workoutSession] = await ctx.db
        .insert(workoutSessions)
        .values({
          user_id: userId,
          templateId: null, // Playbook workouts don't use templates
          workoutDate: input.workoutDate,
        })
        .returning();

      if (!workoutSession) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workout session",
        });
      }

      // Create session exercises from prescription
      // Note: Playbook exercises don't use templateExerciseId since they're not from templates
      // Historical data lookup will use exerciseName instead
      // Each set becomes its own row (matching how workouts.save stores data)
      const exerciseRows = (prescription?.exercises || []).flatMap(
        (exercise) => {
          const numSets = exercise.sets || 1;
          return Array.from({ length: numSets }, (_, setIndex) => ({
            sessionId: workoutSession.id,
            user_id: userId,
            exerciseName: exercise.exerciseName,
            resolvedExerciseName: exercise.exerciseName,
            weight: exercise.weight,
            reps: exercise.reps,
            sets: 1, // Each row represents ONE set
            unit: "kg",
            setOrder: setIndex, // Position within this exercise
            templateExerciseId: null, // Playbook exercises don't link to templates
            rpe: exercise.rpe ?? null,
            rest_seconds: exercise.restSeconds ?? null,
            is_estimate: false,
            is_default_applied: false,
            one_rm_estimate: null, // Will be calculated on save
            volume_load: null, // Will be calculated on save
            usesSetTable: false, // Using legacy format (one row per set)
            warmupSets: exercise.warmupSets?.length ?? 0,
            workingSets: numSets,
            topSetWeight: exercise.weight ?? 0,
          }));
        },
      );

      // Insert exercises in chunks to avoid D1 parameter limits
      const insertedExercises = await chunkedBatch(
        ctx.db,
        exerciseRows,
        (chunk) => ctx.db.insert(sessionExercises).values(chunk).returning(),
        { limit: 50 },
      );

      // Flatten the results (chunkedBatch returns array of arrays)
      const allInsertedExercises = (
        insertedExercises as Array<Array<typeof sessionExercises.$inferSelect>>
      ).flat();

      // Link the workout back to the playbook session
      await ctx.db
        .update(playbookSessions)
        .set({
          actualWorkoutId: workoutSession.id,
          updatedAt: new Date(),
        })
        .where(eq(playbookSessions.id, input.playbookSessionId));

      logger.info("Started playbook workout", {
        userId,
        playbookSessionId: String(input.playbookSessionId),
        workoutId: String(workoutSession.id),
      });

      // Analytics: Track workout start
      const posthog = getPosthog();
      posthog.capture("playbook_workout.started", {
        playbook_id: session.week.playbook.id,
        session_id: input.playbookSessionId,
        workout_id: String(workoutSession.id),
        week_number: session.week.weekNumber,
        session_number: session.sessionNumber,
        exercise_count: (prescription?.exercises || []).length,
        user_id: userId,
      });

      return {
        workoutId: workoutSession.id,
        alreadyStarted: false,
      };
    }),

  /**
   * Regenerate weeks from a specific point
   */
  regenerateWeeks: protectedProcedure
    .input(regenerationRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify playbook ownership
      const playbook = await ctx.db.query.playbooks.findFirst({
        where: and(
          eq(playbooks.id, input.playbookId),
          eq(playbooks.userId, userId),
        ),
      });

      if (!playbook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playbook not found",
        });
      }

      // Fetch affected weeks separately using query builder
      const affectedWeeks = await ctx.db
        .select()
        .from(playbookWeeks)
        .where(
          and(
            eq(playbookWeeks.playbookId, input.playbookId),
            gte(playbookWeeks.weekNumber, input.weekStart),
            lte(playbookWeeks.weekNumber, input.weekEnd),
          ),
        )
        .orderBy(asc(playbookWeeks.weekNumber));

      // Store snapshot of previous plan
      const previousPlanSnapshot = affectedWeeks.map((w) => ({
        weekNumber: w.weekNumber,
        aiPlan: w.aiPlanJson ? JSON.parse(w.aiPlanJson) : null,
      }));

      // Rebuild context and generate new plan
      const playbookInput: PlaybookCreateInput = {
        name: playbook.name,
        goalText: playbook.goalText ?? undefined,
        goalPreset:
          (playbook.goalPreset as PlaybookCreateInput["goalPreset"]) ??
          undefined,
        targetType: playbook.targetType as "template" | "exercise",
        targetIds: JSON.parse(playbook.targetIds),
        duration: playbook.duration,
        metadata: playbook.metadata ? JSON.parse(playbook.metadata) : undefined,
      };

      const context = await buildPlaybookContext(ctx.db, userId, playbookInput);
      const newAiWeeks = await generateAIPlan(context);

      // Update affected weeks
      for (const week of affectedWeeks) {
        const newWeek = newAiWeeks.find(
          (w) => w.weekNumber === week.weekNumber,
        );
        if (newWeek) {
          await ctx.db
            .update(playbookWeeks)
            .set({
              aiPlanJson: JSON.stringify(newWeek),
              volumeTarget: newWeek.volumeTarget ?? null,
              updatedAt: new Date(),
            })
            .where(eq(playbookWeeks.id, week.id));
        }
      }

      // Record regeneration
      await ctx.db.insert(playbookRegenerations).values({
        playbookId: input.playbookId,
        triggeredBySessionId: null,
        regenerationReason: input.reason,
        affectedWeekStart: input.weekStart,
        affectedWeekEnd: input.weekEnd,
        previousPlanSnapshot: JSON.stringify(previousPlanSnapshot),
        newPlanSnapshot: JSON.stringify(newAiWeeks),
        createdAt: new Date(),
      });

      logger.info("Playbook regenerated", {
        userId,
        playbookId: input.playbookId,
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        reason: input.reason,
      });

      // Analytics: Track playbook regeneration
      const posthog = getPosthog();
      posthog.capture("playbook.regenerated", {
        playbook_id: input.playbookId,
        regeneration_reason: input.reason,
        week_start: input.weekStart,
        week_end: input.weekEnd,
        weeks_regenerated: newAiWeeks.length,
        user_id: userId,
      });

      return { success: true, regeneratedWeeks: newAiWeeks.length };
    }),

  /**
   * Get adherence metrics for a playbook
   */
  getAdherenceMetrics: protectedProcedure
    .input(z.object({ playbookId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const playbook = await ctx.db.query.playbooks.findFirst({
        where: and(
          eq(playbooks.id, input.playbookId),
          eq(playbooks.userId, userId),
        ),
        with: {
          weeks: {
            with: {
              sessions: true,
            },
          },
        },
      });

      if (!playbook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playbook not found",
        });
      }

      const totalSessions = playbook.weeks.reduce(
        (sum, week) => sum + week.sessions.length,
        0,
      );
      const completedSessions = playbook.weeks.reduce(
        (sum, week) => sum + week.sessions.filter((s) => s.isCompleted).length,
        0,
      );

      const rpeValues = playbook.weeks
        .flatMap((week) => week.sessions)
        .map((s) => s.rpe)
        .filter((rpe): rpe is number => rpe !== null);

      const averageRpe =
        rpeValues.length > 0
          ? rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length
          : null;

      const adherencePercentage =
        totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      return {
        playbookId: input.playbookId,
        totalSessions,
        completedSessions,
        adherencePercentage: Math.round(adherencePercentage),
        averageRpe: averageRpe ? Math.round(averageRpe * 10) / 10 : null,
        weeklyBreakdown: playbook.weeks.map((week) => ({
          weekNumber: week.weekNumber,
          sessionsCompleted: week.sessions.filter((s) => s.isCompleted).length,
          sessionsTotal: week.sessions.length,
        })),
      };
    }),

  /**
   * Get regeneration history for a playbook
   */
  getRegenerationHistory: protectedProcedure
    .input(z.object({ playbookId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify ownership
      const playbook = await ctx.db.query.playbooks.findFirst({
        where: and(
          eq(playbooks.id, input.playbookId),
          eq(playbooks.userId, userId),
        ),
      });

      if (!playbook) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Playbook not found",
        });
      }

      const regenerations = await ctx.db
        .select()
        .from(playbookRegenerations)
        .where(eq(playbookRegenerations.playbookId, input.playbookId))
        .orderBy(desc(playbookRegenerations.createdAt));

      return regenerations.map((r) => ({
        ...r,
        previousPlanSnapshot: r.previousPlanSnapshot
          ? JSON.parse(r.previousPlanSnapshot)
          : null,
        newPlanSnapshot: r.newPlanSnapshot
          ? JSON.parse(r.newPlanSnapshot)
          : null,
      }));
    }),
});
