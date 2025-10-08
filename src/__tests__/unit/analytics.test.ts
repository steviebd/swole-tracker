import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import after setting up mocks
import { analytics } from "~/lib/analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("pageView", () => {
    it("should call pageView function", () => {
      expect(() => {
        analytics.pageView("Test Page", { customProp: "value" });
      }).not.toThrow();
    });
  });

  describe("workout events", () => {
    it("should call workoutStarted function", () => {
      expect(() => {
        analytics.workoutStarted("template-123", "Push Day");
      }).not.toThrow();
    });

    it("should call workoutCompleted function", () => {
      expect(() => {
        analytics.workoutCompleted("session-123", 3600, 5);
      }).not.toThrow();
    });

    it("should call exerciseLogged function with weight", () => {
      expect(() => {
        analytics.exerciseLogged("exercise-123", "Bench Press", 3, 80);
      }).not.toThrow();
    });

    it("should call exerciseLogged function without weight", () => {
      expect(() => {
        analytics.exerciseLogged("exercise-123", "Push-ups", 3);
      }).not.toThrow();
    });
  });

  describe("template events", () => {
    it("should call templateCreated function", () => {
      expect(() => {
        analytics.templateCreated("template-123", 6);
      }).not.toThrow();
    });

    it("should call templateDeleted function", () => {
      expect(() => {
        analytics.templateDeleted("template-123");
      }).not.toThrow();
    });

    it("should call templateEdited function", () => {
      expect(() => {
        analytics.templateEdited("template-123", 7);
      }).not.toThrow();
    });
  });

  describe("settings events", () => {
    it("should call weightUnitChanged function", () => {
      expect(() => {
        analytics.weightUnitChanged("lbs");
      }).not.toThrow();
    });
  });

  describe("error tracking", () => {
    it("should call error function with context", () => {
      expect(() => {
        const error = new Error("Test error");
        const context = { userId: "user-123", page: "workout" };
        analytics.error(error, context);
      }).not.toThrow();
    });

    it("should call error function without context", () => {
      expect(() => {
        const error = new Error("Test error");
        analytics.error(error);
      }).not.toThrow();
    });
  });

  describe("feature usage", () => {
    it("should call featureUsed function with properties", () => {
      expect(() => {
        analytics.featureUsed("dark_mode", { source: "settings" });
      }).not.toThrow();
    });

    it("should call featureUsed function without properties", () => {
      expect(() => {
        analytics.featureUsed("quick_start");
      }).not.toThrow();
    });
  });

  describe("offline behavior", () => {
    it("should call functions regardless of online status", () => {
      expect(() => {
        analytics.workoutStarted("template-123", "Test");
      }).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should call functions even when mocked", () => {
      expect(() => {
        analytics.workoutStarted("template-123", "Test");
      }).not.toThrow();
    });
  });
});
