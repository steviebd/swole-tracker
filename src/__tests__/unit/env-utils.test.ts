import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireEnv } from "~/lib/env-utils";

describe("requireEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env to original state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return the environment variable value when it exists", () => {
    process.env.TEST_VAR = "test-value";

    expect(requireEnv("TEST_VAR")).toBe("test-value");
  });

  it("should throw an error when the environment variable is not set", () => {
    delete process.env.TEST_VAR;

    expect(() => requireEnv("TEST_VAR")).toThrow("TEST_VAR is not set");
  });

  it("should throw an error when the environment variable is an empty string", () => {
    process.env.TEST_VAR = "";

    expect(() => requireEnv("TEST_VAR")).toThrow("TEST_VAR is not set");
  });

  it("should handle different variable names", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.API_KEY = "secret-key";

    expect(requireEnv("DATABASE_URL")).toBe("postgresql://localhost:5432/test");
    expect(requireEnv("API_KEY")).toBe("secret-key");
  });
});
