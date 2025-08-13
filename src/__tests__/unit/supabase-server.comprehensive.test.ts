import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("supabase-server.ts comprehensive coverage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  describe("environment variable handling", () => {
    it("should use environment variables from env module", async () => {
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({
          getAll: vi.fn(() => []),
          set: vi.fn(),
          get: vi.fn(() => ({ value: ""})),
        })),
      }));

      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );

      // Should not throw when env vars are properly set
      await expect(createServerSupabaseClient()).resolves.toBeDefined();
    });

    it("should handle environment configuration errors from env module", async () => {
      vi.doMock("~/env", () => ({
        env: {
          get NEXT_PUBLIC_SUPABASE_URL() {
            throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
          },
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        },
      }));

      await expect(async () => {
        const { createServerSupabaseClient } = await import(
          "~/lib/supabase-server"
        );
        await createServerSupabaseClient();
      }).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL is not set");
    });
  });

  describe("createServerSupabaseClient - test environment", () => {
    it("should create client in test environment without auth", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const mockCreateServerClient = vi.fn().mockReturnValue({ testClient: true });
      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({
          getAll: vi.fn(() => []),
          set: vi.fn(),
          get: vi.fn(() => ({ value: ""})),
        })),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      const client = await createServerSupabaseClient();

      expect(mockCreateServerClient).toHaveBeenCalled();
      expect(client).toEqual({ testClient: true });
    });
  });

  describe("createServerSupabaseClient - production environment", () => {

    it("should handle development environment like production", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const mockCreateServerClient = vi.fn().mockReturnValue({ devClient: true });
      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({
          getAll: vi.fn(() => []),
          set: vi.fn(),
          get: vi.fn(() => ({ value: ""})),
        })),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://dev.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "dev-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      const client = await createServerSupabaseClient();

      expect(mockCreateServerClient).toHaveBeenCalled();
      expect(client).toEqual({ devClient: true });
    });
  });

  describe("createServerSupabaseClientFactory", () => {
    it("should return a function that creates clients in test environment", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const mockCreateServerClient = vi
        .fn()
        .mockReturnValue({ factoryTestClient: true });
      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({
          getAll: vi.fn(() => []),
          set: vi.fn(),
          get: vi.fn(() => ({ value: ""})),
        })),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        },
      }));

      const { createServerSupabaseClientFactory } = await import(
        "~/lib/supabase-server"
      );
      const factory = createServerSupabaseClientFactory();

      expect(typeof factory).toBe("function");

      const client = await factory();
      expect(mockCreateServerClient).toHaveBeenCalled();
      expect(client).toEqual({ factoryTestClient: true });
    });

    it("should handle factory in development environment", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const mockCreateServerClient = vi
        .fn()
        .mockReturnValue({ factoryDevClient: true });
      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({
          getAll: vi.fn(() => []),
          set: vi.fn(),
          get: vi.fn(() => ({ value: ""})),
        })),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://dev.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "dev-anon-key",
        },
      }));

      const { createServerSupabaseClientFactory } = await import(
        "~/lib/supabase-server"
      );
      const factory = createServerSupabaseClientFactory();

      const client = await factory();

      expect(mockCreateServerClient).toHaveBeenCalled();
      expect(client).toEqual({ factoryDevClient: true });
    });
  });

  describe("function exports and types", () => {
    it("should export createServerSupabaseClient as async function", async () => {
      const module = await import("~/lib/supabase-server");

      expect(typeof module.createServerSupabaseClient).toBe("function");
      expect(module.createServerSupabaseClient).toBeInstanceOf(Function);

      // Should be async (returns Promise)
      vi.stubEnv("NODE_ENV", "test");
      vi.doMock("@supabase/ssr", () => ({
        createServerClient: vi.fn().mockReturnValue({}),
      }));
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({
          getAll: vi.fn(() => []),
          set: vi.fn(),
          get: vi.fn(() => ({ value: ""})),
        })),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
        },
      }));

      const result = module.createServerSupabaseClient();
      expect(result).toBeInstanceOf(Promise);
    });

    it("should export createServerSupabaseClientFactory as function", async () => {
      const module = await import("~/lib/supabase-server");

      expect(typeof module.createServerSupabaseClientFactory).toBe("function");
      expect(module.createServerSupabaseClientFactory).toBeInstanceOf(Function);

      const factory = module.createServerSupabaseClientFactory();
      expect(typeof factory).toBe("function");
    });

    it("should return SupabaseClient-like objects", async () => {
      const mockClient = {
        from: vi.fn(),
        auth: { signOut: vi.fn() },
        storage: { from: vi.fn() },
        rpc: vi.fn(),
      };

      vi.stubEnv("NODE_ENV", "test");
      vi.doMock("@supabase/ssr", () => ({
        createServerClient: vi.fn().mockReturnValue(mockClient),
      }));
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({
          getAll: vi.fn(() => []),
          set: vi.fn(),
          get: vi.fn(() => ({ value: ""})),
        })),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
        },
      }));

      const { createServerSupabaseClient, createServerSupabaseClientFactory } =
        await import("~/lib/supabase-server");

      const client1 = await createServerSupabaseClient();
      expect(client1).toEqual(mockClient);

      const factory = createServerSupabaseClientFactory();
      const client2 = await factory();
      expect(client2).toEqual(mockClient);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle createClient throwing an error", async () => {
      vi.stubEnv("NODE_ENV", "test");

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: vi.fn().mockImplementation(() => {
          throw new Error("Client creation failed");
        }),
      }));
      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({})),
      }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );

      await expect(createServerSupabaseClient()).rejects.toThrow(
        "Client creation failed",
      );
    });

    it("should handle missing env variables gracefully in factory", async () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      vi.doMock("next/headers", () => ({
        cookies: vi.fn(() => ({})),
      }));
      vi.doMock("~/env", () => ({
        env: {
          get NEXT_PUBLIC_SUPABASE_URL() {
            throw new Error("Missing URL");
          },
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "key",
        },
      }));

      const { createServerSupabaseClientFactory } = await import(
        "~/lib/supabase-server"
      );
      const factory = createServerSupabaseClientFactory();

      await expect(factory()).rejects.toThrow("Missing URL");
    });
  });
});
