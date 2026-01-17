import { c as createServerRpc } from "./createServerRpc-Bd3B-Ah9-C8t3QJ6i.js";
import { w as withAuth } from "./middleware-C0nuZrz9-3s0fDIfv.js";
import { s as sql, i as is, C as Column, w as workoutTemplates, e as eq, a as and, b as workoutSessions, d as desc, c as asc, t as templateExercises, f as inArray } from "./session-cookie-y6_dLywe-dJqk9W7A.js";
import { c as chunkedBatch, w as whereInChunks } from "./chunk-utils-DONcBtfE-DONcBtfE.js";
import { c as createServerFn } from "./worker-entry-_S0z7k3x.js";
import { o as object, r as record, a as any, s as string, b as array, n as number, _ as _enum } from "./schemas-Dk_VZEFo.js";
import "node:events";
import "node:stream";
import "node:async_hooks";
import "node:stream/web";
function count(expression) {
  return sql`count(${expression || sql.raw("*")})`.mapWith(Number);
}
function max(expression) {
  return sql`max(${expression})`.mapWith(is(expression, Column) ? expression : String);
}
const getTemplates_createServerFn_handler = createServerRpc({
  id: "0d10ec2bf434c6a63c6025f4e70d8057daa98775c0451fea477b00b9354371f4",
  name: "getTemplates",
  filename: "src/server/functions/templates.ts"
}, (opts, signal) => getTemplates.__executeServer(opts, signal));
const getTemplates = createServerFn({
  method: "GET"
}).inputValidator(object({
  search: string().max(120).optional(),
  sort: _enum(["recent", "lastUsed", "mostUsed", "name"]).default("recent")
}).optional()).middleware([withAuth]).handler(getTemplates_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const input = data ?? {
    search: void 0,
    sort: "recent"
  };
  const searchTerm = input.search?.trim();
  const sort = input.sort ?? "recent";
  const whereCondition = searchTerm ? and(eq(workoutTemplates.user_id, user.id), sql`LOWER(${workoutTemplates.name}) LIKE LOWER(${`%${searchTerm}%`})`) : eq(workoutTemplates.user_id, user.id);
  const queryBuilder = db.select({
    template: workoutTemplates,
    lastUsed: max(workoutSessions.workoutDate).as("lastUsed"),
    totalSessions: count(workoutSessions.id).as("totalSessions")
  }).from(workoutTemplates).leftJoin(workoutSessions, eq(workoutTemplates.id, workoutSessions.templateId)).where(whereCondition).groupBy(workoutTemplates.id);
  switch (sort) {
    case "lastUsed":
      queryBuilder.orderBy(desc(max(workoutSessions.workoutDate)));
      break;
    case "mostUsed":
      queryBuilder.orderBy(desc(count(workoutSessions.id)));
      break;
    case "name":
      queryBuilder.orderBy(asc(workoutTemplates.name));
      break;
    default:
      queryBuilder.orderBy(desc(workoutTemplates.createdAt));
  }
  const results = await queryBuilder;
  const templateIds = results.map((row) => row.template.id);
  if (templateIds.length === 0) {
    return [];
  }
  const templates = await whereInChunks(templateIds, async (idChunk) => {
    return db.query.workoutTemplates.findMany({
      where: inArray(workoutTemplates.id, idChunk),
      with: {
        exercises: {
          orderBy: (exercises, {
            asc: asc2
          }) => [asc2(exercises.orderIndex)]
        }
      }
    });
  });
  const statsByTemplate = new Map(results.map((row) => [row.template.id, {
    lastUsed: row.lastUsed ?? null,
    totalSessions: Number(row.totalSessions ?? 0)
  }]));
  return templates.map((t) => ({
    ...t,
    ...statsByTemplate.get(t.id)
  }));
});
const getTemplate_createServerFn_handler = createServerRpc({
  id: "e2e3d77d332e133902a398ee645ee7f1cd2d034180f8d86df13159f9e3a181eb",
  name: "getTemplate",
  filename: "src/server/functions/templates.ts"
}, (opts, signal) => getTemplate.__executeServer(opts, signal));
const getTemplate = createServerFn({
  method: "GET"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(getTemplate_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const template = await db.query.workoutTemplates.findFirst({
    where: and(eq(workoutTemplates.id, data.id), eq(workoutTemplates.user_id, user.id)),
    with: {
      exercises: {
        orderBy: (exercises, {
          asc: asc2
        }) => [asc2(exercises.orderIndex)]
      }
    }
  });
  if (!template) {
    throw new Error("Template not found");
  }
  return template;
});
const createTemplate_createServerFn_handler = createServerRpc({
  id: "d4d3c0cc524945cea68f72c47f6c715061cde53014bbfeeb760dc13d61761b84",
  name: "createTemplate",
  filename: "src/server/functions/templates.ts"
}, (opts, signal) => createTemplate.__executeServer(opts, signal));
const createTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  name: string().min(1).max(256),
  exercises: array(string().min(1).max(256)),
  dedupeKey: string().optional(),
  warmupConfig: record(string(), any()).optional()
})).middleware([withAuth]).handler(createTemplate_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const [created] = await db.insert(workoutTemplates).values({
    name: data.name,
    user_id: user.id,
    warmupConfig: data.warmupConfig ? JSON.stringify(data.warmupConfig) : null
  }).returning();
  if (!created) {
    throw new Error("Failed to create template");
  }
  if (data.exercises.length > 0) {
    const exerciseRows = data.exercises.map((name, index) => ({
      user_id: user.id,
      templateId: created.id,
      exerciseName: name,
      orderIndex: index,
      linkingRejected: false
    }));
    await chunkedBatch(db, exerciseRows, (chunk) => db.insert(templateExercises).values(chunk));
  }
  return db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, created.id),
    with: {
      exercises: {
        orderBy: (exercises, {
          asc: asc2
        }) => [asc2(exercises.orderIndex)]
      }
    }
  });
});
const updateTemplate_createServerFn_handler = createServerRpc({
  id: "75f0b852d5fc0e020075f08dec218ab3c33d26b90fa8924ee1d9ec1cf2715da9",
  name: "updateTemplate",
  filename: "src/server/functions/templates.ts"
}, (opts, signal) => updateTemplate.__executeServer(opts, signal));
const updateTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number(),
  name: string().min(1).max(256),
  exercises: array(string().min(1).max(256)),
  warmupConfig: record(string(), any()).optional()
})).middleware([withAuth]).handler(updateTemplate_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const existing = await db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, data.id)
  });
  if (!existing || existing.user_id !== user.id) {
    return {
      success: true,
      alreadyDeleted: true
    };
  }
  await db.update(workoutTemplates).set({
    name: data.name,
    warmupConfig: data.warmupConfig ? JSON.stringify(data.warmupConfig) : null
  }).where(eq(workoutTemplates.id, data.id));
  await db.delete(templateExercises).where(eq(templateExercises.templateId, data.id));
  if (data.exercises.length > 0) {
    const exerciseRows = data.exercises.map((name, index) => ({
      user_id: user.id,
      templateId: data.id,
      exerciseName: name,
      orderIndex: index,
      linkingRejected: false
    }));
    await chunkedBatch(db, exerciseRows, (chunk) => db.insert(templateExercises).values(chunk));
  }
  return {
    success: true
  };
});
const deleteTemplate_createServerFn_handler = createServerRpc({
  id: "409eddae35c415ebcff85c9c16763eab8439fca2d738be603106039a3431c4f3",
  name: "deleteTemplate",
  filename: "src/server/functions/templates.ts"
}, (opts, signal) => deleteTemplate.__executeServer(opts, signal));
const deleteTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(deleteTemplate_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const existing = await db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, data.id)
  });
  if (!existing || existing.user_id !== user.id) {
    return {
      success: true,
      alreadyDeleted: true
    };
  }
  await db.delete(workoutTemplates).where(eq(workoutTemplates.id, data.id));
  return {
    success: true
  };
});
const duplicateTemplate_createServerFn_handler = createServerRpc({
  id: "fbea046e6c5c27f1263dce4ac18d00dcd1f56336cbf0f741f248713b27615601",
  name: "duplicateTemplate",
  filename: "src/server/functions/templates.ts"
}, (opts, signal) => duplicateTemplate.__executeServer(opts, signal));
const duplicateTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number(),
  name: string().min(1).max(256).optional()
})).middleware([withAuth]).handler(duplicateTemplate_createServerFn_handler, async ({
  context,
  data
}) => {
  const {
    db,
    user
  } = context;
  const original = await db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, data.id),
    with: {
      exercises: {
        orderBy: (exercises, {
          asc: asc2
        }) => [asc2(exercises.orderIndex)]
      }
    }
  });
  if (!original || original.user_id !== user.id) {
    throw new Error("Template not found");
  }
  const baseName = data.name?.trim() || `${original.name} Copy`;
  const [created] = await db.insert(workoutTemplates).values({
    name: baseName,
    user_id: user.id
  }).returning();
  if (!created) {
    throw new Error("Failed to duplicate template");
  }
  if (original.exercises.length > 0) {
    const exerciseRows = original.exercises.map((ex) => ({
      user_id: user.id,
      templateId: created.id,
      exerciseName: ex.exerciseName,
      orderIndex: ex.orderIndex,
      linkingRejected: ex.linkingRejected ?? false
    }));
    await chunkedBatch(db, exerciseRows, (chunk) => db.insert(templateExercises).values(chunk));
  }
  return db.query.workoutTemplates.findFirst({
    where: eq(workoutTemplates.id, created.id),
    with: {
      exercises: {
        orderBy: (exercises, {
          asc: asc2
        }) => [asc2(exercises.orderIndex)]
      }
    }
  });
});
export {
  createTemplate_createServerFn_handler,
  deleteTemplate_createServerFn_handler,
  duplicateTemplate_createServerFn_handler,
  getTemplate_createServerFn_handler,
  getTemplates_createServerFn_handler,
  updateTemplate_createServerFn_handler
};
