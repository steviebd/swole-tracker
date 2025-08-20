import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireEnv } from "~/lib/env-utils";

describe("requireEnv function", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env after each test
    process.env = originalEnv;
  });

  it("should return the environment variable value when it exists", () => {
    process.env.TEST_VAR = "test_value";
    expect(requireEnv("TEST_VAR")).toBe("test_value");
  });

  it("should throw an error when the environment variable is not set", () => {
    expect(() => requireEnv("NON_EXISTENT_VAR")).toThrow(
      "NON_EXISTENT_VAR is not set",
    );
  });

  it("should throw an error when the environment variable is empty string", () => {
    process.env.EMPTY_VAR = "";
    expect(() => requireEnv("EMPTY_VAR")).toThrow("EMPTY_VAR is not set");
  });

  it("should throw an error when the environment variable is undefined", () => {
    process.env.UNDEFINED_VAR = undefined;
    expect(() => requireEnv("UNDEFINED_VAR")).toThrow(
      "UNDEFINED_VAR is not set",
    );
  });

  it("should work with various environment variable names", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.API_KEY = "secret123";
    process.env.PORT = "3000";

    expect(requireEnv("DATABASE_URL")).toBe("postgresql://localhost:5432/test");
    expect(requireEnv("API_KEY")).toBe("secret123");
    expect(requireEnv("PORT")).toBe("3000");
  });

  it("should handle environment variables with special characters", () => {
    process.env.SPECIAL_VAR = "value with spaces and !@#$%^&*()";
    expect(requireEnv("SPECIAL_VAR")).toBe("value with spaces and !@#$%^&*()");
  });
});
