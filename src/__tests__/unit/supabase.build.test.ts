import { describe, it, expect } from "vitest";

describe("supabase.ts build tests", () => {
  describe("requireEnv function", () => {
    it("should return environment variable when set", () => {
      // Mock process.env
      const originalEnv = process.env;
      process.env = { ...originalEnv, TEST_VAR: "test_value" };

      // Import the module to get the requireEnv function
      const { requireEnv } = require("~/lib/supabase");
      
      expect(requireEnv("TEST_VAR")).toBe("test_value");
      
      // Restore process.env
      process.env = originalEnv;
    });

    it("should throw error when environment variable is not set", () => {
      // Mock process.env
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.MISSING_VAR;

      // Import the module to get the requireEnv function
      const { requireEnv } = require("~/lib/supabase");
      
      expect(() => requireEnv("MISSING_VAR")).toThrow("MISSING_VAR is not set");
      
      // Restore process.env
      process.env = originalEnv;
    });
  });

  describe("module exports", () => {
    it("should not export client or server implementations", () => {
      const module = require("~/lib/supabase");
      
      expect(module).toBeDefined();
      // The module should not export createClient or SupabaseClient
      expect(module.createClient).toBeUndefined();
      expect(module.SupabaseClient).toBeUndefined();
    });
  });

  describe("import behavior", () => {
    it("should be importable without errors", () => {
      expect(() => {
        require("~/lib/supabase");
      }).not.toThrow();
    });
  });
});
