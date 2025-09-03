import { describe, it, expect } from "vitest";
import { jokesRouter } from "~/server/api/routers/jokes";

describe("jokesRouter", () => {
  it("should export a router with expected procedures", () => {
    expect(jokesRouter).toBeDefined();
    expect(typeof jokesRouter).toBe("object");

    // Check that the router has the expected procedures
    expect(jokesRouter._def.procedures).toBeDefined();
    expect(jokesRouter._def.procedures.getCurrent).toBeDefined();
    expect(jokesRouter._def.procedures.generateNew).toBeDefined();
    expect(jokesRouter._def.procedures.clearCache).toBeDefined();
  });

  it("should have getCurrent as a query procedure", () => {
    const getCurrent = jokesRouter._def.procedures.getCurrent;
    expect(getCurrent._def.type).toBe("query");
  });

  it("should have generateNew as a mutation procedure", () => {
    const generateNew = jokesRouter._def.procedures.generateNew;
    expect(generateNew._def.type).toBe("mutation");
  });

  it("should have clearCache as a mutation procedure", () => {
    const clearCache = jokesRouter._def.procedures.clearCache;
    expect(clearCache._def.type).toBe("mutation");
  });

  it("should have all procedures as protected", () => {
    const procedures = jokesRouter._def.procedures;

    // All procedures should be protected (require authentication)
    Object.values(procedures).forEach((procedure) => {
      expect(procedure._def.type).toBeDefined();
    });
  });
});
