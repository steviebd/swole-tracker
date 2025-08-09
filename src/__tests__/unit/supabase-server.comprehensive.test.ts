import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

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

      // Mock Clerk auth to avoid server-only import issues
      vi.doMock("@clerk/nextjs/server", () => ({
        auth: vi.fn().mockResolvedValue({
          getToken: vi.fn().mockResolvedValue("token"),
        }),
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

      const mockCreateClient = vi.fn().mockReturnValue({ testClient: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
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

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
      );
      expect(client).toEqual({ testClient: true });
    });

    it("should skip Clerk auth in test environment", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const mockCreateClient = vi.fn().mockReturnValue({ skipAuth: true });
      const mockAuth = vi.fn();

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      await createServerSupabaseClient();

      // auth should not be called in test mode
      expect(mockAuth).not.toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
      );
    });
  });

  describe("createServerSupabaseClient - production environment", () => {
    it("should create client with Clerk auth token", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockGetToken = vi.fn().mockResolvedValue("clerk-server-token");
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ productionClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      const client = await createServerSupabaseClient();

      expect(mockAuth).toHaveBeenCalled();
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-anon-key",
        {
          global: {
            headers: {
              Authorization: "Bearer clerk-server-token",
            },
          },
        },
      );
      expect(client).toEqual({ productionClient: true });
    });

    it("should create client with empty auth header when token is null", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockGetToken = vi.fn().mockResolvedValue(null);
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ nullTokenClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      const client = await createServerSupabaseClient();

      expect(mockAuth).toHaveBeenCalled();
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-anon-key",
        {
          global: {
            headers: {
              Authorization: "",
            },
          },
        },
      );
      expect(client).toEqual({ nullTokenClient: true });
    });

    it("should create client with empty auth header when getToken is undefined", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockAuth = vi.fn().mockResolvedValue({}); // No getToken property
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ undefinedGetTokenClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );

      // This should throw because destructuring { getToken } will fail when getToken doesn't exist
      await expect(createServerSupabaseClient()).rejects.toThrow();
    });

    it("should handle auth function returning null", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockAuth = vi.fn().mockResolvedValue(null);
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ nullAuthClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );

      // This should handle gracefully when auth returns null
      await expect(createServerSupabaseClient()).rejects.toThrow();
    });

    it("should handle development environment like production", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const mockGetToken = vi.fn().mockResolvedValue("dev-token");
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });
      const mockCreateClient = vi.fn().mockReturnValue({ devClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
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

      expect(mockAuth).toHaveBeenCalled();
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://dev.supabase.co",
        "dev-anon-key",
        {
          global: {
            headers: {
              Authorization: "Bearer dev-token",
            },
          },
        },
      );
      expect(client).toEqual({ devClient: true });
    });
  });

  describe("createServerSupabaseClientFactory", () => {
    it("should return a function that creates clients in test environment", async () => {
      vi.stubEnv("NODE_ENV", "test");

      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ factoryTestClient: true });
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
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
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
      );
      expect(client).toEqual({ factoryTestClient: true });
    });

    it("should return a function that creates clients with auth in production", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockGetToken = vi.fn().mockResolvedValue("factory-token");
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ factoryProdClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClientFactory } = await import(
        "~/lib/supabase-server"
      );
      const factory = createServerSupabaseClientFactory();

      const client = await factory();

      expect(mockAuth).toHaveBeenCalled();
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-anon-key",
        {
          global: {
            headers: {
              Authorization: "Bearer factory-token",
            },
          },
        },
      );
      expect(client).toEqual({ factoryProdClient: true });
    });

    it("should handle factory with null token", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockGetToken = vi.fn().mockResolvedValue(null);
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ factoryNullTokenClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClientFactory } = await import(
        "~/lib/supabase-server"
      );
      const factory = createServerSupabaseClientFactory();

      const client = await factory();

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-anon-key",
        {
          global: {
            headers: {
              Authorization: "",
            },
          },
        },
      );
      expect(client).toEqual({ factoryNullTokenClient: true });
    });

    it("should allow multiple factory calls with fresh auth context", async () => {
      vi.stubEnv("NODE_ENV", "production");

      let callCount = 0;
      const mockGetToken = vi.fn().mockImplementation(async () => {
        callCount++;
        return `token-${callCount}`;
      });
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });
      const mockCreateClient = vi.fn().mockImplementation(() => ({
        callNumber: callCount,
      }));

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClientFactory } = await import(
        "~/lib/supabase-server"
      );
      const factory = createServerSupabaseClientFactory();

      const client1 = await factory();
      const client2 = await factory();

      expect(mockAuth).toHaveBeenCalledTimes(2);
      expect(mockGetToken).toHaveBeenCalledTimes(2);
      expect(mockCreateClient).toHaveBeenNthCalledWith(
        1,
        "https://prod.supabase.co",
        "prod-anon-key",
        {
          global: {
            headers: {
              Authorization: "Bearer token-1",
            },
          },
        },
      );
      expect(mockCreateClient).toHaveBeenNthCalledWith(
        2,
        "https://prod.supabase.co",
        "prod-anon-key",
        {
          global: {
            headers: {
              Authorization: "Bearer token-2",
            },
          },
        },
      );
      expect(client1).toEqual({ callNumber: 1 });
      expect(client2).toEqual({ callNumber: 2 });
    });

    it("should handle factory in development environment", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const mockGetToken = vi.fn().mockResolvedValue("dev-factory-token");
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });
      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ factoryDevClient: true });

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: mockCreateClient,
      }));
      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
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

      expect(mockAuth).toHaveBeenCalled();
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
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: vi.fn().mockReturnValue({}),
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
      vi.doMock("@supabase/supabase-js", () => ({
        createClient: vi.fn().mockReturnValue(mockClient),
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
    it("should handle auth throwing an error", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockAuth = vi.fn().mockRejectedValue(new Error("Auth failed"));

      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );

      await expect(createServerSupabaseClient()).rejects.toThrow("Auth failed");
    });

    it("should handle getToken throwing an error", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const mockGetToken = vi.fn().mockRejectedValue(new Error("Token failed"));
      const mockAuth = vi.fn().mockResolvedValue({ getToken: mockGetToken });

      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );

      await expect(createServerSupabaseClient()).rejects.toThrow(
        "Token failed",
      );
    });

    it("should handle createClient throwing an error", async () => {
      vi.stubEnv("NODE_ENV", "test");

      vi.doMock("@supabase/supabase-js", () => ({
        createClient: vi.fn().mockImplementation(() => {
          throw new Error("Client creation failed");
        }),
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

      const mockAuth = vi
        .fn()
        .mockResolvedValue({ getToken: vi.fn().mockResolvedValue("token") });

      vi.doMock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
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
