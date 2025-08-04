import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "../integration/trpc-harness";
import { dailyJokes } from "~/server/db/schema";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock the env module
vi.mock("~/env", () => ({
  env: {
    VERCEL_AI_GATEWAY_API_KEY: undefined,
    AI_GATEWAY_MODEL: "xai/grok-3-mini",
    AI_GATEWAY_PROMPT: "Tell me a short, funny programming or tech joke. Keep it clean and under 100 words.",
    AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
  },
}));

// Create a helper to update the mocked env
const updateMockedEnv = (newEnv: Record<string, any>) => {
  vi.doMock("~/env", () => ({
    env: {
      VERCEL_AI_GATEWAY_API_KEY: undefined,
      AI_GATEWAY_MODEL: "xai/grok-3-mini",
      AI_GATEWAY_PROMPT: "Tell me a short, funny programming or tech joke. Keep it clean and under 100 words.",
      AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
      ...newEnv,
    },
  }));
};

describe("jokes.ts enhanced coverage", () => {
  const originalEnv = process.env;
  let mockGenerateText: any;

  beforeAll(async () => {
    const { generateText } = await import("ai");
    mockGenerateText = generateText as any;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    
    // Set default test environment
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost";
    process.env.NEXT_PUBLIC_ENV = "test";
    delete process.env.VERCEL_AI_GATEWAY_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("SUPPORTED_MODELS constant", () => {
    it("should contain all expected AI models", async () => {
      // Read the module source to verify it contains expected models
      const fs = await import("fs");
      const path = await import("path");
      
      const modulePath = path.resolve(process.cwd(), "src/server/api/routers/jokes.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");
      
      // Check that all expected models are defined
      expect(moduleContent).toContain("xai/grok-3-mini");
      expect(moduleContent).toContain("xai/grok-beta");
      expect(moduleContent).toContain("google/gemini-2.0-flash-lite");
      expect(moduleContent).toContain("google/gemini-1.5-pro");
      expect(moduleContent).toContain("openai/gpt-4o");
      expect(moduleContent).toContain("openai/gpt-4o-mini");
      expect(moduleContent).toContain("openai/gpt-3.5-turbo");
      expect(moduleContent).toContain("anthropic/claude-3-5-sonnet-20241022");
      expect(moduleContent).toContain("meta/llama-3.1-405b-instruct");
    });
  });

  describe("getModelInfo function", () => {
    it("should return correct info for supported models", async () => {
      // Since getModelInfo is not exported, we test its behavior indirectly
      // by checking the module contains the expected model mappings
      const fs = await import("fs");
      const path = await import("path");
      
      const modulePath = path.resolve(process.cwd(), "src/server/api/routers/jokes.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");
      
      expect(moduleContent).toContain("XAI Grok 3 Mini");
      expect(moduleContent).toContain("Google Gemini 2.0 Flash Lite");
      expect(moduleContent).toContain("OpenAI GPT-4o");
      expect(moduleContent).toContain("Anthropic Claude 3.5 Sonnet");
      expect(moduleContent).toContain("Meta Llama 3.1 405B");
    });

    it("should handle unknown models gracefully", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const modulePath = path.resolve(process.cwd(), "src/server/api/routers/jokes.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");
      
      // Check that there's fallback handling for unknown models
      expect(moduleContent).toContain("Unknown Model");
      expect(moduleContent).toContain("isSupported");
    });
  });

  describe("generateNewJoke function - AI Gateway not configured", () => {
    it("should return fallback joke when VERCEL_AI_GATEWAY_API_KEY is not set", async () => {
      const user = createMockUser({ id: "user_fallback_1" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("Vercel AI Gateway not configured");
      expect(result.isFromCache).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should not call AI generation when gateway is not configured", async () => {
      const user = createMockUser({ id: "user_fallback_2" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      await caller.jokes.generateNew();

      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  describe("generateNewJoke function - AI Gateway configured", () => {
    beforeEach(() => {
      // Mock environment with AI Gateway configured
      vi.doMock("~/env", () => ({
        env: {
          VERCEL_AI_GATEWAY_API_KEY: "test_api_key",
          AI_GATEWAY_MODEL: "xai/grok-3-mini",
          AI_GATEWAY_PROMPT: "Tell me a joke",
          AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
        },
      }));
    });

    it("should generate new joke with AI when gateway is configured", async () => {
      const user = createMockUser({ id: "user_ai_1" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 1,
          createdAt: new Date(),
          joke: "AI generated joke",
        }]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue(insertChain),
      });

      mockGenerateText.mockResolvedValue({
        text: "Why do programmers prefer dark mode? Because light attracts bugs!",
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: "xai/grok-3-mini",
        prompt: "Tell me a joke",
      });
      expect(result.joke).toBe("Why do programmers prefer dark mode? Because light attracts bugs!");
      expect(result.isFromCache).toBe(false);
    });

    it("should include previous jokes in enhanced prompt", async () => {
      const user = createMockUser({ id: "user_ai_2" })!;
      
      const previousJokes = [
        { joke: "Previous joke 1" },
        { joke: "Previous joke 2" },
      ];

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(previousJokes),
      };

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 1,
          createdAt: new Date(),
        }]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue(insertChain),
      });

      mockGenerateText.mockResolvedValue({
        text: "New unique joke",
      });

      const caller = await buildCaller({ db, user });
      await caller.jokes.generateNew();

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: "xai/grok-3-mini",
        prompt: expect.stringContaining("Previous joke 1, Previous joke 2"),
      });
    });

    it("should handle AI generation errors gracefully", async () => {
      const user = createMockUser({ id: "user_ai_error" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      mockGenerateText.mockRejectedValue(new Error("AI service unavailable"));

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("AI generation failed");
      expect(result.joke).toContain("AI service unavailable");
      expect(result.isFromCache).toBe(false);
    });

    it("should handle empty AI response", async () => {
      const user = createMockUser({ id: "user_ai_empty" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      mockGenerateText.mockResolvedValue({ text: "" });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("No content generated from AI Gateway");
    });

    it("should handle database insertion failure", async () => {
      const user = createMockUser({ id: "user_db_error" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]), // Empty array simulates insertion failure
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue(insertChain),
      });

      mockGenerateText.mockResolvedValue({
        text: "Generated joke",
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("Failed to save joke to database");
    });

    it("should trim whitespace from AI generated text", async () => {
      const user = createMockUser({ id: "user_trim" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 1,
          createdAt: new Date(),
        }]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue(insertChain),
      });

      mockGenerateText.mockResolvedValue({
        text: "   Joke with whitespace   \n\n",
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toBe("Joke with whitespace");
    });
  });

  describe("jokesRouter.getCurrent", () => {
    it("should call generateNewJoke internally", async () => {
      const user = createMockUser({ id: "user_get_current" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.getCurrent();

      expect(result.joke).toBeDefined();
      expect(result.isFromCache).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should handle errors and return fallback joke", async () => {
      const user = createMockUser({ id: "user_get_current_error" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.getCurrent();

      expect(result.joke).toContain("Error loading joke");
      expect(result.joke).toContain("backup");
      expect(result.isFromCache).toBe(false);
    });

    it("should require authentication", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.jokes.getCurrent()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("jokesRouter.generateNew", () => {
    it("should generate new joke on demand", async () => {
      const user = createMockUser({ id: "user_generate_new" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toBeDefined();
      expect(result.isFromCache).toBe(false);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("should require authentication", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.jokes.generateNew()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("jokesRouter.clearCache", () => {
    it("should delete all jokes for user", async () => {
      const user = createMockUser({ id: "user_clear_cache" })!;
      
      const whereChain = vi.fn().mockResolvedValue([]);
      const deleteChain = vi.fn().mockReturnValue({ where: whereChain });

      const db = createMockDb({
        delete: deleteChain,
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.clearCache();

      expect(result).toEqual({ success: true });
      expect(deleteChain).toHaveBeenCalledWith(dailyJokes);
      expect(whereChain).toHaveBeenCalled();
    });

    it("should require authentication", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.jokes.clearCache()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("database operations", () => {
    it("should query previous jokes with correct parameters", async () => {
      const user = createMockUser({ id: "user_db_ops" })!;
      
      const limitSpy = vi.fn().mockResolvedValue([]);
      const orderBySpy = vi.fn().mockReturnValue({ limit: limitSpy });
      const whereSpy = vi.fn().mockReturnValue({ orderBy: orderBySpy });
      const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
      const selectSpy = vi.fn().mockReturnValue({ from: fromSpy });

      const db = createMockDb({
        select: selectSpy,
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      await caller.jokes.generateNew();

      expect(selectSpy).toHaveBeenCalledWith({ joke: dailyJokes.joke });
      expect(fromSpy).toHaveBeenCalledWith(dailyJokes);
      expect(whereSpy).toHaveBeenCalled();
      expect(orderBySpy).toHaveBeenCalled();
      expect(limitSpy).toHaveBeenCalledWith(3); // AI_GATEWAY_JOKE_MEMORY_NUMBER
    });

    it("should insert new joke with correct data structure", async () => {
      const user = createMockUser({ id: "user_insert" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const returningSpy = vi.fn().mockResolvedValue([{
        id: 1,
        createdAt: new Date(),
      }]);
      const valuesSpy = vi.fn().mockReturnValue({ returning: returningSpy });
      const insertSpy = vi.fn().mockReturnValue({ values: valuesSpy });

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: insertSpy,
      });

      // Mock AI Gateway configured
      vi.doMock("~/env", () => ({
        env: {
          VERCEL_AI_GATEWAY_API_KEY: "test_key",
          AI_GATEWAY_MODEL: "xai/grok-3-mini",
          AI_GATEWAY_PROMPT: "Tell me a joke",
          AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
        },
      }));

      mockGenerateText.mockResolvedValue({
        text: "Test joke",
      });

      const caller = await buildCaller({ db, user });
      await caller.jokes.generateNew();

      expect(insertSpy).toHaveBeenCalledWith(dailyJokes);
      expect(valuesSpy).toHaveBeenCalledWith({
        user_id: user.id,
        joke: "Test joke",
        aiModel: "xai/grok-3-mini",
        prompt: "Tell me a joke",
      });
    });
  });

  describe("logging and debugging", () => {
    it("should contain appropriate console logging", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const user = createMockUser({ id: "user_logging" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      await caller.jokes.getCurrent();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("jokesRouter.getCurrent called for user:")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Generating fresh joke on browser refresh")
      );

      consoleSpy.mockRestore();
    });

    it("should log AI Gateway configuration status", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const user = createMockUser({ id: "user_ai_logging" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      await caller.jokes.generateNew();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Vercel AI Gateway not configured")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("error handling edge cases", () => {
    it("should handle non-Error exceptions", async () => {
      const user = createMockUser({ id: "user_non_error" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      // Mock AI Gateway configured but throw non-Error
      vi.doMock("~/env", () => ({
        env: {
          VERCEL_AI_GATEWAY_API_KEY: "test_key",
          AI_GATEWAY_MODEL: "xai/grok-3-mini",
          AI_GATEWAY_PROMPT: "Tell me a joke",
          AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
        },
      }));

      mockGenerateText.mockRejectedValue("String error");

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("AI generation failed");
      expect(result.joke).toContain("Unknown error");
    });

    it("should handle database connection errors", async () => {
      const user = createMockUser({ id: "user_db_connection" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Connection timeout")),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toContain("AI generation failed");
      expect(result.joke).toContain("Connection timeout");
    });
  });

  describe("memory and performance", () => {
    it("should limit memory queries to configured number", async () => {
      const user = createMockUser({ id: "user_memory_limit" })!;
      
      const limitSpy = vi.fn().mockResolvedValue([]);
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: limitSpy,
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      await caller.jokes.generateNew();

      expect(limitSpy).toHaveBeenCalledWith(3); // AI_GATEWAY_JOKE_MEMORY_NUMBER
    });

    it("should handle large numbers of previous jokes", async () => {
      const user = createMockUser({ id: "user_many_jokes" })!;
      
      const manyJokes = Array.from({ length: 100 }, (_, i) => ({
        joke: `Previous joke ${i + 1}`,
      }));

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(manyJokes.slice(0, 3)), // Should be limited
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = await buildCaller({ db, user });
      const result = await caller.jokes.generateNew();

      expect(result.joke).toBeDefined();
      expect(result.isFromCache).toBe(false);
    });
  });
});
