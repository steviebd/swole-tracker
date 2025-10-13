import { describe, it, expect, beforeAll } from "vitest";

// Import the router with dynamic import to avoid db import issues
let templatesRouter: any;

describe("templatesRouter", () => {
  beforeAll(async () => {
    // Dynamic import to avoid issues
    const { templatesRouter: router } = await import(
      "~/server/api/routers/templates"
    );
    templatesRouter = router;
  });

  describe("router structure", () => {
    it("should export a router with expected procedures", () => {
      expect(templatesRouter).toBeDefined();
      expect(typeof templatesRouter).toBe("object");
      expect(templatesRouter._def.procedures).toBeDefined();
    });

    it("should have getAll as a query procedure", () => {
      expect(templatesRouter._def.procedures.getAll).toBeDefined();
      expect(templatesRouter._def.procedures.getAll._def.type).toBe("query");
    });

    it("should have getById as a query procedure", () => {
      expect(templatesRouter._def.procedures.getById).toBeDefined();
      expect(templatesRouter._def.procedures.getById._def.type).toBe("query");
    });

    it("should have create as a mutation procedure", () => {
      expect(templatesRouter._def.procedures.create).toBeDefined();
      expect(templatesRouter._def.procedures.create._def.type).toBe("mutation");
    });

    it("should have update as a mutation procedure", () => {
      expect(templatesRouter._def.procedures.update).toBeDefined();
      expect(templatesRouter._def.procedures.update._def.type).toBe("mutation");
    });

    it("should have delete as a mutation procedure", () => {
      expect(templatesRouter._def.procedures.delete).toBeDefined();
      expect(templatesRouter._def.procedures.delete._def.type).toBe("mutation");
    });
  });
});
