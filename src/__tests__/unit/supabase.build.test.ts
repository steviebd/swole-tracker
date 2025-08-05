import { describe, it, expect } from "vitest";
import { requireEnv } from "~/lib/supabase";

describe("supabase.ts build tests", () => {
  describe("requireEnv function", () => {
    it("should return environment variable when set", () => {
      // Mock process.env
      const originalEnv = process.env;
      process.env = { ...originalEnv, TEST_VAR: "test_value" };

      expect(requireEnv("TEST_VAR")).toBe("test_value");

      // Restore process.env
      process.env = originalEnv;
    });

    it("should throw error when environment variable is not set", () => {
      // Mock process.env
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.MISSING_VAR;

      expect(() => requireEnv("MISSING_VAR")).toThrow("MISSING_VAR is not set");

      // Restore process.env
      process.env = originalEnv;
    });
  });

  describe("module exports", () => {
    it("should not export client or server implementations", async () => {
      const module = await import("~/lib/supabase");

      expect(module).toBeDefined();
      // The module should not export createClient or SupabaseClient
      expect((module as any).createClient).toBeUndefined();
      expect((module as any).SupabaseClient).toBeUndefined();
    });
  });

  describe("import behavior", () => {
    it("should be importable without errors", async () => {
      expect(async () => {
        await import("~/lib/supabase");
      }).not.toThrow();
    });
  });
});
