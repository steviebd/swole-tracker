import { describe, it, expect } from "vitest";

import { buildSessionDebriefPrompt, SESSION_DEBRIEF_SYSTEM_PROMPT } from "~/lib/ai-prompts/session-debrief";

const payload = {
  locale: "en-US",
  context: {
    sessionId: 99,
    sessionDate: new Date("2024-05-05T10:00:00Z").toISOString(),
    templateName: "Strength Day",
    totalExercises: 1,
    totalVolume: 7500,
    exercises: [
      {
        exerciseName: "Deadlift",
        templateExerciseId: 12,
        totalVolume: 7500,
        estimatedOneRm: 220,
        bestWeight: 200,
        bestReps: 5,
        sets: [
          {
            setOrder: 0,
            weight: 200,
            reps: 5,
            sets: 1,
            unit: "kg" as const,
            volume: 1000,
          },
        ],
        prFlags: ["weight"],
        previousBest: {
          volume: 7000,
          bestWeight: 195,
          estimatedOneRm: 210,
        },
      },
    ],
    prHighlights: [],
    adherence: {
      sessionsLast7Days: 3,
      sessionsLast28Days: 10,
      weeklyFrequency: 2.5,
      rollingCompliance: 80,
    },
    streak: {
      current: 4,
      longest: 12,
      lastWorkoutDate: new Date("2024-05-05T10:00:00Z").toISOString(),
    },
    healthAdvice: {
      readinessScore: 0.74,
      overloadMultiplier: 1.03,
      summary: "Solid readiness",
      focusFlags: ["well_recovered"],
    },
    previousDebrief: null,
  },
};

describe("session debrief prompt builder", () => {
  it("includes system instructions and structured context", () => {
    const result = buildSessionDebriefPrompt(payload);

    expect(result.system).toBe(SESSION_DEBRIEF_SYSTEM_PROMPT);
    expect(result.prompt).toContain("SESSION CONTEXT");
    expect(result.prompt).toContain("Deadlift");
    expect(result.prompt).toContain("OUTPUT SCHEMA");
    expect(result.prompt).not.toContain("undefined");
  });
});
