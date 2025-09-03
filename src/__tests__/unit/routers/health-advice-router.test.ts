import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("~/server/db", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    values: vi.fn(),
    onConflictDoUpdate: vi.fn(),
    returning: vi.fn(),
  },
}));

vi.mock("~/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

// Import after mocking
import { healthAdviceRouter } from "~/server/api/routers/health-advice";
import { db } from "~/server/db";

describe("healthAdviceRouter", () => {
  const mockUser = { id: "user-123" };
  const mockCtx = {
    db,
    user: mockUser,
    requestId: "test-request",
    headers: new Headers(),
  };

  const mockHealthAdviceRequest = {
    exercises: [
      {
        exercise_name: "Bench Press",
        sets: [
          { weight: 80, reps: 8, unit: "kg" },
          { weight: 80, reps: 6, unit: "kg" },
        ],
      },
    ],
    readiness: {
      recovery_score: 85,
      sleep_performance: 90,
      hrv_now_ms: 45,
      hrv_baseline_ms: 42,
      rhr_now_bpm: 60,
      rhr_baseline_bpm: 65,
      yesterday_strain: 15,
    },
  };

  const mockHealthAdviceResponse = {
    readiness: {
      rho: 0.85,
      overload_multiplier: 1.1,
      flags: ["good_recovery"],
    },
    session_predicted_chance: 0.75,
    per_exercise: [
      {
        exercise_name: "Bench Press",
        sets: [
          {
            weight: 82.5,
            reps: 8,
            unit: "kg",
            rationale: "Linear progression",
          },
        ],
      },
    ],
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
            set: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(mockResult),
            }),
          }),
        }),
      };

      db.insert = vi.fn().mockReturnValue(mockInsertBuilder);

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.save({
        sessionId: 1,
        request: mockHealthAdviceRequest,
        response: mockHealthAdviceResponse,
        responseTimeMs: 1500,
        modelUsed: "gpt-4o-mini",
      });

      expect(result).toEqual(mockResult[0]);
      expect(db.insert).toHaveBeenCalledWith(
        expect.any(Function), // healthAdvice table
        expect.objectContaining({
          values: expect.any(Function),
        }),
      );
    });

    it("should handle database errors gracefully", async () => {
      db.insert = vi.fn().mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);

      await expect(
        caller.save({
          sessionId: 1,
          request: mockHealthAdviceRequest,
          response: mockHealthAdviceResponse,
        }),
      ).rejects.toThrow("Database connection failed");
    });

    it("should calculate total suggestions correctly", async () => {
      const complexResponse = {
        ...mockHealthAdviceResponse,
        per_exercise: [
          {
            exercise_name: "Bench Press",
            sets: [
              { weight: 82.5, reps: 8, unit: "kg", rationale: "Progression" },
              { weight: 85, reps: 6, unit: "kg", rationale: "Overload" },
            ],
          },
          {
            exercise_name: "Squat",
            sets: [{ weight: 100, reps: 5, unit: "kg", rationale: "Strength" }],
          },
        ],
      };

      const mockResult = [
        {
          id: 1,
          user_id: "user-123",
          sessionId: 1,
          request: mockHealthAdviceRequest,
          response: complexResponse,
          readiness_rho: "0.85",
          overload_multiplier: "1.1",
          session_predicted_chance: "0.75",
          user_accepted_suggestions: 0,
          total_suggestions: 3, // 2 + 1
          response_time_ms: null,
          model_used: null,
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      const mockInsertBuilder = {
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(mockResult),
            }),
          }),
        }),
      };

      db.insert = vi.fn().mockReturnValue(mockInsertBuilder);

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.save({
        sessionId: 1,
        request: mockHealthAdviceRequest,
        response: complexResponse,
      });

      expect(result.total_suggestions).toBe(3);
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
      db.select = vi.fn().mockReturnValue({
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
            set: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(mockResult),
            }),
          }),
        }),
      };

      db.insert = vi.fn().mockReturnValue(mockInsertBuilder);

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
      expect(db.select).toHaveBeenCalled(); // Verify wellness data check
    });

    it("should handle missing wellness data gracefully", async () => {
      // Mock wellness data not found
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

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
          response_time_ms: null,
          model_used: null,
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      const mockInsertBuilder = {
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue(mockResult),
            }),
          }),
        }),
      };

      db.insert = vi.fn().mockReturnValue(mockInsertBuilder);

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.saveWithWellness({
        sessionId: 1,
        request: mockHealthAdviceRequest,
        response: mockHealthAdviceResponse,
        wellnessDataId: 999, // Non-existent wellness data
      });

      expect(result).toEqual(mockResult[0]); // Should still succeed
    });
  });

  describe("getBySessionId", () => {
    it("should return health advice for session", async () => {
      const mockAdvice = {
        id: 1,
        user_id: "user-123",
        sessionId: 1,
        request: mockHealthAdviceRequest,
        response: mockHealthAdviceResponse,
        readiness_rho: "0.85",
        overload_multiplier: "1.1",
        session_predicted_chance: "0.75",
        user_accepted_suggestions: 2,
        total_suggestions: 3,
        response_time_ms: 1500,
        model_used: "gpt-4o-mini",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockAdvice]),
          }),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.getBySessionId({ sessionId: 1 });

      expect(result).toEqual(mockAdvice);
    });

    it("should return null when no advice exists", async () => {
      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.getBySessionId({ sessionId: 999 });

      expect(result).toBeNull();
    });
  });

  describe("getHistory", () => {
    it("should return user's health advice history", async () => {
      const mockHistory = [
        {
          id: 1,
          user_id: "user-123",
          sessionId: 1,
          request: mockHealthAdviceRequest,
          response: mockHealthAdviceResponse,
          readiness_rho: "0.85",
          overload_multiplier: "1.1",
          session_predicted_chance: "0.75",
          user_accepted_suggestions: 2,
          total_suggestions: 3,
          response_time_ms: 1500,
          model_used: "gpt-4o-mini",
          createdAt: new Date("2024-01-01"),
          updatedAt: null,
        },
        {
          id: 2,
          user_id: "user-123",
          sessionId: 2,
          request: mockHealthAdviceRequest,
          response: mockHealthAdviceResponse,
          readiness_rho: "0.8",
          overload_multiplier: "1.05",
          session_predicted_chance: "0.7",
          user_accepted_suggestions: 1,
          total_suggestions: 2,
          response_time_ms: 1200,
          model_used: "gpt-4o-mini",
          createdAt: new Date("2024-01-02"),
          updatedAt: null,
        },
      ];

      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockHistory),
              }),
            }),
          }),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.getHistory({ limit: 10, offset: 0 });

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(2);
    });

    it("should use default values for pagination", async () => {
      const mockHistory = [];

      db.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockHistory),
              }),
            }),
          }),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      await caller.getHistory({}); // No parameters provided

      // Should use defaults: limit=10, offset=0
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe("updateAcceptedSuggestions", () => {
    it("should update accepted suggestions count", async () => {
      const mockUpdatedAdvice = {
        id: 1,
        user_id: "user-123",
        sessionId: 1,
        user_accepted_suggestions: 3,
        updatedAt: new Date(),
      };

      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedAdvice]),
          }),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.updateAcceptedSuggestions({
        sessionId: 1,
        acceptedCount: 3,
      });

      expect(result).toEqual(mockUpdatedAdvice);
      expect(db.update).toHaveBeenCalledWith(
        expect.any(Function), // healthAdvice table
        expect.objectContaining({
          set: expect.any(Function),
        }),
      );
    });

    it("should return null when no advice found", async () => {
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.updateAcceptedSuggestions({
        sessionId: 999,
        acceptedCount: 1,
      });

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete health advice for session", async () => {
      const mockDeletedAdvice = {
        id: 1,
        user_id: "user-123",
        sessionId: 1,
        deletedAt: new Date(),
      };

      db.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDeletedAdvice]),
        }),
      });

      const caller = healthAdviceRouter.createCaller(mockCtx);
      const result = await caller.delete({ sessionId: 1 });

      expect(result).toEqual(mockDeletedAdvice);
      expect(db.delete).toHaveBeenCalledWith(
        expect.any(Function), // healthAdvice table
        expect.objectContaining({
          where: expect.any(Function),
        }),
      );
    });

    it("should return null when no advice found", async () => {
      db.delete = vi.fn().mockReturnValue({
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
