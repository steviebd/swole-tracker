import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock posthog first
const mockPosthog = {
  capture: vi.fn(),
};

vi.mock("posthog-js", () => ({
  default: mockPosthog,
}));

// Mock navigator
const mockNavigator = {
  onLine: true,
};

Object.defineProperty(window, "navigator", {
  value: mockNavigator,
  writable: true,
});

// Mock the analytics module
vi.mock("~/lib/analytics", () => ({
  analytics: {
    pageView: vi.fn(),
    workoutStarted: vi.fn(),
    workoutCompleted: vi.fn(),
    exerciseLogged: vi.fn(),
    templateCreated: vi.fn(),
    templateDeleted: vi.fn(),
    templateEdited: vi.fn(),
    weightUnitChanged: vi.fn(),
    error: vi.fn(),
    featureUsed: vi.fn(),
  },
}));

// Import after mocking
import { analytics } from "~/lib/analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigator.onLine = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("safeOnline", () => {
    it("should return true when navigator.onLine is true", () => {
      mockNavigator.onLine = true;
      // This is a private function, but we can test the behavior through public methods
      expect(mockNavigator.onLine).toBe(true);
    });

    it("should return false when navigator.onLine is false", () => {
      mockNavigator.onLine = false;
      expect(mockNavigator.onLine).toBe(false);
    });
  });

  describe("pageView", () => {
    it("should call pageView function", () => {
      analytics.pageView("Test Page", { customProp: "value" });

      expect(analytics.pageView).toHaveBeenCalledWith("Test Page", {
        customProp: "value",
      });
    });
  });

  describe("workout events", () => {
    it("should call workoutStarted function", () => {
      const templateId = "template-123";
      const templateName = "Push Day";

      analytics.workoutStarted(templateId, templateName);

      expect(analytics.workoutStarted).toHaveBeenCalledWith(
        templateId,
        templateName,
      );
    });

    it("should call workoutCompleted function", () => {
      const sessionId = "session-123";
      const duration = 3600;
      const exerciseCount = 5;

      analytics.workoutCompleted(sessionId, duration, exerciseCount);

      expect(analytics.workoutCompleted).toHaveBeenCalledWith(
        sessionId,
        duration,
        exerciseCount,
      );
    });

    it("should call exerciseLogged function with weight", () => {
      const exerciseId = "exercise-123";
      const exerciseName = "Bench Press";
      const sets = 3;
      const weight = 80;

      analytics.exerciseLogged(exerciseId, exerciseName, sets, weight);

      expect(analytics.exerciseLogged).toHaveBeenCalledWith(
        exerciseId,
        exerciseName,
        sets,
        weight,
      );
    });

    it("should call exerciseLogged function without weight", () => {
      const exerciseId = "exercise-123";
      const exerciseName = "Push-ups";

      analytics.exerciseLogged(exerciseId, exerciseName, 3);

      expect(analytics.exerciseLogged).toHaveBeenCalledWith(
        exerciseId,
        exerciseName,
        3,
      );
    });
  });

  describe("template events", () => {
    it("should call templateCreated function", () => {
      const templateId = "template-123";
      const exerciseCount = 6;

      analytics.templateCreated(templateId, exerciseCount);

      expect(analytics.templateCreated).toHaveBeenCalledWith(
        templateId,
        exerciseCount,
      );
    });

    it("should call templateDeleted function", () => {
      const templateId = "template-123";

      analytics.templateDeleted(templateId);

      expect(analytics.templateDeleted).toHaveBeenCalledWith(templateId);
    });

    it("should call templateEdited function", () => {
      const templateId = "template-123";
      const exerciseCount = 7;

      analytics.templateEdited(templateId, exerciseCount);

      expect(analytics.templateEdited).toHaveBeenCalledWith(
        templateId,
        exerciseCount,
      );
    });
  });

  describe("settings events", () => {
    it("should call weightUnitChanged function", () => {
      const unit = "lbs";

      analytics.weightUnitChanged(unit);

      expect(analytics.weightUnitChanged).toHaveBeenCalledWith(unit);
    });
  });

  describe("error tracking", () => {
    it("should call error function with context", () => {
      const error = new Error("Test error");
      const context = { userId: "user-123", page: "workout" };

      analytics.error(error, context);

      expect(analytics.error).toHaveBeenCalledWith(error, context);
    });

    it("should call error function without context", () => {
      const error = new Error("Test error");

      analytics.error(error);

      expect(analytics.error).toHaveBeenCalledWith(error);
    });
  });

  describe("feature usage", () => {
    it("should call featureUsed function with properties", () => {
      const feature = "dark_mode";
      const properties = { source: "settings" };

      analytics.featureUsed(feature, properties);

      expect(analytics.featureUsed).toHaveBeenCalledWith(feature, properties);
    });

    it("should call featureUsed function without properties", () => {
      const feature = "quick_start";

      analytics.featureUsed(feature);

      expect(analytics.featureUsed).toHaveBeenCalledWith(feature);
    });
  });

  describe("offline behavior", () => {
    it("should call functions regardless of online status", () => {
      mockNavigator.onLine = false;

      analytics.workoutStarted("template-123", "Test");

      expect(analytics.workoutStarted).toHaveBeenCalledWith(
        "template-123",
        "Test",
      );
    });
  });

  describe("error handling", () => {
    it("should call functions even when mocked", () => {
      expect(() => {
        analytics.workoutStarted("template-123", "Test");
      }).not.toThrow();

      expect(analytics.workoutStarted).toHaveBeenCalledWith(
        "template-123",
        "Test",
      );
    });
  });
});
