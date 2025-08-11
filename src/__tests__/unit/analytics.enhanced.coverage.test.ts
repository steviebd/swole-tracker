import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock posthog before importing analytics
const mockPosthog = {
  capture: vi.fn(),
  identify: vi.fn(),
  pageview: vi.fn(),
  flush: vi.fn(),
  init: vi.fn(),
};

vi.mock("posthog-js", () => ({
  default: mockPosthog,
}));

describe("analytics.ts enhanced coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for browser environment
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:3000/test" },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("pageView captures with correct parameters", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.pageView("/dashboard", { userId: "123" });

    expect(mockPosthog.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: "http://localhost:3000/test",
      page: "/dashboard",
      userId: "123",
    });
  });

  it("workoutStarted captures with template info", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.workoutStarted("template-123", "Push Day");

    expect(mockPosthog.capture).toHaveBeenCalledWith("workout_started", {
      templateId: "template-123",
      templateName: "Push Day",
      timestamp: expect.any(String),
    });
  });

  it("workoutCompleted captures with session metrics", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.workoutCompleted("session-456", 3600, 5);

    expect(mockPosthog.capture).toHaveBeenCalledWith("workout_completed", {
      sessionId: "session-456",
      duration: 3600,
      exerciseCount: 5,
      timestamp: expect.any(String),
    });
  });

  it("exerciseLogged captures with exercise details", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.exerciseLogged("ex-789", "Bench Press", 3, 225);

    expect(mockPosthog.capture).toHaveBeenCalledWith("exercise_logged", {
      exerciseId: "ex-789",
      exerciseName: "Bench Press",
      sets: 3,
      weight: 225,
      timestamp: expect.any(String),
    });
  });

  it("exerciseLogged works without weight", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.exerciseLogged("ex-790", "Push-ups", 3);

    expect(mockPosthog.capture).toHaveBeenCalledWith("exercise_logged", {
      exerciseId: "ex-790",
      exerciseName: "Push-ups",
      sets: 3,
      weight: undefined,
      timestamp: expect.any(String),
    });
  });

  it("templateCreated captures template info", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.templateCreated("template-999", 8);

    expect(mockPosthog.capture).toHaveBeenCalledWith("template_created", {
      templateId: "template-999",
      exerciseCount: 8,
      timestamp: expect.any(String),
    });
  });

  it("templateDeleted captures template id", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.templateDeleted("template-888");

    expect(mockPosthog.capture).toHaveBeenCalledWith("template_deleted", {
      templateId: "template-888",
      timestamp: expect.any(String),
    });
  });

  it("templateEdited captures template changes", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.templateEdited("template-777", 6);

    expect(mockPosthog.capture).toHaveBeenCalledWith("template_edited", {
      templateId: "template-777",
      exerciseCount: 6,
      timestamp: expect.any(String),
    });
  });

  it("weightUnitChanged captures unit preference", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.weightUnitChanged("lbs");

    expect(mockPosthog.capture).toHaveBeenCalledWith("weight_unit_changed", {
      unit: "lbs",
      timestamp: expect.any(String),
    });
  });

  it("error captures error details", async () => {
    const { analytics } = await import("~/lib/analytics");

    const testError = new Error("Test error message");
    testError.stack = "Error stack trace";

    analytics.error(testError, { component: "WorkoutSession" });

    expect(mockPosthog.capture).toHaveBeenCalledWith("error", {
      error: "Test error message",
      stack: "Error stack trace",
      context: { component: "WorkoutSession" },
      timestamp: expect.any(String),
    });
  });

  it("error works without context", async () => {
    const { analytics } = await import("~/lib/analytics");

    const testError = new Error("Simple error");

    analytics.error(testError);

    expect(mockPosthog.capture).toHaveBeenCalledWith("error", {
      error: "Simple error",
      stack: expect.any(String),
      context: undefined,
      timestamp: expect.any(String),
    });
  });

  it("featureUsed captures feature usage", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.featureUsed("offline-mode", { enabled: true, duration: 300 });

    expect(mockPosthog.capture).toHaveBeenCalledWith("feature_used", {
      feature: "offline-mode",
      enabled: true,
      duration: 300,
      timestamp: expect.any(String),
    });
  });

  it("featureUsed works without properties", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.featureUsed("dark-mode");

    expect(mockPosthog.capture).toHaveBeenCalledWith("feature_used", {
      feature: "dark-mode",
      timestamp: expect.any(String),
    });
  });

  it("pageView works without properties", async () => {
    const { analytics } = await import("~/lib/analytics");

    analytics.pageView("/home");

    expect(mockPosthog.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: "http://localhost:3000/test",
      page: "/home",
    });
  });

  it("all methods include timestamp", async () => {
    const { analytics } = await import("~/lib/analytics");

    const beforeTime = new Date();

    analytics.workoutStarted("t1", "Test");
    analytics.workoutCompleted("s1", 100, 1);
    analytics.exerciseLogged("e1", "Test", 1);
    analytics.templateCreated("t1", 1);
    analytics.templateDeleted("t1");
    analytics.templateEdited("t1", 1);
    analytics.weightUnitChanged("kg");
    analytics.error(new Error("test"));
    analytics.featureUsed("test");

    const afterTime = new Date();

    // Check that all calls included timestamps within our time range
    const calls = mockPosthog.capture.mock.calls;
    calls.forEach((call) => {
      const eventData = call[1];
      expect(eventData.timestamp).toBeDefined();
      expect(typeof eventData.timestamp).toBe("string");
      const eventTime = new Date(eventData.timestamp);
      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
