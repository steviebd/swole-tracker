import { describe, it, expect, vi, beforeEach } from "vitest";

import { gatherSessionDebriefContext } from "~/server/api/utils/session-debrief";
import type { db } from "~/server/db";

const sessionId = 42;
const userId = "user-xyz";
const now = new Date();

const mockSession = {
  id: sessionId,
  user_id: userId,
  workoutDate: now,
  createdAt: new Date(now.getTime() - 60 * 60 * 1000),
  template: { name: "Upper Body Power" },
  exercises: [
    {
      id: 1,
      user_id: userId,
      sessionId,
      templateExerciseId: 10,
      exerciseName: "Bench Press",
      setOrder: 0,
      weight: "102.5",
      reps: 5,
      sets: 1,
      unit: "kg",
      createdAt: new Date("2024-05-05T10:00:00Z"),
    },
    {
      id: 2,
      user_id: userId,
      sessionId,
      templateExerciseId: 10,
      exerciseName: "Bench Press",
      setOrder: 1,
      weight: "100",
      reps: 5,
      sets: 1,
      unit: "kg",
      createdAt: new Date("2024-05-05T10:02:00Z"),
    },
  ],
};

const historicalSets = [
  {
    exerciseName: "Bench Press",
    weight: "100",
    reps: 5,
    sets: 1,
    unit: "kg",
    setOrder: 0,
    sessionId: 21,
  },
];

const adherenceSessions = [
  { workoutDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
  { workoutDate: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
  { workoutDate: now },
];

const mockHealthAdvice = {
  response: {
    readiness: {
      rho: 0.78,
      overload_multiplier: 1.04,
      flags: ["well_recovered"],
    },
    summary: "Strong session expected",
  },
};

const buildSelectChain = (result: any[]) => {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(result),
  };
  return chain;
};

describe("gatherSessionDebriefContext", () => {
  let mockDb: typeof db;

  beforeEach(() => {
    vi.clearAllMocks();

    const queryMocks = {
      workoutSessions: {
        findFirst: vi.fn().mockResolvedValue(mockSession),
      },
      sessionDebriefs: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      healthAdvice: {
        findFirst: vi.fn().mockResolvedValue(mockHealthAdvice),
      },
    };

    const selectMock = vi.fn((fields: Record<string, unknown>) => {
      if (Object.prototype.hasOwnProperty.call(fields, "exerciseName")) {
        return buildSelectChain(historicalSets);
      }
      if (Object.prototype.hasOwnProperty.call(fields, "workoutDate")) {
        return buildSelectChain(adherenceSessions);
      }
      return buildSelectChain([]);
    });

    mockDb = {
      query: queryMocks as any,
      select: selectMock as any,
    } as typeof db;
  });

  it("returns structured context with PR highlights and streak info", async () => {
    const payload = await gatherSessionDebriefContext({
      dbClient: mockDb,
      userId,
      sessionId,
      locale: "en-US",
    });

    expect(payload.context.sessionId).toBe(sessionId);
    expect(payload.context.templateName).toBe("Upper Body Power");
    expect(payload.context.exercises).toHaveLength(1);
    expect(payload.context.totalVolume).toBeGreaterThan(0);
    expect(payload.context.prHighlights[0]?.prFlags).toContain("weight");
    expect(payload.context.streak.current).toBeGreaterThanOrEqual(1);
    expect(payload.context.healthAdvice?.readinessScore).toBeCloseTo(0.78);
  });

  it("gracefully handles missing health advice", async () => {
    (mockDb.query.healthAdvice.findFirst as any).mockResolvedValueOnce(null);

    const payload = await gatherSessionDebriefContext({
      dbClient: mockDb,
      userId,
      sessionId,
    });

    expect(payload.context.healthAdvice).toBeUndefined();
  });
});
