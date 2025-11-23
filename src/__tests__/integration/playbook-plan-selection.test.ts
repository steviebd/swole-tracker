import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createTRPCContext } from "~/server/api/trpc";
import { appRouter, type AppRouter } from "~/server/api/root";
import { type inferProcedureInput } from "@trpc/server";
import { playbooks, playbookWeeks, playbookSessions } from "~/server/db/schema";
import { eq } from "drizzle-orm";

// Mock AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock environment variables
vi.mock("~/env", () => ({
  env: {
    AI_DEBRIEF_MODEL: "gpt-4",
    AI_DEBRIEF_TEMPERATURE: "0.7",
  },
}));

// Mock logger
vi.mock("~/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
  logApiCall: vi.fn(),
}));

// Mock PostHog
vi.mock("~/lib/posthog", () => ({
  default: vi.fn(() => ({
    capture: vi.fn(),
    identify: vi.fn(),
    shutdown: vi.fn(),
    flush: vi.fn(),
  })),
  getPosthog: vi.fn(() => ({
    capture: vi.fn(),
    identify: vi.fn(),
    shutdown: vi.fn(),
    flush: vi.fn(),
  })),
  __resetTestPosthogClient: vi.fn(),
  __setTestPosthogCtor: vi.fn(),
}));

// Mock algorithmic planner
vi.mock("~/server/api/utils/algorithmic-planner", () => ({
  generateAlgorithmicPlan: vi.fn(() => [
    {
      weekNumber: 1,
      weekType: "training",
      sessions: [
        {
          sessionNumber: 1,
          exercises: [
            {
              exerciseName: "Squat",
              sets: 5,
              reps: 5,
              weight: 100,
            },
          ],
        },
      ],
      volumeTarget: 1000,
      progressionFormula: "linear_2.5kg",
    },
  ]),
}));

describe("Playbook Router - Plan Selection", () => {
  let mockDb: any;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    // Create a complete mock of the Drizzle query builder
    const mockQueryBuilder = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      rightJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      and: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      inArray: vi.fn().mockReturnThis(),
      desc: vi.fn().mockReturnThis(),
      asc: vi.fn().mockReturnThis(),
    };

    mockDb = {
      query: {
        playbooks: {
          findFirst: vi.fn(),
        },
        templateExercises: {
          findMany: vi.fn(),
        },
        workoutSessions: {
          findMany: vi.fn(),
        },
        userPreferences: {
          findMany: vi.fn(),
        },
      },
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          ...mockQueryBuilder,
          where: vi.fn().mockReturnValue({
            ...mockQueryBuilder,
            orderBy: vi.fn().mockResolvedValue([
              { id: 1, weekNumber: 1, playbookId: 1 },
              { id: 2, weekNumber: 2, playbookId: 1 },
              { id: 3, weekNumber: 3, playbookId: 1 },
              { id: 4, weekNumber: 4, playbookId: 1 },
              { id: 5, weekNumber: 5, playbookId: 1 },
              { id: 6, weekNumber: 6, playbookId: 1 },
            ]),
          }),
        }),
      }),
      insert: vi.fn().mockImplementation((table: any) => {
        if (table === playbooks) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi
                .fn()
                .mockResolvedValue([
                  { id: 1, name: "Test Playbook", hasAiPlan: false },
                ]),
            }),
          };
        }
        if (table === playbookWeeks) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                { id: 1, weekNumber: 1 },
                { id: 2, weekNumber: 2 },
                { id: 3, weekNumber: 3 },
                { id: 4, weekNumber: 4 },
                { id: 5, weekNumber: 5 },
                { id: 6, weekNumber: 6 },
              ]),
            }),
          };
        }
        if (table === playbookSessions) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        };
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn(),
    };

    // Mock the return values for chained calls
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.limit.mockResolvedValue([]);
    mockQueryBuilder.leftJoin.mockReturnValue(mockQueryBuilder);

    caller = appRouter.createCaller({
      user: { id: "test-user" },
      db: mockDb,
      headers: new Headers(),
      requestId: "test-request-id",
    });

    vi.clearAllMocks();
  });

  describe("create mutation", () => {
    type CreateInput = inferProcedureInput<AppRouter["playbooks"]["create"]>;

    it("should create playbook with algorithmic plan only", async () => {
      const input: CreateInput = {
        name: "Test Playbook",
        targetType: "template",
        targetIds: [1, 2],
        duration: 6,
        selectedPlans: {
          algorithmic: true,
          ai: false,
        },
      };

      // Mock successful creation
      (mockDb.query.playbooks.findFirst as any).mockResolvedValue(null);

      const result = await caller.playbooks.create(input);

      expect(result).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalledWith(playbooks);
      expect(mockDb.insert).toHaveBeenCalledWith(playbookWeeks);
      expect(mockDb.insert).toHaveBeenCalledWith(playbookSessions);
    });

    it("should create playbook with both plans when AI is selected", async () => {
      const { generateText } = await import("ai");
      (generateText as any).mockResolvedValue({
        text: JSON.stringify({
          weeks: [
            {
              weekNumber: 1,
              weekType: "training",
              sessions: [
                {
                  sessionNumber: 1,
                  exercises: [
                    {
                      exerciseName: "Squat",
                      sets: 5,
                      reps: 5,
                      weight: 100,
                    },
                  ],
                },
              ],
            },
          ],
        }),
        usage: { totalTokens: 1000 },
        finishReason: "stop",
      } as any);

      const input: CreateInput = {
        name: "Test Playbook with AI",
        targetType: "template",
        targetIds: [1, 2],
        duration: 6,
        selectedPlans: {
          algorithmic: true,
          ai: true,
        },
      };

      // Mock successful creation
      (mockDb.query.playbooks.findFirst as any).mockResolvedValue(null);

      // Override the insert mock for playbooks to return AI plan
      (mockDb.insert as any).mockImplementation((table: any) => {
        if (table === playbooks) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi
                .fn()
                .mockResolvedValue([
                  { id: 1, name: input.name, hasAiPlan: true },
                ]),
            }),
          };
        }
        if (table === playbookWeeks) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                { id: 1, weekNumber: 1 },
                { id: 2, weekNumber: 2 },
                { id: 3, weekNumber: 3 },
                { id: 4, weekNumber: 4 },
                { id: 5, weekNumber: 5 },
                { id: 6, weekNumber: 6 },
              ]),
            }),
          };
        }
        if (table === playbookSessions) {
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        return {
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      const result = await caller.playbooks.create(input);

      expect(result).toBeDefined();
      expect(generateText).toHaveBeenCalled();
    });

    it("should reject creation when no plans are selected", async () => {
      const input = {
        name: "Invalid Playbook",
        targetType: "template" as const,
        targetIds: [1, 2],
        duration: 6,
        selectedPlans: {
          algorithmic: false,
          ai: false,
        },
      };

      await expect(caller.playbooks.create(input)).rejects.toThrow();
    });
  });

  describe("updateSessionPlanType mutation", () => {
    it("should update session plan type to AI", async () => {
      // Mock session exists
      (mockDb.query.playbooks.findFirst as any).mockResolvedValue({
        id: 1,
        userId: "test-user",
        weeks: [
          {
            id: 1,
            weekNumber: 1,
            sessions: [
              {
                id: 1,
                sessionNumber: 1,
                activePlanType: "algorithmic",
              },
            ],
          },
        ],
      } as any);

      // Mock successful update
      (mockDb.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 1,
                activePlanType: "ai",
              },
            ]),
          }),
        }),
      } as any);

      const result = await caller.playbooks.updateSessionPlanType({
        sessionId: 1,
        planType: "ai",
      });

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(playbookSessions);
    });

    it("should reject invalid plan type", async () => {
      await expect(
        caller.playbooks.updateSessionPlanType({
          sessionId: 1,
          planType: "invalid" as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe("regenerateFromLatestSession mutation", () => {
    it("should regenerate weeks from latest completed session", async () => {
      // Mock AI generation
      const { generateText } = await import("ai");
      (generateText as any).mockResolvedValue({
        text: JSON.stringify({
          weeks: [
            {
              weekNumber: 2,
              weekType: "training",
              sessions: [
                {
                  sessionNumber: 1,
                  exercises: [
                    {
                      exerciseName: "Squat",
                      sets: 5,
                      reps: 5,
                      weight: 100,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });

      // Mock playbook with completed sessions
      (mockDb.query.playbooks.findFirst as any).mockResolvedValue({
        id: 1,
        userId: "test-user",
        hasAiPlan: true,
        duration: 6,
        targetIds: "[1, 2]", // JSON string as expected by DB
        targetType: "template",
        weeks: [
          {
            id: 1,
            weekNumber: 1,
            sessions: [
              {
                id: 1,
                sessionNumber: 1,
                isCompleted: true,
                completedAt: new Date(),
                playbookWeekId: 1, // Add this relationship
              },
            ],
          },
          {
            id: 2,
            weekNumber: 2,
            sessions: [
              {
                id: 2,
                sessionNumber: 1,
                isCompleted: false,
                playbookWeekId: 2, // Add this relationship
              },
            ],
          },
        ],
      } as any);

      // Mock successful updates
      (mockDb.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{}]),
          }),
        }),
      } as any);

      (mockDb.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      } as any);

      const result = await caller.playbooks.regenerateFromLatestSession({
        playbookId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.regeneratedWeeks).toEqual([2]);
    });

    it("should add AI plan when requested", async () => {
      const { generateText } = await import("ai");
      (generateText as any).mockResolvedValue({
        text: JSON.stringify({
          weeks: [
            {
              weekNumber: 2,
              weekType: "training",
              sessions: [
                {
                  sessionNumber: 1,
                  exercises: [
                    {
                      exerciseName: "Squat",
                      sets: 5,
                      reps: 5,
                      weight: 100,
                    },
                  ],
                },
              ],
            },
          ],
        }),
        usage: { totalTokens: 1000 },
        finishReason: "stop",
      } as any);

      // Mock playbook without AI plan
      (mockDb.query.playbooks.findFirst as any).mockResolvedValue({
        id: 1,
        userId: "test-user",
        hasAiPlan: false,
        duration: 6,
        targetIds: "[1, 2]", // JSON string as expected by DB
        targetType: "template",
        weeks: [
          {
            id: 1,
            weekNumber: 1,
            sessions: [
              {
                id: 1,
                sessionNumber: 1,
                isCompleted: true,
                completedAt: new Date(),
                playbookWeekId: 1, // Add this relationship
              },
            ],
          },
        ],
      } as any);

      // Mock successful updates
      (mockDb.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{}]),
          }),
        }),
      } as any);

      (mockDb.insert as any).mockReturnValue({
        values: vi.fn().mockResolvedValue([{}]),
      } as any);

      const result = await caller.playbooks.regenerateFromLatestSession({
        playbookId: 1,
        addAiPlan: true,
      });

      expect(result.success).toBe(true);
      expect(result.aiPlanAdded).toBe(true);
      expect(generateText).toHaveBeenCalled();
    });

    it("should reject when no completed sessions exist", async () => {
      // Mock playbook with no completed sessions
      (mockDb.query.playbooks.findFirst as any).mockResolvedValue({
        id: 1,
        userId: "test-user",
        targetIds: "[1, 2]", // JSON string as expected by DB
        targetType: "template",
        weeks: [
          {
            id: 1,
            weekNumber: 1,
            sessions: [
              {
                id: 1,
                sessionNumber: 1,
                isCompleted: false,
                playbookWeekId: 1, // Add this relationship
              },
            ],
          },
        ],
      } as any);

      await expect(
        caller.playbooks.regenerateFromLatestSession({
          playbookId: 1,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
