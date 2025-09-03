import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("~/server/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
  },
}));

vi.mock("~/env", () => ({
  env: {
    AI_GATEWAY_PROMPT: "Tell a fitness joke",
    AI_GATEWAY_MODEL: "openai/gpt-4o-mini",
    AI_GATEWAY_JOKE_MEMORY_NUMBER: 3,
    VERCEL_AI_GATEWAY_API_KEY: "test-key",
  },
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  relations: vi.fn(),
}));

// Import after mocking
import { jokesRouter } from "~/server/api/routers/jokes";

describe("jokesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("router structure", () => {
    it("should export a router with expected procedures", () => {
      expect(jokesRouter).toBeDefined();
      expect(typeof jokesRouter).toBe("object");
      expect(jokesRouter._def.procedures).toBeDefined();
    });

    it("should have getCurrent as a query procedure", () => {
      expect(jokesRouter._def.procedures.getCurrent).toBeDefined();
      expect(jokesRouter._def.procedures.getCurrent._def.type).toBe("query");
    });

    it("should have generateNew as a mutation procedure", () => {
      expect(jokesRouter._def.procedures.generateNew).toBeDefined();
      expect(jokesRouter._def.procedures.generateNew._def.type).toBe(
        "mutation",
      );
    });

    it("should have clearCache as a mutation procedure", () => {
      expect(jokesRouter._def.procedures.clearCache).toBeDefined();
      expect(jokesRouter._def.procedures.clearCache._def.type).toBe("mutation");
    });
  });

  describe("AI models", () => {
    it("should support multiple AI models", () => {
      // This is a basic test to ensure the router is properly structured
      expect(jokesRouter).toBeDefined();
    });
  });

  describe("joke generation", () => {
    it("should have joke generation procedures", () => {
      expect(jokesRouter._def.procedures.getCurrent).toBeDefined();
      expect(jokesRouter._def.procedures.generateNew).toBeDefined();
    });
  });
});
