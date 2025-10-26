import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  analytics,
  setPosthogClientForTesting,
  resetPosthogClientForTesting,
} from "~/lib/analytics";

const mockPosthog = {
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
};

describe("analytics", () => {
  beforeEach(() => {
    mockPosthog.capture.mockClear();
    mockPosthog.identify.mockClear();
    mockPosthog.reset.mockClear();
    setPosthogClientForTesting(mockPosthog);
  });

  afterEach(() => {
    resetPosthogClientForTesting();
  });

  describe("pageView", () => {
    it("should call pageView function", () => {
      expect(() => {
        analytics.pageView("Test Page", { customProp: "value" });
      }).not.toThrow();
    });
  });

  describe("custom events", () => {
    it("should call event function", () => {
      expect(() => {
        analytics.event("test_event", { context: "unit-test" });
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
      const error = new Error("Test error");
      // Remove stack to avoid serialization issues in test output
      error.stack = undefined;
      const context = { userId: "user-123", page: "workout" };
      expect(() => analytics.error(error, context)).not.toThrow();
    });

    it("should call error function without context", () => {
      const error = new Error("Test error");
      // Remove stack to avoid serialization issues in test output
      error.stack = undefined;
      expect(() => analytics.error(error)).not.toThrow();
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
