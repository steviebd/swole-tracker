// Complete refactor of jokes router tests with proper module mocking
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Ensure PUBLIC env is present before any imports that transitively load src/env.js,
 * which validates runtime env via @t3-oss/env-nextjs.
 */
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_KEY ??= "phc_test_dummy";
process.env.NEXT_PUBLIC_POSTHOG_HOST ??= "https://us.i.posthog.com";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_KEY ??= "supabase_test_key";

// Also stub server-side env so @t3-oss/env-core proxy does not throw under jsdom.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR ??= "100";
process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR ??= "100";
process.env.RATE_LIMIT_JOKES_PER_HOUR ??= "100";
process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR ??= "100";

// Mock environment before any imports
const mockEnv = {
  VERCEL_AI_GATEWAY_API_KEY: "",
  AI_GATEWAY_MODEL: "openai/gpt-4o-mini",
  AI_GATEWAY_PROMPT: "Tell a short fitness-themed joke.",
  AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
  AI_GATEWAY_ENABLED: false,
  // Public vars (unused in server code paths here, but keep for completeness)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY!,
  // Server vars used by routers
  RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR:
    process.env.RATE_LIMIT_TEMPLATE_OPERATIONS_PER_HOUR!,
  RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR:
    process.env.RATE_LIMIT_WORKOUT_OPERATIONS_PER_HOUR!,
  RATE_LIMIT_JOKES_PER_HOUR: process.env.RATE_LIMIT_JOKES_PER_HOUR!,
  RATE_LIMIT_WHOOP_SYNC_PER_HOUR: process.env.RATE_LIMIT_WHOOP_SYNC_PER_HOUR!,
  DATABASE_URL: process.env.DATABASE_URL!,
  NODE_ENV: process.env.NODE_ENV ?? "test",
};

vi.mock("~/env", () => ({
  env: mockEnv,
}));

// Mock AI before import
const mockGenerateText = vi.fn();
vi.mock("ai", () => ({
  generateText: mockGenerateText,
}));

// Mock database schema
vi.mock("~/server/db/schema", () => ({
  dailyJokes: {
    user_id: "user_id",
    joke: "joke",
    createdAt: "createdAt",
    aiModel: "aiModel",
    prompt: "prompt",
  },
}));

// Ensure rate limiting middleware is a no-op in tests to avoid undefined ctx.headers/requestId issues
vi.mock("~/lib/rate-limit-middleware", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.create();
  const noOpMiddleware = t.middleware(async ({ next }) => next());
  return {
    apiCallRateLimit: noOpMiddleware,
    templateRateLimit: noOpMiddleware,
    workoutRateLimit: noOpMiddleware,
    whoopSyncRateLimit: noOpMiddleware,
    rateLimitMiddleware:
      () =>
      async ({ next }: any) =>
        next(),
    asTrpcMiddleware: () => noOpMiddleware,
  };
});

// Mock Clerk currentUser
vi.mock("@clerk/nextjs/server", () => {
  return {
    currentUser: async () => ({ id: "test-user" }),
  };
});

// Mock the database module
const mockState = {
  db: undefined as any,
  user: { id: "test-user" },
};

vi.mock("~/server/db", () => {
  return {
    get db() {
      return mockState.db;
    },
  };
});

describe("jokes.ts enhanced coverage (rewritten)", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Reset mock env
    Object.assign(mockEnv, {
      VERCEL_AI_GATEWAY_API_KEY: "",
      AI_GATEWAY_MODEL: "openai/gpt-4o-mini",
      AI_GATEWAY_PROMPT: "Tell a short fitness-themed joke.",
      AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
      AI_GATEWAY_ENABLED: false,
    });

    // Setup mock database
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1, createdAt: new Date() }]),
    };

    const whereChain = vi.fn().mockResolvedValue([]);

    mockDb = {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      delete: vi.fn().mockReturnValue({ where: whereChain }),
    };

    // Update mockState with the new db
    mockState.db = mockDb;

    mockCtx = {
      db: mockDb,
      user: { id: "test-user" },
      requestId: "00000000-0000-4000-8000-000000000000",
      headers: new Headers({ "x-test": "1" }),
    };
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("Unconfigured AI Gateway path", () => {
    it("returns static fallback and does not call AI", async () => {
      // Ensure AI Gateway is not configured
      mockEnv.VERCEL_AI_GATEWAY_API_KEY = "";
      mockEnv.AI_GATEWAY_ENABLED = false;

      // Import after mocks are set and create a caller to test the procedure
      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      const result = await caller.jokes.generateNew();

      expect(mockGenerateText).not.toHaveBeenCalled();
      expect(result.joke).toContain("Vercel AI Gateway not configured");
      expect(result.isFromCache).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Vercel AI Gateway not configured, using fallback joke",
      );
    });
  });

  describe("Configured AI Gateway path", () => {
    beforeEach(() => {
      // Configure AI Gateway
      mockEnv.VERCEL_AI_GATEWAY_API_KEY = "test-key";
      mockEnv.AI_GATEWAY_ENABLED = true;
    });

    it("calls AI with model and prompt, saves to DB, trims whitespace", async () => {
      mockGenerateText.mockResolvedValue({
        text: "  A trimmed joke \n",
      });

      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      const result = await caller.jokes.generateNew();

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: "openai/gpt-4o-mini",
        prompt: "Tell a short fitness-themed joke.",
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.insert().values).toHaveBeenCalledWith({
        user_id: "test-user",
        joke: "A trimmed joke",
        aiModel: "openai/gpt-4o-mini",
        prompt: "Tell a short fitness-themed joke.",
      });

      expect(result.joke).toBe("A trimmed joke");
      expect(result.isFromCache).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("includes previous jokes in enhanced prompt", async () => {
      const previousJokes = [{ joke: "J1" }, { joke: "J2" }];
      mockDb.select().limit.mockResolvedValue(previousJokes);

      mockGenerateText.mockResolvedValue({ text: "New joke" });

      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      await caller.jokes.generateNew();

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: "openai/gpt-4o-mini",
        prompt: expect.stringContaining("Previous jokes: J1, J2"),
      });
    });

    it("gracefully handles AI errors", async () => {
      mockGenerateText.mockRejectedValue(new Error("AI down"));

      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("AI generation failed");
      expect(result.joke).toContain("AI down");
      expect(result.isFromCache).toBe(false);
    });

    it("throws specific error when AI returns empty text", async () => {
      mockGenerateText.mockResolvedValue({ text: "" });

      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("No content generated from AI Gateway");
    });
  });

  describe("clearCache", () => {
    it("deletes all jokes for user", async () => {
      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      const result = await caller.jokes.clearCache();

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.delete().where).toHaveBeenCalled();
    });
  });

  describe("getCurrent", () => {
    it("returns a fallback when generate fails with AI path", async () => {
      // Configure AI Gateway but make it fail
      mockEnv.VERCEL_AI_GATEWAY_API_KEY = "test-key";
      mockEnv.AI_GATEWAY_ENABLED = true;
      mockGenerateText.mockRejectedValue(new Error("AI busted"));

      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      const result = await caller.jokes.getCurrent();

      expect(result.joke).toContain("Error loading joke");
      expect(result.isFromCache).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);

      expect(consoleSpy).toHaveBeenCalledWith(
        "jokesRouter.getCurrent called for user:",
        mockCtx.user.id,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "🔄 Generating fresh joke on browser refresh...",
      );
    });

    it("passes through unconfigured gateway fallback", async () => {
      // Ensure unconfigured
      mockEnv.VERCEL_AI_GATEWAY_API_KEY = "";
      mockEnv.AI_GATEWAY_ENABLED = false;

      const { createCaller } = await import("~/server/api/root");
      const caller = createCaller(mockCtx);

      const result = await caller.jokes.getCurrent();

      expect(result.joke).toContain("Vercel AI Gateway not configured");
      expect(result.isFromCache).toBe(false);
    });
  });
});
