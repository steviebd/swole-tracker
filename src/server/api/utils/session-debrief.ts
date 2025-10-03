import { and, desc, eq, inArray, lte, ne } from "drizzle-orm";

import { calculateOneRM, calculateVolumeLoad, isPR } from "~/server/api/utils/exercise-calculations";
import {
  healthAdvice,
  sessionDebriefs,
  sessionExercises,
  workoutSessions,
} from "~/server/db/schema";
import { type db } from "~/server/db";
import {
  type SessionDebriefContext,
  type SessionDebriefExerciseSet,
  type SessionDebriefGenerationPayload,
  type SessionDebriefHealthAdviceSummary,
} from "~/server/api/types/health-advice-debrief";
import type { SessionExerciseData } from "~/server/api/types/exercise-progression";
import { calculateStreak } from "~/lib/achievements";
import { logger } from "~/lib/logger";
import { sessionDebriefContentSchema } from "~/server/api/schemas/health-advice-debrief";

interface GatherContextArgs {
  dbClient: typeof db;
  userId: string;
  sessionId: number;
  locale?: string;
  timezone?: string;
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = toNumber(value);
  return parsed === null ? undefined : parsed;
};

const buildExerciseSet = (set: typeof sessionExercises.$inferSelect): SessionDebriefExerciseSet => {
  const weight = toNumber(set.weight);
  const reps = set.reps ?? null;
  const sets = set.sets ?? 1;
  const unit = (set.unit as "kg" | "lbs") ?? "kg";
  const volume = calculateVolumeLoad(sets ?? 1, reps ?? 0, weight ?? 0);

  return {
    setOrder: set.setOrder ?? 0,
    weight,
    reps,
    sets,
    unit,
    volume,
  };
};

const computeExerciseSnapshot = (
  exerciseName: string,
  templateExerciseId: number | null,
  sets: typeof sessionExercises.$inferSelect[],
  historicalSets: SessionDebriefExerciseSet[],
) => {
  const mappedSets = sets.map(buildExerciseSet);
  const totalVolume = mappedSets.reduce((sum, set) => sum + set.volume, 0);
  const bestSet = mappedSets.reduce((prev, curr) =>
    curr.weight !== null && (prev?.weight ?? 0) < curr.weight ? curr : prev,
  undefined as SessionDebriefExerciseSet | undefined);

  const bestVolumeSet = mappedSets.reduce((prev, curr) =>
    curr.volume > (prev?.volume ?? 0) ? curr : prev,
  undefined as SessionDebriefExerciseSet | undefined);

  const estimatedOneRm = mappedSets
    .map((set) =>
      set.weight && set.reps
        ? calculateOneRM(set.weight, set.reps)
        : null,
    )
    .filter((value): value is number => value !== null);

  const bestOneRm = estimatedOneRm.length
    ? Math.max(...estimatedOneRm)
    : null;

  // Build historical best snapshot
  let historicalBestVolume: number | null = null;
  let historicalBestWeight: number | null = null;
  let historicalBestOneRm: number | null = null;

  if (historicalSets.length > 0) {
    historicalBestVolume = historicalSets.reduce(
      (sum, set) => (set.volume > sum ? set.volume : sum),
      0,
    );
    historicalBestWeight = historicalSets.reduce(
      (max, set) => (set.weight !== null && set.weight > max ? set.weight : max),
      0,
    );
    const historicalOneRms = historicalSets
      .map((set) =>
        set.weight && set.reps
          ? calculateOneRM(set.weight, set.reps)
          : null,
      )
      .filter((value): value is number => value !== null);
    historicalBestOneRm = historicalOneRms.length
      ? Math.max(...historicalOneRms)
      : null;
  }

  const currentBest: SessionExerciseData = {
    workoutDate: new Date(),
    exerciseName,
    weight: bestSet?.weight?.toString() ?? null,
    reps: bestSet?.reps ?? null,
    sets: bestSet?.sets ?? null,
    unit: bestSet?.unit ?? "kg",
  };

  const historicalBest: SessionExerciseData | null = historicalBestWeight
    ? {
        workoutDate: new Date(),
        exerciseName,
        weight: historicalBestWeight.toString(),
        reps: bestSet?.reps ?? null,
        sets: bestSet?.sets ?? null,
        unit: bestSet?.unit ?? "kg",
      }
    : null;

  const prFlags: Array<"weight" | "volume" | "oneRM"> = [];

  if (historicalBest) {
    if (bestSet?.weight && historicalBest.weight) {
      if (
        isPR(currentBest, historicalBest, "weight") &&
        bestSet.weight > (historicalBestWeight ?? 0)
      ) {
        prFlags.push("weight");
      }
    }

    if (bestVolumeSet && historicalBestVolume) {
      const historicalVolumeAsSet: SessionExerciseData = {
        workoutDate: new Date(),
        exerciseName,
        weight: (historicalBestWeight ?? 0).toString(),
        reps: bestVolumeSet.reps ?? null,
        sets: bestVolumeSet.sets ?? null,
        unit: bestVolumeSet.unit,
      };
      if (isPR(currentBest, historicalVolumeAsSet, "volume")) {
        prFlags.push("volume");
      }
    }

    if (bestOneRm && historicalBestOneRm) {
      const historicalOneRmAsSet: SessionExerciseData = {
        workoutDate: new Date(),
        exerciseName,
        weight: (historicalBestWeight ?? 0).toString(),
        reps: bestSet?.reps ?? null,
        sets: bestSet?.sets ?? null,
        unit: bestSet?.unit ?? "kg",
      };
      if (isPR(currentBest, historicalOneRmAsSet, "1rm")) {
        prFlags.push("oneRM");
      }
    }
  }

  return {
    exerciseName,
    templateExerciseId,
    totalVolume,
    estimatedOneRm: bestOneRm,
    bestWeight: bestSet?.weight ?? null,
    bestReps: bestSet?.reps ?? null,
    sets: mappedSets.sort((a, b) => a.setOrder - b.setOrder),
    prFlags,
    previousBest: {
      volume: historicalBestVolume,
      bestWeight: historicalBestWeight,
      estimatedOneRm: historicalBestOneRm,
    },
  } satisfies SessionDebriefContext["exercises"][number];
};

type SessionExerciseDataLike = {
  workoutDate: Date;
  exerciseName: string;
  weight: string | null;
  reps: number | null;
  sets: number | null;
  unit: string;
};

export async function gatherSessionDebriefContext({
  dbClient,
  userId,
  sessionId,
  locale = "en-US",
  timezone,
}: GatherContextArgs): Promise<SessionDebriefGenerationPayload> {
  const session = await dbClient.query.workoutSessions.findFirst({
    where: eq(workoutSessions.id, sessionId),
    with: {
      template: true,
      exercises: {
        orderBy: (exercise, { asc }) => [asc(exercise.setOrder)],
      },
    },
  });

  if (!session || session.user_id !== userId) {
    throw new Error("Workout session not found");
  }

  const sessionDate = session.workoutDate ?? new Date();
  const exerciseNames = Array.from(
    new Set(session.exercises.map((exercise) => exercise.exerciseName)),
  );

  let historicalSets: Record<string, SessionDebriefExerciseSet[]> = {};
  if (exerciseNames.length > 0) {
    const rawHistorical = await dbClient
      .select({
        exerciseName: sessionExercises.exerciseName,
        weight: sessionExercises.weight,
        reps: sessionExercises.reps,
        sets: sessionExercises.sets,
        unit: sessionExercises.unit,
        setOrder: sessionExercises.setOrder,
        sessionId: sessionExercises.sessionId,
      })
      .from(sessionExercises)
      .innerJoin(
        workoutSessions,
        eq(sessionExercises.sessionId, workoutSessions.id),
      )
      .where(
        and(
          eq(sessionExercises.user_id, userId),
          inArray(sessionExercises.exerciseName, exerciseNames),
          ne(sessionExercises.sessionId, sessionId),
          lte(workoutSessions.workoutDate, sessionDate),
        ),
      )
      .orderBy(desc(workoutSessions.workoutDate))
      .limit(200);

    historicalSets = rawHistorical.reduce<Record<string, SessionDebriefExerciseSet[]>>(
      (acc, item) => {
        const current = acc[item.exerciseName] ?? [];
        current.push({
          setOrder: item.setOrder ?? 0,
          weight: toNumber(item.weight),
          reps: item.reps ?? null,
          sets: item.sets ?? 1,
          unit: (item.unit as "kg" | "lbs") ?? "kg",
          volume: calculateVolumeLoad(item.sets ?? 1, item.reps ?? 0, toNumber(item.weight) ?? 0),
        });
        acc[item.exerciseName] = current;
        return acc;
      },
      {},
    );
  }

  const groupedExercises = session.exercises.reduce(
    (acc, set) => {
      const bucket = acc.get(set.exerciseName) ?? { sets: [], templateExerciseId: set.templateExerciseId };
      bucket.sets.push(set);
      bucket.templateExerciseId ??= set.templateExerciseId;
      acc.set(set.exerciseName, bucket);
      return acc;
    },
    new Map<string, { sets: typeof sessionExercises.$inferSelect[]; templateExerciseId: number | null }>(),
  );

  const exerciseEntries = Array.from(
    groupedExercises.entries(),
  ) as Array<[
    string,
    { sets: typeof sessionExercises.$inferSelect[]; templateExerciseId: number | null },
  ]>;

  const exerciseSnapshots = exerciseEntries.map(([name, info]) =>
    computeExerciseSnapshot(
      name,
      info.templateExerciseId ?? null,
      info.sets,
      historicalSets[name] ?? [],
    ),
  );

  const totalVolume = exerciseSnapshots.reduce(
    (sum, exercise) => sum + exercise.totalVolume,
    0,
  );

  const prHighlights = exerciseSnapshots.filter((exercise) => exercise.prFlags.length > 0);

  const sevenDaysAgo = new Date(sessionDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const twentyEightDaysAgo = new Date(sessionDate);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 27);

  const adherenceSessions = await dbClient
    .select({ workoutDate: workoutSessions.workoutDate })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.user_id, userId), lte(workoutSessions.workoutDate, sessionDate)))
    .orderBy(desc(workoutSessions.workoutDate))
    .limit(90);

  const sessionsLast7 = adherenceSessions.filter(
    (entry) => entry.workoutDate >= sevenDaysAgo && entry.workoutDate <= sessionDate,
  ).length;
  const sessionsLast28 = adherenceSessions.filter(
    (entry) => entry.workoutDate >= twentyEightDaysAgo && entry.workoutDate <= sessionDate,
  ).length;

  const weeklyFrequency = sessionsLast28 / 4;
  const rollingCompliance = Math.min(1, weeklyFrequency / 3) * 100;

  const streakInfo = calculateStreak(
    adherenceSessions.map((entry) => new Date(entry.workoutDate)),
  );

  const activeDebrief = await dbClient.query.sessionDebriefs.findFirst({
    where: and(
      eq(sessionDebriefs.user_id, userId),
      eq(sessionDebriefs.sessionId, sessionId),
      eq(sessionDebriefs.isActive, true),
    ),
    orderBy: (debrief, { desc: orderDesc }) => [orderDesc(debrief.version)],
  });

  let previousDebrief: SessionDebriefContext["previousDebrief"] = null;
  if (activeDebrief) {
    const parsed = sessionDebriefContentSchema.safeParse({
      summary: activeDebrief.summary,
      prHighlights: activeDebrief.prHighlights ?? undefined,
      adherenceScore: activeDebrief.adherenceScore ?? undefined,
      focusAreas: activeDebrief.focusAreas ?? undefined,
      streakContext: activeDebrief.streakContext ?? undefined,
      overloadDigest: activeDebrief.overloadDigest ?? undefined,
      metadata: activeDebrief.metadata ?? undefined,
    });
    if (parsed.success) {
      previousDebrief = parsed.data;
    }
  }

  const healthAdviceRow = await dbClient.query.healthAdvice.findFirst({
    where: and(
      eq(healthAdvice.user_id, userId),
      eq(healthAdvice.sessionId, sessionId),
    ),
  });

  let healthAdviceSummary: SessionDebriefHealthAdviceSummary | undefined;
  if (healthAdviceRow?.response && typeof healthAdviceRow.response === "object") {
    try {
      const readiness = (healthAdviceRow.response as any).readiness?.rho;
      const overload = (healthAdviceRow.response as any).readiness?.overload_multiplier;
      const summary = (healthAdviceRow.response as any).summary;
      const flags = Array.isArray((healthAdviceRow.response as any).readiness?.flags)
        ? ((healthAdviceRow.response as any).readiness.flags as string[])
        : undefined;
      healthAdviceSummary = {
        readinessScore: toFiniteNumber(readiness),
        overloadMultiplier: toFiniteNumber(overload),
        summary: typeof summary === "string" ? summary : undefined,
        focusFlags: flags,
      };
    } catch (error) {
      logger.warn("Failed to parse health advice response for debrief", {
        sessionId,
        userId,
        error,
      });
    }
  }

  const templateName = (() => {
    const template = (session as { template?: unknown }).template;
    if (
      template &&
      typeof template === "object" &&
      !Array.isArray(template) &&
      typeof (template as { name?: unknown }).name === "string"
    ) {
      const name = (template as { name: string }).name.trim();
      if (name.length > 0) {
        return name;
      }
    }

    return "Workout";
  })();

  const context: SessionDebriefContext = {
    sessionId,
    sessionDate: sessionDate.toISOString(),
    templateName,
    totalExercises: exerciseSnapshots.length,
    totalVolume,
    exercises: exerciseSnapshots,
    prHighlights,
    adherence: {
      sessionsLast7Days: sessionsLast7,
      sessionsLast28Days: sessionsLast28,
      weeklyFrequency: Number(weeklyFrequency.toFixed(2)),
      rollingCompliance: Math.round(rollingCompliance),
    },
    streak: {
      current: streakInfo.current ?? 0,
      longest: streakInfo.longest ?? 0,
      lastWorkoutDate: streakInfo.lastWorkoutDate?.toISOString(),
    },
    healthAdvice: healthAdviceSummary,
    previousDebrief: previousDebrief ?? null,
  };

  return {
    context,
    locale,
    timezone,
  } satisfies SessionDebriefGenerationPayload;
}
