import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("supabase-browser.ts comprehensive coverage", () => {
  const originalEnv = process.env;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    console.warn = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.warn = originalConsoleWarn;
    vi.unstubAllEnvs();
  });

  describe("environment variable handling", () => {
    it("should use environment variables from env module", async () => {
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );

      expect(() => createClerkSupabaseClient()).not.toThrow();
    });

    it("should handle environment configuration errors from env module", async () => {
      vi.doMock("~/env", () => ({
        env: {
          get NEXT_PUBLIC_SUPABASE_URL() {
            throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
          },
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
        },
      }));

      await expect(async () => {
        const { createClerkSupabaseClient } = await import(
          "~/lib/supabase-browser"
        );
        createClerkSupabaseClient();
      }).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL is not set");
    });
  });

  describe("createClerkSupabaseClient - local development path", () => {
    it("should use service role key for local development", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

      const mockCreateClient = vi.fn().mockReturnValue({ local: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      const client = createClerkSupabaseClient();

      expect(console.warn).toHaveBeenCalledWith(
        "[supabase] Using service role key for local development",
      );
      expect(mockCreateClient).toHaveBeenCalledWith(
        "http://127.0.0.1:54321",
        "service-role-key",
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );
      expect(client).toEqual({ local: true });
    });

    it("should detect local dev environment with localhost URL", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321/any/path");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

      const mockCreateClient = vi.fn().mockReturnValue({ local: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321/any/path",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient();

      expect(console.warn).toHaveBeenCalledWith(
        "[supabase] Using service role key for local development",
      );
      expect(mockCreateClient).toHaveBeenCalledWith(
        "http://127.0.0.1:54321/any/path",
        "service-role-key",
        expect.objectContaining({
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }),
      );
    });

    it("should not use service role key when not in development", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

      const mockCreateClient = vi.fn().mockReturnValue({ production: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient();

      expect(console.warn).not.toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "http://127.0.0.1:54321",
        "anon-key",
        expect.objectContaining({
          global: expect.any(Object),
        }),
      );
    });

    it("should not use service role key when URL is not localhost", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

      const mockCreateClient = vi.fn().mockReturnValue({ remote: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient();

      expect(console.warn).not.toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://project.supabase.co",
        "anon-key",
        expect.objectContaining({
          global: expect.any(Object),
        }),
      );
    });

    it("should not use service role key when service role key is not available", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
      delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

      const mockCreateClient = vi.fn().mockReturnValue({ noServiceRole: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient();

      expect(console.warn).not.toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "http://127.0.0.1:54321",
        "anon-key",
        expect.objectContaining({
          global: expect.any(Object),
        }),
      );
    });
  });

  describe("createClerkSupabaseClient - production path with session", () => {
    it("should create client with custom fetch when session is provided", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockGetToken = vi.fn().mockResolvedValue("clerk-token-123");
      const session = { getToken: mockGetToken };
      const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
      const capturedFetch = vi.fn();

      const mockCreateClient = vi
        .fn()
        .mockImplementation((_url, _key, options) => {
          capturedFetch.mockImplementation(options.global.fetch);
          return {
            withSession: true,
            globalFetch: options.global.fetch,
          };
        });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      // Mock global fetch
      vi.stubGlobal("fetch", mockGlobalFetch);

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      const client = createClerkSupabaseClient(session);

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://project.supabase.co",
        "anon-key",
        expect.objectContaining({
          global: {
            fetch: expect.any(Function),
          },
        }),
      );

      // Test the custom fetch function
      await capturedFetch("https://api.test.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(mockGetToken).toHaveBeenCalled();
      expect(mockGlobalFetch).toHaveBeenCalledWith("https://api.test.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer clerk-token-123",
        },
      });
    });

    it("should handle session.getToken returning null", async () => {
      const mockGetToken = vi.fn().mockResolvedValue(null);
      const session = { getToken: mockGetToken };
      const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
      const capturedFetch = vi.fn();

      const mockCreateClient = vi
        .fn()
        .mockImplementation((_url, _key, options) => {
          capturedFetch.mockImplementation(options.global.fetch);
          return { withNullToken: true };
        });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      vi.stubGlobal("fetch", mockGlobalFetch);

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient(session);

      // Test the custom fetch function with null token
      await capturedFetch("https://api.test.com", {
        headers: { "Content-Type": "application/json" },
      });

      expect(mockGetToken).toHaveBeenCalled();
      expect(mockGlobalFetch).toHaveBeenCalledWith("https://api.test.com", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "",
        },
      });
    });

    it("should handle session.getToken throwing an error", async () => {
      const mockGetToken = vi.fn().mockRejectedValue(new Error("Token error"));
      const session = { getToken: mockGetToken };
      const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
      const capturedFetch = vi.fn();

      const mockCreateClient = vi
        .fn()
        .mockImplementation((_url, _key, options) => {
          capturedFetch.mockImplementation(options.global.fetch);
          return { withTokenError: true };
        });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      vi.stubGlobal("fetch", mockGlobalFetch);

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient(session);

      // Test the custom fetch function with token error
      await capturedFetch("https://api.test.com", {
        headers: { "Content-Type": "application/json" },
      });

      expect(mockGetToken).toHaveBeenCalled();
      expect(mockGlobalFetch).toHaveBeenCalledWith("https://api.test.com", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "",
        },
      });
    });

    it("should handle options with no headers", async () => {
      const mockGetToken = vi.fn().mockResolvedValue("clerk-token");
      const session = { getToken: mockGetToken };
      const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
      const capturedFetch = vi.fn();

      const mockCreateClient = vi
        .fn()
        .mockImplementation((_url, _key, options) => {
          capturedFetch.mockImplementation(options.global.fetch);
          return { noHeaders: true };
        });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      vi.stubGlobal("fetch", mockGlobalFetch);

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient(session);

      // Test the custom fetch function with no initial headers
      await capturedFetch("https://api.test.com", {});

      expect(mockGlobalFetch).toHaveBeenCalledWith("https://api.test.com", {
        headers: {
          Authorization: "Bearer clerk-token",
        },
      });
    });

    it("should handle options with undefined headers", async () => {
      const mockGetToken = vi.fn().mockResolvedValue("clerk-token");
      const session = { getToken: mockGetToken };
      const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
      const capturedFetch = vi.fn();

      const mockCreateClient = vi
        .fn()
        .mockImplementation((_url, _key, options) => {
          capturedFetch.mockImplementation(options.global.fetch);
          return { undefinedHeaders: true };
        });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      vi.stubGlobal("fetch", mockGlobalFetch);

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient(session);

      // Test the custom fetch function with undefined headers
      await capturedFetch("https://api.test.com", { headers: undefined });

      expect(mockGlobalFetch).toHaveBeenCalledWith("https://api.test.com", {
        headers: {
          Authorization: "Bearer clerk-token",
        },
      });
    });
  });

  describe("createClerkSupabaseClient - no session", () => {
    it("should create client without session", async () => {
      const mockCreateClient = vi.fn().mockReturnValue({ noSession: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      const client = createClerkSupabaseClient();

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://project.supabase.co",
        "anon-key",
        expect.objectContaining({
          global: {
            fetch: expect.any(Function),
          },
        }),
      );
      expect(client).toEqual({ noSession: true });
    });

    it("should create client when session is null", async () => {
      const mockCreateClient = vi.fn().mockReturnValue({ nullSession: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      const client = createClerkSupabaseClient(null);

      expect(client).toEqual({ nullSession: true });
    });

    it("should create client when session has no getToken method", async () => {
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ sessionWithoutGetToken: true });
      const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
      const capturedFetch = vi.fn();

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      vi.stubGlobal("fetch", mockGlobalFetch);

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      const client = createClerkSupabaseClient({
        someOtherProp: "value",
      } as any);

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://project.supabase.co",
        "anon-key",
        expect.objectContaining({
          global: {
            fetch: expect.any(Function),
          },
        }),
      );

      // Capture the fetch function and test it
      const options = mockCreateClient.mock.calls[0]?.[2];
      capturedFetch.mockImplementation(options?.global?.fetch);

      await capturedFetch("https://api.test.com", {});

      expect(mockGlobalFetch).toHaveBeenCalledWith("https://api.test.com", {
        headers: {
          Authorization: "",
        },
      });
    });
  });

  describe("function type and export validation", () => {
    it("should export createClerkSupabaseClient as a function", async () => {
      const module = await import("~/lib/supabase-browser");

      expect(typeof module.createClerkSupabaseClient).toBe("function");
      expect(module.createClerkSupabaseClient).toBeInstanceOf(Function);
    });

    it("should return a SupabaseClient-like object", async () => {
      const mockClient = {
        from: vi.fn(),
        auth: { signIn: vi.fn() },
        storage: { from: vi.fn() },
      };

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: vi.fn().mockReturnValue(mockClient),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      const client = createClerkSupabaseClient();

      expect(client).toEqual(mockClient);
      expect(typeof client.from).toBe("function");
      expect(typeof client.auth.signInWithPassword).toBe("function");
      expect(typeof client.storage.from).toBe("function");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle various session object shapes", async () => {
      const mockCreateClient = vi.fn().mockReturnValue({ flexible: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );

      // Test with different session shapes
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
        expect(() => createClerkSupabaseClient(session as any)).not.toThrow();
      }
    });

    it("should handle RequestInit with various header types", async () => {
      const mockGetToken = vi.fn().mockResolvedValue("token");
      const session = { getToken: mockGetToken };
      const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("ok"));
      const capturedFetch = vi.fn();

      const mockCreateClient = vi
        .fn()
        .mockImplementation((_url, _key, options) => {
          capturedFetch.mockImplementation(options.global.fetch);
          return { headerTest: true };
        });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      vi.stubGlobal("fetch", mockGlobalFetch);

      const { createClerkSupabaseClient } = await import(
        "~/lib/supabase-browser"
      );
      createClerkSupabaseClient(session);

      // Test with Headers object
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      await capturedFetch("https://api.test.com", { headers });

      // Test with array of tuples
      await capturedFetch("https://api.test.com", {
        headers: [["Content-Type", "application/json"]],
      });

      // Test with record object
      await capturedFetch("https://api.test.com", {
        headers: { "Content-Type": "application/json" },
      });

      expect(mockGlobalFetch).toHaveBeenCalledTimes(3);
    });
  });
});
