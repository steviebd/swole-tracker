import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  workoutSessions,
  sessionExercises,
  workoutTemplates,
  templateExercises,
  playbookSessions,
} from "~/server/db/schema";
import { eq, and, desc, inArray, lt, gte, or, sql } from "drizzle-orm";
import { chunkedBatch, whereInChunks } from "~/server/db/chunk-utils";
import { withAuth } from "./middleware";

const setInputSchema = z.object({
  id: z.string().optional(),
  weight: z.number().optional(),
  reps: z.number().int().positive().optional(),
  sets: z.number().int().positive().default(1),
  unit: z.enum(["kg", "lbs"]).default("kg"),
  rpe: z.number().int().min(1).max(10).optional(),
  rest: z.number().int().positive().optional(),
});

const exerciseInputSchema = z.object({
  templateExerciseId: z.number().optional(),
  exerciseName: z.string().min(1).max(256),
  sets: z.array(setInputSchema),
  unit: z.enum(["kg", "lbs"]).default("kg"),
});

interface PlaybookSessionWithWeek {
  id: number;
  playbookWeekId: number;
  sessionNumber: number;
  sessionDate: Date | null;
  prescribedWorkoutJson: string;
  actualWorkoutId: number | null;
  week: {
    id: number;
    playbookId: number;
    weekNumber: number;
    playbook: {
      name: string;
    };
  };
}

// === GET RECENT WORKOUTS ===
export const getRecentWorkouts = createServerFn({ method: "GET" })
  .inputValidator(z.object({ limit: z.number().int().positive().default(10) }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const limit = data?.limit ?? 10;

    const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);

    await db.delete(workoutSessions).where(
      and(
        eq(workoutSessions.user_id, user.id),
        lt(workoutSessions.createdAt, staleThreshold),
        sql`NOT EXISTS (
            SELECT 1 FROM session_exercise se
            WHERE se.sessionId = ${workoutSessions.id}
              AND se.user_id = ${user.id}
          )`,
      ),
    );

    const sessions = await db.query.workoutSessions.findMany({
      where: and(
        eq(workoutSessions.user_id, user.id),
        sql`EXISTS (
          SELECT 1 FROM session_exercise se
          WHERE se.sessionId = ${workoutSessions.id}
            AND se.user_id = ${user.id}
        )`,
      ),
      orderBy: [desc(workoutSessions.workoutDate)],
      limit,
      columns: {
        id: true,
        workoutDate: true,
        templateId: true,
        createdAt: true,
      },
      with: {
        exercises: {
          columns: {
            id: true,
            exerciseName: true,
            weight: true,
            reps: true,
            sets: true,
            unit: true,
            setOrder: true,
            templateExerciseId: true,
            one_rm_estimate: true,
            volume_load: true,
          },
        },
      },
    });

    const sessionIds = sessions.map((s) => s.id);
    let playbookSessionData: PlaybookSessionWithWeek[] = [];

    if (sessionIds.length > 0) {
      try {
        playbookSessionData = await db.query.playbookSessions.findMany({
          where: inArray(playbookSessions.actualWorkoutId, sessionIds),
          with: {
            week: {
              with: {
                playbook: {
                  columns: {
                    name: true,
                  },
                },
              },
            },
          },
        });
      } catch {
        playbookSessionData = [];
      }
    }

    const playbookSessionMap = new Map(
      playbookSessionData.map((ps) => [
        ps.actualWorkoutId,
        {
          name: ps.week?.playbook?.name,
          weekNumber: ps.week?.weekNumber,
          sessionNumber: ps.sessionNumber,
        },
      ]),
    );

    const templateIds = [
      ...new Set(
        sessions
          .map((s) => s.templateId)
          .filter((id): id is number => id !== null),
      ),
    ];

    const templates =
      templateIds.length > 0
        ? await whereInChunks(templateIds, async (idChunk) => {
            return db.query.workoutTemplates.findMany({
              where: inArray(workoutTemplates.id, idChunk),
              columns: {
                id: true,
                name: true,
              },
              with: {
                exercises: {
                  columns: {
                    id: true,
                    exerciseName: true,
                    orderIndex: true,
                  },
                },
              },
            });
          })
        : [];

    const templateMap = new Map(templates.map((t) => [t.id, t]));

    return sessions.map((session) => {
      const playbookData = playbookSessionMap.get(session.id);
      return {
        ...session,
        template: session.templateId
          ? (templateMap.get(session.templateId) ?? null)
          : null,
        playbook: playbookData?.name
          ? {
              name: playbookData.name,
              weekNumber: playbookData.weekNumber,
              sessionNumber: playbookData.sessionNumber,
            }
          : null,
      };
    });
  });

// === GET WORKOUT BY ID ===
export const getWorkout = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const workout = await db.query.workoutSessions.findFirst({
      where: and(
        eq(workoutSessions.id, data.id),
        eq(workoutSessions.user_id, user.id),
      ),
      columns: {
        id: true,
        workoutDate: true,
        templateId: true,
        user_id: true,
        createdAt: true,
      },
      with: {
        template: {
          columns: {
            id: true,
            name: true,
          },
          with: {
            exercises: {
              columns: {
                id: true,
                exerciseName: true,
                orderIndex: true,
              },
            },
          },
        },
        exercises: {
          columns: {
            id: true,
            exerciseName: true,
            weight: true,
            reps: true,
            sets: true,
            unit: true,
            setOrder: true,
            templateExerciseId: true,
            one_rm_estimate: true,
            volume_load: true,
          },
        },
      },
    });

    if (!workout) {
      throw new Error("Workout not found");
    }

    let playbookSessionData = null;
    try {
      const result = await db.query.playbookSessions.findFirst({
        where: eq(playbookSessions.actualWorkoutId, data.id),
        with: {
          week: {
            with: {
              playbook: {
                columns: {
                  name: true,
                },
              },
            },
          },
        },
      });
      if (result?.week?.playbook?.name) {
        playbookSessionData = {
          name: result.week.playbook.name,
          weekNumber: result.week.weekNumber,
          sessionNumber: result.sessionNumber,
        };
      }
    } catch {
      playbookSessionData = null;
    }

    return {
      ...workout,
      playbook: playbookSessionData,
    };
  });

// === START WORKOUT ===
export const startWorkout = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      templateId: z.number().optional(),
      workoutDate: z.date().default(() => new Date()),
      copyFromSessionId: z.number().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { templateId, workoutDate, copyFromSessionId } = data;

    let template = null;

    if (templateId) {
      const recentSession = await db.query.workoutSessions.findFirst({
        where: and(
          eq(workoutSessions.user_id, user.id),
          eq(workoutSessions.templateId, templateId),
          gte(workoutSessions.workoutDate, new Date(Date.now() - 120000)),
        ),
        orderBy: [desc(workoutSessions.workoutDate)],
        with: {
          exercises: true,
        },
      });

      if (recentSession?.exercises.length === 0) {
        template = await db.query.workoutTemplates.findFirst({
          where: eq(workoutTemplates.id, templateId),
          with: {
            exercises: {
              orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
            },
          },
        });
        return {
          sessionId: recentSession.id,
          template,
        };
      }

      template = await db.query.workoutTemplates.findFirst({
        where: and(
          eq(workoutTemplates.id, templateId),
          eq(workoutTemplates.user_id, user.id),
        ),
        with: {
          exercises: {
            orderBy: (exercises, { asc }) => [asc(exercises.orderIndex)],
          },
        },
      });

      if (!template) {
        throw new Error("Template not found");
      }
    }

    const [session] = await db
      .insert(workoutSessions)
      .values({
        user_id: user.id,
        templateId: templateId || null,
        workoutDate,
      })
      .returning();

    if (!session) {
      throw new Error("Failed to create workout session");
    }

    if (copyFromSessionId) {
      const sourceExercises = await db.query.sessionExercises.findMany({
        where: and(
          eq(sessionExercises.sessionId, copyFromSessionId),
          eq(sessionExercises.user_id, user.id),
        ),
      });

      if (sourceExercises.length > 0) {
        const exerciseRows = sourceExercises.map((ex) => ({
          sessionId: session.id,
          user_id: user.id,
          exerciseName: ex.exerciseName,
          weight: ex.weight,
          reps: ex.reps,
          sets: ex.sets,
          unit: ex.unit,
          setOrder: ex.setOrder,
          templateExerciseId: ex.templateExerciseId,
          one_rm_estimate: ex.one_rm_estimate,
          volume_load: ex.volume_load,
        }));

        await chunkedBatch(db, exerciseRows, (chunk) =>
          db.insert(sessionExercises).values(chunk),
        );
      }
    }

    return {
      sessionId: session.id,
      template,
    };
  });

// === SAVE WORKOUT ===
export const saveWorkout = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      exercises: z.array(exerciseInputSchema),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, exercises } = data;

    const session = await db.query.workoutSessions.findFirst({
      where: and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.user_id, user.id),
      ),
    });

    if (!session) {
      throw new Error("Workout session not found");
    }

    await db
      .delete(sessionExercises)
      .where(eq(sessionExercises.sessionId, sessionId));

    const setsToInsert = exercises.flatMap((exercise) =>
      exercise.sets
        .filter(
          (set) =>
            set.weight !== undefined ||
            set.reps !== undefined ||
            set.rpe !== undefined ||
            set.rest !== undefined,
        )
        .map((set, setIndex) => ({
          sessionId,
          user_id: user.id,
          exerciseName: exercise.exerciseName,
          weight: set.weight ?? null,
          reps: set.reps ?? null,
          sets: set.sets ?? 1,
          unit: exercise.unit,
          setOrder: setIndex,
          templateExerciseId: exercise.templateExerciseId ?? null,
          rpe: set.rpe ?? null,
          rest_seconds: set.rest ?? null,
          is_estimate: false,
          is_default_applied: false,
        })),
    );

    if (setsToInsert.length > 0) {
      await chunkedBatch(db, setsToInsert, (chunk) =>
        db.insert(sessionExercises).values(chunk),
      );
    }

    return { success: true };
  });

// === DELETE WORKOUT ===
export const deleteWorkout = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const session = await db.query.workoutSessions.findFirst({
      where: and(
        eq(workoutSessions.id, data.id),
        eq(workoutSessions.user_id, user.id),
      ),
    });

    if (!session) {
      throw new Error("Workout not found");
    }

    await db.delete(workoutSessions).where(eq(workoutSessions.id, data.id));

    return { success: true };
  });

// === GET LAST EXERCISE DATA ===
export const getLastExerciseData = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      exerciseNames: z.array(z.string()).optional(),
      templateExerciseId: z.number().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { exerciseNames, templateExerciseId } = data ?? {};

    if ((!exerciseNames || exerciseNames.length === 0) && !templateExerciseId) {
      return null;
    }

    const latestSession = await db
      .select({ sessionId: sessionExercises.sessionId })
      .from(sessionExercises)
      .where(eq(sessionExercises.user_id, user.id))
      .orderBy(desc(sessionExercises.id))
      .limit(1);

    if (latestSession.length === 0 || !latestSession[0]) {
      return null;
    }

    const query = db
      .select({
        weight: sessionExercises.weight,
        reps: sessionExercises.reps,
        sets: sessionExercises.sets,
        unit: sessionExercises.unit,
        workoutDate: workoutSessions.workoutDate,
      })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(sessionExercises.sessionId, workoutSessions.id),
      )
      .where(
        and(
          eq(sessionExercises.sessionId, latestSession[0].sessionId),
          eq(sessionExercises.user_id, user.id),
          or(
            exerciseNames && exerciseNames.length > 0
              ? inArray(sessionExercises.exerciseName, exerciseNames)
              : sql`false`,
            templateExerciseId
              ? eq(sessionExercises.templateExerciseId, templateExerciseId)
              : sql`false`,
          ),
        ),
      )
      .orderBy(desc(sessionExercises.weight))
      .limit(1);

    const performance = await query;

    return performance[0]
      ? {
          weight: performance[0].weight,
          reps: performance[0].reps,
          sets: performance[0].sets,
          unit: performance[0].unit,
          workoutDate: performance[0].workoutDate,
        }
      : null;
  });

// === ADD EXERCISE TO WORKOUT ===
export const addExercise = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      exerciseName: z.string().min(1).max(256),
      templateExerciseId: z.number().optional(),
      unit: z.enum(["kg", "lbs"]).default("kg"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, exerciseName, templateExerciseId, unit } = data;

    const session = await db.query.workoutSessions.findFirst({
      where: and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.user_id, user.id),
      ),
    });

    if (!session) {
      throw new Error("Workout session not found");
    }

    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`MAX(${sessionExercises.setOrder})` })
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionId, sessionId));

    const maxOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    await db.insert(sessionExercises).values({
      sessionId,
      user_id: user.id,
      exerciseName,
      templateExerciseId: templateExerciseId ?? null,
      unit,
      setOrder: maxOrder,
    });

    const exercise = await db.query.sessionExercises.findFirst({
      where: and(
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionExercises.setOrder, maxOrder),
      ),
    });

    return exercise;
  });

// === UPDATE EXERCISE ===
export const updateExercise = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      exerciseId: z.number(),
      exerciseName: z.string().min(1).max(256).optional(),
      templateExerciseId: z.number().optional().nullable(),
      unit: z.enum(["kg", "lbs"]).optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, exerciseId, exerciseName, templateExerciseId, unit } =
      data;

    const exercise = await db.query.sessionExercises.findFirst({
      where: and(
        eq(sessionExercises.id, exerciseId),
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionExercises.user_id, user.id),
      ),
    });

    if (!exercise) {
      throw new Error("Exercise not found");
    }

    await db
      .update(sessionExercises)
      .set({
        ...(exerciseName !== undefined && { exerciseName }),
        ...(templateExerciseId !== undefined && {
          templateExerciseId: templateExerciseId ?? null,
        }),
        ...(unit !== undefined && { unit }),
      })
      .where(eq(sessionExercises.id, exerciseId));

    return db.query.sessionExercises.findFirst({
      where: eq(sessionExercises.id, exerciseId),
    });
  });

// === REMOVE EXERCISE ===
export const removeExercise = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      exerciseId: z.number(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, exerciseId } = data;

    const exercise = await db.query.sessionExercises.findFirst({
      where: and(
        eq(sessionExercises.id, exerciseId),
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionExercises.user_id, user.id),
      ),
    });

    if (!exercise) {
      throw new Error("Exercise not found");
    }

    await db
      .delete(sessionExercises)
      .where(eq(sessionExercises.id, exerciseId));

    return { success: true };
  });

// === ADD SET ===
export const addSet = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      exerciseId: z.number(),
      weight: z.number().optional(),
      reps: z.number().int().positive().optional(),
      sets: z.number().int().positive().default(1),
      unit: z.enum(["kg", "lbs"]).default("kg"),
      rpe: z.number().int().min(1).max(10).optional(),
      rest: z.number().int().positive().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, exerciseId, weight, reps, sets, unit, rpe, rest } = data;

    const exercise = await db.query.sessionExercises.findFirst({
      where: and(
        eq(sessionExercises.id, exerciseId),
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionExercises.user_id, user.id),
      ),
    });

    if (!exercise) {
      throw new Error("Exercise not found");
    }

    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`MAX(${sessionExercises.setOrder})` })
      .from(sessionExercises)
      .where(eq(sessionExercises.sessionId, sessionId));

    const maxOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    await db.insert(sessionExercises).values({
      sessionId,
      user_id: user.id,
      exerciseName: exercise.exerciseName,
      templateExerciseId: exercise.templateExerciseId,
      unit,
      setOrder: maxOrder,
      weight: weight ?? null,
      reps: reps ?? null,
      sets: sets ?? 1,
      rpe: rpe ?? null,
      rest_seconds: rest ?? null,
      resolvedExerciseName: exercise.resolvedExerciseName,
    });

    return db.query.sessionExercises.findFirst({
      where: and(
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionExercises.setOrder, maxOrder),
      ),
    });
  });

// === UPDATE SET ===
export const updateSet = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      exerciseId: z.number(),
      setId: z.number(),
      weight: z.number().optional().nullable(),
      reps: z.number().int().positive().optional().nullable(),
      sets: z.number().int().positive().optional().nullable(),
      unit: z.enum(["kg", "lbs"]).optional(),
      rpe: z.number().int().min(1).max(10).optional().nullable(),
      rest: z.number().int().positive().optional().nullable(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, setId, weight, reps, sets, unit, rpe, rest } = data;

    const set = await db.query.sessionExercises.findFirst({
      where: and(
        eq(sessionExercises.id, setId),
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionExercises.user_id, user.id),
      ),
    });

    if (!set) {
      throw new Error("Set not found");
    }

    await db
      .update(sessionExercises)
      .set({
        ...(weight !== undefined && { weight }),
        ...(reps !== undefined && { reps }),
        ...(sets !== undefined && { sets }),
        ...(unit !== undefined && { unit }),
        ...(rpe !== undefined && { rpe }),
        ...(rest !== undefined && { rest_seconds: rest }),
      })
      .where(eq(sessionExercises.id, setId));

    return db.query.sessionExercises.findFirst({
      where: eq(sessionExercises.id, setId),
    });
  });

// === DELETE SET ===
export const deleteSet = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      setId: z.number(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, setId } = data;

    const set = await db.query.sessionExercises.findFirst({
      where: and(
        eq(sessionExercises.id, setId),
        eq(sessionExercises.sessionId, sessionId),
        eq(sessionExercises.user_id, user.id),
      ),
    });

    if (!set) {
      throw new Error("Set not found");
    }

    await db.delete(sessionExercises).where(eq(sessionExercises.id, setId));

    return { success: true };
  });
