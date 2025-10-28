import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock PostHog analytics
vi.mock("~/lib/analytics", () => ({
  analytics: {
    event: vi.fn(),
  },
}));

// Import after mocking
import {
  logger,
  logApiCall,
  logWebhook,
  logSecurityEvent,
  Logger,
} from "~/lib/logger";
import { analytics } from "~/lib/analytics";

// Helper to create logger with specific environment
const createLoggerWithEnv = (nodeEnv: string) => {
  return new Logger(nodeEnv);
};

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("debug logging", () => {
    it("should send debug events to PostHog", () => {
      logger.debug("Test debug message", { userId: "test-user" });
      expect(analytics.event).toHaveBeenCalledWith(
        "log.debug",
        expect.objectContaining({
          message: "Test debug message",
          userId: "test-user",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should handle debug messages without context", () => {
      logger.debug("Test debug message");
      expect(analytics.event).toHaveBeenCalledWith(
        "log.debug",
        expect.objectContaining({
          message: "Test debug message",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log debug messages in test environment", () => {
      const testLogger = createLoggerWithEnv("test");
      testLogger.debug("Test debug message");
      expect(analytics.event).toHaveBeenCalledWith(
        "log.debug",
        expect.objectContaining({
          message: "Test debug message",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should sanitize sensitive context data", () => {
      logger.debug("Test message", {
        userId: "test-user",
        accessToken: "secret-token",
        password: "secret-password",
        refreshToken: "secret-refresh",
        secret: "secret-key",
        normalField: "normal-value",
      });
      expect(analytics.event).toHaveBeenCalledWith(
        "log.debug",
        expect.objectContaining({
          message: "Test message",
          userId: "test-user",
          normalField: "normal-value",
          timestamp: expect.any(String),
        }),
      );
      expect(analytics.event).toHaveBeenCalledWith(
        "log.debug",
        expect.not.objectContaining({
          accessToken: expect.any(String),
          password: expect.any(String),
          refreshToken: expect.any(String),
          secret: expect.any(String),
        }),
      );
    });
  });

  describe("info logging", () => {
    it("should send info events to PostHog", () => {
      logger.info("Test info message", { endpoint: "/api/test" });
      expect(analytics.event).toHaveBeenCalledWith(
        "log.info",
        expect.objectContaining({
          message: "Test info message",
          endpoint: "/api/test",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should not log info messages in production", () => {
      const testLogger = createLoggerWithEnv("production");
      testLogger.info("Test info message");
      expect(analytics.event).not.toHaveBeenCalled();
    });
  });

  describe("warn logging", () => {
    it("should send warn events to PostHog", () => {
      logger.warn("Test warning", { userId: "test-user" });
      expect(analytics.event).toHaveBeenCalledWith(
        "log.warn",
        expect.objectContaining({
          message: "Test warning",
          userId: "test-user",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log warn messages in production", () => {
      const testLogger = createLoggerWithEnv("production");
      testLogger.warn("Test warning");
      expect(analytics.event).toHaveBeenCalledWith(
        "log.warn",
        expect.objectContaining({
          message: "Test warning",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("error logging", () => {
    it("should send error events to PostHog with Error objects", () => {
      const testError = new Error("Test error");
      logger.error("Test error message", testError, { userId: "test-user" });
      expect(analytics.event).toHaveBeenCalledWith(
        "log.error",
        expect.objectContaining({
          message: "Test error message",
          error: "Test error",
          stack: expect.any(String),
          userId: "test-user",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should handle non-Error objects", () => {
      logger.error("Test error message", "string error");
      expect(analytics.event).toHaveBeenCalledWith(
        "log.error",
        expect.objectContaining({
          message: "Test error message",
          error: "string error",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should handle null/undefined errors", () => {
      logger.error("Test error message", null);
      expect(analytics.event).toHaveBeenCalledWith(
        "log.error",
        expect.objectContaining({
          message: "Test error message",
          error: null,
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log error messages in production", () => {
      const testLogger = createLoggerWithEnv("production");
      testLogger.error("Test error");
      expect(analytics.event).toHaveBeenCalledWith(
        "log.error",
        expect.objectContaining({
          message: "Test error",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("webhook logging", () => {
    it("should send webhook events to PostHog", () => {
      logWebhook("user.created", "user-123", "workout-456");
      expect(analytics.event).toHaveBeenCalledWith(
        "webhook.processed",
        expect.objectContaining({
          message: "Processing user.created",
          userId: "user-123",
          workoutId: "workout-456",
          eventType: "user.created",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should handle webhook logging without userId", () => {
      logWebhook("workout.completed", undefined, "workout-456");
      expect(analytics.event).toHaveBeenCalledWith(
        "webhook.processed",
        expect.objectContaining({
          message: "Processing workout.completed",
          workoutId: "workout-456",
          eventType: "workout.completed",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should send webhook debug events in development", () => {
      const testLogger = createLoggerWithEnv("development");
      testLogger.webhook(
        "test.event",
        { data: "test" },
        { userId: "user-123" },
      );
      expect(analytics.event).toHaveBeenCalledWith(
        "webhook.debug",
        expect.objectContaining({
          message: "test.event",
          payload: { data: "test" },
          userId: "user-123",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("timing logging", () => {
    it("should send API timing events to PostHog", () => {
      logApiCall("/api/workouts", "user-123", 150);
      expect(analytics.event).toHaveBeenCalledWith(
        "api.timing",
        expect.objectContaining({
          endpoint: "/api/workouts",
          duration: 150,
          userId: "user-123",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should send debug events for API calls without duration", () => {
      logApiCall("/api/templates", "user-456");
      expect(analytics.event).toHaveBeenCalledWith(
        "log.debug",
        expect.objectContaining({
          message: "API call: /api/templates",
          userId: "user-456",
          endpoint: "/api/templates",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should handle timing calls directly", () => {
      logger.timing("/api/exercises", 200, { userId: "user-789" });
      expect(analytics.event).toHaveBeenCalledWith(
        "api.timing",
        expect.objectContaining({
          endpoint: "/api/exercises",
          duration: 200,
          userId: "user-789",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("security logging", () => {
    it("should send security events to PostHog", () => {
      logSecurityEvent("login.failed", "test-user", { ip: "192.168.1.1" });
      expect(analytics.event).toHaveBeenCalledWith(
        "security.event",
        expect.objectContaining({
          message: "login.failed",
          userId: "test-user",
          ip: "192.168.1.1",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should handle security events without userId", () => {
      logSecurityEvent("rate.limit.exceeded", undefined, { ip: "192.168.1.1" });
      expect(analytics.event).toHaveBeenCalledWith(
        "security.event",
        expect.objectContaining({
          message: "rate.limit.exceeded",
          ip: "192.168.1.1",
          timestamp: expect.any(String),
        }),
      );
    });

    it("should log security events even in test environment", () => {
      const testLogger = createLoggerWithEnv("test");
      testLogger.security("test.security.event", { userId: "test-user" });
      expect(analytics.event).toHaveBeenCalledWith(
        "security.event",
        expect.objectContaining({
          message: "test.security.event",
          userId: "test-user",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("convenience functions", () => {
    it("should export logApiCall function", () => {
      expect(typeof logApiCall).toBe("function");
    });

    it("should export logWebhook function", () => {
      expect(typeof logWebhook).toBe("function");
    });

    it("should export logSecurityEvent function", () => {
      expect(typeof logSecurityEvent).toBe("function");
    });
  });
});

describe("logSecurityEvent", () => {
  it("should log security events", () => {
    logSecurityEvent("login.failed", "test-user", { ip: "192.168.1.1" });
    expect(analytics.event).toHaveBeenCalledWith(
      "security.event",
      expect.objectContaining({
        message: "login.failed",
        userId: "test-user",
        ip: "192.168.1.1",
        timestamp: expect.any(String),
      }),
    );
  });
});

describe("Logger environment behavior", () => {
  it("should handle PostHog failures gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(analytics.event).mockImplementation(() => {
      throw new Error("PostHog error");
    });

    logger.debug("Test message");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[LOGGER] Failed to send to PostHog:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("should truncate long strings in production", () => {
    const testLogger = createLoggerWithEnv("production");
    const longString = "a".repeat(150);
    testLogger.warn("Test message", { longField: longString });
    expect(analytics.event).toHaveBeenCalledWith(
      "log.warn",
      expect.objectContaining({
        message: "Test message",
        longField: "a".repeat(97) + "...",
      }),
    );
  });

  it("should not truncate strings in development", () => {
    const testLogger = createLoggerWithEnv("development");
    const longString = "a".repeat(150);
    testLogger.warn("Test message", { longField: longString });
    expect(analytics.event).toHaveBeenCalledWith(
      "log.warn",
      expect.objectContaining({
        message: "Test message",
        longField: longString,
      }),
    );
  });
});

describe("Logger singleton", () => {
  it("should export a singleton logger instance", () => {
    // Since logger is imported, we can just check it's defined
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe("function");
  });

  it("should be an instance of Logger class", () => {
    expect(logger).toBeInstanceOf(Logger);
  });
});
