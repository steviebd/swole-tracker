import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateText } from "ai";
import {
  generateAndPersistDebrief,
  bulkGenerateAndPersistDebriefs,
  AIDebriefRateLimitError,
  type GenerateDebriefOptions,
  type BulkGenerateDebriefOptions,
} from "~/server/api/services/session-debrief";
import { gatherSessionDebriefContext } from "~/server/api/utils/session-debrief";
import { chunkedBatch } from "~/server/db/chunk-utils";
import { logger } from "~/lib/logger";
import { env } from "~/env";

// Mock dependencies
vi.mock("~/lib/logger");
vi.mock("~/server/api/utils/session-debrief");
vi.mock("~/server/db/chunk-utils");
vi.mock("~/env", () => ({
  env: {
    AI_DEBRIEF_MODEL: "gpt-4",
    AI_GATEWAY_MODEL_HEALTH: "gpt-3.5-turbo",
    AI_DEBRIEF_TEMPERATURE: "0.7",
  },
}));

// Mock AI module
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock Drizzle operations
const mockDbClient = {
  query: {
    sessionDebriefs: {
      findFirst: vi.fn(),
    },
  },
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
};

// Mock session debrief data
const mockSessionDebrief = {
  id: 1,
  user_id: "user123",
  sessionId: 456,
  version: 1,
  summary: "Great workout session",
  isActive: true,
  regenerationCount: 0,
  metadata: '{"generatedAt":"2024-01-01T00:00:00.000Z","trigger":"auto"}',
  prHighlights: null,
  adherenceScore: 85,
  focusAreas: null,
  streakContext: null,
  overloadDigest: null,
  parentDebriefId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDebriefContent = {
  summary: "Great workout session",
  prHighlights: [
    {
      exerciseName: "Bench Press",
      metric: "weight",
      summary: "New personal record on bench press",
      delta: 5,
      unit: "kg",
      currentValue: 100,
      previousValue: 95,
      emoji: "🏋️",
    },
  ],
  adherenceScore: 85,
  focusAreas: [
    {
      title: "Form Improvement",
      description: "Focus on maintaining proper form during compound movements",
      priority: "upcoming",
      actions: ["Watch form videos", "Reduce weight temporarily"],
    },
  ],
  streakContext: {
    current: 5,
    longest: 10,
    message: "You're on a 5-day workout streak! Keep it up!",
    status: "building",
  },
  overloadDigest: {
    readiness: 0.8,
    recommendation: "Good recovery status, ready for progressive overload",
    nextSteps: ["Increase weight by 2.5kg", "Add one more set"],
    cautionFlags: ["Monitor shoulder discomfort"],
  },
  metadata: { difficulty: "medium" },
};

const mockContextPayload = {
  context: {
    sessionId: 456,
    sessionDate: "2024-01-01",
    templateName: "Test Template",
    totalExercises: 3,
    totalVolume: 1000,
    estimatedDurationMinutes: 45,
    exercises: [],
    adherence: {
      sessionsLast7Days: 3,
      sessionsLast28Days: 12,
      weeklyFrequency: 3,
      rollingCompliance: 0.85,
    },
    streak: {
      current: 5,
      longest: 10,
      lastWorkoutDate: "2024-01-01",
    },
    prHighlights: [],
  },
  locale: "en",
  timezone: "UTC",
};

describe("Session Debrief Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    vi.mocked(gatherSessionDebriefContext).mockResolvedValue(
      mockContextPayload,
    );
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(mockDebriefContent),
    } as any);

    // Setup mock chain for database operations
    const mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
    };

    mockDbClient.select.mockReturnValue(mockSelectChain as any);
    mockDbClient.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSessionDebrief]),
      }),
    });
    mockDbClient.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    mockDbClient.transaction.mockImplementation((callback) =>
      callback(mockDbClient),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateAndPersistDebrief", () => {
    const defaultOptions: GenerateDebriefOptions = {
      dbClient: mockDbClient as any,
      userId: "user123",
      sessionId: 456,
      locale: "en",
      timezone: "UTC",
      trigger: "auto",
      requestId: "test-123",
    };

    it("should generate and persist a debrief successfully", async () => {
      // Mock no existing active debrief
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      // Mock version query
      mockDbClient.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const result = await generateAndPersistDebrief(defaultOptions);

      expect(result).toHaveProperty("debrief");
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("context");
      expect(result.debrief).toEqual(mockSessionDebrief);
      expect(result.content).toEqual(mockDebriefContent);

      expect(gatherSessionDebriefContext).toHaveBeenCalledWith({
        dbClient: mockDbClient,
        userId: "user123",
        sessionId: 456,
        locale: "en",
        timezone: "UTC",
      });

      expect(generateText).toHaveBeenCalledWith({
        model: "gpt-4",
        system: expect.any(String),
        prompt: expect.any(String),
        temperature: 0.7,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "session_debrief.generated",
        expect.any(Object),
      );
    });

    it("should skip generation if skipIfActive is true and active debrief exists", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(
        mockSessionDebrief,
      );

      const result = await generateAndPersistDebrief({
        ...defaultOptions,
        skipIfActive: true,
      });

      expect(result).toEqual({
        debrief: mockSessionDebrief,
        content: null,
      });

      expect(logger.info).toHaveBeenCalledWith(
        "session_debrief.skip_generate",
        expect.any(Object),
      );
      expect(generateText).not.toHaveBeenCalled();
    });

    it("should handle AI rate limit errors", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      const rateLimitError = new Error("Rate limit exceeded");
      (rateLimitError as any).name = "GatewayRateLimitError";
      (rateLimitError as any).status = 429;

      vi.mocked(generateText).mockRejectedValue(rateLimitError);

      await expect(generateAndPersistDebrief(defaultOptions)).rejects.toThrow(
        AIDebriefRateLimitError,
      );

      expect(logger.error).toHaveBeenCalledWith(
        "session_debrief.ai_call_failed",
        expect.any(Error),
        expect.any(Object),
      );
    });

    it("should handle invalid JSON response from AI", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);
      vi.mocked(generateText).mockResolvedValue({
        text: "invalid json response",
      } as any);

      await expect(generateAndPersistDebrief(defaultOptions)).rejects.toThrow(
        "AI response was not valid JSON",
      );

      expect(logger.error).toHaveBeenCalledWith(
        "session_debrief.invalid_json",
        expect.any(Error),
        expect.any(Object),
      );
    });

    it("should handle transaction errors with fallback", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      const transactionError = new Error(
        "cannot start a transaction within a transaction",
      );
      mockDbClient.transaction.mockRejectedValue(transactionError);

      // Mock version query for fallback
      mockDbClient.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const result = await generateAndPersistDebrief(defaultOptions);

      expect(result.debrief).toEqual(mockSessionDebrief);
      expect(logger.warn).toHaveBeenCalledWith(
        "session_debrief.transaction_fallback",
        expect.any(Object),
      );
    });

    it("should validate content against schema", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      const invalidContent = { invalid: "data" };
      vi.mocked(generateText).mockResolvedValue({
        text: JSON.stringify(invalidContent),
      } as any);

      await expect(generateAndPersistDebrief(defaultOptions)).rejects.toThrow();
    });
  });

  describe("bulkGenerateAndPersistDebriefs", () => {
    const defaultBulkOptions: BulkGenerateDebriefOptions = {
      dbClient: mockDbClient as any,
      userId: "user123",
      sessionIds: [456, 457, 458],
      locale: "en",
      timezone: "UTC",
      trigger: "auto",
      requestId: "bulk-test-123",
    };

    beforeEach(() => {
      // Mock bulk version query
      mockDbClient.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { sessionId: 456, version: 0 },
              { sessionId: 457, version: 1 },
              { sessionId: 458, version: 0 },
            ]),
          }),
        }),
      } as any);
    });

    it("should generate debriefs for multiple sessions successfully", async () => {
      // Mock no existing active debriefs
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      // Mock chunked batch for bulk insert
      vi.mocked(chunkedBatch).mockImplementation(
        async (dbClient, payloads, callback) => {
          // Simulate successful chunked batch insert
          return payloads.map((payload: any, index) => ({
            ...mockSessionDebrief,
            id: mockSessionDebrief.id + index,
            sessionId: payload.sessionId,
          }));
        },
      );

      const result = await bulkGenerateAndPersistDebriefs(defaultBulkOptions);

      expect(result.debriefs).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      expect(gatherSessionDebriefContext).toHaveBeenCalledTimes(3);
      expect(generateText).toHaveBeenCalledTimes(3);
      expect(chunkedBatch).toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledWith(
        "session_debrief.bulk_generated",
        expect.any(Object),
      );
    });

    it("should handle empty session IDs array", async () => {
      const result = await bulkGenerateAndPersistDebriefs({
        ...defaultBulkOptions,
        sessionIds: [],
      });

      expect(result.debriefs).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(gatherSessionDebriefContext).not.toHaveBeenCalled();
    });

    it("should skip sessions with existing active debriefs when skipIfActive is true", async () => {
      // Mock existing active debrief for first session
      mockDbClient.query.sessionDebriefs.findFirst
        .mockResolvedValueOnce(mockSessionDebrief) // Session 456 has active debrief
        .mockResolvedValue(null) // Session 457 has no active debrief
        .mockResolvedValue(null); // Session 458 has no active debrief

      vi.mocked(chunkedBatch).mockImplementation(
        async (dbClient, payloads, callback) => {
          // Simulate successful chunked batch insert for 2 items
          return payloads.map((_, index) => ({
            ...mockSessionDebrief,
            id: mockSessionDebrief.id + index,
            sessionId: [457, 458][index], // Skip 456 since it has active debrief
          }));
        },
      );

      const result = await bulkGenerateAndPersistDebriefs({
        ...defaultBulkOptions,
        skipIfActive: true,
      });

      expect(result.debriefs).toHaveLength(2); // Only for sessions 457 and 458
      expect(logger.info).toHaveBeenCalledWith(
        "session_debrief.bulk_skip_generate",
        expect.any(Object),
      );
    });

    it("should handle context gathering errors gracefully", async () => {
      // Mock context gathering failure for first session
      vi.mocked(gatherSessionDebriefContext)
        .mockRejectedValueOnce(new Error("Context gathering failed"))
        .mockResolvedValue(mockContextPayload)
        .mockResolvedValue(mockContextPayload);

      vi.mocked(chunkedBatch).mockImplementation(
        async (dbClient, payloads, callback) => {
          // Simulate successful chunked batch insert for 2 items
          return payloads.map((_, index) => ({
            ...mockSessionDebrief,
            id: mockSessionDebrief.id + index,
            sessionId: [457, 458][index], // Skip 456 since it failed
          }));
        },
      );

      const result = await bulkGenerateAndPersistDebriefs(defaultBulkOptions);

      expect(result.debriefs).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        sessionId: 456,
        error: expect.stringContaining("Failed to gather context"),
      });
    });

    it("should handle AI generation errors for individual sessions", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      // Mock AI failure for second session
      vi.mocked(generateText)
        .mockResolvedValueOnce({
          text: JSON.stringify(mockDebriefContent),
        } as any)
        .mockRejectedValueOnce(new Error("AI generation failed"))
        .mockResolvedValueOnce({
          text: JSON.stringify(mockDebriefContent),
        } as any);

      vi.mocked(chunkedBatch).mockImplementation(
        async (dbClient, payloads, callback) => {
          // Simulate successful chunked batch insert for 2 items
          return payloads.map((_, index) => ({
            ...mockSessionDebrief,
            id: mockSessionDebrief.id + index,
            sessionId: [456, 458][index], // Skip 457 since it failed
          }));
        },
      );

      const result = await bulkGenerateAndPersistDebriefs(defaultBulkOptions);

      expect(result.debriefs).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        sessionId: 457,
        error: "AI generation failed",
      });
    });

    it("should fallback to individual inserts when bulk insert fails", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      // Mock bulk insert failure
      vi.mocked(chunkedBatch).mockRejectedValue(
        new Error("Bulk insert failed"),
      );

      // Mock individual insert success
      mockDbClient.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValueOnce([{ ...mockSessionDebrief, sessionId: 456 }])
            .mockResolvedValueOnce([{ ...mockSessionDebrief, sessionId: 457 }])
            .mockResolvedValueOnce([{ ...mockSessionDebrief, sessionId: 458 }]),
        }),
      });

      const result = await bulkGenerateAndPersistDebriefs(defaultBulkOptions);

      expect(result.debriefs).toHaveLength(3);
      expect(logger.warn).toHaveBeenCalledWith(
        "session_debrief.bulk_fallback_to_individual",
        expect.any(Object),
      );
    });

    it("should use regular insert for small batches", async () => {
      mockDbClient.query.sessionDebriefs.findFirst.mockResolvedValue(null);

      const smallBulkOptions = {
        ...defaultBulkOptions,
        sessionIds: [456, 457], // Only 2 sessions
      };

      // Mock regular insert (not chunked)
      const mockInsert = vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([mockSessionDebrief, mockSessionDebrief]),
      });
      mockDbClient.insert.mockReturnValue(mockInsert as any);

      await bulkGenerateAndPersistDebriefs(smallBulkOptions);

      expect(chunkedBatch).not.toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should handle all sessions failing", async () => {
      // Mock all context gathering failures
      vi.mocked(gatherSessionDebriefContext).mockRejectedValue(
        new Error("All failed"),
      );

      const result = await bulkGenerateAndPersistDebriefs(defaultBulkOptions);

      expect(result.debriefs).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
      expect(chunkedBatch).not.toHaveBeenCalled();
    });
  });

  describe("AIDebriefRateLimitError", () => {
    it("should create error with correct name and message", () => {
      const error = new AIDebriefRateLimitError("Rate limited");

      expect(error.name).toBe("AIDebriefRateLimitError");
      expect(error.message).toBe("Rate limited");
    });
  });
});
