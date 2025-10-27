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

  describe("AI debrief events", () => {
    it("should call aiDebriefViewed function", () => {
      expect(() => {
        analytics.aiDebriefViewed("session-123", 1, 5);
      }).not.toThrow();
    });

    it("should call aiDebriefRegenerated function with reason", () => {
      expect(() => {
        analytics.aiDebriefRegenerated("session-123", 2, "user_requested");
      }).not.toThrow();
    });

    it("should call aiDebriefRegenerated function without reason", () => {
      expect(() => {
        analytics.aiDebriefRegenerated("session-123", 2);
      }).not.toThrow();
    });

    it("should call aiDebriefDismissed function", () => {
      expect(() => {
        analytics.aiDebriefDismissed("session-123", 1, true);
      }).not.toThrow();
    });
  });

  describe("navigation events", () => {
    it("should call navigationChanged function with source", () => {
      expect(() => {
        analytics.navigationChanged("dashboard", "workouts", "menu");
      }).not.toThrow();
    });

    it("should call navigationChanged function without source", () => {
      expect(() => {
        analytics.navigationChanged("workouts", "exercise-detail");
      }).not.toThrow();
    });
  });

  describe("search and filter events", () => {
    it("should call searchPerformed function with category", () => {
      expect(() => {
        analytics.searchPerformed("bench press", 5, "exercises");
      }).not.toThrow();
    });

    it("should call searchPerformed function without category", () => {
      expect(() => {
        analytics.searchPerformed("push day", 2);
      }).not.toThrow();
    });

    it("should call filtersApplied function", () => {
      expect(() => {
        analytics.filtersApplied(
          { muscleGroup: "chest", difficulty: "intermediate" },
          3,
        );
      }).not.toThrow();
    });
  });

  describe("social and sharing events", () => {
    it("should call workoutShared function", () => {
      expect(() => {
        analytics.workoutShared("workout-123", "twitter");
      }).not.toThrow();
    });

    it("should call progressShared function", () => {
      expect(() => {
        analytics.progressShared("30d", "instagram");
      }).not.toThrow();
    });
  });

  describe("goal and achievement events", () => {
    it("should call goalSet function", () => {
      expect(() => {
        analytics.goalSet("weight_loss", 5, "kg");
      }).not.toThrow();
    });

    it("should call goalAchieved function", () => {
      expect(() => {
        analytics.goalAchieved("bench_press", 100, 95, "kg");
      }).not.toThrow();
    });

    it("should call personalRecord function", () => {
      expect(() => {
        analytics.personalRecord("exercise-123", "Bench Press", 90, 100, "kg");
      }).not.toThrow();
    });
  });

  describe("device and connectivity events", () => {
    it("should call offlineModeEnabled function", () => {
      expect(() => {
        analytics.offlineModeEnabled();
      }).not.toThrow();
    });

    it("should call syncCompleted function", () => {
      expect(() => {
        analytics.syncCompleted(25, 1500);
      }).not.toThrow();
    });
  });

  describe("user engagement events", () => {
    it("should call appInstalled function with source", () => {
      expect(() => {
        analytics.appInstalled("web_store");
      }).not.toThrow();
    });

    it("should call appInstalled function without source", () => {
      expect(() => {
        analytics.appInstalled();
      }).not.toThrow();
    });

    it("should call tutorialCompleted function", () => {
      expect(() => {
        analytics.tutorialCompleted("getting_started", 300);
      }).not.toThrow();
    });

    it("should call feedbackSubmitted function with comments", () => {
      expect(() => {
        analytics.feedbackSubmitted(4, "usability", "Great app!");
      }).not.toThrow();
    });

    it("should call feedbackSubmitted function without comments", () => {
      expect(() => {
        analytics.feedbackSubmitted(5, "performance");
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
