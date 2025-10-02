import { describe, it, expect, vi, beforeEach } from "vitest";

// Import after mocking
import { healthAdviceRouter } from "~/server/api/routers/health-advice";

describe("healthAdviceRouter", () => {
  const mockUser = { id: "user-123" };

  // Create a proper mock db that supports Drizzle fluent API
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  } as any;

  const mockCtx = {
    db: mockDb,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  } as any;

  const mockHealthAdviceRequest = {
    session_id: "session-123",
    user_profile: {
      experience_level: "intermediate" as const,
      min_increment_kg: 2.5,
      preferred_rpe: 7,
    },
    whoop: {
      recovery_score: 85,
      sleep_performance: 90,
      hrv_now_ms: 45,
      hrv_baseline_ms: 42,
      rhr_now_bpm: 60,
      rhr_baseline_bpm: 65,
      yesterday_strain: 15,
    },
    workout_plan: {
      exercises: [
        {
          exercise_id: "bench-press-1",
          name: "Bench Press",
          tags: ["strength" as const],
          sets: [
            {
              set_id: "set-1",
              target_reps: 8,
              target_weight_kg: 80,
              target_rpe: 7,
            },
            {
              set_id: "set-2",
              target_reps: 6,
              target_weight_kg: 80,
              target_rpe: 8,
            },
          ],
        },
      ],
    },
    prior_bests: {
      by_exercise_id: {
        "bench-press-1": {
          best_total_volume_kg: 640,
          best_e1rm_kg: 95,
        },
      },
    },
  };

  const mockHealthAdviceResponse = {
    session_id: "session-123",
    readiness: {
      rho: 0.85,
      overload_multiplier: 1.1,
      flags: ["good_recovery"],
    },
    session_predicted_chance: 0.75,
    per_exercise: [
      {
        exercise_id: "bench-press-1",
        name: "Bench Press",
        predicted_chance_to_beat_best: 0.7,
        planned_volume_kg: 640,
        best_volume_kg: 640,
        sets: [
          {
            set_id: "set-1",
            suggested_weight_kg: 82.5,
            suggested_reps: 8,
            suggested_rest_seconds: 180,
            rationale: "Linear progression",
          },
        ],
      },
    ],
    summary: "Good recovery state, moderate progression recommended",
    warnings: [],
    recovery_recommendations: {
      recommended_rest_between_sets: "2-3 minutes",
      recommended_rest_between_sessions: "48 hours",
      session_duration_estimate: "45 minutes",
      additional_recovery_notes: ["Maintain current sleep schedule"],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("save", () => {
    it("should save health advice to database", async () => {
      const mockResult = [
        {
          id: 1,
          user_id: "user-123",
          sessionId: 1,
          request: mockHealthAdviceRequest,
          response: mockHealthAdviceResponse,
          readiness_rho: "0.85",
          overload_multiplier: "1.1",
          session_predicted_chance: "0.75",
          user_accepted_suggestions: 0,
          total_suggestions: 1,
          response_time_ms: 1500,
          model_used: "gpt-4o-mini",
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      // Mock the database operations
      const mockInsertBuilder = {
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(mockResult),
          }),
        }),
      };

      mockDb.insert.mockReturnValue(mockInsertBuilder);

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.save({
        sessionId: 1,
        request: mockHealthAdviceRequest,
        response: mockHealthAdviceResponse,
      });

      expect(result.total_suggestions).toBe(1);
    });
  });

  describe("saveWithWellness", () => {
    it("should save health advice with wellness data", async () => {
      const mockWellnessData = [{ id: 1, user_id: "user-123" }];

      const mockResult = [
        {
          id: 1,
          user_id: "user-123",
          sessionId: 1,
          request: mockHealthAdviceRequest,
          response: mockHealthAdviceResponse,
          readiness_rho: "0.85",
          overload_multiplier: "1.1",
          session_predicted_chance: "0.75",
          user_accepted_suggestions: 0,
          total_suggestions: 1,
          response_time_ms: 1200,
          model_used: "gpt-4o-mini",
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      // Mock wellness data verification
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockWellnessData),
          }),
        }),
      });

      // Mock insert operation
      const mockInsertBuilder = {
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(mockResult),
          }),
        }),
      };

      mockDb.insert.mockReturnValue(mockInsertBuilder);

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.saveWithWellness({
        sessionId: 1,
        request: mockHealthAdviceRequest,
        response: mockHealthAdviceResponse,
        responseTimeMs: 1200,
        modelUsed: "gpt-4o-mini",
        wellnessDataId: 1,
      });

      expect(result).toEqual(mockResult[0]);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return null when no advice found", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.delete({ sessionId: 999 });

      expect(result).toBeNull();
    });
  });

  describe("input validation", () => {
    it("should validate sessionId is positive number", async () => {
      const caller = healthAdviceRouter.createCaller(mockCtx);

      await expect(caller.getBySessionId({ sessionId: -1 })).rejects.toThrow();

      await expect(caller.getBySessionId({ sessionId: 0 })).rejects.toThrow();
    });

    it("should validate history pagination parameters", async () => {
      const caller = healthAdviceRouter.createCaller(mockCtx);

      await expect(caller.getHistory({ limit: 0 })).rejects.toThrow();

      await expect(caller.getHistory({ limit: 101 })).rejects.toThrow();

      await expect(caller.getHistory({ offset: -1 })).rejects.toThrow();
    });

    it("should validate accepted suggestions count", async () => {
      const caller = healthAdviceRouter.createCaller(mockCtx);

      await expect(
        caller.updateAcceptedSuggestions({
          sessionId: 1,
          acceptedCount: -1,
        }),
      ).rejects.toThrow();
    });
  });
});
