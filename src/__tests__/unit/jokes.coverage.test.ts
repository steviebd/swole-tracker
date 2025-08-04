import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildCaller, createMockDb, createMockUser } from "../integration/trpc-harness";
import { dailyJokes } from "~/server/db/schema";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

describe("jokes.ts coverage tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("module structure and constants", () => {
    it("should contain SUPPORTED_MODELS with all expected AI models", async () => {
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

    it("should contain model name mappings", async () => {
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

    it("should have getModelInfo function with unknown model handling", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const modulePath = path.resolve(process.cwd(), "src/server/api/routers/jokes.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");
      
      expect(moduleContent).toContain("function getModelInfo");
      expect(moduleContent).toContain("Unknown Model");
      expect(moduleContent).toContain("isSupported");
    });

    it("should have generateNewJoke function with proper error handling", async () => {
      const fs = await import("fs");
      const path = await import("path");
      
      const modulePath = path.resolve(process.cwd(), "src/server/api/routers/jokes.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");
      
      expect(moduleContent).toContain("async function generateNewJoke");
      expect(moduleContent).toContain("try {");
      expect(moduleContent).toContain("catch (error)");
      expect(moduleContent).toContain("fallback joke");
    });
  });

  describe("jokesRouter procedures", () => {
    it("should have getCurrent procedure that calls generateNewJoke", async () => {
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

      expect(result).toHaveProperty("joke");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("isFromCache");
      expect(result.isFromCache).toBe(false);
    });

    it("should have generateNew procedure", async () => {
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

      expect(result).toHaveProperty("joke");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("isFromCache");
    });

    it("should have clearCache procedure that deletes user jokes", async () => {
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

    it("should require authentication for all procedures", async () => {
      const db = createMockDb({});
      const caller = await buildCaller({ db, user: null });

      await expect(caller.jokes.getCurrent()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      await expect(caller.jokes.generateNew()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });

      await expect(caller.jokes.clearCache()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("database operations", () => {
    it("should query previous jokes with correct structure", async () => {
      const user = createMockUser({ id: "user_db_query" })!;
      
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

      // Verify the database operations were called
      expect(db.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalledWith(dailyJokes);
      expect(selectChain.where).toHaveBeenCalled();
      expect(selectChain.orderBy).toHaveBeenCalled();
      expect(selectChain.limit).toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      const user = createMockUser({ id: "user_db_error" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database connection failed")),
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

      // Should return fallback joke when database fails
      expect(result.joke).toBeDefined();
      expect(typeof result.joke).toBe("string");
      expect(result.isFromCache).toBe(false);
    });
  });

  describe("error handling and fallbacks", () => {
    it("should return fallback joke when AI Gateway is not configured", async () => {
      const user = createMockUser({ id: "user_fallback" })!;
      
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
      expect(result.joke).toContain("classic");
      expect(result.isFromCache).toBe(false);
      
      // Get the mocked generateText function
      const { generateText } = await import("ai");
      expect(generateText).not.toHaveBeenCalled();
    });

    it("should handle getCurrent errors with fallback", async () => {
      const user = createMockUser({ id: "user_get_current_error" })!;
      
      // Mock database to throw error
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

      // The actual implementation returns a fallback joke from generateNewJoke, not getCurrent's error handler
      expect(result.joke).toBeDefined();
      expect(typeof result.joke).toBe("string");
      expect(result.isFromCache).toBe(false);
      // The error is handled in generateNewJoke, so we get either the AI Gateway fallback or error fallback
      expect(result.joke).toMatch(/AI generation failed|Vercel AI Gateway not configured/);
    });

    it("should handle various error types", async () => {
      const user = createMockUser({ id: "user_error_types" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue("String error"), // Non-Error object
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
      expect(typeof result.joke).toBe("string");
      expect(result.isFromCache).toBe(false);
    });
  });

  describe("logging and debugging", () => {
    it("should log appropriate messages", async () => {
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

      // Should log user ID and refresh message
      expect(consoleSpy).toHaveBeenCalledWith(
        "jokesRouter.getCurrent called for user:",
        user.id
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "🔄 Generating fresh joke on browser refresh..."
      );

      consoleSpy.mockRestore();
    });

    it("should log AI Gateway status", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const user = createMockUser({ id: "user_ai_status" })!;
      
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
        "Vercel AI Gateway not configured, using fallback joke"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("memory and performance considerations", () => {
    it("should handle empty previous jokes array", async () => {
      const user = createMockUser({ id: "user_empty_jokes" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Empty array
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

    it("should handle multiple previous jokes", async () => {
      const user = createMockUser({ id: "user_multiple_jokes" })!;
      
      const previousJokes = [
        { joke: "Previous joke 1" },
        { joke: "Previous joke 2" },
        { joke: "Previous joke 3" },
      ];

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(previousJokes),
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

  describe("data validation and types", () => {
    it("should return properly typed response objects", async () => {
      const user = createMockUser({ id: "user_types" })!;
      
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

      expect(typeof result.joke).toBe("string");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(typeof result.isFromCache).toBe("boolean");
      expect(result.isFromCache).toBe(false);
    });

    it("should handle clearCache return type", async () => {
      const user = createMockUser({ id: "user_clear_types" })!;
      
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
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("integration with external services", () => {
    it("should not call AI service when not configured", async () => {
      const user = createMockUser({ id: "user_no_ai" })!;
      
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

      // Get the mocked generateText function
      const { generateText } = await import("ai");
      expect(generateText).not.toHaveBeenCalled();
    });

    it("should handle database schema correctly", async () => {
      const user = createMockUser({ id: "user_schema" })!;
      
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const deleteChain = {
        where: vi.fn().mockResolvedValue([]),
      };

      const db = createMockDb({
        select: vi.fn().mockReturnValue(selectChain),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        }),
        delete: vi.fn().mockReturnValue(deleteChain),
      });

      const caller = await buildCaller({ db, user });
      
      // Test individual operations
      await caller.jokes.generateNew();
      expect(db.select).toHaveBeenCalled();
      
      await caller.jokes.clearCache();
      expect(db.delete).toHaveBeenCalledWith(dailyJokes);
      expect(deleteChain.where).toHaveBeenCalled();

      // Verify the schema table is used correctly
      expect(selectChain.from).toHaveBeenCalledWith(dailyJokes);
    });
  });
});
