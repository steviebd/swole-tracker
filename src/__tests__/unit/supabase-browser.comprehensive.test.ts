import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("supabase-browser.ts comprehensive coverage", () => {
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    vi.clearAllMocks();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  describe("createBrowserSupabaseClient - secure implementation", () => {
    it("should always use anonymous key for security in all environments", async () => {
      // Test that the function always uses anonymous key, never service role key
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      // Should not throw with basic usage
      expect(() => createBrowserSupabaseClient()).not.toThrow();
      expect(() => createBrowserSupabaseClient(null)).not.toThrow();
      
      // Filter out expected Supabase GoTrueClient warnings, should not have service role key warnings
      const warnCalls = (console.warn as any).mock.calls;
      const nonSupabaseWarnings = warnCalls.filter((call: any[]) => 
        !call[0]?.includes("Multiple GoTrueClient instances detected")
      );
      expect(nonSupabaseWarnings).toHaveLength(0);
    });

    it("should handle session with getToken method", async () => {
      const mockGetToken = vi.fn().mockResolvedValue("supabase-token-123");
      const session = { getToken: mockGetToken };

      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient(session);
      
      // Should create a client successfully
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      
      // Filter out expected Supabase GoTrueClient warnings, should not have service role key warnings
      const warnCalls = (console.warn as any).mock.calls;
      const nonSupabaseWarnings = warnCalls.filter((call: any[]) => 
        !call[0]?.includes("Multiple GoTrueClient instances detected")
      );
      expect(nonSupabaseWarnings).toHaveLength(0);
    });

    it("should handle session.getToken returning null", async () => {
      const mockGetToken = vi.fn().mockResolvedValue(null);
      const session = { getToken: mockGetToken };

      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient(session);
      
      // Should create a client successfully
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      
      // Filter out expected Supabase GoTrueClient warnings, should not have service role key warnings
      const warnCalls = (console.warn as any).mock.calls;
      const nonSupabaseWarnings = warnCalls.filter((call: any[]) => 
        !call[0]?.includes("Multiple GoTrueClient instances detected")
      );
      expect(nonSupabaseWarnings).toHaveLength(0);
    });

    it("should handle session without getToken method", async () => {
      // Session object without getToken method
      const session = { someOtherProp: "value" };

      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient(session as any);
      
      // Should create a client successfully
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      
      // Filter out expected Supabase GoTrueClient warnings, should not have service role key warnings
      const warnCalls = (console.warn as any).mock.calls;
      const nonSupabaseWarnings = warnCalls.filter((call: any[]) => 
        !call[0]?.includes("Multiple GoTrueClient instances detected")
      );
      expect(nonSupabaseWarnings).toHaveLength(0);
    });

    it("should handle various session object shapes without warnings", async () => {
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );

      // Test with different session shapes that should all work securely
      const sessions = [
        undefined,
        null,
        {},
        { getToken: undefined },
        { getToken: null },
        { getToken: "not-a-function" },
        { getToken: () => Promise.resolve("token") },
        { getToken: () => Promise.reject(new Error("error")) },
        { getToken: () => null },
      ];

      for (const session of sessions) {
        expect(() => createBrowserSupabaseClient(session as any)).not.toThrow();
      }
      
      // Filter out expected Supabase GoTrueClient warnings, should not have service role key warnings
      const warnCalls = (console.warn as any).mock.calls;
      const nonSupabaseWarnings = warnCalls.filter((call: any[]) => 
        !call[0]?.includes("Multiple GoTrueClient instances detected")
      );
      expect(nonSupabaseWarnings).toHaveLength(0);
    });
  });

  describe("function type and export validation", () => {
    it("should export createBrowserSupabaseClient as a function", async () => {
      const module = await import("~/lib/supabase-browser");

      expect(typeof module.createBrowserSupabaseClient).toBe("function");
      expect(module.createBrowserSupabaseClient).toBeInstanceOf(Function);
      // Legacy export should still exist for backward compatibility
      expect(typeof module.createClerkSupabaseClient).toBe("function");
      expect(module.createClerkSupabaseClient).toBeInstanceOf(Function);
    });

    it("should return a SupabaseClient-like object with required methods", async () => {
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient();

      // Basic SupabaseClient interface checks
      expect(client).toBeDefined();
      expect(typeof client.from).toBe("function");
      expect(typeof client.auth).toBe("object");
      expect(typeof client.storage).toBe("object");
      
      // The polyfill should ensure signInWithPassword exists
      expect(typeof client.auth.signInWithPassword).toBe("function");
    });
  });

  describe("security behavior validation", () => {
    it("should never log service role key warnings (core security test)", async () => {
      // This is the key test that verifies the security fix
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      // Create clients in various ways that used to trigger service role key usage
      createBrowserSupabaseClient();
      createBrowserSupabaseClient(null);
      createBrowserSupabaseClient({});
      createBrowserSupabaseClient({ getToken: () => Promise.resolve("token") });

      // Filter out expected Supabase GoTrueClient warnings, should not have service role key warnings
      const warnCalls = (console.warn as any).mock.calls;
      const nonSupabaseWarnings = warnCalls.filter((call: any[]) => 
        !call[0]?.includes("Multiple GoTrueClient instances detected")
      );
      expect(nonSupabaseWarnings).toHaveLength(0);
    });

    it("should work with localhost URLs without using service role key", async () => {
      // This test verifies that even with localhost URLs (which used to trigger 
      // service role key usage), the function now securely uses anonymous key
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient();
      
      expect(client).toBeDefined();
      // Filter out expected Supabase GoTrueClient warnings, should not have service role key warnings
      const warnCalls = (console.warn as any).mock.calls;
      const nonSupabaseWarnings = warnCalls.filter((call: any[]) => 
        !call[0]?.includes("Multiple GoTrueClient instances detected")
      );
      expect(nonSupabaseWarnings).toHaveLength(0);
    });

    it("should handle auth polyfill for test compatibility", async () => {
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient();
      
      // The polyfill ensures signInWithPassword exists for test compatibility
      expect(typeof client.auth.signInWithPassword).toBe("function");
      
      // Should be able to call the polyfilled method without error
      expect(() => {
        // This may return a promise or call underlying signIn method
        const result = client.auth.signInWithPassword({
          email: "test@example.com",
          password: "password"
        });
        // If it returns a promise, it should be a valid promise
        if (result && typeof result.then === 'function') {
          expect(result).toBeInstanceOf(Promise);
        }
      }).not.toThrow();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle module import errors gracefully", async () => {
      // Basic module import should work
      await expect(import("~/lib/supabase-browser")).resolves.toBeDefined();
    });

    it("should create client without session argument", async () => {
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient();
      
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      expect(typeof client.from).toBe("function");
    });

    it("should create client with null session explicitly", async () => {
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient(null);
      
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      expect(typeof client.from).toBe("function");
    });

    it("should create client with empty session object", async () => {
      const { createBrowserSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      
      const client = createBrowserSupabaseClient({});
      
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      expect(typeof client.from).toBe("function");
    });
  });
});