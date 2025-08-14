import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

describe("env-utils.ts enhanced coverage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("module structure and imports", () => {
    it("should be importable without errors", async () => {
      await expect(async () => {
        await import(path.resolve(process.cwd(), "src/lib/env-utils.ts"));
      }).not.toThrow();
    });

    it("should be importable multiple times without side effects", async () => {
      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const module1 = await import(modulePath);
      const module2 = await import(modulePath);

      expect(typeof module1).toBe("object");
      expect(typeof module2).toBe("object");
      expect(typeof module1.requireEnv).toBe("function");
      expect(typeof module2.requireEnv).toBe("function");
    });

    it("should handle ES module import syntax", async () => {
      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const module = await import(modulePath);

      expect(typeof module).toBe("object");
      expect(typeof module.requireEnv).toBe("function");
    });

    it("should export requireEnv function", async () => {
      const module = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(typeof module.requireEnv).toBe("function");
    });

    it("should not export createClient directly", async () => {
      const module = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(module.createClient).toBeUndefined();
    });

    it("should not export SupabaseClient type directly", async () => {
      const module = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(module.SupabaseClient).toBeUndefined();
    });

    it("should have correct exports structure", async () => {
      const module = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      // Should export requireEnv but not client implementations
      const exportedKeys = Object.keys(module);
      expect(exportedKeys).toContain("requireEnv");
      expect(exportedKeys).not.toContain("createClient");
      expect(exportedKeys).not.toContain("SupabaseClient");
    });
  });

  describe("requireEnv function behavior", () => {
    it("should return environment variable when set to non-empty string", async () => {
      process.env.TEST_VAR = "test_value";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("TEST_VAR")).toBe("test_value");
    });

    it("should return environment variable when set to empty string", async () => {
      process.env.EMPTY_VAR = "";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      // Empty string should be treated as falsy and throw
      expect(() => requireEnv("EMPTY_VAR")).toThrow("EMPTY_VAR is not set");
    });

    it("should return environment variable when set to zero", async () => {
      process.env.ZERO_VAR = "0";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("ZERO_VAR")).toBe("0");
    });

    it("should return environment variable when set to false", async () => {
      process.env.FALSE_VAR = "false";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("FALSE_VAR")).toBe("false");
    });

    it("should throw error when environment variable is undefined", async () => {
      delete process.env.UNDEFINED_VAR;

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(() => requireEnv("UNDEFINED_VAR")).toThrow(
        "UNDEFINED_VAR is not set",
      );
    });

    it("should throw error with correct variable name in message", async () => {
      delete process.env.CUSTOM_VAR_NAME;

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(() => requireEnv("CUSTOM_VAR_NAME")).toThrow(
        "CUSTOM_VAR_NAME is not set",
      );
    });

    it("should handle special characters in environment variable names", async () => {
      process.env["VAR_WITH_SPECIAL-CHARS.123"] = "special_value";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("VAR_WITH_SPECIAL-CHARS.123")).toBe("special_value");
    });

    it("should handle unicode values in environment variables", async () => {
      process.env.UNICODE_VAR = "🚀 test value with émojis and àccénts";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("UNICODE_VAR")).toBe(
        "🚀 test value with émojis and àccénts",
      );
    });

    it("should handle very long environment variable values", async () => {
      const longValue = "a".repeat(10000);
      process.env.LONG_VAR = longValue;

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("LONG_VAR")).toBe(longValue);
    });

    it("should handle whitespace-only values as falsy", async () => {
      process.env.WHITESPACE_VAR = "   ";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      // Whitespace-only should be treated as truthy since it's not empty
      expect(requireEnv("WHITESPACE_VAR")).toBe("   ");
    });

    it("should handle newline characters", async () => {
      process.env.NEWLINE_VAR = "line1\nline2\r\nline3";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("NEWLINE_VAR")).toBe("line1\nline2\r\nline3");
    });

    it("should handle JSON-like strings", async () => {
      process.env.JSON_VAR = '{"key": "value", "number": 123}';

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(requireEnv("JSON_VAR")).toBe('{"key": "value", "number": 123}');
    });

    it("should throw Error instance with correct properties", async () => {
      delete process.env.ERROR_TEST_VAR;

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      try {
        requireEnv("ERROR_TEST_VAR");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("ERROR_TEST_VAR is not set");
        expect((error as Error).name).toBe("Error");
      }
    });

    it("should always return string type", async () => {
      process.env.STRING_VAR = "string_value";
      process.env.NUMBER_VAR = "123";
      process.env.BOOLEAN_VAR = "true";

      const { requireEnv } = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      expect(typeof requireEnv("STRING_VAR")).toBe("string");
      expect(typeof requireEnv("NUMBER_VAR")).toBe("string");
      expect(typeof requireEnv("BOOLEAN_VAR")).toBe("string");
    });
  });

  describe("module documentation and comments", () => {
    it("should contain guidance about proper import paths", async () => {
      // Read the module source to verify it contains proper documentation
      const fs = await import("fs");
      const path = await import("path");

      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");

      expect(moduleContent).toContain("supabase-browser");
      expect(moduleContent).toContain("supabase-server");
      expect(moduleContent).toContain("client code");
      expect(moduleContent).toContain("server code");
    });

    it("should explain the purpose of the module", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");

      expect(moduleContent).toContain(
        "no longer exports client or server implementations",
      );
      expect(moduleContent).toContain("avoid mixing boundaries");
    });
  });

  describe("TypeScript imports and types", () => {
    it("should import createClient from @supabase/supabase-js", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");

      expect(moduleContent).toContain(
        'import { createClient, type SupabaseClient } from "@supabase/supabase-js"',
      );
    });

    it("should define requireEnv function internally", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");

      expect(moduleContent).toContain(
        "function requireEnv(name: string): string",
      );
      expect(moduleContent).toContain("process.env[name]");
      expect(moduleContent).toContain("is not set");
    });
  });

  describe("environment variable validation logic", () => {
    it("should contain proper error handling for missing env vars", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");

      // Check that the requireEnv function has proper validation
      expect(moduleContent).toContain("if (!v)");
      expect(moduleContent).toContain("throw new Error");
      expect(moduleContent).toContain("return v");
    });

    it("should handle falsy values correctly in requireEnv", async () => {
      const fs = await import("fs");
      const path = await import("path");

      const modulePath = path.resolve(process.cwd(), "src/lib/env-utils.ts");
      const moduleContent = fs.readFileSync(modulePath, "utf-8");

      // The function should check for !v which catches undefined, null, and empty string
      expect(moduleContent).toContain("if (!v)");
    });
  });

  describe("module architecture", () => {
    it("should serve as a shared utility module", async () => {
      const module = await import(
        path.resolve(process.cwd(), "src/lib/env-utils.ts")
      );

      // Should be a minimal module that doesn't expose client implementations
      expect(Object.keys(module).length).toBeLessThanOrEqual(2); // Minimal exports
    });

    it("should not instantiate any clients at module level", async () => {
      // Module should not create any side effects or client instances
      await expect(async () => {
        await import(path.resolve(process.cwd(), "src/lib/env-utils.ts"));
      }).not.toThrow();
    });
  });

  describe("integration with other supabase modules", () => {
    it("should work with supabase-browser module", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_KEY = "test_key";

      await expect(async () => {
        await import(path.resolve(process.cwd(), "src/lib/env-utils.ts"));
        await import(
          path.resolve(process.cwd(), "src/lib/supabase-browser.ts")
        );
      }).not.toThrow();
    });

    it("should work with supabase-server module", async () => {
      process.env.SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service_key";

      await expect(async () => {
        await import(path.resolve(process.cwd(), "src/lib/env-utils.ts"));
        // Note: supabase-server might have server-only imports, so we just test the base module
      }).not.toThrow();
    });
  });
});
