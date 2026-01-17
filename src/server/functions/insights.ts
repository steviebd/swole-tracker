import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  workoutSessions,
  sessionExercises,
  templateExercises,
  exerciseLinks,
} from "~/server/db/schema";
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { withAuth } from "./middleware";

function toNumber(n: string | number | null | undefined): number | undefined {
  if (n === null || n === undefined) return undefined;
  const v = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(v) ? v : undefined;
}

function estimate1RM(
  weight: number | undefined,
  reps: number | undefined,
): number | undefined {
  if (!weight || !reps) return undefined;
  return weight * (1 + reps / 30);
}

function compareUnits(
  weight: number | undefined,
  unit: "kg" | "lbs",
  targetUnit: "kg" | "lbs",
): number | undefined {
  if (weight === undefined) return undefined;
  if (unit === targetUnit) return weight;
  return targetUnit === "kg" ? weight / 2.2046226218 : weight * 2.2046226218;
}

// === GET EXERCISE INSIGHTS ===
export const getExerciseInsights = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      exerciseName: z.string().min(1),
      templateExerciseId: z.number().optional(),
      unit: z.enum(["kg", "lbs"]).default("kg"),
      limitSessions: z.number().int().positive().max(50).default(10),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { exerciseName, templateExerciseId, unit, limitSessions } = data!;

    const recentSessions = await db.query.workoutSessions.findMany({
      where: and(eq(workoutSessions.user_id, user.id)),
      orderBy: [desc(workoutSessions.workoutDate)],
      limit: limitSessions,
      with: {
        exercises: {
          where: or(
            eq(sessionExercises.exerciseName, exerciseName),
            templateExerciseId
              ? eq(sessionExercises.templateExerciseId, templateExerciseId)
              : undefined,
          ),
        },
      },
    });

    const flatSets: Array<{
      sessionId: number;
      workoutDate: Date;
      weight?: number;
      reps?: number | null;
      sets?: number | null;
      unit: string;
      rpe?: number | null;
      rest_seconds?: number | null;
      volumeLoad?: number;
      oneRMEstimate?: number;
    }> = [];

    for (const s of recentSessions) {
      for (const ex of s.exercises || []) {
        const weight = toNumber(ex.weight);
        const volumeLoad = toNumber(ex.volume_load);
        const oneRMEstimate = toNumber(ex.one_rm_estimate);

        flatSets.push({
          sessionId: s.id,
          workoutDate: s.workoutDate,
          weight,
          reps: ex.reps,
          sets: ex.sets,
          unit: ex.unit,
          rpe: (ex as { rpe?: number }).rpe,
          rest_seconds: (ex as { rest_seconds?: number }).rest_seconds,
          volumeLoad,
          oneRMEstimate,
        });
      }
    }

    const bySession = new Map<
      number,
      {
        date: Date;
        volume: number;
        bestWeight?: number;
        bestSet?: { weight?: number; reps?: number | null; unit: string };
        est1RM?: number;
      }
    >();

    for (const fs of flatSets) {
      const weightTarget = compareUnits(
        fs.weight,
        fs.unit as "kg" | "lbs",
        unit,
      );
      const vol = fs.volumeLoad ?? (weightTarget ?? 0) * (fs.reps ?? 0);
      const prev = bySession.get(fs.sessionId);
      const est =
        fs.oneRMEstimate ??
        estimate1RM(weightTarget, fs.reps ?? undefined) ??
        0;

      if (!prev) {
        const sessionData: {
          date: Date;
          volume: number;
          bestWeight?: number;
          bestSet?: { weight?: number; reps?: number | null; unit: string };
          est1RM?: number;
        } = {
          date: fs.workoutDate,
          volume: vol,
        };
        if (weightTarget !== undefined) {
          sessionData.bestWeight = weightTarget;
          sessionData.bestSet = { weight: weightTarget, reps: fs.reps, unit };
        }
        bySession.set(fs.sessionId, sessionData);
      } else {
        prev.volume += vol;
        if (
          weightTarget !== undefined &&
          weightTarget > (prev.bestWeight ?? -Infinity)
        ) {
          prev.bestWeight = weightTarget;
          prev.bestSet = { weight: weightTarget, reps: fs.reps, unit };
        }
      }
    }

    const sessionsSorted = Array.from(bySession.entries())
      .map(([sessionId, v]) => ({ sessionId, ...v }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const sparkline = sessionsSorted.map((s) => ({
      date: s.date,
      volume: Math.round(s.volume * 100) / 100,
    }));

    const bestSetOverall = sessionsSorted.reduce<
      { weight?: number; reps?: number | null; unit: string } | undefined
    >((acc, s) => {
      if (!s.bestSet) return acc;
      if (!acc || (s.bestSet.weight ?? -Infinity) > (acc.weight ?? -Infinity)) {
        return s.bestSet;
      }
      return acc;
    }, undefined);

    const best1RM = sessionsSorted.reduce<number | undefined>((acc, s) => {
      if (s.est1RM === undefined) return acc;
      if (acc === undefined || s.est1RM > acc) return s.est1RM;
      return acc;
    }, undefined);

    const suggestions: Array<{ kind: string; message: string }> = [];
    const rpeValues = flatSets
      .map((f) => (typeof f.rpe === "number" ? f.rpe : undefined))
      .filter((n): n is number => Number.isFinite(n));

    if (rpeValues.length >= 3) {
      const avgRpe = rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length;
      if (avgRpe >= 9) {
        suggestions.push({
          kind: "rpe",
          message:
            "Average RPE is high (≥9). Consider reducing weight or total sets.",
        });
      }
      if (avgRpe <= 6) {
        suggestions.push({
          kind: "rpe",
          message:
            "Average RPE is low (≤6). Consider increasing weight or reps to target RPE 7–9.",
        });
      }
    }

    return {
      unit,
      bestSet: bestSetOverall,
      best1RM: best1RM ? Math.round(best1RM * 100) / 100 : undefined,
      volumeSparkline: sparkline,
      suggestions,
    };
  });

// === GET SESSION INSIGHTS ===
export const getSessionInsights = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      sessionId: z.number(),
      unit: z.enum(["kg", "lbs"]).default("kg"),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { sessionId, unit } = data!;

    const session = await db.query.workoutSessions.findFirst({
      where: and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.user_id, user.id),
      ),
      with: { exercises: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }

    const byExercise = new Map<
      string,
      {
        volume: number;
        bestSet?: { weight?: number; reps?: number | null; unit: string };
      }
    >();

    for (const ex of session.exercises) {
      const key = ex.exerciseName;
      const weight = compareUnits(
        toNumber(ex.weight),
        (ex.unit as "kg" | "lbs") ?? "kg",
        unit,
      );
      const reps = ex.reps ?? 0;
      const vol = (weight ?? 0) * reps;

      const entry = byExercise.get(key) ?? { volume: 0 };
      entry.volume += vol;
      if (
        !entry.bestSet ||
        (weight ?? -Infinity) > (entry.bestSet.weight ?? -Infinity)
      ) {
        entry.bestSet = { weight, reps, unit };
      }
      byExercise.set(key, entry);
    }

    const totalVolume =
      Math.round(
        Array.from(byExercise.values()).reduce((a, b) => a + b.volume, 0) * 100,
      ) / 100;

    const bestSets = Array.from(byExercise.entries()).map(
      ([exerciseName, v]) => ({
        exerciseName,
        volume: v.volume,
        bestSet: v.bestSet,
      }),
    );

    return { unit, totalVolume, bestSets };
  });

// === EXPORT WORKOUTS CSV ===
export const exportWorkoutsCSV = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      since: z.date().optional(),
      limit: z.number().int().positive().max(500).default(50),
    }),
  )
  .middleware([withAuth])
  .handler(async ({ context, data }) => {
    const { db, user } = context;
    const { since, limit } = data ?? { limit: 50 };

    const where = [eq(workoutSessions.user_id, user.id)];
    if (since) {
      where.push(gte(workoutSessions.workoutDate, since));
    }

    const sessions = await db.query.workoutSessions.findMany({
      where: and(...where),
      orderBy: [desc(workoutSessions.workoutDate)],
      limit,
      with: { exercises: true, template: true },
    });

    const rows: string[] = [];
    rows.push(
      [
        "date",
        "sessionId",
        "templateName",
        "exercise",
        "setOrder",
        "weight",
        "reps",
        "sets",
        "unit",
        "rpe",
        "rest_seconds",
      ].join(","),
    );

    for (const s of sessions) {
      for (const ex of s.exercises) {
        const templateName =
          s.template && typeof s.template.name === "string"
            ? s.template.name
            : "";
        const rpeVal = (ex as { rpe?: number }).rpe;
        const restVal = (ex as { rest_seconds?: number }).rest_seconds;

        rows.push(
          [
            s.workoutDate.toISOString(),
            s.id,
            templateName,
            ex.exerciseName,
            ex.setOrder ?? 0,
            ex.weight ?? "",
            ex.reps ?? "",
            ex.sets ?? "",
            ex.unit ?? "",
            rpeVal ?? "",
            restVal ?? "",
          ].join(","),
        );
      }
    }

    return {
      filename: "workouts_export.csv",
      mimeType: "text/csv",
      content: rows.join("\n"),
      metadata: {
        totalSessions: sessions.length,
        chunkedProcessing: false,
      },
    };
  });
