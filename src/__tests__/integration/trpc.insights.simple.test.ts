import "./setup.debug-errors";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "./trpc-harness";

// Seed public env
process.env.NEXT_PUBLIC_POSTHOG_KEY ||= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ||= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ||= "supabase_test_key";

describe("tRPC insights router simple coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should return empty insights for empty sessions", async () => {
    const user = createMockUser(true);

    const db = createMockDb({
      query: {
        exerciseLinks: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        templateExercises: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        workoutSessions: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const trpc = buildCaller({ db, user });
    const result = await (trpc as any).insights?.getExerciseInsights({
      exerciseName: "Bench Press",
      unit: "kg",
    });

    expect(result).toBeDefined();
    expect(result.unit).toBe("kg");
    expect(result.bestSet).toBeUndefined();
    expect(result.volumeSparkline).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
  });

  it("should handle session insights with no session found", async () => {
    const user = createMockUser(true);

    const db = createMockDb({
      query: {
        workoutSessions: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const trpc = buildCaller({ db, user });

    await expect(
      (trpc as any).insights?.getSessionInsights({
        sessionId: 999,
        unit: "kg",
      }),
    ).rejects.toThrow("Session not found");
  });

  it("should export CSV with empty data", async () => {
    const user = createMockUser(true);

    const db = createMockDb({
      query: {
        workoutSessions: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const trpc = buildCaller({ db, user });
    const result = await (trpc as any).insights?.exportWorkoutsCSV({
      limit: 50,
    });

    expect(result).toBeDefined();
    expect(result.filename).toBe("workouts_export.csv");
    expect(result.mimeType).toBe("text/csv");
    expect(result.content).toContain("date,sessionId,templateName");
  });

  it("should handle exercise insights with templateExerciseId but no link", async () => {
    const user = createMockUser(true);

    const mockTemplateExercise = {
      id: 1,
      user_id: user!.id,
      exerciseName: "Squat",
    };

    const db = createMockDb({
      query: {
        exerciseLinks: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        templateExercises: {
          findFirst: vi.fn().mockResolvedValue(mockTemplateExercise),
        },
        workoutSessions: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    });

    const trpc = buildCaller({ db, user });
    const result = await (trpc as any).insights?.getExerciseInsights({
      exerciseName: "Squat",
      templateExerciseId: 1,
      unit: "kg",
    });

    expect(result).toBeDefined();
    expect(result.unit).toBe("kg");
    expect(db.query.templateExercises.findFirst).toHaveBeenCalled();
  });
});
