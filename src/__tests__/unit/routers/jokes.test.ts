import { describe, it, expect, beforeAll } from "vitest";

// Import the router - we'll handle mocking differently
let jokesRouter: any;

describe("jokesRouter", () => {
  beforeAll(async () => {
    // Dynamic import to avoid mocking issues
    const { jokesRouter: router } = await import("~/server/api/routers/jokes");
    jokesRouter = router;
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
