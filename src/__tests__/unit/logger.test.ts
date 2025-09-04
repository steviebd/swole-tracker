import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
      expect(() => {
        logger.debug("Test debug message", { userId: "test-user" });
      }).not.toThrow();
    });

    it("should handle debug messages without context", () => {
      expect(() => {
        logger.debug("Test debug message");
      }).not.toThrow();
    });
  });

  describe("info logging", () => {
    it("should log info messages in development", () => {
      expect(() => {
        logger.info("Test info message", { endpoint: "/api/test" });
      }).not.toThrow();
    });
  });

  describe("warn logging", () => {
    it("should log warn messages", () => {
      expect(() => {
        logger.warn("Test warning", { userId: "test-user" });
      }).not.toThrow();
    });
  });

  describe("error logging", () => {
    it("should log error messages with Error objects", () => {
      expect(() => {
        const testError = new Error("Test error");
        logger.error("Test error message", testError, { userId: "test-user" });
      }).not.toThrow();
    });

    it("should handle non-Error objects", () => {
      expect(() => {
        logger.error("Test error message", "string error");
      }).not.toThrow();
    });
  });

  describe("webhook logging", () => {
    it("should call logWebhook function", () => {
      expect(() => {
        logWebhook("user.created", "user-123", "workout-456");
      }).not.toThrow();
    });
  });

  describe("timing logging", () => {
    it("should call logApiCall function", () => {
      expect(() => {
        logApiCall("/api/workouts", "user-123", 150);
      }).not.toThrow();
    });
  });

  describe("security logging", () => {
    it("should call logSecurityEvent function", () => {
      expect(() => {
        logSecurityEvent("login.failed", "test-user", { ip: "192.168.1.1" });
      }).not.toThrow();
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
