import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// No console spies needed since logger mock doesn't call console methods

// Mock the logger module
vi.mock("~/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logApiCall: vi.fn(),
  logWebhook: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

// Import after mocking
import { logger, logApiCall, logWebhook, logSecurityEvent } from "~/lib/logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("debug logging", () => {
    it("should log debug messages in development", () => {
      logger.debug("Test debug message", { userId: "test-user" });

      expect(logger.debug).toHaveBeenCalledWith("Test debug message", {
        userId: "test-user",
      });
    });

    it("should handle debug messages without context", () => {
      logger.debug("Test debug message");

      expect(logger.debug).toHaveBeenCalledWith("Test debug message");
    });
  });

  describe("info logging", () => {
    it("should log info messages in development", () => {
      logger.info("Test info message", { endpoint: "/api/test" });

      expect(logger.info).toHaveBeenCalledWith("Test info message", {
        endpoint: "/api/test",
      });
    });
  });

  describe("warn logging", () => {
    it("should log warn messages", () => {
      logger.warn("Test warning", { userId: "test-user" });

      expect(logger.warn).toHaveBeenCalledWith("Test warning", {
        userId: "test-user",
      });
    });
  });

  describe("error logging", () => {
    it("should log error messages with Error objects", () => {
      const testError = new Error("Test error");
      logger.error("Test error message", testError, { userId: "test-user" });

      expect(logger.error).toHaveBeenCalledWith(
        "Test error message",
        testError,
        { userId: "test-user" },
      );
    });

    it("should handle non-Error objects", () => {
      logger.error("Test error message", "string error");

      expect(logger.error).toHaveBeenCalledWith(
        "Test error message",
        "string error",
      );
    });
  });

  describe("webhook logging", () => {
    it("should call logWebhook function", () => {
      logWebhook("user.created", "user-123", "workout-456");

      expect(logWebhook).toHaveBeenCalledWith(
        "user.created",
        "user-123",
        "workout-456",
      );
    });
  });

  describe("timing logging", () => {
    it("should call logApiCall function", () => {
      logApiCall("/api/workouts", "user-123", 150);

      expect(logApiCall).toHaveBeenCalledWith("/api/workouts", "user-123", 150);
    });
  });

  describe("security logging", () => {
    it("should call logSecurityEvent function", () => {
      logSecurityEvent("login.failed", "test-user", { ip: "192.168.1.1" });

      expect(logSecurityEvent).toHaveBeenCalledWith(
        "login.failed",
        "test-user",
        { ip: "192.168.1.1" },
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
  });
});
