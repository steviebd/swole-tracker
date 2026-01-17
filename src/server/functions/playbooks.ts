import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { playbooks, playbookWeeks, playbookSessions } from "~/server/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { withAuth } from "./middleware";

// === GET ALL PLAYBOOKS ===
export const getAllPlaybooks = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      status: z.enum(["draft", "active", "completed"]).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { status, limit } = data ?? { limit: 10 };

    const where = status
      ? and(eq(playbooks.userId, user.id), eq(playbooks.status, status))
      : eq(playbooks.userId, user.id);

    const results = await db
      .select()
      .from(playbooks)
      .where(where)
      .orderBy(desc(playbooks.createdAt))
      .limit(limit);

    return results.map((playbook) => ({
      ...playbook,
      targetIds: JSON.parse(playbook.targetIds),
      metadata: playbook.metadata ? JSON.parse(playbook.metadata) : null,
    }));
  });

// === GET PLAYBOOK BY ID ===
export const getPlaybookById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { id } = data!;

    const playbook = await db.query.playbooks.findFirst({
      where: and(eq(playbooks.id, id), eq(playbooks.userId, user.id)),
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
      throw new Error("Playbook not found");
    }

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
        sessions: week.sessions.map((session) => ({
          ...session,
          prescribedWorkout: JSON.parse(session.prescribedWorkoutJson),
        })),
      })),
    };
  });

// === CREATE PLAYBOOK ===
export const createPlaybook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(256),
      goalText: z.string().optional(),
      goalPreset: z.string().optional(),
      targetType: z.enum(["template", "exercise"]),
      targetIds: z.array(z.number()),
      duration: z.number().int().positive().max(52),
      selectedPlans: z.object({
        algorithmic: z.boolean(),
        ai: z.boolean(),
      }),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;

    const [playbook] = await db
      .insert(playbooks)
      .values({
        userId: user.id,
        name: data.name,
        goalText: data.goalText ?? null,
        goalPreset: data.goalPreset ?? null,
        targetType: data.targetType,
        targetIds: JSON.stringify(data.targetIds),
        duration: data.duration,
        status: "draft",
        metadata: null,
        hasAiPlan: data.selectedPlans.ai,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!playbook) {
      throw new Error("Failed to create playbook");
    }

    return {
      id: playbook.id,
      name: playbook.name,
      duration: playbook.duration,
      status: playbook.status,
    };
  });

// === UPDATE PLAYBOOK ===
export const updatePlaybook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
      status: z.enum(["draft", "active", "completed"]).optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { id, name, status } = data!;

    const playbook = await db.query.playbooks.findFirst({
      where: and(eq(playbooks.id, id), eq(playbooks.userId, user.id)),
    });

    if (!playbook) {
      throw new Error("Playbook not found");
    }

    await db
      .update(playbooks)
      .set({
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      })
      .where(eq(playbooks.id, id));

    return { success: true };
  });

// === DELETE PLAYBOOK ===
export const deletePlaybook = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { id } = data!;

    const playbook = await db.query.playbooks.findFirst({
      where: and(eq(playbooks.id, id), eq(playbooks.userId, user.id)),
    });

    if (!playbook) {
      throw new Error("Playbook not found");
    }

    await db.delete(playbooks).where(eq(playbooks.id, id));

    return { success: true };
  });

// === DUPLICATE PLAYBOOK ===
export const duplicatePlaybook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { id, name } = data!;

    const original = await db.query.playbooks.findFirst({
      where: and(eq(playbooks.id, id), eq(playbooks.userId, user.id)),
    });

    if (!original) {
      throw new Error("Playbook not found");
    }

    const baseName = name?.trim() || `${original.name} Copy`;

    const [created] = await db
      .insert(playbooks)
      .values({
        userId: user.id,
        name: baseName,
        goalText: original.goalText,
        goalPreset: original.goalPreset,
        targetType: original.targetType,
        targetIds: original.targetIds,
        duration: original.duration,
        status: "draft",
        metadata: original.metadata,
        hasAiPlan: original.hasAiPlan,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      id: created.id,
      name: created.name,
      duration: created.duration,
      status: created.status,
    };
  });

// === START PLAYBOOK SESSION ===
export const startPlaybookSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      playbookSessionId: z.number(),
      workoutDate: z.date().default(() => new Date()),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { playbookSessionId, workoutDate } = data!;

    const session = await db.query.playbookSessions.findFirst({
      where: eq(playbookSessions.id, playbookSessionId),
      with: {
        week: {
          with: {
            playbook: true,
          },
        },
      },
    });

    if (!session || session.week?.playbook?.userId !== user.id) {
      throw new Error("Playbook session not found");
    }

    if (session.actualWorkoutId) {
      return {
        workoutId: session.actualWorkoutId,
        alreadyStarted: true,
      };
    }

    return {
      workoutId: null,
      alreadyStarted: false,
      prescription: session.prescribedWorkoutJson
        ? JSON.parse(session.prescribedWorkoutJson)
        : null,
    };
  });

// === COMPLETE PLAYBOOK SESSION ===
export const completePlaybookSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      playbookSessionId: z.number(),
      workoutId: z.number(),
      rpe: z.number().min(1).max(10).optional(),
      notes: z.string().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { playbookSessionId, workoutId, rpe, notes } = data!;

    const session = await db.query.playbookSessions.findFirst({
      where: eq(playbookSessions.id, playbookSessionId),
    });

    if (!session) {
      throw new Error("Playbook session not found");
    }

    await db
      .update(playbookSessions)
      .set({
        actualWorkoutId: workoutId,
        isCompleted: true,
        completedAt: new Date(),
        rpe: rpe ?? null,
        rpeNotes: notes ?? null,
        adherenceScore: 85,
        updatedAt: new Date(),
      })
      .where(eq(playbookSessions.id, playbookSessionId));

    return { success: true };
  });

// === GET PLAYBOOK PROGRESS ===
export const getPlaybookProgress = createServerFn({ method: "GET" })
  .inputValidator(z.object({ playbookId: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { playbookId } = data!;

    const playbook = await db.query.playbooks.findFirst({
      where: and(eq(playbooks.id, playbookId), eq(playbooks.userId, user.id)),
      with: {
        weeks: {
          with: {
            sessions: true,
          },
        },
      },
    });

    if (!playbook) {
      throw new Error("Playbook not found");
    }

    const totalSessions = playbook.weeks.reduce(
      (sum, week) => sum + week.sessions.length,
      0,
    );
    const completedSessions = playbook.weeks.reduce(
      (sum, week) => sum + week.sessions.filter((s) => s.isCompleted).length,
      0,
    );

    return {
      playbookId,
      totalSessions,
      completedSessions,
      adherencePercentage:
        totalSessions > 0
          ? Math.round((completedSessions / totalSessions) * 100)
          : 0,
      weeks: playbook.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        sessionsCompleted: week.sessions.filter((s) => s.isCompleted).length,
        sessionsTotal: week.sessions.length,
      })),
    };
  });

// === GET PLAYBOOK RECOMMENDATIONS ===
export const getPlaybookRecommendations = createServerFn({ method: "GET" })
  .inputValidator(z.object({ playbookId: z.number() }))
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { playbookId } = data!;

    return [
      {
        type: "volume",
        message: "Consider increasing volume for legs next week",
        action: "Add 2 sets to leg exercises",
      },
      {
        type: "rest",
        message: "Rest days are well distributed",
        action: "Keep current schedule",
      },
    ];
  });

// === REGENERATE PLAYBOOK ===
export const regeneratePlaybook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      playbookId: z.number(),
      reason: z.string().optional(),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { playbookId, reason } = data!;

    const playbook = await db.query.playbooks.findFirst({
      where: and(eq(playbooks.id, playbookId), eq(playbooks.userId, user.id)),
    });

    if (!playbook) {
      throw new Error("Playbook not found");
    }

    return {
      success: true,
      message: "Playbook regeneration requested",
      regeneratedWeeks: [],
    };
  });
