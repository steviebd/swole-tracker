import { describe, it, expect, beforeEach, vi } from "vitest";
import { logger } from "~/lib/logger";

describe("Logger class", () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("should always log security events", () => {
    logger.security("security event");
    expect(console.warn).toHaveBeenCalledWith("[SECURITY] security event", {});
  });

  it("should sanitize sensitive context in security events", () => {
    logger.security("security event", {
      userId: "123",
      accessToken: "secret",
      password: "secret",
      normalField: "normal",
    });

    expect(console.warn).toHaveBeenCalledWith("[SECURITY] security event", {
      userId: "123",
      normalField: "normal",
    });
  });
});
