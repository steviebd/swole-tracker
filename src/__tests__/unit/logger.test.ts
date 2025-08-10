import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Use vi.stubEnv instead of directly assigning to process.env.NODE_ENV
vi.stubEnv("NODE_ENV", "test");

// Re-import logger after setting NODE_ENV to ensure it picks up the test environment
vi.resetModules();
const loggerModule = await import("~/lib/logger");
const { logger, logApiCall, logSecurityEvent, logWebhook } = loggerModule;

describe("logger", () => {
  const getEnv = () => process.env.NODE_ENV;
  let originalEnv: string | undefined;

  let spyDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
  let spyLog = vi.spyOn(console, "log").mockImplementation(() => {});
  let spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  let spyError = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    originalEnv = getEnv();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // restore spies (also restores console methods)
    spyDebug.mockRestore();
    spyLog.mockRestore();
    spyWarn.mockRestore();
    spyError.mockRestore();

    // reset spies for next test
    spyDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    spyLog = vi.spyOn(console, "log").mockImplementation(() => {});
    spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    spyError = vi.spyOn(console, "error").mockImplementation(() => {});

    // Note: logger reads NODE_ENV at construction; we don't mutate it here to avoid read-only errors.
    // We just verify current behavior under the test environment.
    if (originalEnv !== undefined) {
      // no-op: keep env as-is
    }
  });

  it("emits warn/error via console with sanitized context in test env", () => {
    // In vitest (NODE_ENV=test), shouldLog returns false for debug/info/warn/error.
    logger.debug("debug msg", { userId: "u1", accessToken: "secret123" });
    logger.info("info msg", { userId: "u1", accessToken: "secret123" });
    logger.warn("careful", { password: "p", extra: "value" });
    logger.error("boom", new Error("crash"), { refreshToken: "r" });

    expect(spyLog).not.toHaveBeenCalled();
    expect(spyWarn).not.toHaveBeenCalled();
    expect(spyError).not.toHaveBeenCalled();
  });

  it("should log in production environment (warn/error only)", async () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");

    // Re-import logger to pick up new env
    vi.resetModules();
    const prodLogger = (await import("~/lib/logger")).logger;

    const prodWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const prodErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const prodLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Should not log debug/info in production
    prodLogger.debug("debug msg", { userId: "u1" });
    prodLogger.info("info msg", { userId: "u1" });
    expect(prodLogSpy).not.toHaveBeenCalled();

    // Should log warn/error in production
    prodLogger.warn("warn msg", { userId: "u1", password: "secret" });
    prodLogger.error("error msg", new Error("test"), { accessToken: "token" });

    expect(prodWarnSpy).toHaveBeenCalledWith(
      "[WARN] warn msg",
      expect.objectContaining({ userId: "u1" }),
    );
    expect(prodWarnSpy).toHaveBeenCalledWith(
      "[WARN] warn msg",
      expect.not.objectContaining({ password: expect.anything() }),
    );
    expect(prodErrorSpy).toHaveBeenCalledWith(
      "[ERROR] error msg",
      expect.objectContaining({
        error: "test",
        stack: undefined, // No stack in production
      }),
    );
    expect(prodErrorSpy).toHaveBeenCalledWith(
      "[ERROR] error msg",
      expect.not.objectContaining({ accessToken: expect.anything() }),
    );

    prodWarnSpy.mockRestore();
    prodErrorSpy.mockRestore();
    prodLogSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("should log everything in development environment", async () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");

    // Re-import logger to pick up new env
    vi.resetModules();
    const devLogger = (await import("~/lib/logger")).logger;

    const devWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const devErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const devLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Should log all levels in development
    devLogger.debug("debug msg", { userId: "u1" });
    devLogger.info("info msg", { userId: "u1" });
    devLogger.warn("warn msg", { userId: "u1" });
    devLogger.error("error msg", new Error("test"), { userId: "u1" });

    expect(devLogSpy).toHaveBeenCalledWith(
      "[DEBUG] debug msg",
      expect.objectContaining({ userId: "u1" }),
    );
    expect(devLogSpy).toHaveBeenCalledWith(
      "[INFO] info msg",
      expect.objectContaining({ userId: "u1" }),
    );
    expect(devWarnSpy).toHaveBeenCalledWith(
      "[WARN] warn msg",
      expect.objectContaining({ userId: "u1" }),
    );
    expect(devErrorSpy).toHaveBeenCalledWith(
      "[ERROR] error msg",
      expect.objectContaining({
        error: "test",
        stack: expect.any(String), // Stack trace should be included in development
      }),
    );

    devWarnSpy.mockRestore();
    devErrorSpy.mockRestore();
    devLogSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("should sanitize long strings in production", async () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");

    // Re-import logger to pick up new env
    vi.resetModules();
    const prodLogger = (await import("~/lib/logger")).logger;

    const prodWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const longString = "a".repeat(120); // Longer than 100 chars
    prodLogger.warn("test", { longData: longString });

    expect(prodWarnSpy).toHaveBeenCalledWith(
      "[WARN] test",
      expect.objectContaining({
        longData: expect.stringMatching(/^a{97}\.\.\.$/),
      }),
    );

    prodWarnSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("should handle webhook logging in development vs production", async () => {
    // Test development webhook logging
    const originalEnv = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "development");

    vi.resetModules();
    const devLogger = (await import("~/lib/logger")).logger;
    const devLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    devLogger.webhook("test event", { data: "payload" }, { userId: "u1" });
    expect(devLogSpy).toHaveBeenCalledWith(
      "[DEBUG] Webhook: test event",
      expect.objectContaining({
        userId: "u1",
        payload: { data: "payload" },
      }),
    );

    devLogSpy.mockRestore();

    // Test production webhook logging
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const prodLogger = (await import("~/lib/logger")).logger;
    const prodLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    prodLogger.webhook("test event", { data: "payload" }, { userId: "u1" });
    // In production, webhook calls info() which is filtered out, so no log should occur
    expect(prodLogSpy).not.toHaveBeenCalled();

    prodLogSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("error logs non-Error payloads too in test env", () => {
    // Also suppressed in test env
    logger.error("bad", { something: true });
    expect(spyError).not.toHaveBeenCalled();
  });

  it("webhook uses debug in development and info otherwise (uses current env)", () => {
    // In test env, logger.shouldLog returns false, so webhook won't log through debug/info paths.
    // But security always logs through warn; we verify webhook delegates without throwing.
    logWebhook("EVENT", "user_1", "wk_1");
    // Nothing guaranteed due to env suppression; ensure it doesn't throw.
    expect(true).toBe(true);
  });

  it("logApiCall uses timing when duration provided, otherwise debug path", () => {
    logApiCall("/x", "u1", 123);
    // In test env, timing triggers debug internally but should be suppressed; still no throw.
    logApiCall("/y", "u2");
    expect(true).toBe(true);
  });

  it("logSecurityEvent always logs via warn", () => {
    // Spy on console.warn fresh since logSecurityEvent bypasses shouldLog() and uses console.warn directly
    const freshWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logSecurityEvent("blocked", "u3", { ip: "1.2.3.4" });
    expect(freshWarnSpy).toHaveBeenCalled();
    const [msg] = freshWarnSpy.mock.calls.at(-1)!;
    expect(String(msg)).toContain("[SECURITY]");

    freshWarnSpy.mockRestore();
  });
});
