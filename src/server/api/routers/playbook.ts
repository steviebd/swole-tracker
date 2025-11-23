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
  activePlanTypeSchema,
  type PlaybookCreateInput,
  type PlaybookStatus,
  type WeeklyAiPlan,
  type WeeklyAlgorithmicPlan,
  type ActivePlanType,
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
import { calculateWarmupSets } from "~/lib/warmup-utils";
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
      const { selectedPlans } = input;

      logger.info("Creating playbook", { userId, input });

      // Build context from database
      const context = await buildPlaybookContext(ctx.db, userId, input);

      // Conditional generation
      let aiWeeks: WeeklyAiPlan[] | null = null;
      let algorithmicWeeks: WeeklyAlgorithmicPlan[];

      if (selectedPlans.ai) {
        // Generate both (AI selected means we want AI, Algorithmic is always free)
        [aiWeeks, algorithmicWeeks] = await Promise.all([
          generateAIPlan(context),
          Promise.resolve(generateAlgorithmicPlan(context)),
        ]);
      } else {
        // Only Algorithmic
        algorithmicWeeks = generateAlgorithmicPlan(context);
      }

      // Determine default active plan type
      const defaultActivePlanType: "ai" | "algorithmic" = selectedPlans.ai
        ? "ai"
        : "algorithmic";

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
          hasAiPlan: selectedPlans.ai,
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

      // Create weeks
      const weekRows = algorithmicWeeks.map((algoWeek, idx) => {
        const aiWeek = aiWeeks?.[idx] ?? null;
        return {
          playbookId: playbook.id,
          weekNumber: algoWeek.weekNumber,
          weekType: algoWeek.weekType,
          aiPlanJson: aiWeek ? JSON.stringify(aiWeek) : null,
          algorithmicPlanJson: JSON.stringify(algoWeek),
          volumeTarget: aiWeek?.volumeTarget ?? algoWeek.volumeTarget,
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

      // Create sessions from active plan
      const sourcePlan = selectedPlans.ai ? aiWeeks : algorithmicWeeks;
      const sessionRows = [];

      for (const week of createdWeeks) {
        const weekPlan = sourcePlan?.find(
          (w) => w.weekNumber === week.weekNumber,
        );
        if (!weekPlan) continue;

        for (const session of weekPlan.sessions) {
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
            activePlanType: defaultActivePlanType, // Set active plan
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
        hasAiPlan: selectedPlans.ai,
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
        has_ai_plan: selectedPlans.ai,
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
          const topWeight = exercise.weight;
          const rows: Array<{
            sessionId: number;
            user_id: string;
            exerciseName: string;
            resolvedExerciseName: string;
            weight: number | null;
            reps: number;
            sets: number;
            unit: string;
            setOrder: number;
            templateExerciseId: null;
            rpe: number | null;
            rest_seconds: number | null;
            is_estimate: boolean;
            is_default_applied: boolean;
            one_rm_estimate: null;
            volume_load: null;
          }> = [];

          let setOrder = 0;

          // Calculate and add warmup sets if we have a working weight
          if (topWeight && topWeight > 0) {
            const warmupSets = calculateWarmupSets(topWeight, exercise.reps, 5);

            for (const warmup of warmupSets) {
              rows.push({
                sessionId: workoutSession.id,
                user_id: userId,
                exerciseName: exercise.exerciseName,
                resolvedExerciseName: exercise.exerciseName,
                weight: warmup.weight,
                reps: warmup.reps,
                sets: 1,
                unit: "kg",
                setOrder: setOrder++,
                templateExerciseId: null,
                rpe: null,
                rest_seconds: exercise.restSeconds ?? null,
                is_estimate: false,
                is_default_applied: false,
                one_rm_estimate: null,
                volume_load: null,
              });
            }
          }

          // Add working sets
          for (let i = 0; i < numSets; i++) {
            rows.push({
              sessionId: workoutSession.id,
              user_id: userId,
              exerciseName: exercise.exerciseName,
              resolvedExerciseName: exercise.exerciseName,
              weight: exercise.weight,
              reps: exercise.reps,
              sets: 1,
              unit: "kg",
              setOrder: setOrder++,
              templateExerciseId: null,
              rpe: exercise.rpe ?? null,
              rest_seconds: exercise.restSeconds ?? null,
              is_estimate: false,
              is_default_applied: false,
              one_rm_estimate: null,
              volume_load: null,
            });
          }

          return rows;
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
  regenerateFromLatestSession: protectedProcedure
    .input(
      z.object({
        playbookId: z.number(),
        addAiPlan: z.boolean().optional(), // For prompting to add AI
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { playbookId, addAiPlan } = input;
      const userId = ctx.user.id;

      // Get playbook
      const playbook = await ctx.db.query.playbooks.findFirst({
        where: and(eq(playbooks.id, playbookId), eq(playbooks.userId, userId)),
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

      // Find latest completed session
      const allSessions = playbook.weeks.flatMap((w) => w.sessions);
      const completedSessions = allSessions
        .filter((s) => s.isCompleted)
        .sort((a, b) => {
          // Sort by week number then session number
          const weekA = playbook.weeks.find((w) => w.id === a.playbookWeekId)!;
          const weekB = playbook.weeks.find((w) => w.id === b.playbookWeekId)!;
          if (weekA.weekNumber !== weekB.weekNumber) {
            return weekB.weekNumber - weekA.weekNumber;
          }
          return b.sessionNumber - a.sessionNumber;
        });

      const latestSession = completedSessions[0];
      if (!latestSession) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No completed sessions to regenerate from",
        });
      }

      const latestWeek = playbook.weeks.find(
        (w) => w.id === latestSession.playbookWeekId,
      )!;

      // Determine if we should generate AI plan
      const shouldGenerateAi =
        playbook.hasAiPlan || false || addAiPlan || false;

      // Build context including completed session history
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
        selectedPlans: {
          algorithmic: true,
          ai: shouldGenerateAi,
        },
      };

      const context = await buildPlaybookContext(ctx.db, userId, playbookInput);

      // Generate plans for remaining weeks
      const remainingWeekNumbers = playbook.weeks
        .filter((w) => w.weekNumber > latestWeek.weekNumber)
        .map((w) => w.weekNumber);

      let aiWeeks: WeeklyAiPlan[] | null = null;
      let algorithmicWeeks: WeeklyAlgorithmicPlan[];

      if (shouldGenerateAi) {
        [aiWeeks, algorithmicWeeks] = await Promise.all([
          generateAIPlan(context),
          Promise.resolve(generateAlgorithmicPlan(context)),
        ]);
      } else {
        algorithmicWeeks = generateAlgorithmicPlan(context);
      }

      // Update playbook hasAiPlan if AI was added
      if (addAiPlan && !playbook.hasAiPlan) {
        await ctx.db
          .update(playbooks)
          .set({ hasAiPlan: true, updatedAt: new Date() })
          .where(eq(playbooks.id, playbookId));
      }

      // Update weeks and sessions
      const affectedWeeks = playbook.weeks.filter(
        (w) => w.weekNumber > latestWeek.weekNumber,
      );

      for (const week of affectedWeeks) {
        const aiWeek = aiWeeks?.find((w) => w.weekNumber === week.weekNumber);
        const algoWeek = algorithmicWeeks.find(
          (w) => w.weekNumber === week.weekNumber,
        );

        if (!algoWeek) continue;

        // Update week
        await ctx.db
          .update(playbookWeeks)
          .set({
            aiPlanJson: aiWeek ? JSON.stringify(aiWeek) : week.aiPlanJson,
            algorithmicPlanJson: JSON.stringify(algoWeek),
            volumeTarget: aiWeek?.volumeTarget ?? algoWeek.volumeTarget,
            updatedAt: new Date(),
          })
          .where(eq(playbookWeeks.id, week.id));

        // Update sessions in this week
        const sourcePlan = shouldGenerateAi ? aiWeeks : algorithmicWeeks;
        const weekPlan = sourcePlan?.find(
          (w) => w.weekNumber === week.weekNumber,
        );

        if (weekPlan) {
          for (const session of weekPlan.sessions) {
            await ctx.db
              .update(playbookSessions)
              .set({
                prescribedWorkoutJson: JSON.stringify(session),
                activePlanType: shouldGenerateAi ? "ai" : "algorithmic",
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(playbookSessions.playbookWeekId, week.id),
                  eq(playbookSessions.sessionNumber, session.sessionNumber),
                ),
              );
          }
        }
      }

      // Log regeneration
      await ctx.db.insert(playbookRegenerations).values({
        playbookId,
        triggeredBySessionId: latestSession.id,
        regenerationReason: `Regenerated from session ${latestSession.sessionNumber} of week ${latestWeek.weekNumber}`,
        affectedWeekStart: latestWeek.weekNumber + 1,
        affectedWeekEnd: playbook.duration,
        previousPlanSnapshot: JSON.stringify({
          weeks: affectedWeeks.map((w) => ({
            weekNumber: w.weekNumber,
            aiPlan: w.aiPlanJson ? JSON.parse(w.aiPlanJson) : null,
          })),
        }),
        newPlanSnapshot: JSON.stringify({
          weeks: remainingWeekNumbers.map((weekNum) => {
            const aiWeek = aiWeeks?.find((w) => w.weekNumber === weekNum);
            const algoWeek = algorithmicWeeks.find(
              (w) => w.weekNumber === weekNum,
            );
            return {
              weekNumber: weekNum,
              aiPlan: aiWeek ?? null,
              algorithmicPlan: algoWeek ?? null,
            };
          }),
        }),
        createdAt: new Date(),
      });

      logger.info("Playbook regenerated from latest session", {
        userId,
        playbookId,
        latestSessionId: latestSession.id,
        latestWeekNumber: latestWeek.weekNumber,
        remainingWeeks: remainingWeekNumbers,
        aiPlanAdded: addAiPlan && !playbook.hasAiPlan,
      });

      // Analytics: Track playbook regeneration
      const posthog = getPosthog();
      posthog.capture("playbook.regenerated_from_latest", {
        playbook_id: playbookId,
        latest_session_id: latestSession.id,
        latest_week_number: latestWeek.weekNumber,
        remaining_weeks: remainingWeekNumbers.length,
        ai_plan_added: addAiPlan && !playbook.hasAiPlan,
        user_id: userId,
      });

      return {
        success: true,
        regeneratedWeeks: remainingWeekNumbers,
        aiPlanAdded: addAiPlan && !playbook.hasAiPlan,
      };
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

  updateSessionPlanType: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        planType: activePlanTypeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, planType } = input;

      await ctx.db
        .update(playbookSessions)
        .set({ activePlanType: planType, updatedAt: new Date() })
        .where(eq(playbookSessions.id, sessionId));

      return { success: true };
    }),
});
