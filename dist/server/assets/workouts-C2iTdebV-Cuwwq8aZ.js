import { c as createServerRpc } from "./createServerRpc-Bd3B-Ah9-C8t3QJ6i.js";
import { a as and, e as eq, h as sessionExercises, s as sql, b as workoutSessions, d as desc, o as or, f as inArray, l as lt, p as playbookSessions, g as gte, w as workoutTemplates } from "./session-cookie-y6_dLywe-dJqk9W7A.js";
import { w as whereInChunks, c as chunkedBatch } from "./chunk-utils-DONcBtfE-DONcBtfE.js";
import { w as withAuth } from "./middleware-C0nuZrz9-3s0fDIfv.js";
import { c as createServerFn } from "./worker-entry-_S0z7k3x.js";
import { o as object, n as number, _ as _enum, b as array, s as string, d as date } from "./schemas-Dk_VZEFo.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
const setInputSchema = object({
  id: string().optional(),
  weight: number().optional(),
  reps: number().int().positive().optional(),
  sets: number().int().positive().default(1),
  unit: _enum(["kg", "lbs"]).default("kg"),
  rpe: number().int().min(1).max(10).optional(),
  rest: number().int().positive().optional()
});
const exerciseInputSchema = object({
  templateExerciseId: number().optional(),
  exerciseName: string().min(1).max(256),
  sets: array(setInputSchema),
  unit: _enum(["kg", "lbs"]).default("kg")
});
const getRecentWorkouts_createServerFn_handler = createServerRpc({
  id: "fd51064e077a7e2c5410450d538d184cd913a23e3a3ec6270cc8d321a0dd35c4",
  name: "getRecentWorkouts",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => getRecentWorkouts.__executeServer(opts, signal));
const getRecentWorkouts = createServerFn({
  method: "GET"
}).inputValidator(object({
  limit: number().int().positive().default(10)
})).middleware([withAuth]).handler(getRecentWorkouts_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const limit = data?.limit ?? 10;
  const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1e3);
  await db.delete(workoutSessions).where(and(eq(workoutSessions.user_id, user.id), lt(workoutSessions.createdAt, staleThreshold), sql`NOT EXISTS (
            SELECT 1 FROM session_exercise se
            WHERE se.sessionId = ${workoutSessions.id}
              AND se.user_id = ${user.id}
          )`));
  const sessions = await db.query.workoutSessions.findMany({
    where: and(eq(workoutSessions.user_id, user.id), sql`EXISTS (
          SELECT 1 FROM session_exercise se
          WHERE se.sessionId = ${workoutSessions.id}
            AND se.user_id = ${user.id}
        )`),
    orderBy: [desc(workoutSessions.workoutDate)],
    limit,
    columns: {
      id: true,
      workoutDate: true,
      templateId: true,
      createdAt: true
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
          volume_load: true
        }
      }
    }
  });
  const sessionIds = sessions.map((s) => s.id);
  let playbookSessionData = [];
  if (sessionIds.length > 0) {
    try {
      playbookSessionData = await db.query.playbookSessions.findMany({
        where: inArray(playbookSessions.actualWorkoutId, sessionIds),
        with: {
          week: {
            with: {
              playbook: {
                columns: {
                  name: true
                }
              }
            }
          }
        }
      });
    } catch {
      playbookSessionData = [];
    }
  }
  const playbookSessionMap = new Map(playbookSessionData.map((ps) => [ps.actualWorkoutId, {
    name: ps.week?.playbook?.name,
    weekNumber: ps.week?.weekNumber,
    sessionNumber: ps.sessionNumber
  }]));
  const templateIds = [...new Set(sessions.map((s) => s.templateId).filter((id) => id !== null))];
  const templates = templateIds.length > 0 ? await whereInChunks(templateIds, async (idChunk) => {
    return db.query.workoutTemplates.findMany({
      where: inArray(workoutTemplates.id, idChunk),
      columns: {
        id: true,
        name: true
      },
      with: {
        exercises: {
          columns: {
            id: true,
            exerciseName: true,
            orderIndex: true
          }
        }
      }
    });
  }) : [];
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  return sessions.map((session) => {
    const playbookData = playbookSessionMap.get(session.id);
    return {
      ...session,
      template: session.templateId ? templateMap.get(session.templateId) ?? null : null,
      playbook: playbookData?.name ? {
        name: playbookData.name,
        weekNumber: playbookData.weekNumber,
        sessionNumber: playbookData.sessionNumber
      } : null
    };
  });
});
const getWorkout_createServerFn_handler = createServerRpc({
  id: "cbd05d3b6e9d4d9a4467af432428ff3ec9668fc1ccf7f11702b49207a36fb60d",
  name: "getWorkout",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => getWorkout.__executeServer(opts, signal));
const getWorkout = createServerFn({
  method: "GET"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(getWorkout_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const workout = await db.query.workoutSessions.findFirst({
    where: and(eq(workoutSessions.id, data.id), eq(workoutSessions.user_id, user.id)),
    columns: {
      id: true,
      workoutDate: true,
      templateId: true,
      user_id: true,
      createdAt: true
    },
    with: {
      template: {
        columns: {
          id: true,
          name: true
        },
        with: {
          exercises: {
            columns: {
              id: true,
              exerciseName: true,
              orderIndex: true
            }
          }
        }
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
          volume_load: true
        }
      }
    }
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
                name: true
              }
            }
          }
        }
      }
    });
    if (result?.week?.playbook?.name) {
      playbookSessionData = {
        name: result.week.playbook.name,
        weekNumber: result.week.weekNumber,
        sessionNumber: result.sessionNumber
      };
    }
  } catch {
    playbookSessionData = null;
  }
  return {
    ...workout,
    playbook: playbookSessionData
  };
});
const startWorkout_createServerFn_handler = createServerRpc({
  id: "55efdfc67e8d94993c01213abf20e83bbf2b7c210b536b79494dfd1520cb1817",
  name: "startWorkout",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => startWorkout.__executeServer(opts, signal));
const startWorkout = createServerFn({
  method: "POST"
}).inputValidator(object({
  templateId: number().optional(),
  workoutDate: date().default(() => /* @__PURE__ */ new Date()),
  copyFromSessionId: number().optional()
})).middleware([withAuth]).handler(startWorkout_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    templateId,
    workoutDate,
    copyFromSessionId
  } = data;
  let template = null;
  if (templateId) {
    const recentSession = await db.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.user_id, user.id), eq(workoutSessions.templateId, templateId), gte(workoutSessions.workoutDate, new Date(Date.now() - 12e4))),
      orderBy: [desc(workoutSessions.workoutDate)],
      with: {
        exercises: true
      }
    });
    if (recentSession?.exercises.length === 0) {
      template = await db.query.workoutTemplates.findFirst({
        where: eq(workoutTemplates.id, templateId),
        with: {
          exercises: {
            orderBy: (exercises, {
              asc
            }) => [asc(exercises.orderIndex)]
          }
        }
      });
      return {
        sessionId: recentSession.id,
        template
      };
    }
    template = await db.query.workoutTemplates.findFirst({
      where: and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.user_id, user.id)),
      with: {
        exercises: {
          orderBy: (exercises, {
            asc
          }) => [asc(exercises.orderIndex)]
        }
      }
    });
    if (!template) {
      throw new Error("Template not found");
    }
  }
  const [session] = await db.insert(workoutSessions).values({
    user_id: user.id,
    templateId: templateId || null,
    workoutDate
  }).returning();
  if (!session) {
    throw new Error("Failed to create workout session");
  }
  if (copyFromSessionId) {
    const sourceExercises = await db.query.sessionExercises.findMany({
      where: and(eq(sessionExercises.sessionId, copyFromSessionId), eq(sessionExercises.user_id, user.id))
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
        volume_load: ex.volume_load
      }));
      await chunkedBatch(db, exerciseRows, (chunk) => db.insert(sessionExercises).values(chunk));
    }
  }
  return {
    sessionId: session.id,
    template
  };
});
const saveWorkout_createServerFn_handler = createServerRpc({
  id: "9b45fe33fa458a8d12a12b0f790fd4e5d3cfbf535a2aa0af1ac1128f23fb59b5",
  name: "saveWorkout",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => saveWorkout.__executeServer(opts, signal));
const saveWorkout = createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exercises: array(exerciseInputSchema)
})).middleware([withAuth]).handler(saveWorkout_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    sessionId,
    exercises
  } = data;
  const session = await db.query.workoutSessions.findFirst({
    where: and(eq(workoutSessions.id, sessionId), eq(workoutSessions.user_id, user.id))
  });
  if (!session) {
    throw new Error("Workout session not found");
  }
  await db.delete(sessionExercises).where(eq(sessionExercises.sessionId, sessionId));
  const setsToInsert = exercises.flatMap((exercise) => exercise.sets.filter((set) => set.weight !== void 0 || set.reps !== void 0 || set.rpe !== void 0 || set.rest !== void 0).map((set, setIndex) => ({
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
    is_default_applied: false
  })));
  if (setsToInsert.length > 0) {
    await chunkedBatch(db, setsToInsert, (chunk) => db.insert(sessionExercises).values(chunk));
  }
  return {
    success: true
  };
});
const deleteWorkout_createServerFn_handler = createServerRpc({
  id: "2c6c4a36fac579d6a56e784c3cfa8d3d179fe2429aa741eb7a8a21bccbcdd4ea",
  name: "deleteWorkout",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => deleteWorkout.__executeServer(opts, signal));
const deleteWorkout = createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(deleteWorkout_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const session = await db.query.workoutSessions.findFirst({
    where: and(eq(workoutSessions.id, data.id), eq(workoutSessions.user_id, user.id))
  });
  if (!session) {
    throw new Error("Workout not found");
  }
  await db.delete(workoutSessions).where(eq(workoutSessions.id, data.id));
  return {
    success: true
  };
});
const getLastExerciseData_createServerFn_handler = createServerRpc({
  id: "084dd54fcd0d58a1a6c106ea10b347a65cbaabb724652b220009787bc3a133c7",
  name: "getLastExerciseData",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => getLastExerciseData.__executeServer(opts, signal));
const getLastExerciseData = createServerFn({
  method: "GET"
}).inputValidator(object({
  exerciseNames: array(string()).optional(),
  templateExerciseId: number().optional()
})).middleware([withAuth]).handler(getLastExerciseData_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    exerciseNames,
    templateExerciseId
  } = data ?? {};
  if ((!exerciseNames || exerciseNames.length === 0) && !templateExerciseId) {
    return null;
  }
  const latestSession = await db.select({
    sessionId: sessionExercises.sessionId
  }).from(sessionExercises).where(eq(sessionExercises.user_id, user.id)).orderBy(desc(sessionExercises.id)).limit(1);
  if (latestSession.length === 0 || !latestSession[0]) {
    return null;
  }
  const query = db.select({
    weight: sessionExercises.weight,
    reps: sessionExercises.reps,
    sets: sessionExercises.sets,
    unit: sessionExercises.unit,
    workoutDate: workoutSessions.workoutDate
  }).from(sessionExercises).innerJoin(workoutSessions, eq(sessionExercises.sessionId, workoutSessions.id)).where(and(eq(sessionExercises.sessionId, latestSession[0].sessionId), eq(sessionExercises.user_id, user.id), or(exerciseNames && exerciseNames.length > 0 ? inArray(sessionExercises.exerciseName, exerciseNames) : sql`false`, templateExerciseId ? eq(sessionExercises.templateExerciseId, templateExerciseId) : sql`false`))).orderBy(desc(sessionExercises.weight)).limit(1);
  const performance = await query;
  return performance[0] ? {
    weight: performance[0].weight,
    reps: performance[0].reps,
    sets: performance[0].sets,
    unit: performance[0].unit,
    workoutDate: performance[0].workoutDate
  } : null;
});
const addExercise_createServerFn_handler = createServerRpc({
  id: "144b739c4e6847ddfc29a2db156e0bc77a03e853a5310115fbf3017116247b16",
  name: "addExercise",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => addExercise.__executeServer(opts, signal));
const addExercise = createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseName: string().min(1).max(256),
  templateExerciseId: number().optional(),
  unit: _enum(["kg", "lbs"]).default("kg")
})).middleware([withAuth]).handler(addExercise_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    sessionId,
    exerciseName,
    templateExerciseId,
    unit
  } = data;
  const session = await db.query.workoutSessions.findFirst({
    where: and(eq(workoutSessions.id, sessionId), eq(workoutSessions.user_id, user.id))
  });
  if (!session) {
    throw new Error("Workout session not found");
  }
  const maxOrderResult = await db.select({
    maxOrder: sql`MAX(${sessionExercises.setOrder})`
  }).from(sessionExercises).where(eq(sessionExercises.sessionId, sessionId));
  const maxOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
  await db.insert(sessionExercises).values({
    sessionId,
    user_id: user.id,
    exerciseName,
    templateExerciseId: templateExerciseId ?? null,
    unit,
    setOrder: maxOrder
  });
  const exercise = await db.query.sessionExercises.findFirst({
    where: and(eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.setOrder, maxOrder))
  });
  return exercise;
});
const updateExercise_createServerFn_handler = createServerRpc({
  id: "ed37380a60c0937a5841118f118b5fabc26138055aece9b67e48c24c2f20561b",
  name: "updateExercise",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => updateExercise.__executeServer(opts, signal));
const updateExercise = createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number(),
  exerciseName: string().min(1).max(256).optional(),
  templateExerciseId: number().optional().nullable(),
  unit: _enum(["kg", "lbs"]).optional()
})).middleware([withAuth]).handler(updateExercise_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    sessionId,
    exerciseId,
    exerciseName,
    templateExerciseId,
    unit
  } = data;
  const exercise = await db.query.sessionExercises.findFirst({
    where: and(eq(sessionExercises.id, exerciseId), eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.user_id, user.id))
  });
  if (!exercise) {
    throw new Error("Exercise not found");
  }
  await db.update(sessionExercises).set({
    ...exerciseName !== void 0 && {
      exerciseName
    },
    ...templateExerciseId !== void 0 && {
      templateExerciseId: templateExerciseId ?? null
    },
    ...unit !== void 0 && {
      unit
    }
  }).where(eq(sessionExercises.id, exerciseId));
  return db.query.sessionExercises.findFirst({
    where: eq(sessionExercises.id, exerciseId)
  });
});
const removeExercise_createServerFn_handler = createServerRpc({
  id: "3753f848ef10f4aa549312d5ecc266828b151f16d860119bd66f4761a066b144",
  name: "removeExercise",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => removeExercise.__executeServer(opts, signal));
const removeExercise = createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number()
})).middleware([withAuth]).handler(removeExercise_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    sessionId,
    exerciseId
  } = data;
  const exercise = await db.query.sessionExercises.findFirst({
    where: and(eq(sessionExercises.id, exerciseId), eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.user_id, user.id))
  });
  if (!exercise) {
    throw new Error("Exercise not found");
  }
  await db.delete(sessionExercises).where(eq(sessionExercises.id, exerciseId));
  return {
    success: true
  };
});
const addSet_createServerFn_handler = createServerRpc({
  id: "33ab049565bbfc9bddffc879283f4a68cb4e0f70096af31e32228bc27e0871fb",
  name: "addSet",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => addSet.__executeServer(opts, signal));
const addSet = createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number(),
  weight: number().optional(),
  reps: number().int().positive().optional(),
  sets: number().int().positive().default(1),
  unit: _enum(["kg", "lbs"]).default("kg"),
  rpe: number().int().min(1).max(10).optional(),
  rest: number().int().positive().optional()
})).middleware([withAuth]).handler(addSet_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    sessionId,
    exerciseId,
    weight,
    reps,
    sets,
    unit,
    rpe,
    rest
  } = data;
  const exercise = await db.query.sessionExercises.findFirst({
    where: and(eq(sessionExercises.id, exerciseId), eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.user_id, user.id))
  });
  if (!exercise) {
    throw new Error("Exercise not found");
  }
  const maxOrderResult = await db.select({
    maxOrder: sql`MAX(${sessionExercises.setOrder})`
  }).from(sessionExercises).where(eq(sessionExercises.sessionId, sessionId));
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
    resolvedExerciseName: exercise.resolvedExerciseName
  });
  return db.query.sessionExercises.findFirst({
    where: and(eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.setOrder, maxOrder))
  });
});
const updateSet_createServerFn_handler = createServerRpc({
  id: "bfda402f223b530d3e6c1e56832336ec22946c59e9cea18601f5ce7b8cff9392",
  name: "updateSet",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => updateSet.__executeServer(opts, signal));
const updateSet = createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  exerciseId: number(),
  setId: number(),
  weight: number().optional().nullable(),
  reps: number().int().positive().optional().nullable(),
  sets: number().int().positive().optional().nullable(),
  unit: _enum(["kg", "lbs"]).optional(),
  rpe: number().int().min(1).max(10).optional().nullable(),
  rest: number().int().positive().optional().nullable()
})).middleware([withAuth]).handler(updateSet_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    sessionId,
    setId,
    weight,
    reps,
    sets,
    unit,
    rpe,
    rest
  } = data;
  const set = await db.query.sessionExercises.findFirst({
    where: and(eq(sessionExercises.id, setId), eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.user_id, user.id))
  });
  if (!set) {
    throw new Error("Set not found");
  }
  await db.update(sessionExercises).set({
    ...weight !== void 0 && {
      weight
    },
    ...reps !== void 0 && {
      reps
    },
    ...sets !== void 0 && {
      sets
    },
    ...unit !== void 0 && {
      unit
    },
    ...rpe !== void 0 && {
      rpe
    },
    ...rest !== void 0 && {
      rest_seconds: rest
    }
  }).where(eq(sessionExercises.id, setId));
  return db.query.sessionExercises.findFirst({
    where: eq(sessionExercises.id, setId)
  });
});
const deleteSet_createServerFn_handler = createServerRpc({
  id: "43e80a2d24c6616ce4a99caf445291d76a3d9757e37805f100474be2cff77a7f",
  name: "deleteSet",
  filename: "src/server/functions/workouts.ts"
}, (opts, signal) => deleteSet.__executeServer(opts, signal));
const deleteSet = createServerFn({
  method: "POST"
}).inputValidator(object({
  sessionId: number(),
  setId: number()
})).middleware([withAuth]).handler(deleteSet_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const {
    sessionId,
    setId
  } = data;
  const set = await db.query.sessionExercises.findFirst({
    where: and(eq(sessionExercises.id, setId), eq(sessionExercises.sessionId, sessionId), eq(sessionExercises.user_id, user.id))
  });
  if (!set) {
    throw new Error("Set not found");
  }
  await db.delete(sessionExercises).where(eq(sessionExercises.id, setId));
  return {
    success: true
  };
});
export {
  addExercise_createServerFn_handler,
  addSet_createServerFn_handler,
  deleteSet_createServerFn_handler,
  deleteWorkout_createServerFn_handler,
  getLastExerciseData_createServerFn_handler,
  getRecentWorkouts_createServerFn_handler,
  getWorkout_createServerFn_handler,
  removeExercise_createServerFn_handler,
  saveWorkout_createServerFn_handler,
  startWorkout_createServerFn_handler,
  updateExercise_createServerFn_handler,
  updateSet_createServerFn_handler
};
