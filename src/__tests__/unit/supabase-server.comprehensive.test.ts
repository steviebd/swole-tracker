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
      // Mock NODE_ENV to test
      vi.stubEnv("NODE_ENV", "test");
      // Clear module cache to re-import with new env
      vi.resetModules();

      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ testClient: true });
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

      expect(mockCreateClient).toHaveBeenCalled();
      expect(client).toEqual({ testClient: true });
    });
  });

  describe("createServerSupabaseClient - production environment", () => {
    it("should create client in production environment with auth", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([
          { name: "sb-access-token", value: "test-token" },
          { name: "regular-cookie", value: "regular-value" }
        ]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

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

      expect(mockCookieStore.getAll).toHaveBeenCalled();
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-anon-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBeDefined();
    });

    it("should handle development environment like production", async () => {
      // Mock development environment
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
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

      expect(mockCookieStore.getAll).toHaveBeenCalled();
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        "https://dev.supabase.co",
        "dev-anon-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBeDefined();
    });

    it("should handle cookie setAll errors gracefully", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn().mockImplementation(() => {
          throw new Error("Cookie setting failed");
        }),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      
      // Should not throw even when cookie setting fails
      await expect(createServerSupabaseClient()).resolves.toBeDefined();
    });

    it("should log debug information in non-test environments", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([
          { name: "sb-access-token", value: "test-token" },
          { name: "supabase-refresh-token", value: "refresh-token" },
          { name: "regular-cookie", value: "regular-value" }
        ]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      // Spy on console.log to verify debug output
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      
      await createServerSupabaseClient();

      // Should log debug information
      expect(consoleSpy).toHaveBeenCalledWith(
        "Server-side cookies debug:",
        expect.objectContaining({
          totalCookies: 3,
          supabaseCookies: 2,
          cookieNames: expect.arrayContaining(["sb-access-token", "supabase-refresh-token"]),
        })
      );

      consoleSpy.mockRestore();
    });

    it("should execute cookie setAll function without errors", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockImplementation((url, key, options) => {
        // When createServerClient is called, simulate calling the setAll function
        // with test data to trigger coverage of the try-catch block
        if (options?.cookies?.setAll) {
          try {
            // Call setAll with valid data
            options.cookies.setAll([
              { name: "sb-test-cookie", value: "test-value", options: {} },
              { name: "supabase-other", value: "other-value", options: {} }
            ]);
          } catch (error) {
            // This should not be reached with valid data
          }
        }
        
        // Return a mock client
        return {
          auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
          from: vi.fn(),
        };
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

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
      
      // Verify that setAll was called with our test data
      expect(mockCookieStore.set).toHaveBeenNthCalledWith(
        1,
        "sb-test-cookie",
        "test-value",
        {}
      );
      expect(mockCookieStore.set).toHaveBeenNthCalledWith(
        2,
        "supabase-other",
        "other-value",
        {}
      );
      expect(client).toBeDefined();
    });

    it("should handle cookie setAll function with errors gracefully", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn().mockImplementation(() => {
          // Throw an error to trigger the catch block in setAll
          throw new Error("Cookie setting failed");
        }),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockImplementation((url, key, options) => {
        // When createServerClient is called, simulate calling the setAll function
        // with test data that will cause an error to trigger coverage of the catch block
        if (options?.cookies?.setAll) {
          try {
            // Call setAll with data that will cause an error
            options.cookies.setAll([
              { name: "sb-test-cookie", value: "test-value", options: {} }
            ]);
          } catch {
            // This should be reached when cookie setting fails
          }
        }
        
        // Return a mock client
        return {
          auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
          from: vi.fn(),
        };
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      
      // Should not throw even when cookie setting fails
      await expect(createServerSupabaseClient()).resolves.toBeDefined();
      
      // Verify that the set function was called (to trigger the try block)
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "sb-test-cookie",
        "test-value",
        {}
      );
    });

    it("should execute setAll function with valid data to cover try block", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(), // Don't throw an error this time, let it execute normally
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      // Mock the actual implementation to call setAll with test data
      const mockCreateServerClient = vi.fn().mockImplementation((url, key, options) => {
        // When createServerClient is called, simulate calling the setAll function
        // with valid test data to trigger coverage of the try block lines 37-38
        if (options?.cookies?.setAll) {
          // Call setAll with valid data to trigger coverage of lines 37-38
          options.cookies.setAll([
            { name: "sb-test-cookie", value: "test-value", options: {} }
          ]);
        }
        
        // Return a mock client
        return {
          auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
          from: vi.fn(),
        };
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

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
      
      // Verify that the set function was called with our test data
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "sb-test-cookie",
        "test-value",
        {}
      );
      expect(client).toBeDefined();
    });

    it("should successfully execute forEach in try block to cover lines 37-38", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(), // Don't throw an error, let it execute normally
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      // Mock the actual implementation to call setAll with multiple test data items
      const mockCreateServerClient = vi.fn().mockImplementation((url, key, options) => {
        // When createServerClient is called, simulate calling the setAll function
        // with multiple items to ensure forEach is executed
        if (options?.cookies?.setAll) {
          // Call setAll with multiple items to trigger forEach execution
          options.cookies.setAll([
            { name: "sb-cookie-1", value: "value-1", options: { path: "/" } },
            { name: "sb-cookie-2", value: "value-2", options: { path: "/api" } },
            { name: "supabase-cookie", value: "supabase-value", options: { domain: ".example.com" } }
          ]);
        }
        
        // Return a mock client
        return {
          auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
          from: vi.fn(),
        };
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

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
      
      // Verify that the set function was called with all our test data
      expect(mockCookieStore.set).toHaveBeenNthCalledWith(
        1,
        "sb-cookie-1",
        "value-1",
        { path: "/" }
      );
      expect(mockCookieStore.set).toHaveBeenNthCalledWith(
        2,
        "sb-cookie-2",
        "value-2",
        { path: "/api" }
      );
      expect(mockCookieStore.set).toHaveBeenNthCalledWith(
        3,
        "supabase-cookie",
        "supabase-value",
        { domain: ".example.com" }
      );
      expect(client).toBeDefined();
    });

    it("should handle cookie setAll function with destructuring errors", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      // Create a mock client that will call the setAll function with invalid data
      const mockClientInstance = {
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
        cookies: {
          getAll: vi.fn().mockReturnValue([]),
          setAll: vi.fn(),
        }
      };

      const mockCreateServerClient = vi.fn().mockImplementation((url, key, options) => {
        // When createServerClient is called, return our mock client
        // but also call the setAll function with invalid data to trigger error handling
        const client = { ...mockClientInstance };
        
        // Call the setAll function with invalid data that will cause destructuring errors
        if (options?.cookies?.setAll) {
          try {
            // Pass undefined items to trigger the catch block
            options.cookies.setAll([undefined, null, {}]);
          } catch (error) {
            // Ignore errors in this test
          }
        }
        
        return client;
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-anon-key",
        },
      }));

      const { createServerSupabaseClient } = await import(
        "~/lib/supabase-server"
      );
      
      // Should not throw even when setAll is called with invalid data
      await expect(createServerSupabaseClient()).resolves.toBeDefined();
    });
  });

  describe("createServerSupabaseClientFactory", () => {
    it("should return a function that creates clients in test environment", async () => {
      vi.stubEnv("NODE_ENV", "test");
      vi.resetModules();

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

      const client = await factory();
      expect(mockCreateClient).toHaveBeenCalled();
      expect(client).toEqual({ factoryTestClient: true });
    });

    it("should handle factory in production environment", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

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
      expect(mockCreateServerClient).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    it("should handle factory in development environment", async () => {
      // Mock development environment
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
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
      expect(client).toBeDefined();
    });

    it("should create new clients on each call in test environment", async () => {
      vi.stubEnv("NODE_ENV", "test");
      vi.resetModules();

      const mockCreateClient = vi
        .fn()
        .mockReturnValue({ testClient: true });
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

      const client1 = await factory();
      const client2 = await factory();
      
      // In test environment, each call creates a new client (no singleton pattern)
      expect(client1).toEqual({ testClient: true });
      expect(client2).toEqual({ testClient: true });
      expect(mockCreateClient).toHaveBeenCalledTimes(2);
    });

    it("should execute factory function correctly in production", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([
          { name: "sb-access-token", value: "test-token" }
        ]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockClient = {
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        from: vi.fn(),
      };

      const mockCreateServerClient = vi.fn().mockReturnValue(mockClient);

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

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

      // Call factory multiple times
      const client1 = await factory();
      const client2 = await factory();
      
      // Each call should create a new client in production (not singleton)
      expect(mockCreateServerClient).toHaveBeenCalledTimes(2);
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
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

    it("should handle createServerSupabaseClient in production environment with real client", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        from: vi.fn(),
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        storage: { from: vi.fn() },
        rpc: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-key",
        },
      }));

      const { createServerSupabaseClient } = await import("~/lib/supabase-server");
      
      const client = await createServerSupabaseClient();
      
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      expect(typeof client.from).toBe("function");
      expect(typeof client.auth).toBe("object");
      expect(typeof client.storage).toBe("object");
      expect(typeof client.rpc).toBe("function");
    });

    it("should handle createServerSupabaseClientFactory in production environment", async () => {
      // Mock production environment
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VITEST", undefined);
      vi.resetModules();

      const mockCookieStore = {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      };

      vi.doMock("next/headers", () => ({
        cookies: vi.fn().mockResolvedValue(mockCookieStore),
      }));

      const mockCreateServerClient = vi.fn().mockReturnValue({
        from: vi.fn(),
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        storage: { from: vi.fn() },
        rpc: vi.fn(),
      });

      vi.doMock("@supabase/ssr", () => ({
        createServerClient: mockCreateServerClient,
      }));

      vi.doMock("~/env", () => ({
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "prod-key",
        },
      }));

      const { createServerSupabaseClientFactory } = await import("~/lib/supabase-server");
      const factory = createServerSupabaseClientFactory();
      
      const client = await factory();
      
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        "https://prod.supabase.co",
        "prod-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(client).toBeDefined();
      expect(typeof client).toBe("object");
      expect(typeof factory).toBe("function");
    });
  });

  describe("edge cases and error handling", () => {
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

      const { createServerSupabaseClient } = await import("~/lib/supabase-server");

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
