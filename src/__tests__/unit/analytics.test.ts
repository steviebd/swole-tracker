import { describe, it, expect } from "vitest";
import { analytics } from "~/lib/analytics";

describe("analytics module", () => {
  it("should have all required methods", () => {
    expect(typeof analytics.pageView).toBe("function");
    expect(typeof analytics.workoutStarted).toBe("function");
    expect(typeof analytics.workoutCompleted).toBe("function");
    expect(typeof analytics.exerciseLogged).toBe("function");
    expect(typeof analytics.templateCreated).toBe("function");
    expect(typeof analytics.templateDeleted).toBe("function");
    expect(typeof analytics.templateEdited).toBe("function");
    expect(typeof analytics.weightUnitChanged).toBe("function");
    expect(typeof analytics.error).toBe("function");
    expect(typeof analytics.featureUsed).toBe("function");
  });

  it("should handle function calls without throwing", () => {
    expect(() => analytics.pageView("dashboard")).not.toThrow();
    expect(() =>
      analytics.workoutStarted("template1", "Push Day"),
    ).not.toThrow();
    expect(() => analytics.workoutCompleted("session1", 3600, 8)).not.toThrow();
    expect(() =>
      analytics.exerciseLogged("ex1", "Bench Press", 3, 100),
    ).not.toThrow();
    expect(() => analytics.templateCreated("template1", 5)).not.toThrow();
    expect(() => analytics.templateDeleted("template1")).not.toThrow();
    expect(() => analytics.templateEdited("template1", 6)).not.toThrow();
    expect(() => analytics.weightUnitChanged("kg")).not.toThrow();
    expect(() => analytics.error(new Error("test"))).not.toThrow();
    expect(() => analytics.featureUsed("dark_mode")).not.toThrow();
  });

  it("should handle various input types", () => {
    expect(() =>
      analytics.pageView("dashboard", { userId: "123" }),
    ).not.toThrow();
    expect(() => analytics.exerciseLogged("ex1", "Pull Ups", 3)).not.toThrow();
    expect(() =>
      analytics.error(new Error("test"), { context: "value" }),
    ).not.toThrow();
    expect(() =>
      analytics.featureUsed("export_data", { format: "csv" }),
    ).not.toThrow();
  });
});
